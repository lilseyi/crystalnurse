# Crystal Care

Two things live in this repo:

- **[crystalnurse.com](https://crystalnurse.com)** — the public site for Crystal
  Care Nursing, LLC. Skilled and non-skilled home health care in Potomac,
  Maryland and Washington, DC.
- **[admin.crystalnurse.com](https://admin.crystalnurse.com)** — the internal
  admin portal. Working, and deliberately empty: it's built to be filled in.

## If you're here to build out the portal

Start with **[docs/BUILDING-THE-PORTAL.md](./docs/BUILDING-THE-PORTAL.md)**.
It's written for someone who runs the agency, not someone who writes software.

The short version: open this folder in Claude Code and describe what you want.

```bash
cd ~/Code/crystalnurse
claude
```

> Add a Clients section. Each client has a name, a phone number, an address, who
> referred them, and a status of prospective, active, or discharged.

## Layout

```
apps/site      Marketing site        Astro + Tailwind      → crystalnurse.com
apps/ops       Admin portal          Expo Router → web     → admin.crystalnurse.com (EAS Hosting)
apps/convex    Backend               Convex (database + functions)
packages/shared  Constants both sides import
```

Built on the [Supa Framework](https://github.com/Supa-Media/supa-framework)
(`@supa-media/*`), which supplies auth, CI, and the app shell.

## Running it locally

Needs Node 22+ and pnpm 9+. Nothing else — no shared credentials, no access to
anyone else's Convex account, no 1Password.

```bash
# GitHub Packages needs a token even for public packages, which is where
# @supa-media/* live. Any GitHub account's token works; it grants nothing.
gh auth login
gh auth refresh -s read:packages
export GITHUB_TOKEN=$(gh auth token)

pnpm install
npx convex dev     # creates YOUR OWN backend (any Convex account) — leave running
pnpm setup:dev     # configures it: signing keys, and code 000000 for sign-in
pnpm dev           # → http://localhost:8081
pnpm dev:site      # the marketing site → http://localhost:4321
```

Sign in with any `@crystalnurse.com` address and the code `000000`. Your backend
starts empty, so you'll be offered ownership — after that it's invite-only.

`pnpm setup:dev` refuses to run against production, since it turns on the
sign-in bypass. Production ignores that bypass regardless — see
`productionIdentifier` in `apps/convex/auth.ts`.

| Command | What it does |
|---|---|
| `pnpm dev` | Convex + the portal |
| `pnpm dev:site` | just the marketing site |
| `pnpm typecheck` | typecheck everything |
| `pnpm build:ops-web` | build the portal (what CI runs) |
| `pnpm setup:secrets` | 1Password → `.env.local` |
| `pnpm push:secrets` | `.env.local` → the Convex deployment |

## Who can sign in

Two locks, both required: the address ends in **@crystalnurse.com**, and it's
been added under Settings → Who has access. Both are enforced on the server on
every request, not just at sign-up.

## Deploying

Everything ships on merge to `main` — backend and data migrations, the portal,
and the marketing site. See [docs/DEPLOYING.md](./docs/DEPLOYING.md).

## Before you store patient information

Client names and addresses are protected health information for a home health
agency, and this stack isn't currently set up to hold it. That's a deliberate
boundary, not an oversight — read
[ADR-001](./docs/architecture/ADR-001-phi-boundary.md) before crossing it.

## Docs

| | |
|---|---|
| [SETUP-CHECKLIST.md](./docs/SETUP-CHECKLIST.md) | Everything to configure before it's live |
| [BUILDING-THE-PORTAL.md](./docs/BUILDING-THE-PORTAL.md) | How to add sections, for a non-developer |
| [CONNECTIONS.md](./docs/CONNECTIONS.md) | Where keys and secrets live |
| [DEPLOYING.md](./docs/DEPLOYING.md) | Deploys, migrations, first-time setup |
| [ADR-001](./docs/architecture/ADR-001-phi-boundary.md) | The PHI boundary |
| [CLAUDE.md](./CLAUDE.md) | Instructions for AI agents working here |

## Marketing site notes

- Site-wide info (phone, email, addresses, nav, footer) is in
  `apps/site/src/lib/site.ts`. Change it once, it updates everywhere.
- Page copy is in `apps/site/src/pages/*.astro`; images in `apps/site/public/`.
- The contact form posts to Formspree; the careers page embeds a Tally form.
  Both IDs are in `site.ts`.
- Type is Fraunces + Figtree; the palette lives in
  `apps/site/tailwind.config.mjs` and is mirrored in `apps/ops/theme.ts` so the
  portal and the site match.
