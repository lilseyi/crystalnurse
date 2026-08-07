#!/usr/bin/env node

/**
 * The portal is a single-page app: the server only has index.html, but the
 * browser can be asked for /settings directly (a bookmark, a refresh, a pasted
 * link). Without a fallback that's a 404.
 *
 * Both hosts we might use resolve this the same way — Cloudflare Pages serves
 * 404.html for unmatched paths, and so does GitHub Pages — so copying
 * index.html over 404.html turns the miss into the app, which then reads the
 * URL and routes to the right page itself.
 *
 * Runs automatically after `pnpm --filter @crystalcare/ops build:web`.
 */

const { copyFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const dist = join(__dirname, "..", "dist");
const index = join(dist, "index.html");

if (!existsSync(index)) {
  console.error(
    "spa-fallback: dist/index.html not found — did `expo export` succeed?",
  );
  process.exit(1);
}

copyFileSync(index, join(dist, "404.html"));
console.log("spa-fallback: wrote dist/404.html");
