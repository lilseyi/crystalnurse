# Connections and secrets

Where keys live, and why there are two places instead of one.

## The two places

| | **Settings → Connections** | **Environment variables** |
|---|---|---|
| Where | In the portal, in the database | Convex dashboard / 1Password |
| Who can change it | An owner, from a browser | A developer, from a terminal |
| Needs a deploy | No | Yes |
| Use for | Keys for services the portal talks to | The handful of secrets that make the portal boot |

The default is **Connections**. That's the whole point of it: adding a Google
Sheets key shouldn't require a developer, a terminal, or a deploy.

## Adding a connection

Settings → Connections → Add a connection. Give it a name, paste the value, save.

The value is hidden immediately after saving — the list only ever shows the last
four characters. That isn't a display quirk; the real value is never sent to the
browser at all. To change one, save it again with the same name.

Each connection also gets a **reference name** (`google_sheets_api_key`), which
is how code refers to it. It's derived from the name you typed unless you set
one.

## Using one in code

Connections are read server-side only:

```ts
import { getConnectionValue } from "./connections";

const apiKey = await getConnectionValue(ctx, "google_sheets_api_key");
if (!apiKey) {
  throw new ConvexError({
    code: "NOT_CONFIGURED",
    message: "Add a Google Sheets API key under Settings → Connections.",
  });
}
```

`getConnectionValue` is deliberately a plain function, not a Convex query.
Exporting it as a query would make it callable from the browser, which is
exactly what the masking exists to prevent.

Always fail with a message that names the missing connection and where to add
it. "Not configured" tells the owner nothing.

## When NOT to use a connection

Connections live in the database. Anyone with dashboard access to the Convex
deployment can read them. That's the right trade for keys your team owns and can
rotate. It's the wrong trade for:

- A payment processor's live secret key
- Anything granting access to health records
- Anything where a leak would be a reportable incident

Those go in a **Convex environment variable** (dashboard → Settings →
Environment Variables), read with `process.env.THE_KEY`. Slower to change, and
that's the point.

## The bootstrap secrets

Four values have to exist before the portal can run at all, so they can't live
in the portal:

| Variable | What it does |
|---|---|
| `RESEND_API_KEY` | Sends the six-digit sign-in codes |
| `AUTH_EMAIL_FROM` | The address those codes come from |
| `JWT_PRIVATE_KEY` | Signs sign-in sessions |
| `JWKS` | Verifies them |

Plus `CONVEX_DEPLOY_KEY`, which only GitHub Actions uses to deploy.

They're stored in **1Password**, vault `Crystal Care`, and referenced from
`.env.example` — a committed template holding no actual secrets, only pointers
like `op://Crystal Care/Resend/api-key`.

### Setting them up

```bash
pnpm setup:auth-keys   # generates the signing keys into 1Password (once, ever)
pnpm setup:secrets     # 1Password → .env.local on your machine
pnpm push:secrets      # .env.local → the dev Convex deployment
pnpm push:secrets --prod
```

`push:secrets` is the step people forget. Convex functions read their
environment from the *deployment*, not from your laptop — a value sitting in
`.env.local` has not reached the backend. If sign-in codes stop arriving, check
this first.

`setup:auth-keys` refuses to overwrite an existing key on purpose: replacing the
signing keys signs everyone out.

## Rotating a key

- **A connection**: save it again in the portal. Takes effect immediately.
- **A bootstrap secret**: change it in 1Password, then
  `pnpm setup:secrets && pnpm push:secrets --prod`. Never edit the value in the
  Convex dashboard directly — the next push overwrites it, and 1Password is
  meant to be the record of what the value actually is.
