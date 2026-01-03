import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 1. Allow Next.js to transpile the external TypeScript files
  transpilePackages: ["../../shared"],

  // 2. Map the @shared alias for the Webpack/Turbopack bundler
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@shared": path.resolve(__dirname, "../../shared"),
    };
    return config;
  },
  
  // 3. If you are using Turbopack (--turbo), you must set the root
  experimental: {
    turbo: {
      resolveAlias: {
        "@shared": "../../shared",
      },
    },
  },
};

export default nextConfig;
