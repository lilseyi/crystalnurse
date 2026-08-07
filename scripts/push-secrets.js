#!/usr/bin/env node

/**
 * Push the bootstrap secrets from .env.local into the Convex deployment.
 *
 *   pnpm push:secrets              # the dev deployment
 *   pnpm push:secrets --prod       # production
 *
 * Convex functions read `process.env`, and that environment lives on the
 * deployment, not on your laptop — so values in .env.local don't reach the
 * backend until they're pushed. This is the step people forget when sign-in
 * codes stop arriving.
 *
 * Only the keys in PUSHED_KEYS go up. Anything else in .env.local (like
 * CONVEX_DEPLOYMENT, which is about your machine, not the backend) is skipped.
 */

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

/** The only variables the backend itself needs. Service keys go in the portal. */
const PUSHED_KEYS = ["RESEND_API_KEY", "AUTH_EMAIL_FROM", "JWT_PRIVATE_KEY", "JWKS"];

const envPath = join(__dirname, "..", ".env.local");

if (!existsSync(envPath)) {
  console.error(
    ".env.local not found. Run `pnpm setup:secrets` first — it builds the file\n" +
      "from .env.example by pulling the real values out of 1Password.",
  );
  process.exit(1);
}

/** Minimal .env parser: KEY=value, ignoring blanks, comments and quotes. */
function parseEnv(contents) {
  const values = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = parseEnv(readFileSync(envPath, "utf-8"));
const isProd = process.argv.includes("--prod");
const target = isProd ? ["--prod"] : [];

let pushed = 0;
const skipped = [];

for (const key of PUSHED_KEYS) {
  const value = env[key];
  if (!value) {
    skipped.push(key);
    continue;
  }

  // `--` stops the CLI reading a value that begins with "-" as a flag, which is
  // exactly what happens with a PEM key.
  execFileSync("npx", ["convex", "env", "set", ...target, "--", key, value], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log(`  set ${key}`);
  pushed += 1;
}

console.log(
  `\nPushed ${pushed} value(s) to the ${isProd ? "production" : "dev"} deployment.`,
);
if (skipped.length > 0) {
  console.log(`Skipped (not set in .env.local): ${skipped.join(", ")}`);
}
