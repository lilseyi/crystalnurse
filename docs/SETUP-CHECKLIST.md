# Setup checklist

Everything that has to exist outside the code before the portal is live.
Work top to bottom — later steps need values from earlier ones.

## How secrets are stored

One 1Password item per environment variable, in the vault `Crystal`, titled
**exactly as the variable**, with `dev` / `staging` / `production` fields:

```
Crystal
├── RESEND_API_KEY        dev · staging · production
├── JWT_PRIVATE_KEY       dev · production
├── JWKS                  dev · production
└── CONVEX_DEPLOY_KEY     production
```

`.env.example` references them as `op://Crystal/<VAR>/{{ENV}}`. Item titles must
be unique within the vault — two items with the same title make `op read`
ambiguous and every script fails until one is renamed or removed.

## 1. Convex project and production deployment

There is no separate "create a release" step. A project has a dev deployment and
a production deployment; generating a **production deploy key** is what targets
the latter, and the first `npx convex deploy` populates it.

**Done.** Project `crystalcare`, team `supa-media`:

| | Deployment | URL |
|---|---|---|
| Dev | `formal-mastiff-577` | `https://formal-mastiff-577.convex.cloud` |
| Production | `accurate-gull-766` | `https://accurate-gull-766.convex.cloud` |

The production deploy key is in 1Password (`CONVEX_DEPLOY_KEY` → `production`),
and both deployments have their environment variables set.

If the production deployment is ever recreated, update `productionIdentifier`
in `apps/convex/auth.ts` to match the new name — it's what stops the
development sign-in bypass from working there.

## 2. Resend

For sign-in codes. Sign up, then:

1. **Domains → Add domain → `crystalnurse.com`.** Resend gives you DNS records
   (a DKIM TXT, and usually an MX + TXT for a sending subdomain). Add them
   wherever DNS is managed. Codes will not deliver until this verifies.
2. **API keys → Create.** Store it in 1Password: vault `Crystal`, item
   `RESEND_API_KEY`, in the `dev` and `production` fields.

Resend's DKIM record sits alongside the existing Google Workspace records —
it doesn't replace them, and it doesn't affect inbound mail.

## 3. Sign-in signing keys

Already done — `pnpm setup:auth-keys` generated them into 1Password as
`JWT_PRIVATE_KEY` and `JWKS`, with a **separate key pair for dev and
production**. Sharing one pair across environments would let a session minted
against the dev backend be accepted by production.

Never regenerate these. Replacing them signs everyone out.

## 4. Push the secrets to Convex — done

Both deployments are configured. For reference, or after rotating a key:

```bash
pnpm setup:secrets          # 1Password (dev) → .env.local
pnpm push:secrets           # .env.local → dev deployment
pnpm push:secrets --prod    # 1Password (production) → prod deployment
```

`--prod` reads production values straight from 1Password; they never touch
disk. `setup:secrets` merges into `.env.local` rather than overwriting it, so
the `CONVEX_DEPLOYMENT` line that `npx convex dev` wrote survives.

Convex functions read their environment from the *deployment*, not from your
laptop. If sign-in codes stop arriving, this is the first thing to check.

## 5. GitHub repo secrets and variables

**Done for the four deploy secrets** — the `production` environment exists and
holds all of them, sourced from 1Password.

### Keeping them in sync

1Password is the source of truth; GitHub secrets are a buffer the deploy
workflows read. **Never edit a secret in the GitHub UI** — they're write-only
(you can't read one back to check it) and the next sync overwrites whatever you
typed. Change the value in 1Password instead, then re-sync.

To re-sync: Actions → **Sync secrets from 1Password** → Run workflow. It leaves
dry-run on by default so you see the plan first.

Adding a new secret is three steps: create the 1Password item (titled exactly as
the variable, with a `production` field), add the key to
`secrets-allowlist.json`, and run the sync. A key not on the allowlist is never
synced.

That workflow needs two tokens seeded by hand — it can't sync the credentials it
needs in order to run:

| Secret | What |
|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password service account, read-only, scoped to the `Crystal` vault (1Password → Developer → Service Accounts) |
| `GH_ADMIN_TOKEN` | GitHub PAT with repo admin scope. The built-in `GITHUB_TOKEN` cannot manage secrets — a hard limitation, not a setting |

Until those exist the sync can't run, which is why the four below were seeded
directly from 1Password. Once seeded, uncomment the `push:` trigger in
`.github/workflows/sync-secrets.yml` so allowlist changes sync themselves.

### Secrets — `production` environment

| Secret | Value | Used by |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | 1Password → `CONVEX_DEPLOY_KEY` → `production` | `deploy-convex.yml`, `deploy-admin.yml` |
| `EXPO_PUBLIC_CONVEX_URL` | `https://accurate-gull-766.convex.cloud` | `deploy-admin.yml` |
| `CLOUDFLARE_API_TOKEN` | token with **Cloudflare Pages: Edit** | `deploy-admin.yml` |
| `CLOUDFLARE_ACCOUNT_ID` | 1Password → `CLOUDFLARE_ACCOUNT_ID` | `deploy-admin.yml` |

`EXPO_PUBLIC_CONVEX_URL` is baked into the JavaScript at build time, not read at
runtime. If it's missing, the build still succeeds and ships a portal that
silently can't reach the backend — which is why `deploy-admin.yml` checks for it
before building.

### Secrets — repository level (optional)

| Secret | Why |
|---|---|
| `CONVEX_DEPLOY_KEY` | Lets `ci.yml` verify `apps/convex/_generated` isn't stale |

`ci.yml` runs on pull requests without an environment, so it can't see
environment-scoped secrets. The generated types are committed, so CI works fine
without this — it just skips the freshness check. Add it only if you want that
check on PRs.

### Variables

| Variable | Value | Why |
|---|---|---|
| `CN_DEPLOY_TARGET` | `custom-domain` | Builds the marketing site at the domain root instead of `/crystalnurse/`. Set once DNS points at GitHub Pages. |

### Not needed

`GITHUB_TOKEN` is provided automatically by Actions — it's what authenticates
`pnpm install` against the private `@supa-media/*` registry. Don't create one.

## 6. Hosting for admin.crystalnurse.com

See [DEPLOYING.md](./DEPLOYING.md). Short version: Cloudflare Pages requires
`crystalnurse.com` to be a Cloudflare zone, which means moving the nameservers —
and the zone carries live Google Workspace email, so follow the ordered steps
there. If you'd rather not move DNS, Netlify or Vercel work with a CNAME from
Google Cloud DNS.

## 7. GitHub Pages (marketing site)

Already configured. Repo Settings → Pages → Source: **GitHub Actions**.

## 8. First sign-in

Once the backend is deployed and the portal is up:

1. Open the portal and sign in with a `@crystalnurse.com` address.
2. It'll offer to let you claim ownership — that only works while nobody owns it.
3. Settings → Give someone access → add your brother as an **Owner**.

## What is NOT in this list

Keys for services the portal talks to — Google Sheets, a mailing list, an
accounting tool. Those go in the portal itself, Settings → Connections, with no
deploy and no developer. See [CONNECTIONS.md](./CONNECTIONS.md). Keeping that
list short is deliberate; if something new lands in this file, ask whether it
belongs in Connections instead.
