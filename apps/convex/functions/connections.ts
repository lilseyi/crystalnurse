import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireMember, requireOwner } from "./members";

/**
 * Connections — keys and settings for outside services, managed from the portal
 * instead of from a developer's terminal.
 *
 * The point: once this exists, hooking the portal up to something new (a Google
 * Sheet, a mailer, an accounting tool) is "paste the key into Settings", not
 * "edit a file, set a secret, redeploy".
 *
 * ── Two rules, and why ──────────────────────────────────────────────────────
 * 1. Values marked `isSecret` are NEVER returned to the browser. `list` sends a
 *    masked preview; only server-side code reads the real thing via
 *    `getConnectionValue`. A secret that reaches the browser has effectively
 *    been published — anyone signed in could read it out of the network tab.
 * 2. Owners only. A manager can run the business; handing out API keys is a
 *    different kind of trust.
 *
 * ── What this is NOT ────────────────────────────────────────────────────────
 * These live in the database, which is less protected than a Convex environment
 * variable: anyone with dashboard access to the deployment can read them. That
 * is the right trade for keys your team owns and rotates (a Sheets key, a
 * mailing-list token). It is the WRONG place for anything that would be
 * catastrophic if leaked — a payment processor's live secret key, or anything
 * that grants access to health records. Those belong in Convex environment
 * variables. See docs/CONNECTIONS.md.
 */

/** Show enough to recognise a key without revealing it. */
function maskSecret(value: string): string {
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

/**
 * Everything configured, safe to render. Secret values come back masked.
 *
 * Readable by any member so a manager can see *that* a connection is set up
 * (and tell someone when it isn't) without being able to read it.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireMember(ctx);
    const rows = await ctx.db.query("connections").collect();

    return rows
      .map((row) => ({
        _id: row._id,
        key: row.key,
        label: row.label,
        description: row.description,
        isSecret: row.isSecret,
        /** Masked for secrets, real value for plain settings. */
        preview: row.isSecret ? maskSecret(row.value) : row.value,
        updatedAt: row.updatedAt,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },
});

/**
 * Add a connection, or replace the value of one that already exists.
 *
 * Upsert rather than separate create/update: from the portal, saving a key you
 * already have is "I'm rotating it", not an error.
 */
export const save = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    value: v.string(),
    isSecret: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);

    // Machine name, so it can be looked up from code later.
    const key = args.key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (key.length === 0) {
      throw new ConvexError({
        code: "INVALID_KEY",
        message: "Give the connection a name using letters or numbers.",
      });
    }
    if (args.value.trim().length === 0) {
      throw new ConvexError({
        code: "EMPTY_VALUE",
        message: "The value can't be blank.",
      });
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label.trim() || existing.label,
        description: args.description ?? existing.description,
        value: args.value,
        isSecret: args.isSecret ?? existing.isSecret,
        updatedByUserId: owner.userId,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("connections", {
      key,
      label: args.label.trim() || key,
      description: args.description,
      value: args.value,
      isSecret: args.isSecret ?? true,
      updatedByUserId: owner.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, { connectionId }) => {
    await requireOwner(ctx);
    await ctx.db.delete(connectionId);
    return null;
  },
});

/**
 * Read a connection's real value — for SERVER-SIDE use only.
 *
 * Deliberately a plain function rather than a query: exporting it as a query
 * would make it callable from the browser, which is exactly what the masking
 * above exists to prevent. Call it from inside another Convex function:
 *
 *   const apiKey = await getConnectionValue(ctx, "google_sheets_api_key");
 */
export async function getConnectionValue(
  ctx: { db: any },
  key: string,
): Promise<string | null> {
  const row = await ctx.db
    .query("connections")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();
  return row?.value ?? null;
}
