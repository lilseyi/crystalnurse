import { v, ConvexError } from "convex/values";
import {
  DISALLOWED_EMAIL_MESSAGE,
  MEMBER_ROLES,
  WRITE_ROLES,
  isAllowedEmail,
  type MemberRole,
} from "@crystalcare/shared";
import { mutation, query, type QueryCtx, type MutationCtx } from "../_generated/server";
import { requireAuthId } from "@supa-media/convex/auth";
import type { Doc } from "../_generated/dataModel";

/**
 * Access control for Crystal Care Ops.
 *
 * A Convex deployment is reachable by anyone who knows the URL, and email OTP
 * will happily issue a code to any address. Authentication therefore only proves
 * "you own this inbox" — it does not grant access. The `members` table does.
 *
 * Every query and mutation in this backend starts with `requireMember` (read) or
 * `requireWriter` (write). If you add a new function, do the same.
 */

/** The signed-in user's member row, or throw. Use this in every read. */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"members">> {
  const userId = (await requireAuthId(ctx)) as Doc<"users">["_id"];
  const user = await ctx.db.get(userId);
  const email = user?.email?.toLowerCase();

  // Domain gate, checked on every request rather than only at sign-up: if the
  // allowed-domain list is ever tightened, existing sessions lose access on
  // their next query instead of lingering until they sign out.
  if (!email || !isAllowedEmail(email)) {
    throw new ConvexError({
      code: "DOMAIN_NOT_ALLOWED",
      message: DISALLOWED_EMAIL_MESSAGE,
    });
  }

  const byUser = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (byUser) return byUser;

  // Invited but not yet linked: match the invite by email on first sign-in.
  {
    const byEmail = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (byEmail) return byEmail;
  }

  throw new ConvexError({
    code: "NOT_A_MEMBER",
    message:
      "This email hasn't been invited to Crystal Care Ops. Ask an owner to add you.",
  });
}

/** Same as `requireMember`, but rejects read-only viewers. Use in every write. */
export async function requireWriter(ctx: MutationCtx): Promise<Doc<"members">> {
  const member = await requireMember(ctx);
  if (!WRITE_ROLES.includes(member.role as MemberRole)) {
    throw new ConvexError({
      code: "READ_ONLY",
      message: "Your account is read-only.",
    });
  }
  return member;
}

/** Owners only — for managing who has access, and the connection keys. */
export async function requireOwner(ctx: MutationCtx): Promise<Doc<"members">> {
  const member = await requireMember(ctx);
  if (member.role !== "owner") {
    throw new ConvexError({
      code: "OWNER_ONLY",
      message: "Only an owner can change who has access.",
    });
  }
  return member;
}

/**
 * Link an invited member row to the auth user on first sign-in, so subsequent
 * lookups hit the `by_user` index instead of re-matching on email.
 */
export const linkCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const member = await requireMember(ctx);
    const userId = (await requireAuthId(ctx)) as Doc<"users">["_id"];
    if (member.userId !== userId) {
      await ctx.db.patch(member._id, { userId });
    }
    return null;
  },
});

/**
 * Who am I? Returns null instead of throwing when the signed-in user hasn't
 * been invited — the app renders a "request access" screen for that case rather
 * than an error boundary.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    try {
      const member = await requireMember(ctx);
      return { role: member.role, name: member.name, email: member.email };
    } catch {
      return null;
    }
  },
});

/** Everyone with access. Owners see this on the Settings screen. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireMember(ctx);
    return await ctx.db.query("members").collect();
  },
});

/**
 * Bootstrap: the very first person to sign in claims ownership.
 *
 * This is only possible while the `members` table is empty, which is true for
 * exactly as long as it takes the founder to sign in once. After that this
 * mutation always throws and invites are the only way in.
 */
export const claimOwnership = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, { name }) => {
    const existing = await ctx.db.query("members").take(1);
    if (existing.length > 0) {
      throw new ConvexError({
        code: "ALREADY_CLAIMED",
        message: "Crystal Care Ops already has an owner. Ask them for an invite.",
      });
    }

    const userId = (await requireAuthId(ctx)) as Doc<"users">["_id"];
    const user = await ctx.db.get(userId);
    const email = user?.email?.toLowerCase();
    if (!email) {
      throw new ConvexError({
        code: "NO_EMAIL",
        message: "Sign in with an email address to claim ownership.",
      });
    }
    // Without this, the one unauthenticated-by-membership path in the whole
    // backend would let any address claim the workspace before the real owner
    // gets to it.
    if (!isAllowedEmail(email)) {
      throw new ConvexError({
        code: "DOMAIN_NOT_ALLOWED",
        message: DISALLOWED_EMAIL_MESSAGE,
      });
    }

    return await ctx.db.insert("members", {
      userId,
      email,
      name: name ?? user?.name,
      role: "owner",
      createdAt: Date.now(),
    });
  },
});

/** Invite someone by email. They get access the next time they sign in. */
export const invite = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(...(MEMBER_ROLES.map((r) => v.literal(r)) as any)),
  },
  handler: async (ctx, { email, name, role }) => {
    const owner = await requireOwner(ctx);
    const normalized = email.trim().toLowerCase();

    // Stop an outside address becoming a member row at all — otherwise it would
    // sit there looking valid while `requireMember` silently refused it.
    if (!isAllowedEmail(normalized)) {
      throw new ConvexError({
        code: "DOMAIN_NOT_ALLOWED",
        message: DISALLOWED_EMAIL_MESSAGE,
      });
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: role as MemberRole, name: name ?? existing.name });
      return existing._id;
    }

    return await ctx.db.insert("members", {
      email: normalized,
      name,
      role: role as MemberRole,
      invitedByUserId: owner.userId,
      createdAt: Date.now(),
    });
  },
});

/** Revoke access. An owner cannot remove themselves — that would lock everyone out. */
export const remove = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const owner = await requireOwner(ctx);
    if (owner._id === memberId) {
      throw new ConvexError({
        code: "CANNOT_REMOVE_SELF",
        message: "Transfer ownership before removing your own access.",
      });
    }
    await ctx.db.delete(memberId);
    return null;
  },
});
