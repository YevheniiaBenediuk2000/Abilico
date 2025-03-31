import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'], // This line is to include file extensions for Next.js pages
};

export default nextConfig;