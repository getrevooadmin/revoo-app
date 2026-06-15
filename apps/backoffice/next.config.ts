import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@feebli/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
