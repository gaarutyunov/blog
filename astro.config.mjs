// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Production site is served from the apex custom domain. PR previews are
// published to a subpath on the same gh-pages branch, so the deploy job passes
// BASE_PATH=/pr-preview/pr-<N>/ to prefix every generated asset/route URL.
const base = process.env.BASE_PATH || "/";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.garutyunov.com",
  base,
  trailingSlash: "ignore",
  integrations: [sitemap()],
});
