import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@feebli/shared", "@feebli/components"],
};

export default nextConfig;
