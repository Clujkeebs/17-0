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
