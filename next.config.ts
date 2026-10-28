import type { NextConfig } from "next";

// Static export: Cloudflare Pages serves the built files; anything that
// needs a server runs as a Supabase edge function.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
