import type { NextConfig } from 'next';

// Proxy API + template assets to Express: the browser stays same-origin, so no CORS setup is needed.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export default {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/templates/:path*', destination: `${API_URL}/uploads/templates/:path*` },
    ];
  },
} satisfies NextConfig;
