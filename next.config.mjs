/** @type {import('next').NextConfig} */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-return */

import createWithAnalyser from "@next/bundle-analyzer";

const nextConfig = {
  logging: { incomingRequests: true },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    webpackMemoryOptimizations: true,
    optimizePackageImports: ["lucide-react"],
  },
  allowedDevOrigins: [
    "clerk.com",
    "*.clerk.com",
    "hf.vedadian.com",
    "hf.vedadian.com",
    "hopeflow.org",
    "*.hopeflow.org",
  ],
  basePath: "",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
        pathname: "/**",
      },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
    ],
  },

};

const withBundleAnalyzer = createWithAnalyser({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer((nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "hopeflow",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
