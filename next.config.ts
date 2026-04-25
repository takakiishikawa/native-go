import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@takaki/go-design-system"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
