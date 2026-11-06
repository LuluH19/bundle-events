import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
