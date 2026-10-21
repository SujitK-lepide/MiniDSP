import type { NextConfig } from "next";

// cacheComponents/partialPrefetching disabled (human decision, Phase 2): auth-only app,
// pages read cookies on every request, and /api/scan pins `runtime = 'nodejs'`.
const nextConfig: NextConfig = {};

export default nextConfig;
