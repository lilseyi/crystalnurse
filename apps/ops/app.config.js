/**
 * Expo config for the Crystal Care admin portal.
 *
 * One codebase, two targets:
 *  - web    — admin.crystalnurse.com, what the office uses (`pnpm build:ops-web`)
 *  - native — iOS/Android, if this is ever needed in the field (`eas build`)
 *
 * The portal is served from the root of its own subdomain, so there's no base
 * path. (It used to live under a sub-path of the marketing site, which is why
 * EXPO_PUBLIC_WEB_BASE_URL still exists as an override.)
 */

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: "Crystal Care Admin",
  slug: "crystalcare",
  version: "1.0.0",
  scheme: "crystalcare",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FCFBF8",
  },
  assetBundlePatterns: ["**/*"],
  web: {
    bundler: "metro",
    // "single" = one HTML file, client-side routing. Paired with the 404.html
    // copy in scripts/spa-fallback.js, this makes deep links work on GitHub
    // Pages, which has no server-side rewrite rules.
    output: "single",
    favicon: "./assets/icon.png",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier:
      process.env.APP_ENV === "staging"
        ? "com.crystalcare.ops.staging"
        : "com.crystalcare.ops",
    associatedDomains: [],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FCFBF8",
    },
    package:
      process.env.APP_ENV === "staging"
        ? "com.crystalcare.ops.staging"
        : "com.crystalcare.ops",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "crystalcare" }],
        category: ["DEFAULT", "BROWSABLE"],
      },
    ],
  },
  plugins: ["expo-router"],
  experiments: {
    baseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "",
  },
  extra: {
    // Fill these in when you set up EAS for native builds (`eas init`).
    // The web build doesn't need them.
    eas: { projectId: process.env.EAS_PROJECT_ID ?? undefined },
    router: { origin: false },
  },
  owner: process.env.EXPO_OWNER ?? undefined,
  runtimeVersion: { policy: "appVersion" },
});
