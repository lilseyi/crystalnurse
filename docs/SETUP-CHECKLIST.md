# Setup checklist

Everything that has to exist outside the code before the portal is live.
Work top to bottom — later steps need values from earlier ones.

## 1. Convex production deployment

Convex dashboard → create a production deployment for this project.

Then Settings → **Deploy keys** → generate one. You need two values from here:

- the **deploy key** (starts `prod:`)
- the **deployment URL** (`https://<name>.convex.cloud`)

Store the deploy key in 1Password: vault `Crystal`, item `Convex`, field
`deploy-key`.

## 2. Resend

For sign-in codes. Sign up, then:

1. **Domains → Add domain → `crystalnurse.com`.** Resend gives you DNS records
   (a DKIM TXT, and usually an MX + TXT for a sending subdomain). Add them
   wherever DNS is managed. Codes will not deliver until this verifies.
2. **API keys → Create.** Store it in 1Password: vault `Crystal`, item `Resend`,
   field `api-key`.

Resend's DKIM record sits alongside the existing Google Workspace records —
it doesn't replace them, and it doesn't affect inbound mail.

## 3. Sign-in signing keys

Already done — `pnpm setup:auth-keys` generated them into 1Password
(`Crystal` → `Auth` → `jwt-private-key`, `jwks`).

Never regenerate these. Replacing them signs everyone out.

## 4. Push the secrets to Convex

```bash
pnpm setup:secrets          # 1Password → .env.local
pnpm push:secrets           # .env.local → dev deployment
pnpm push:secrets --prod    # .env.local → production
```

Convex functions read their environment from the *deployment*, not from your
laptop. If sign-in codes stop arriving, this is the first thing to check.

## 5. GitHub repo secrets and variables

Repo → Settings → Secrets and variables → Actions.

### Secrets — `production` environment

Create the environment first (Settings → Environments → New → `production`).
The three deploy workflows run with `environment: production` and read these.

| Secret | Value | Used by |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | from step 1 | `deploy-convex.yml`, `deploy-admin.yml` |
| `EXPO_PUBLIC_CONVEX_URL` | `https://<name>.convex.cloud` from step 1 | `deploy-admin.yml` |
| `CLOUDFLARE_API_TOKEN` | token with **Cloudflare Pages: Edit** | `deploy-admin.yml` |
| `CLOUDFLARE_ACCOUNT_ID` | from any Cloudflare dashboard URL | `deploy-admin.yml` |

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
