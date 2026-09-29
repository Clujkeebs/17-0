import { SiteHeader } from '@/components/SiteHeader';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide the dismissed rules card before first paint, so returning players see no layout shift. */}
      <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('gl-17-0-rules'))document.documentElement.dataset.rules='hidden'}catch(e){}" }} />
      <SiteHeader minimal />
      <main id="main">{children}</main>
    </>
  );
}
