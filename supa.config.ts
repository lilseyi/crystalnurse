import { defineConfig } from "@supa-media/core/config";

export default defineConfig({
  app: {
    name: "Crystal Care Ops",
    slug: "crystalcare",
    scheme: "crystalcare",
    bundleId: {
      production: "com.crystalcare.ops",
      staging: "com.crystalcare.ops.staging",
    },
  },

  multiTenant: false,
  tenantName: "",

  auth: {
    providers: ["email"],
  },

  features: {
    phoneOtp: false,
    emailOtp: true,
    pushNotifications: false,
    chat: false,
    payments: false,
  },

  deployment: {
    strictness: "standard",
  },

  infrastructure: {
    vault: "Crystal Care",
    easProjectId: "YOUR_EAS_PROJECT_ID",
    expoOwner: "your-expo-owner",
  },
});
