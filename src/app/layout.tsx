import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SITE } from '@/lib/site';
import { SiteFooter } from '@/components/SiteFooter';
import { CookieBanner } from '@/components/CookieBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { JsonLd } from '@/components/JsonLd';

// Self-hosted, Latin subset, variable. next/font preloads them and generates metric-matched fallbacks (no CLS).
const inter = localFont({ src: '../fonts/inter-latin-var.woff2', variable: '--font-inter', weight: '100 900', display: 'swap' });
const mono = localFont({ src: '../fonts/jbmono-latin-var.woff2', variable: '--font-jbmono', weight: '100 800', display: 'swap', adjustFontFallback: 'Arial' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { type: 'website', siteName: SITE.name, images: ['/og-default.png'] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.svg' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#0A1128', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsense = process.env.GOOGLE_ADSENSE_CLIENT;
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        {adsense ? <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`} crossOrigin="anonymous" /> : null}
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <OfflineBanner />
        <JsonLd data={[
          { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg` },
          { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url,
            potentialAction: { '@type': 'SearchAction', target: `${SITE.url}/players?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
        ]} />
        {children}
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
