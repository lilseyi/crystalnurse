/**
 * Shared constants for Crystal Care Ops.
 *
 * Imported by BOTH the backend (apps/convex) and the portal (apps/ops), so the
 * two can never disagree. If a value shows up in a dropdown in the portal AND
 * in a check on the server, it belongs in this file.
 */

export const APP_NAME = "Crystal Care Ops";
export const APP_SLUG = "crystalcare";

// ── Who can sign in ──────────────────────────────────────────────────────────
// Two independent gates, both required:
//   1. the email is on a company domain (below)
//   2. an invited `members` row exists (apps/convex/functions/members.ts)
//
// Neither replaces the other. The domain rule keeps outsiders from ever holding
// an account; the invite rule decides who inside the company sees the data.

/**
 * Email domains allowed to sign in. Everything else is refused.
 *
 * Add a domain here and it applies everywhere at once — the sign-in screen, the
 * invite form, and the server-side checks all read this list.
 */
export const ALLOWED_EMAIL_DOMAINS = ["crystalnurse.com"] as const;

/**
 * Is this address allowed to sign in?
 *
 * Subdomains do NOT pass: "someone@mail.crystalnurse.com" is rejected, because
 * anyone who controlled a subdomain would otherwise inherit access. Matching is
 * case-insensitive, and an address with more or fewer than one "@" is rejected
 * rather than guessed at.
 */
export function isAllowedEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (local.length === 0 || domain.length === 0) return false;

  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

/** The message shown when an address fails `isAllowedEmail`. */
export const DISALLOWED_EMAIL_MESSAGE = `Crystal Care Ops is limited to ${ALLOWED_EMAIL_DOMAINS.map(
  (domain) => `@${domain}`,
).join(" and ")} email addresses.`;

// ── What each role can do ────────────────────────────────────────────────────

export const MEMBER_ROLES = ["owner", "manager", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Roles allowed to create, edit and delete. Viewers can only look. */
export const WRITE_ROLES: readonly MemberRole[] = ["owner", "manager"];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  manager: "Manager",
  viewer: "Viewer (read-only)",
};

export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Can do everything, including managing who has access and connections.",
  manager: "Can add and change records, but not manage access.",
  viewer: "Can look at everything, but not change anything.",
};

// ── Placeholder for your own constants ───────────────────────────────────────
// When you add a section to the portal with a fixed set of options — statuses,
// categories, types — put the list here rather than typing the options out in
// both the backend and the screen. For example:
//
//   export const CLIENT_STATUSES = ["prospective", "active", "discharged"] as const;
//   export type ClientStatus = (typeof CLIENT_STATUSES)[number];
//
//   export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
//     prospective: "Prospective",
//     active: "Active",
//     discharged: "Discharged",
//   };
