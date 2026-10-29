import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const config: NextConfig = {
  output: 'standalone',
  // One id per build (the Docker build passes the commit): a tab left open across a deploy reloads instead of mixing old and new files.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
  poweredByHeader: false,
  // A page Next generates on demand (a compare pair, a player nobody asked for yet, a made-up address) is written to
  // .next/server/app as seven or eight files, 150 to 230 KB. The container counts those files as memory and a crawler walking
  // /compare pairs filled a gigabyte. Pages made at build time stay on disk. Everything made later lives only in this
  // in-memory cache, which holds cacheMaxMemorySize and drops the least recently used page when it is full.
  cacheMaxMemorySize: 64 * 1024 * 1024,
  experimental: { isrFlushToDisk: false },
  serverExternalPackages: ['bullmq', 'ioredis', 'playwright-core', 'bcryptjs'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'www.mlbstatic.com' },
      { protocol: 'https', hostname: 'img.mlbstatic.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'static.www.nfl.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // /sitemap.xml is the address search consoles expect. The numbered sitemaps are served from /sitemap/[id].xml and
  // Next leaves /sitemap.xml itself empty (a route there conflicts with them), so the index lives at /sitemap-index.xml.
  async rewrites() {
    return { beforeFiles: [{ source: '/sitemap.xml', destination: '/sitemap-index.xml' }], afterFiles: [], fallback: [] };
  },
};

export default config;
