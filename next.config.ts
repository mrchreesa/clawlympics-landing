import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed 'output: export' - we need server-side API routes
  // For deployment, Vercel will handle this automatically
};

export default nextConfig;
