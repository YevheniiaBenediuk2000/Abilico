import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional; keep if you’re using standalone output
  // output: 'standalone',

  experimental: {
    serverComponentsExternalPackages: ["sharp", "onnxruntime-node"],
  },
};

export default nextConfig;
