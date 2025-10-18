import type { NextConfig } from "next";

// Configure Next.js for static export suitable for GitHub Pages
const nextConfig: NextConfig = {
  output: "export",
  images: {
    // Disable the Image Optimization API for static hosting environments
    unoptimized: true,
  },
  // Ensures directory-style URLs work when served as static files
  trailingSlash: true,
};

export default nextConfig;
