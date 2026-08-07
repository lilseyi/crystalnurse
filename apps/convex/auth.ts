import { createSupaAuth } from "@supa-media/convex/auth";

/**
 * Auth setup for Crystal Care Ops.
 *
 * Email one-time codes, sent via Resend. `createSupaAuth` wires up
 * @convex-dev/auth; see @supa-media/convex/auth for the full set of options.
 *
 * Note that signing in only proves someone owns an email address. It does not
 * grant access — that needs an allowed domain AND an invited `members` row, both
 * checked server-side on every request. See functions/members.ts.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = createSupaAuth({
  appName: "Crystal Care Ops",
  methods: ["email"],

  /**
   * The production deployment, named so the framework can refuse to honour
   * DEV_OTP_BYPASS there.
   *
   * That bypass makes every sign-in code `000000`, which is exactly right for
   * local development and catastrophic in production — it would let anyone with
   * a @crystalnurse.com address walk in. It's currently set only on the dev
   * deployment, but "currently" isn't a safeguard: a mistyped `--prod`, or a
   * future deployment cloned from dev, would be enough. With this set, the
   * framework ignores the bypass whenever it's running on production and logs
   * an error instead.
   *
   * If the production deployment is ever recreated, update this string.
   */
  productionIdentifier: "accurate-gull-766",

  resend: {
    fromAddress: process.env.AUTH_EMAIL_FROM ?? "ops@crystalnurse.com",
    emailSubject: (code) => `${code} is your Crystal Care code`,
  },
});
