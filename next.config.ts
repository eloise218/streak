import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bridge Vercel-style Supabase env vars to the browser. The Supabase
  // integration provisions SUPABASE_PUBLISHABLE_KEY without the NEXT_PUBLIC_
  // prefix, so we re-export it here.
  env: {
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
