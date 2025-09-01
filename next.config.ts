import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["pub-7027dcead7294deeacde6da1a50ed32f.r2.dev"],
  },
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
