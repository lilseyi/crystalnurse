# Deploying

Everything ships on merge to `main`. Nothing needs a manual deploy.

## What happens on merge

| Workflow | Trigger | Result |
|---|---|---|
| `ci.yml` | every PR | typecheck, lint, test, and both builds |
| `deploy-convex.yml` | merge to main | backend deployed, then pending migrations run |
| `deploy-admin.yml` | merge to main (portal files) | `admin.crystalnurse.com` |
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

### admin.crystalnurse.com (Cloudflare Pages)

**Prerequisite: `crystalnurse.com` must be a Cloudflare zone.**

This is not optional and not a preference. A Pages custom domain requires an
active Cloudflare zone — pointing a CNAME at `*.pages.dev` from another DNS
provider returns [Error 1001](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1001/)
("a non-Cloudflare domain cannot CNAME to a Cloudflare domain"). The two setups
that would avoid moving the zone are both out of reach on a free plan:

| Setup | Free | Pro | Business | Enterprise |
|---|---|---|---|---|
| Full (whole zone on Cloudflare) | ✅ | ✅ | ✅ | ✅ |
| Partial / CNAME-only | ❌ | ❌ | ✅ | ✅ |
| Subdomain-only zone (`admin.` alone) | ❌ | ❌ | ❌ | ✅ |

So: either move the whole zone, or host the portal somewhere that works with
external DNS (see "Not using Cloudflare" below).

**The zone move — the careful order.** `crystalnurse.com` currently carries live
Google Workspace email. Getting MX wrong takes down mail for the business, so:

The domain is registered at **Squarespace** (which absorbed Google Domains —
the old nameservers were `ns-cloud-*.googledomains.com`). DNSSEC is off, which
removes the usual zone-move footgun; if that ever changes, disable DNSSEC at the
registrar *before* switching nameservers or the domain stops resolving entirely.

1. Cloudflare → Add a domain → `crystalnurse.com`. Its scan imports existing
   records automatically.
2. **Count the records before touching the registrar.** The scan is not
   exhaustive — Cloudflare says so in its own banner, and in practice it missed
   two records here. Squarespace had 15; the scan imported 13. The two it
   dropped were the Google Workspace verification CNAMEs:

   | Type | Name | Content |
   |---|---|---|
   | CNAME | `vzrr7quaaqdh` | `gv-n3ptuyenuje5g2.dv.googlehosted.com` |
   | CNAME | `jwwan234ewld` | `gv-jkrkjuvp7psh4h.dv.googlehosted.com` |

   Read these off `dig`, never off a screenshot — the second contains `jkr`,
   which is easy to read back as `jrk`. Losing them lets Google un-verify domain
   ownership, which puts Workspace admin and mail at risk.

   Also confirm: five Google MX records (`aspmx.l.google.com`, `alt1`–`alt4`),
   the SPF TXT (`v=spf1 include:_spf.google.com ~all`), the DKIM TXT at
   `google._domainkey`, four apex A records for GitHub Pages
   (`185.199.108–111.153`), and `www` → `lilseyi.github.io`.

3. Set the apex A records, `www`, and `_domainconnect` to **DNS only** (grey
   cloud). Cloudflare imports them Proxied by default and flags them with a
   warning icon, which is the clue. GitHub Pages renews its TLS certificate by
   HTTP validation; a proxied record means that request never reaches GitHub, so
   the certificate eventually fails to renew and the site starts serving TLS
   errors. With SSL mode set to Flexible you get a redirect loop immediately
   instead. MX and TXT records aren't proxyable and need no change.
4. Only now change the nameservers — Squarespace → Domain → **Domain
   Nameservers** — to the two shown on the Cloudflare zone's Overview page.
5. Once the zone is active, send yourself a test email and load
   `https://crystalnurse.com` before moving on. Squarespace TTLs are 4 hours, so
   allow time before concluding something is broken.

The `admin.crystalnurse.com` record is the exception to step 3: Cloudflare
creates it when you add the Pages custom domain, and it *should* stay proxied.

**Then the Pages project:**

1. Cloudflare → Workers & Pages → Create → Pages → **Direct upload**, named
   `crystalcare-admin`.
2. Repo secrets in the `production` environment:
   - `CLOUDFLARE_API_TOKEN` — a token with **Cloudflare Pages: Edit**
   - `CLOUDFLARE_ACCOUNT_ID`
   - `EXPO_PUBLIC_CONVEX_URL` — the production Convex URL
3. Pages project → Custom domains → add `admin.crystalnurse.com`. Cloudflare
   creates the DNS record and issues the certificate itself.

#### Not using Cloudflare

If moving the zone isn't wanted, host the portal on Netlify or Vercel instead —
both take a CNAME from external DNS and issue a certificate, so DNS stays at
Google. Replace the "Publish to Cloudflare Pages" step in `deploy-admin.yml`
with that provider's deploy action; everything else — the build, the SPA
fallback, `EXPO_PUBLIC_CONVEX_URL` — is unchanged.

`EXPO_PUBLIC_CONVEX_URL` is baked into the JavaScript at build time, not read at
runtime. A missing value ships a portal that silently can't reach the backend,
so the workflow checks for it before building.

### crystalnurse.com (GitHub Pages)

Already set up. Repo Settings → Pages → Source: GitHub Actions. Once DNS points
at Pages, set the repo variable `CN_DEPLOY_TARGET=custom-domain` so the site
builds at the domain root instead of under `/crystalnurse/`.

## Rolling back

- **Portal**: Cloudflare Pages keeps every deployment — promote a previous one
  from the dashboard. Instant, no rebuild.
- **Backend**: revert the commit and merge. There is no undo for a migration
  that has already run; write a new migration that reverses it.
- **Marketing site**: re-run an earlier `deploy-site.yml` run.
