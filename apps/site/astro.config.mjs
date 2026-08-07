import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// Dual-target build, switched by env var CN_DEPLOY_TARGET.
// - default (github-pages): built under the project subpath /crystalnurse/
// - custom-domain: built at the site root for crystalnurse.com
const useCustomDomain = process.env.CN_DEPLOY_TARGET === "custom-domain";

export default defineConfig({
  site: useCustomDomain ? "https://crystalnurse.com" : "https://lilseyi.github.io",
  base: useCustomDomain ? "/" : "/crystalnurse",
  trailingSlash: "ignore",
  integrations: [tailwind({ applyBaseStyles: false }), sitemap()],
});
