import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { supaAuthTables } from "@supa-media/convex/schema";
import { MEMBER_ROLES } from "@crystalcare/shared";

/**
 * Database schema for Crystal Care Ops.
 *
 * ── This file is intentionally almost empty. ────────────────────────────────
 * The only tables here are the ones the portal needs to run at all: who can
 * sign in (`members`) and which outside services it's connected to
 * (`connections`). There is no business data yet — that's yours to add.
 *
 * To add something (a client list, a schedule, a mileage log), you don't have
 * to understand this file. Ask Claude Code, e.g.:
 *
 *   "Add a Clients section to the portal. Each client has a name, a phone
 *    number, an address, and a status of active or inactive."
 *
 * It will add a table here, the functions in functions/, and a page in
 * apps/ops/app/(app)/. See docs/BUILDING-THE-PORTAL.md.
 *
 * ── Before you add anything about a patient ─────────────────────────────────
 * Names, addresses and conditions of people receiving care are protected health
 * information, and putting them here changes what the law requires of this
 * system. Read docs/architecture/ADR-001-phi-boundary.md first.
 * ───────────────────────────────────────────────────────────────────────────
 */
const schema = defineSchema({
  ...supaAuthTables,

  /**
   * Who is allowed into the portal.
   *
   * Signing in proves you own an email address; it does not grant access. A
   * `members` row does. See functions/members.ts.
   */
  members: defineTable({
    userId: v.optional(v.id("users")), // set on first sign-in; empty while invited
    email: v.string(), // lowercased; how an invite is matched
    name: v.optional(v.string()),
    role: v.union(...(MEMBER_ROLES.map((role) => v.literal(role)) as any)),
    invitedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),

  /**
   * Which data migrations have already run, so a deploy never applies one twice.
   * Written only by functions/migrations.ts.
   */
  migrations: defineTable({
    name: v.string(),
    appliedAt: v.number(),
  }).index("by_name", ["name"]),

  /**
   * Keys and settings for outside services, editable from Settings → Connections
   * so adding one doesn't need a developer or a deploy.
   *
   * `secret` values are never sent back to the browser — see functions/connections.ts.
   */
  connections: defineTable({
    /** Stable machine name, e.g. "google_sheets_api_key". Unique. */
    key: v.string(),
    /** What a person calls it, e.g. "Google Sheets API key". */
    label: v.string(),
    /** What it's for, shown under the label. */
    description: v.optional(v.string()),
    value: v.string(),
    /** Secrets are write-only in the UI; plain settings can be read back. */
    isSecret: v.boolean(),
    updatedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});

export default schema;
