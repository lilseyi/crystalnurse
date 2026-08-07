# Deploying

Everything ships on merge to `main`. Nothing needs a manual deploy.

## What happens on merge

| Workflow | Trigger | Result |
|---|---|---|
| `ci.yml` | every PR | typecheck, lint, test, and both builds |
| `deploy-convex.yml` | merge to main | backend deployed, then pending migrations run |
| `deploy-admin.yml` | merge to main (portal files) | `admin.crystalnurse.com` (EAS Hosting) |
| `deploy-site.yml` | merge to main | `crystalnurse.com` |
| `deploy-ops-update.yml` | disabled | phone-app updates, if native builds ever exist |

`deploy-convex.yml` deliberately has no path filter. A migration can be
triggered by a change anywhere, and a workflow that didn't run looks exactly
like one that passed. It deploys every time; Convex does nothing when nothing
changed.

## Order of operations

The backend deploy does two steps, in this order, and it matters:

1. `npx convex deploy` — schema and functions
2. `npx convex run functions/migrations:runPending --prod`

A migration that ran first could reference a field the deployed schema didn't
have yet. Running second, it always sees the new shape.

Both deploys share a `concurrency` group, so two merges in quick succession
queue rather than race.

## Migrations

Schema changes apply themselves — Convex reconciles `schema.ts` on deploy.
A migration is only for changing **rows that already exist**: filling in a new
field, fixing a format, moving values between fields.

Add one by appending to `MIGRATIONS` in
`apps/convex/functions/migrations.ts`:

```ts
{
  name: "2026-08-10-backfill-client-status",
  run: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    for (const client of clients) {
      if (client.status === undefined) {
        await ctx.db.patch(client._id, { status: "active" });
      }
    }
  },
}
```

Rules:

- **Never edit or reorder one that has already shipped.** Its name is recorded
  permanently; a renamed migration silently never runs, an edited one silently
  never re-runs.
- Name it with the date so the order reads correctly.
- Make it safe to run twice anyway (`if (x === undefined)`). Belt and braces.
- If a migration fails, the whole mutation rolls back — including the record of
  it having run — and the deploy fails loudly. That's intended: a half-applied
  migration marked "done" is much worse.

Check what's applied:

```bash
npx convex run functions/migrations:listApplied --prod
```

### The size limit

All migrations run inside one Convex mutation, which has a time limit. Fine for
thousands of rows, wrong for hundreds of thousands. For a very large table, have
the migration process a batch and record its own progress, so repeated deploys
work through it. Ask Claude Code for that shape explicitly.

## First-time setup

### Convex

```bash
npx convex dev        # creates the dev deployment, writes .env.local
```

For production, create a production deployment in the Convex dashboard, then add
a deploy key (Settings → Deploy keys) as the `CONVEX_DEPLOY_KEY` secret in the
repo's `production` environment.

Push the bootstrap secrets — see [CONNECTIONS.md](./CONNECTIONS.md):

```bash
pnpm setup:auth-keys
pnpm setup:secrets
pnpm push:secrets --prod
```

### admin.crystalnurse.com (EAS Hosting)

The portal is an Expo app, so it's hosted by EAS: SPA routing works natively,
and the same project handles native iOS/Android builds later without a move.

**DNS stays exactly where it is.** A custom domain here is three records added
at Squarespace — the zone is never transferred, and Google Workspace email is
never in the blast radius. (Cloudflare Pages was the original plan and would
have required moving the whole zone, because its free plan supports only a full
setup. That trade is what ruled it out.)

Requires an Expo **Starter** plan or above; custom domains aren't on the free
tier.

1. Repo secrets in the `production` environment:
   - `EXPO_TOKEN` — expo.dev → Account settings → Access tokens
   - `EXPO_PUBLIC_CONVEX_URL` — the production Convex URL
2. expo.dev → the `crystalcare` project → **Hosting** → Custom domain →
   `admin.crystalnurse.com`. It gives you three records:

   | Type | Name | Points to |
   |---|---|---|
   | TXT | `_cf-custom-hostname.admin` | ownership verification |
   | CNAME | `_acme-challenge.admin` | certificate validation |
   | CNAME | `admin` | `origin.expo.app` |

3. Add them at Squarespace (Domains → DNS → Custom records). Add them one at a
   time and refresh between each for a zero-downtime setup; all three at once is
   fine for a domain that isn't serving yet, which `admin` isn't.

Deploys go to the production URL, currently `https://crystalcare.expo.app`,
which the custom domain fronts once it verifies.

Manual deploy, if you ever need one:

```bash
pnpm deploy:admin        # builds and promotes to production
```

### crystalnurse.com (GitHub Pages)

Already set up. Repo Settings → Pages → Source: GitHub Actions. Once DNS points
at Pages, set the repo variable `CN_DEPLOY_TARGET=custom-domain` so the site
builds at the domain root instead of under `/crystalnurse/`.

## Rolling back

- **Portal**: EAS keeps every deployment — promote a previous one from
  expo.dev → Hosting → Deployments. Instant, no rebuild.
- **Backend**: revert the commit and merge. There is no undo for a migration
  that has already run; write a new migration that reverses it.
- **Marketing site**: re-run an earlier `deploy-site.yml` run.
