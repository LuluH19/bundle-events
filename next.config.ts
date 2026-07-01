import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
