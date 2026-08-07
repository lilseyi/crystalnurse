import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";

/**
 * Migrations — one-off changes to existing data, run automatically on deploy.
 *
 * ── When you need one ───────────────────────────────────────────────────────
 * Changing the *shape* of the database (adding a table, adding a field) needs
 * no migration: Convex applies schema.ts on deploy. A migration is for changing
 * the *data already in it*. For example:
 *
 *   - you added a `status` field and every existing row needs a starting value
 *   - phone numbers were stored inconsistently and need normalising
 *   - a field was renamed and the old values have to move across
 *
 * ── How to add one ─────────────────────────────────────────────────────────
 * Append an entry to MIGRATIONS below. Never edit or reorder an existing one:
 * once a migration has run on production, its name is recorded forever and
 * changing it means the new version silently never runs.
 *
 * Give it a name starting with the date so the order stays obvious.
 *
 * ── How it runs ────────────────────────────────────────────────────────────
 * `runPending` executes anything not yet recorded, in order, and writes down
 * what it did. It runs on every merge to main (see
 * .github/workflows/deploy-convex.yml), and is safe to run repeatedly — an
 * applied migration is skipped.
 *
 * ── The one real limit ─────────────────────────────────────────────────────
 * All of this happens inside a single Convex mutation, which has a time limit.
 * That's ample for thousands of rows and wrong for hundreds of thousands. If a
 * migration would touch a very large table, have it process a batch and record
 * its own progress rather than trying to do everything in one pass — or ask
 * Claude Code to write it that way.
 */

type Migration = {
  /** Unique, permanent. Date-prefixed so the order reads correctly. */
  name: string;
  run: (ctx: MutationCtx) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  // Nothing yet. The first one will look like this:
  //
  // {
  //   name: "2026-08-10-backfill-client-status",
  //   run: async (ctx) => {
  //     const clients = await ctx.db.query("clients").collect();
  //     for (const client of clients) {
  //       if (client.status === undefined) {
  //         await ctx.db.patch(client._id, { status: "active" });
  //       }
  //     }
  //   },
  // },
];

/**
 * Run every migration that hasn't run yet, in order.
 *
 * Internal, so it can only be triggered by a deploy or from the command line —
 * never from the portal.
 */
export const runPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const applied = await ctx.db.query("migrations").collect();
    const appliedNames = new Set(applied.map((row) => row.name));

    const ran: string[] = [];
    for (const migration of MIGRATIONS) {
      if (appliedNames.has(migration.name)) continue;

      // No try/catch on purpose: if a migration throws, the whole mutation
      // rolls back — its writes AND its record of having run. Better to fail
      // the deploy loudly than to half-apply a change and mark it done.
      await migration.run(ctx);
      await ctx.db.insert("migrations", {
        name: migration.name,
        appliedAt: Date.now(),
      });
      ran.push(migration.name);
    }

    return {
      ran,
      skipped: MIGRATIONS.length - ran.length,
      total: MIGRATIONS.length,
    };
  },
});

/** What has already run. Handy when a deploy looks wrong. */
export const listApplied = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("migrations").collect();
    return rows
      .sort((a, b) => a.appliedAt - b.appliedAt)
      .map((row) => ({
        name: row.name,
        appliedAt: new Date(row.appliedAt).toISOString(),
      }));
  },
});
