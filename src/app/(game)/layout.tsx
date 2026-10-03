import { SiteHeader } from '@/components/SiteHeader';
import { SiteBanner } from '@/components/SiteBanner';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide the dismissed rules card before first paint, so returning players see no layout shift. */}
      <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('gl-17-0-rules'))document.documentElement.dataset.rules='hidden'}catch(e){}" }} />
      <SiteBanner />
      <SiteHeader />
      <main id="main">{children}</main>
    </>
  );
}
