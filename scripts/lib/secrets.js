/**
 * Shared 1Password plumbing for setup-secrets and push-secrets.
 *
 * The convention (matching the rest of Supa): one 1Password item per
 * environment variable, titled exactly as the variable, with `dev` / `staging`
 * / `production` fields. References in .env.example carry a `{{ENV}}`
 * placeholder that gets filled in per target:
 *
 *     RESEND_API_KEY=op://Crystal/RESEND_API_KEY/{{ENV}}
 */

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..", "..");
const EXAMPLE_PATH = join(ROOT, ".env.example");
const LOCAL_PATH = join(ROOT, ".env.local");

/** Written by `npx convex dev`. Never overwrite or resolve these. */
const CONVEX_OWNED = new Set([
  "CONVEX_DEPLOYMENT",
  "CONVEX_URL",
  "CONVEX_SITE_URL",
]);

/**
 * Listed in .env.example to document where they live, but only ever used by
 * GitHub Actions — never resolved locally. CONVEX_DEPLOY_KEY is the credential
 * used to deploy, so nothing on a laptop or a deployment should hold it.
 */
const CI_ONLY = new Set(["CONVEX_DEPLOY_KEY"]);

/** Parse KEY=value lines, ignoring blanks and comments. */
function parseEnv(contents) {
  const values = new Map();
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;
    values.set(trimmed.slice(0, equals).trim(), trimmed.slice(equals + 1).trim());
  }
  return values;
}

function requireOpCli() {
  try {
    execFileSync("op", ["--version"], { stdio: "ignore" });
  } catch {
    console.error(
      "The 1Password CLI isn't available.\n" +
        "Install it, then turn on Settings → Developer → 'Integrate with 1Password CLI'\n" +
        "in the desktop app, and make sure 1Password is unlocked.",
    );
    process.exit(1);
  }
}

function opRead(reference) {
  return execFileSync("op", ["read", reference], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

/**
 * Resolve every op:// reference in .env.example for one environment.
 *
 * Returns { values, missing, ambiguous }. References are resolved one at a time
 * rather than via `op inject` so a single missing item names itself instead of
 * aborting the run — and so a duplicate item title can be reported as the
 * distinct problem it is.
 */
function resolveTemplate(environment) {
  const template = parseEnv(readFileSync(EXAMPLE_PATH, "utf-8"));
  const values = new Map();
  const missing = [];
  const ambiguous = [];

  for (const [key, rawValue] of template) {
    if (CONVEX_OWNED.has(key) || CI_ONLY.has(key)) continue;

    if (!rawValue.startsWith("op://")) {
      values.set(key, rawValue);
      continue;
    }

    const reference = rawValue.replaceAll("{{ENV}}", environment);
    try {
      values.set(key, opRead(reference));
    } catch (error) {
      const message = String(error.stderr ?? error.message ?? "");
      if (message.includes("More than one item matches")) {
        ambiguous.push({ key, reference });
      } else {
        missing.push({ key, reference });
      }
    }
  }

  return { values, missing, ambiguous };
}

/** Print resolution problems in a form that says what to actually do. */
function reportProblems({ missing, ambiguous }) {
  if (ambiguous.length > 0) {
    console.error("\nDuplicate items in 1Password:\n");
    for (const { key, reference } of ambiguous) {
      const item = reference.split("/")[3];
      console.error(`  ${key}`);
      console.error(
        `    more than one item is titled "${item}" — 1Password can't tell them`,
      );
      console.error(
        `    apart. Rename or delete the one you don't want, then re-run.\n`,
      );
    }
  }

  if (missing.length > 0) {
    console.error("\nMissing from 1Password:\n");
    for (const { key, reference } of missing) {
      const [, , vault, item, field] = reference.split("/");
      console.error(`  ${key}`);
      console.error(
        `    create an item titled "${item}" in vault "${vault}", with a "${field}" field\n`,
      );
    }
  }

  console.error("See docs/SETUP-CHECKLIST.md for where each value comes from.\n");
}

module.exports = {
  ROOT,
  EXAMPLE_PATH,
  LOCAL_PATH,
  CONVEX_OWNED,
  CI_ONLY,
  parseEnv,
  requireOpCli,
  resolveTemplate,
  reportProblems,
};
