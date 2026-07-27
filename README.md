# Crystal Care Nursing

Marketing site for **Crystal Care Nursing, LLC** — skilled and non-skilled home
health care serving Potomac, Maryland and Washington, DC.

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com),
statically generated, and deployed free on **GitHub Pages**. It replaces the
previous Webflow site.

## Pages

Home · About · Services · Insurance · Refer · Careers · Resources · Contact

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:4321/crystalnurse
```

| Command        | Action                                   |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Start the local dev server               |
| `pnpm build`   | Build the static site to `dist/`         |
| `pnpm preview` | Preview the production build locally     |

## Editing content

- **Site-wide info** (phone, email, addresses, nav, footer links) lives in one
  file: `src/lib/site.ts`. Change it once, it updates everywhere.
- **Page copy** lives in the matching file under `src/pages/*.astro`.
- **Images** live in `public/images/` and `public/icons/`.

## Two things to finish before going live

1. **Contact form → your inbox.** The Contact form posts to
   [Formspree](https://formspree.io). Create a free form, then set your form ID
   in `src/lib/site.ts`:

   ```ts
   formspreeId: "yourFormId",  // from https://formspree.io/f/XXXXXXXX
   ```

   Point the Formspree form's notification email at `contact@crystalnurse.com`.
   Until this is set, the form will not deliver messages.

2. **Careers application.** The Careers page embeds the existing Tally
   application form (`https://tally.so/r/wdPbbo`). If that form changes, update
   `applyUrl` in `src/lib/site.ts`.

## Deploy (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages.

**One-time setup in the GitHub repo:**

1. Settings → Pages → **Source: GitHub Actions**.
2. Push to `main`. The site publishes at
   `https://<user>.github.io/crystalnurse/`.

**Custom domain (`crystalnurse.com`):**

1. In your DNS, point the domain at GitHub Pages
   ([apex + `www` records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).
2. In the repo, add a **repository variable** `CN_DEPLOY_TARGET` = `custom-domain`
   (Settings → Secrets and variables → Actions → Variables). This makes the site
   build at the domain root instead of the `/crystalnurse/` subpath.
3. `public/CNAME` (already committed, containing `crystalnurse.com`) tells GitHub
   Pages the domain. Re-run the deploy.

The site works in both modes — the build reads `CN_DEPLOY_TARGET` and adjusts the
base path and canonical URLs automatically (see `astro.config.mjs` and
`src/lib/asset.ts`).

## Design notes

- **Type:** Fraunces (display) + Figtree (body), via Google Fonts.
- **Signature:** a heartbeat/pulse line motif (nursing = monitoring vitals) that
  draws in on the hero and repeats as a quiet divider.
- **Palette + tokens:** `tailwind.config.mjs` — deep teal-blue on warm paper with
  a single warm-apricot accent.

Images were extracted from the original Webflow site. The unfinished
placeholder "tab" section and copy typos from the old site were removed/fixed.
