#!/usr/bin/env node

/**
 * Create the portal's sign-in signing keys and store them in 1Password.
 *
 *   pnpm setup:auth-keys
 *
 * These let the backend prove a sign-in session is genuine. They're generated,
 * never chosen — nobody should type or invent them.
 *
 * A SEPARATE key pair is generated per environment. Sharing one pair between
 * dev and production would mean a session minted against a dev deployment is
 * accepted by production, so anyone who could reach the dev backend could forge
 * a production login.
 *
 * Follows the Supa 1Password convention: one item per environment variable,
 * titled exactly as the variable, with `dev` / `production` fields.
 *
 * Safe to re-run: an item that already exists is left completely alone, because
 * replacing these keys signs everyone out.
 */

const { execFileSync } = require("node:child_process");
const { generateKeyPairSync } = require("node:crypto");

const VAULT = process.env.OP_VAULT ?? "Crystal";
const ENVIRONMENTS = ["dev", "production"];

function op(args, options = {}) {
  return execFileSync("op", args, { encoding: "utf-8", ...options }).trim();
}

function itemExists(title) {
  try {
    op(["item", "get", title, "--vault", VAULT, "--format", "json"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/** One RS256 pair, in the shapes @convex-dev/auth expects. */
function generatePair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  const pkcs8 = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString()
    .trimEnd();

  const jwk = publicKey.export({ format: "jwk" });

  return {
    // Newlines collapse to spaces: Convex environment variables are
    // single-line, and the PEM parser accepts either form.
    privateKey: pkcs8.replace(/\n/g, " "),
    jwks: JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...jwk }] }),
  };
}

function main() {
  try {
    op(["--version"]);
  } catch {
    console.error(
      "The 1Password CLI isn't available. Install it, then turn on\n" +
        "Settings → Developer → 'Integrate with 1Password CLI' in the desktop app.",
    );
    process.exit(1);
  }

  const existing = ["JWT_PRIVATE_KEY", "JWKS"].filter(itemExists);
  if (existing.length > 0) {
    console.log(
      `${existing.join(" and ")} already exist in the "${VAULT}" vault — leaving them alone.\n` +
        "Replacing these keys signs everyone out, so this script never overwrites.",
    );
    return;
  }

  const pairs = Object.fromEntries(ENVIRONMENTS.map((env) => [env, generatePair()]));

  op([
    "item",
    "create",
    "--vault",
    VAULT,
    "--category",
    "Secure Note",
    "--title",
    "JWT_PRIVATE_KEY",
    ...ENVIRONMENTS.map((env) => `${env}[password]=${pairs[env].privateKey}`),
  ]);

  op([
    "item",
    "create",
    "--vault",
    VAULT,
    "--category",
    "Secure Note",
    "--title",
    "JWKS",
    ...ENVIRONMENTS.map((env) => `${env}[password]=${pairs[env].jwks}`),
  ]);

  console.log(
    `Created JWT_PRIVATE_KEY and JWKS in the "${VAULT}" vault ` +
      `(${ENVIRONMENTS.join(" + ")}, separate keys each).`,
  );
  console.log("Next: pnpm setup:secrets, then pnpm push:secrets");
}

main();
