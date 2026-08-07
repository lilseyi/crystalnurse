import { createSupaAuth } from "@supa-media/convex/auth";

/**
 * Auth setup for Crystal Care Ops.
 *
 * `createSupaAuth` wires up @convex-dev/auth with OTP providers. The enabled
 * methods and their transports (Resend for email, Twilio Verify for phone)
 * are configured here. See @supa-media/convex/auth for all options.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = createSupaAuth({
  appName: "Crystal Care Ops",
  methods: ["email"],
  resend: {
    fromAddress: process.env.AUTH_EMAIL_FROM ?? "auth@crystalcare.com",
    emailSubject: (code) => `${code} is your Crystal Care Ops code`,
  },
});
