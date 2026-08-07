# Working on Crystal Care

Instructions for Claude Code (and any other AI agent) working in this repo.

## Who you're working with

**Assume the person asking is not a developer.** They run a home-care agency.
They will not read a diff, will not know what a branch is, and should never need
to. Requests will sound like *"update the site with these changes"*, *"add a
page for X"*, or *"make it live"* — not like tickets.

That changes how you behave:

- **Explain in outcomes, not implementation.** "You'll see a Clients tab with a
  search box" beats "I added a paginated query with a by_name index."
- **Don't ask them to choose between technical options** they have no basis to
  decide. Pick the sane default, say what you picked in one line, and move on.
  Ask only when the answer depends on how their business actually works — how
  they track something, what the statuses are, who should see it.
- **Never leave them at a command line puzzle.** If something needs a terminal
  command, give the exact command to paste, and say what it will do.
- **Never use jargon as an answer.** No "the CI is red", "rebase onto main",
  "the migration is pending". Say what happened and what you're doing about it.
- **Say when something is risky** — losing data, exposing information, costing
  money — in plain words, before doing it.
- **Don't report success you haven't checked.** "I've made the change and looked
  at the page — it works" is worth something. "Done!" is not.

## How work gets shipped — follow this every time

There are two distinct moments, and they are almost never the same message:

1. **"Change this"** → build it and open a pull request. Do **not** merge.
2. **"Make it live"** → merge that pull request.

Nothing reaches `crystalnurse.com` or `admin.crystalnurse.com` until step 2,
because merging to `main` is what triggers the deploys.

### When they ask for a change

1. **Never commit to `main`.** Create a branch —
   `git checkout -b <short-description>`.
2. Make the change. Small, focused commits with messages that say *why*.
3. **Check it yourself before showing them.** Run `pnpm typecheck`, `pnpm lint`
   and `pnpm test`. For anything visible, actually open it — `pnpm dev` for the
   portal, `pnpm dev:site` for the marketing site — and look at the page.
   Turbo caches results, so a "pass" you didn't watch run may be a replayed log;
   if something seems too fast to be real, re-run it with `--force`.
4. Push the branch and open a pull request (`gh pr create`).
5. **Review your own diff as if someone else wrote it.** Read every changed
   line and ask: does this do what was asked and nothing else? Does it break
   anything that already worked? Did I leave debugging code, a hardcoded value,
   or a half-finished edit? Fix what you find, and push the fixes to the same
   branch.
6. Tell them, in plain words, what changed and what to look at. Give them the
   pull request link and the preview link if there is one.

### When they say to make it live

Only then: merge the pull request to `main`. Deploys run automatically —
backend and data migrations, the admin portal, the marketing site. Watch them
finish (`gh run watch`), and tell them when it's actually live rather than when
the merge went through. If a deploy fails, say so plainly and fix it.

### Words that mean "make it live"

"Make it live", "publish it", "ship it", "push it out", "put it up", "go ahead".

If it's genuinely ambiguous, ask — one short question. **When in doubt, open the
pull request and don't merge.** An unmerged change costs a message; a merged
mistake is on the public site for their clients to see.

## What this repo is

A pnpm monorepo with three parts:

| Path             | What it is                          | Where it ends up          |
| ---------------- | ----------------------------------- | ------------------------- |
| `apps/site`      | Public marketing site (Astro)       | `crystalnurse.com`        |
| `apps/ops`       | Admin portal (Expo Router → web)    | `admin.crystalnurse.com`  |
| `apps/convex`    | Backend: database + functions       | Convex deployment         |
| `packages/shared`| Constants used by both sides        | —                         |

Built on the **Supa Framework** (`@supa-media/*`, from
`github.com/Supa-Media/supa-framework`, local checkout at `~/Code/supa-framework`).

## The portal is deliberately empty

`apps/ops` has exactly two pages — a Dashboard that explains how to add things,
and Settings. There is **no business data in the schema**, on purpose. The owner
adds sections by asking for them.

### Adding a section — the standard shape

Adding "Clients" (or shifts, or mileage, or anything else) means four files.
Follow this shape every time; consistency is what keeps it approachable.

1. **`packages/shared/src/index.ts`** — any fixed lists of options
   (statuses, categories) plus their display labels. Both sides import these so
   they can't disagree.
2. **`apps/convex/schema.ts`** — the table and its indexes.
3. **`apps/convex/functions/<thing>.ts`** — `list` / `get` queries and
   `create` / `update` / `remove` mutations.
   **Every function starts with `requireMember(ctx)` (reads) or
   `requireWriter(ctx)` (writes).** No exceptions — a function without one is a
   public function on a public URL.
4. **`apps/ops/app/(app)/<thing>.tsx`** — the page, plus one line in
   `NAV_ITEMS` in `apps/ops/components/AdminShell.tsx` to put it in the sidebar.

Build pages from `apps/ops/components/ui.tsx` (`Page`, `PageTitle`, `Card`,
`Row`, `Button`, `TextField`, `ChipSelect`, …). If you need a new primitive, add
it there rather than styling inside a page.

### Changing data that already exists

Schema changes apply themselves on deploy. Changing **existing rows** — filling
in a new field, fixing a format — needs a migration: append an entry to
`MIGRATIONS` in `apps/convex/functions/migrations.ts`. It runs automatically on
merge to main. Never edit or reorder a migration that has already shipped.

## Rules that matter

### Authorization is not optional

Convex deployments are reachable by anyone who knows the URL, and email OTP will
issue a code to any address. So:

- Sign-in is restricted to the domains in `ALLOWED_EMAIL_DOMAINS`
  (`packages/shared`), checked server-side on **every request** in
  `requireMember`, not just at sign-up.
- Access requires a `members` row. Being signed in is not enough.
- Client-side checks are for error messages only. The server check is the real
  one. Always write both.

### Secrets

- Keys for outside services go in the portal: **Settings → Connections**, read
  server-side via `getConnectionValue(ctx, "the_key")`. That's the whole point —
  the owner shouldn't need a developer to connect something.
- **Never return a secret value to the browser.** `connections.list` masks them.
- Only the handful of secrets needed to *boot* the app live in env vars
  (`.env.example` → 1Password). Don't add to that list casually.
- Anything catastrophic if leaked (a payment processor's live key, anything
  touching health records) belongs in a Convex environment variable, not the
  connections table. See `docs/CONNECTIONS.md`.

### Patient information (PHI) — read before modelling it

This is a home-care agency. Names, addresses, conditions, and even the *fact*
that someone receives care are protected health information. Putting them in
this database changes what the law requires of the whole system.

**Before adding any table that identifies a person receiving care, stop and read
`docs/architecture/ADR-001-phi-boundary.md`, and tell the owner what it means.**
Staff records, schedules and business operations are fine. Patient records are a
different decision, and it's theirs to make knowingly.

### Native dependencies

`apps/ops` builds for web today and could build for iOS/Android later. Don't add
a web-only React UI library to it — it pulls a second React into the lockfile
and breaks native rendering in ways CI can't see. Keep new dependencies out
unless there's no alternative; the UI kit in `components/ui.tsx` is
dependency-free for this reason.

## Verifying your work

Convex's generated types don't exist until a deployment is configured, so
typecheck fails on a fresh clone until `npx convex dev` has run once.

```bash
pnpm dev                     # Convex + the portal together
pnpm typecheck               # all packages
pnpm build:ops-web           # the build CI runs — catches what typecheck won't
npx convex run functions/migrations:runPending
```

Prefer checking a change in the browser over assuming it works. `pnpm dev` serves
the portal at http://localhost:8081.

## Git

The full workflow is under "How work gets shipped" above — read that, it's the
part that matters most. In short:

- **Never commit or push to `main`.** Branch, then open a pull request.
- Small, focused commits with messages that say *why*.
- Merge only when they've said they want the change live.
- Merging to `main` deploys: `deploy.yml` runs the backend and its data
  migrations, *then* the admin portal (in that order, on purpose — a portal
  published before the backend could call a function that isn't live yet); the
  marketing site goes via `deploy-site.yml`.
