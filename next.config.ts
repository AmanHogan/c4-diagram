import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone folder — used by the Dockerfile
  // to build a minimal production image (no node_modules in the final layer).
  output: 'standalone',
  images: {
    // The brand mark in public/brand/*.svg is served through next/image —
    // SVGs are blocked by the image optimizer by default.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
