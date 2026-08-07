#!/usr/bin/env node

/**
 * Create the portal's sign-in signing keys and store them in 1Password.
 *
 * These two values let the backend prove that a sign-in session is genuine.
 * They're generated, never chosen — nobody should ever type or invent them.
 *
 * Run once, when first setting the project up:
 *
 *   pnpm setup:auth-keys
 *
 * Safe to re-run: if the item already exists in 1Password it stops and changes
 * nothing, because replacing these keys signs everyone out.
 */

const { execFileSync } = require("node:child_process");
const { generateKeyPairSync } = require("node:crypto");

const VAULT = process.env.OP_VAULT ?? "Crystal";
const ITEM = "Auth";

function op(args, options = {}) {
  return execFileSync("op", args, { encoding: "utf-8", ...options }).trim();
}

function itemExists() {
  try {
    op(["item", "get", ITEM, "--vault", VAULT, "--format", "json"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
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

  if (itemExists()) {
    console.log(
      `"${ITEM}" already exists in the "${VAULT}" vault — leaving it alone.\n` +
        "Replacing these keys would sign everyone out, so this script never overwrites.",
    );
    return;
  }

  // RS256, which is what @convex-dev/auth verifies with.
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  const pkcs8 = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString()
    .trimEnd();

  // generateKeyPairSync returns KeyObjects when no encoding is given, so the
  // public key can be exported to JWK directly.
  const jwk = publicKey.export({ format: "jwk" });
  const jwks = JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...jwk }] });

  // Newlines are collapsed to spaces: Convex environment variables are
  // single-line, and the PEM parser accepts either form.
  op([
    "item",
    "create",
    "--vault",
    VAULT,
    "--category",
    "Secure Note",
    "--title",
    ITEM,
    `jwt-private-key[password]=${pkcs8.replace(/\n/g, " ")}`,
    `jwks[password]=${jwks}`,
  ]);

  console.log(`Created "${ITEM}" in the "${VAULT}" vault.`);
  console.log("Next: pnpm setup:secrets, then pnpm push:secrets");
}

main();
