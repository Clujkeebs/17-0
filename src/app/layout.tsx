import type { Metadata, Viewport } from 'next';
import { ADSENSE_CLIENT } from '@/lib/ads';
import { nameFontVariables } from '@/lib/name-fonts';
import localFont from 'next/font/local';
import './globals.css';
import { SITE } from '@/lib/site';
import { SiteFooter } from '@/components/SiteFooter';
import { CookieBanner } from '@/components/CookieBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { JsonLd } from '@/components/JsonLd';

// Self-hosted, Latin subset, variable. next/font preloads them and generates metric-matched fallbacks (no CLS).
// Inter only: numbers use its tabular figures via --font-num.
const inter = localFont({ src: '../fonts/inter-latin-var.woff2', variable: '--font-inter', weight: '100 900', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { type: 'website', siteName: SITE.name, images: ['/og-default.png'] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.svg' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#FFFFFF', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${nameFontVariables}`}>
      <head>
        <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" />
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
