import type { Metadata, Viewport } from 'next';
import { ADSENSE_CLIENT } from '@/lib/ads';
import { nameFontVariables } from '@/lib/name-fonts';
import localFont from 'next/font/local';
import './globals.css';
import '@/components/cosmetics.css';
import { SITE } from '@/lib/site';
import { SiteFooter } from '@/components/SiteFooter';
import { CookieBanner } from '@/components/CookieBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { JsonLd } from '@/components/JsonLd';
import { THEME_SCRIPT } from '@/components/ThemeToggle';

/** After a deploy, a page opened earlier can ask for scripts or styles that no longer exist. One reload (at most one a minute) brings the new ones. */
const STALE_ASSET_SCRIPT = `(function(){try{function heal(){var k='gl-reload',n=Date.now(),l=+sessionStorage.getItem(k)||0;if(n-l<60000)return;sessionStorage.setItem(k,String(n));location.reload();}addEventListener('error',function(e){var t=e.target;if(t&&(t.tagName==='LINK'||t.tagName==='SCRIPT')){var u=t.href||t.src||'';if(u.indexOf('/_next/static/')>-1)heal();}},true);addEventListener('unhandledrejection',function(e){var r=e.reason,m=String(r&&(r.name+' '+r.message));if(/ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported/.test(m))heal();});}catch(_){}})();`;
import { KonamiCode } from '@/components/KonamiCode';

// Self-hosted, Latin subset, variable. next/font preloads them and generates metric-matched fallbacks (no CLS).
// Inter only: numbers use its tabular figures via --font-num.
const inter = localFont({ src: '../fonts/inter-latin-var.woff2', variable: '--font-inter', weight: '100 900', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { type: 'website', siteName: SITE.name, images: ['/og-default.png'] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: '32x32' }], apple: '/apple-touch-icon.png' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#FFFFFF' }, { media: '(prefers-color-scheme: dark)', color: '#0F0F10' }],
  width: 'device-width', initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${nameFontVariables}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: STALE_ASSET_SCRIPT }} />
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
        <KonamiCode />
      </body>
    </html>
  );
}
