import type { NextConfig } from "next";

// Configure Next.js to run with dynamic routes suitable for Vercel deployments
const nextConfig: NextConfig = {
  images: {
    // Disable the Image Optimization API to avoid relying on the default loader
    unoptimized: true,
  },
  // Ensures directory-style URLs work when preserving compatibility with static hosting if needed
  trailingSlash: true,
};

export default nextConfig;
