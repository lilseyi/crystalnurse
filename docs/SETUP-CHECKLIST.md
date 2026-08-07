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

**Done** — the `production` environment exists and holds all three deploy
secrets (`CONVEX_DEPLOY_KEY`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_TOKEN`), each
sourced from 1Password.

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

That workflow needs two tokens that it can't sync itself — they're the
credentials it needs in order to run. **Both are seeded**, as
*repository-level* secrets (not environment-scoped: the caller job binds no
environment, so it can only read repo-level secrets):

| Secret | What | Note |
|---|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password service account, read-only, scoped to `Crystal` only | ✅ |
| `GH_ADMIN_TOKEN` | Fine-grained PAT, `lilseyi/crystalnurse` only, **Environments: Read and write** | ✅ |

The permission that matters on the PAT is **Environments**, not **Secrets**.
"Secrets" governs *repository* secrets; the sync writes *environment* secrets
(`gh secret set --env production`), which is a different permission entirely.
Getting this wrong fails at write time with a confusing 403.

Rotating either one is manual — nothing can sync them.

### Secrets — `production` environment

| Secret | Value | Used by |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | 1Password → `CONVEX_DEPLOY_KEY` → `production` | `deploy-convex.yml`, `deploy-admin.yml` |
| `EXPO_PUBLIC_CONVEX_URL` | `https://accurate-gull-766.convex.cloud` | `deploy-admin.yml` |
| `EXPO_TOKEN` | 1Password → `EXPO_TOKEN` → `production` | `deploy-admin.yml` |

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

## 6. admin.crystalnurse.com (EAS Hosting)

The portal is already deployed and live at `https://crystalcare.expo.app`.
Pointing the custom domain at it does **not** move DNS — the zone stays at
Squarespace and Google Workspace email is never touched.

Needs an Expo **Starter** plan or above. The `lilseyi` account is already on
Starter (active), so the custom domain is included at no extra cost.

1. expo.dev → the `crystalcare` project → **Hosting** → Custom domain →
   `admin.crystalnurse.com`.
2. Add the three records it gives you at Squarespace → Domains → DNS →
   Custom records:

   | Type | Name | Points to |
   |---|---|---|
   | TXT | `_cf-custom-hostname.admin` | ownership verification |
   | CNAME | `_acme-challenge.admin` | certificate validation |
   | CNAME | `admin` | `origin.expo.app` |

3. Wait for it to verify; the certificate issues automatically.

Nothing else in the zone changes. See [DEPLOYING.md](./DEPLOYING.md).

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
