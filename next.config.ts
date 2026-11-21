import type { NextConfig } from "next";

// Reverse proxy for PostHog: ad blockers drop requests to *.posthog.com, so the browser SDK sends to /ingest instead.
const posthogHost = process.env.POSTHOG_HOST?.replace(/\/$/, "");
const posthogAssetsHost = posthogHost?.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  // PostHog API paths rely on trailing slashes.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!posthogHost || !posthogAssetsHost) return [];
    return [
      { source: "/ingest/static/:path*", destination: `${posthogAssetsHost}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${posthogAssetsHost}/array/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  // The browser SDK needs these at build time: without the NEXT_PUBLIC_ prefix, they must be inlined here.
  env: {
    POSTHOG_PROJECT_TOKEN: process.env.POSTHOG_PROJECT_TOKEN,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.cupid.travel",
        pathname: "/hotels/**",
      },
    ],
  },
};

export default nextConfig;
