#!/usr/bin/env node

/**
 * Push the bootstrap secrets into a Convex deployment.
 *
 *   pnpm push:secrets           # dev  — from .env.local
 *   pnpm push:secrets --prod    # prod — straight from 1Password, never via disk
 *
 * Convex functions read `process.env`, and that environment lives on the
 * deployment, not on your laptop — values sitting in .env.local have not
 * reached the backend. This is the step people forget when sign-in codes stop
 * arriving.
 *
 * Only the keys in PUSHED_KEYS go up. Everything else in .env.local (like
 * CONVEX_DEPLOYMENT, which describes your machine rather than the backend) is
 * left alone.
 */

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const {
  LOCAL_PATH,
  parseEnv,
  reportProblems,
  requireOpCli,
  resolveTemplate,
} = require("./lib/secrets");

/** The only variables the backend itself needs. Service keys go in the portal. */
const PUSHED_KEYS = [
  "SITE_URL",
  "RESEND_API_KEY",
  "AUTH_EMAIL_FROM",
  "JWT_PRIVATE_KEY",
  "JWKS",
];

/**
 * Variables whose value differs between dev and production.
 *
 * Keyed by the name the backend reads; the value is the key to take it from
 * when targeting production. SITE_URL is the only one — pushing localhost to
 * production would mail everyone sign-in links pointing at their own machine.
 */
const PRODUCTION_OVERRIDES = { SITE_URL: "SITE_URL_PRODUCTION" };

/** Never belongs on a deployment: it's the credential used to deploy. */
const NEVER_PUSH = new Set(["CONVEX_DEPLOY_KEY"]);

const isProd = process.argv.includes("--prod");
let source;

if (isProd) {
  // Production secrets are resolved live and held only in memory.
  requireOpCli();
  const { values, missing, ambiguous } = resolveTemplate("production");
  if (missing.length > 0 || ambiguous.length > 0) {
    reportProblems({ missing, ambiguous });
    console.error("Nothing was pushed.\n");
    process.exit(1);
  }
  source = values;
} else {
  if (!existsSync(LOCAL_PATH)) {
    console.error(
      ".env.local not found. Run `pnpm setup:secrets` first — it builds the file\n" +
        "from .env.example using the real values in 1Password.",
    );
    process.exit(1);
  }
  source = parseEnv(readFileSync(LOCAL_PATH, "utf-8"));
}

const target = isProd ? ["--prod"] : [];
let pushed = 0;
const skipped = [];

for (const key of PUSHED_KEYS) {
  if (NEVER_PUSH.has(key)) continue;

  const sourceKey =
    isProd && PRODUCTION_OVERRIDES[key] ? PRODUCTION_OVERRIDES[key] : key;
  const value = source.get ? source.get(sourceKey) : source[sourceKey];

  if (!value) {
    skipped.push(sourceKey);
    continue;
  }

  // `--` stops the CLI reading a value beginning with "-" as a flag, which is
  // exactly what a PEM private key looks like.
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
  console.log(`Skipped (no value found): ${skipped.join(", ")}`);
}
