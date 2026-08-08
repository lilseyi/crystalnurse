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

const { spawnSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { generateKeyPairSync } = require("node:crypto");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const LOCAL_ENV = join(ROOT, ".env.local");
const SITE_URL = process.env.SITE_URL ?? "http://localhost:8081";

/**
 * The Convex CLI picks its target deployment from the environment BEFORE it
 * looks at .env.local. So an exported CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT —
 * left over from deploying production, say — silently wins over the file this
 * script validated, and the guard below would be checking one deployment while
 * writing to another. Given what this script sets, that means turning the
 * `000000` sign-in bypass on in production.
 *
 * Stripping the selectors from the child environment forces the CLI to resolve
 * from .env.local: the same source the guard checked.
 *
 * This list is what's known today, so `convexEnvSet` also verifies after each
 * write that Convex reported the deployment we expected — that check doesn't
 * depend on having enumerated every selector correctly.
 */
const CHILD_ENV = { ...process.env };
for (const selector of [
  "CONVEX_DEPLOY_KEY",
  "CONVEX_DEPLOYMENT",
  // Self-hosted backends are selected by their own pair, and they override just
  // the same. Nothing here uses one, but the cost of covering it is a line and
  // the failure is identical.
  "CONVEX_SELF_HOSTED_URL",
  "CONVEX_SELF_HOSTED_ADMIN_KEY",
]) {
  delete CHILD_ENV[selector];
}

function convexEnvSet(name, value, expectedDeployment) {
  // `--` stops the CLI reading a value starting with "-" as a flag, which is
  // exactly what a PEM private key looks like.
  const result = spawnSync("npx", ["convex", "env", "set", "--", name, value], {
    cwd: ROOT,
    env: CHILD_ENV,
    encoding: "utf-8",
  });

  // The CLI confirms which deployment it wrote to on STDERR, not stdout —
  // "Successfully set X (on dev deployment <name>)". Read both so this check
  // doesn't depend on which stream it happens to use.
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.status !== 0) {
    console.error(`\nConvex rejected \`env set ${name}\`:\n${output.trim()}`);
    process.exit(1);
  }

  // Belt and braces: confirm it wrote where we validated, rather than trusting
  // that stripping the environment was sufficient.
  if (!output.includes(expectedDeployment)) {
    console.error(
      `\nStopping: expected to write to "${expectedDeployment}", but Convex reported:\n  ${output.trim() || "(no deployment named in its output)"}`,
    );
    process.exit(1);
  }

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

// e.g. "dev:formal-mastiff-577 # team: ..." → "formal-mastiff-577"
const DEPLOYMENT_NAME = deployment.trim().split("#")[0].trim().split(":")[1] ?? "";
if (!DEPLOYMENT_NAME) {
  console.error(`Couldn't read a deployment name from "${deployment.trim()}".`);
  process.exit(1);
}

console.log(`Configuring ${DEPLOYMENT_NAME}\n`);

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
  DEPLOYMENT_NAME,
);
convexEnvSet(
  "JWKS",
  JSON.stringify({
    keys: [{ use: "sig", alg: "RS256", ...publicKey.export({ format: "jwk" }) }],
  }),
  DEPLOYMENT_NAME,
);

// Where sign-in links point back to.
convexEnvSet("SITE_URL", SITE_URL, DEPLOYMENT_NAME);

// With this on, the sign-in code is always 000000 and no email is sent — so no
// Resend account is needed to work on this locally. Production refuses to
// honour it regardless (see `productionIdentifier` in apps/convex/auth.ts).
convexEnvSet("DEV_OTP_BYPASS", "true", DEPLOYMENT_NAME);

console.log(`
Done. Your development backend is ready.

  pnpm dev          then open http://localhost:8081

Sign in with any @crystalnurse.com address and the code 000000. The first
person to sign in to an empty backend is offered ownership — on your own
development copy, that's you.
`);
