#!/usr/bin/env node

/**
 * Make deep links work on Cloudflare Pages.
 *
 * The portal is a single-page app: the server only really has index.html, but a
 * browser can ask for /settings directly (a bookmark, a refresh, a pasted
 * link). Without help that's a miss.
 *
 * `_redirects` rewrites anything unmatched to the app and returns 200. Files
 * that exist on disk are served before this rule is consulted, so assets are
 * unaffected.
 *
 * ── Do NOT add a 404.html here ─────────────────────────────────────────────
 * Cloudflare Pages infers the project type from which files are present: an
 * index.html with NO 404.html means "single-page app", while the presence of a
 * 404.html means "static site with custom error pages" and takes precedence
 * over the rewrite above. Shipping both — which this script used to do, to also
 * satisfy GitHub Pages — silently put every deep link back on a 404 status. It
 * still rendered the app, so it looked fine in a browser while reporting an
 * error to crawlers, monitors and anything checking status codes.
 *
 * The admin portal is served from Cloudflare Pages only (the marketing site is
 * the one on GitHub Pages), so there is nothing to trade off here.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Runs automatically after `pnpm --filter @crystalcare/ops build:web`.
 */

const { existsSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const dist = join(__dirname, "..", "dist");
const index = join(dist, "index.html");

if (!existsSync(index)) {
  console.error(
    "spa-fallback: dist/index.html not found — did `expo export` succeed?",
  );
  process.exit(1);
}

writeFileSync(join(dist, "_redirects"), "/*    /index.html    200\n");

// Clear out a 404.html left by an earlier build, which would otherwise switch
// Pages back into static-site mode.
const notFound = join(dist, "404.html");
if (existsSync(notFound)) rmSync(notFound);

console.log("spa-fallback: wrote dist/_redirects (no 404.html — SPA mode)");
