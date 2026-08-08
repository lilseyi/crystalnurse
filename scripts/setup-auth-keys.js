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
 * Safe to re-run: an item that already exists is left completely alone.
 *
 * Not because rotating signs everyone out — it doesn't. Sessions are backed by
 * database rows and refresh against whatever key is current, so a rotation is
 * invisible to anyone already signed in. The danger is subtler: the private key
 * in 1Password and the one on the deployment have to stay the same key. Write a
 * new pair here without pushing it, or push without updating here, and every
 * sign-in fails verification with nothing to indicate why.
 */

const { execFileSync } = require("node:child_process");
const {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
} = require("node:crypto");

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

/**
 * Rebuild a parseable PEM from the single-line form stored in 1Password.
 *
 * The stored value has every newline replaced by a space, because Convex
 * environment variables are single-line. Putting the newlines back by swapping
 * spaces for them does NOT work — the header itself contains spaces
 * ("-----BEGIN PRIVATE KEY-----"), so that mangles the armour and the key fails
 * to decode. Strip to the base64 body and re-wrap it instead.
 */
function toPem(stored) {
  const body = stored
    .replace(/-----[A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  return [
    "-----BEGIN PRIVATE KEY-----",
    ...(body.match(/.{1,64}/g) ?? []),
    "-----END PRIVATE KEY-----",
    "",
  ].join("\n");
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

  const hasPrivate = itemExists("JWT_PRIVATE_KEY");
  const hasJwks = itemExists("JWKS");

  if (hasPrivate && hasJwks) {
    console.log(
      `JWT_PRIVATE_KEY and JWKS already exist in the "${VAULT}" vault — leaving them alone.\n` +
        "Overwriting risks 1Password and the deployment holding different keys,\n" +
        "which breaks every sign-in, so this script never replaces them.",
    );
    return;
  }

  // Half-created state. It happens if the first `op item create` succeeds and
  // the second fails — a dropped connection is enough. Returning early here
  // (as this used to) meant every later run reported "already exists" while
  // authentication stayed broken, with nothing pointing at the cause.
  //
  // JWKS is the public half of JWT_PRIVATE_KEY, so a missing JWKS can be
  // rebuilt from the key that survived. The reverse is not true: a private key
  // cannot be recovered from its public half, and inventing a new pair would
  // break verification against every token already issued.
  if (hasPrivate !== hasJwks) {
    if (hasJwks && !hasPrivate) {
      console.error(
        `Only JWKS exists in the "${VAULT}" vault — the private key it belongs to is gone.\n` +
          "It can't be recovered from the public half. Delete the JWKS item and re-run\n" +
          "this script to generate a fresh pair, then `pnpm push:secrets` so the\n" +
          "deployment gets the matching key.",
      );
      process.exit(1);
    }

    console.log("JWT_PRIVATE_KEY exists but JWKS is missing — rebuilding it from the key.");
    const fields = ENVIRONMENTS.map((env) => {
      const jwk = createPublicKey(
        createPrivateKey(toPem(op(["read", `op://${VAULT}/JWT_PRIVATE_KEY/${env}`]))),
      ).export({ format: "jwk" });
      return `${env}[password]=${JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...jwk }] })}`;
    });

    op([
      "item", "create", "--vault", VAULT, "--category", "Secure Note",
      "--title", "JWKS", ...fields,
    ]);

    console.log(`Rebuilt JWKS in the "${VAULT}" vault. Run: pnpm push:secrets`);
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
