#!/usr/bin/env node

/**
 * Configure your own Convex dev deployment so the portal works locally.
 *
 *   npx convex dev      # once, to create your deployment (any Convex account)
 *   pnpm setup:dev      # then this
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * A Convex deployment reads its configuration from the deployment itself, not
 * from your laptop, so a brand-new one has nothing set and sign-in simply fails
 * with "Couldn't send your code". The four values below are all it needs.
 *
 * None of them are shared secrets. The signing keys are generated here and
 * belong to your deployment alone — they don't need to match anyone else's, and
 * nothing is read from 1Password. That's deliberate: working on this project
 * shouldn't require access to production credentials, or to anyone else's
 * Convex account.
 *
 * Safe to re-run. It generates a new key pair each time, which invalidates
 * access tokens already issued — but not sessions, which are backed by database
 * rows and simply refresh against the new key. In practice you stay signed in.
 */

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { generateKeyPairSync } = require("node:crypto");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const LOCAL_ENV = join(ROOT, ".env.local");
const SITE_URL = process.env.SITE_URL ?? "http://localhost:8081";

function convexEnvSet(name, value) {
  // `--` stops the CLI reading a value starting with "-" as a flag, which is
  // exactly what a PEM private key looks like.
  execFileSync("npx", ["convex", "env", "set", "--", name, value], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log(`  set ${name}`);
}

// ── Refuse to touch production ────────────────────────────────────────────
// This turns on the sign-in bypass, which makes every code `000000`. On a
// production deployment that would let anyone with an allowed email address
// walk straight in, so check what we're pointed at before writing anything.
if (!existsSync(LOCAL_ENV)) {
  console.error(
    "No .env.local found — run `npx convex dev` first.\n" +
      "It creates your own development backend and writes its address here.",
  );
  process.exit(1);
}

const deployment =
  /^CONVEX_DEPLOYMENT=(.*)$/m.exec(readFileSync(LOCAL_ENV, "utf-8"))?.[1] ?? "";

if (!deployment.trim()) {
  console.error(
    "CONVEX_DEPLOYMENT isn't set in .env.local — run `npx convex dev` first.",
  );
  process.exit(1);
}

if (!/^(dev|local):/.test(deployment.trim())) {
  console.error(
    `Refusing to run: CONVEX_DEPLOYMENT is "${deployment.trim()}".\n` +
      "This script enables the development sign-in bypass (every code becomes\n" +
      "000000) and is only ever safe on a dev deployment.",
  );
  process.exit(1);
}

console.log(`Configuring ${deployment.trim().split("#")[0].trim()}\n`);

// ── Signing keys ──────────────────────────────────────────────────────────
// RS256, which is what @convex-dev/auth verifies with. Newlines are collapsed
// to spaces because Convex environment variables are single-line; the PEM
// parser accepts either form.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

convexEnvSet(
  "JWT_PRIVATE_KEY",
  privateKey.export({ type: "pkcs8", format: "pem" }).toString().trimEnd()
    .replace(/\n/g, " "),
);
convexEnvSet(
  "JWKS",
  JSON.stringify({
    keys: [{ use: "sig", alg: "RS256", ...publicKey.export({ format: "jwk" }) }],
  }),
);

// Where sign-in links point back to.
convexEnvSet("SITE_URL", SITE_URL);

// With this on, the sign-in code is always 000000 and no email is sent — so no
// Resend account is needed to work on this locally. Production refuses to
// honour it regardless (see `productionIdentifier` in apps/convex/auth.ts).
convexEnvSet("DEV_OTP_BYPASS", "true");

console.log(`
Done. Your development backend is ready.

  pnpm dev          then open http://localhost:8081

Sign in with any @crystalnurse.com address and the code 000000. The first
person to sign in to an empty backend is offered ownership — on your own
development copy, that's you.
`);
