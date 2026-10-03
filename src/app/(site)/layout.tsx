import { SiteHeader } from '@/components/SiteHeader';
import { SiteBanner } from '@/components/SiteBanner';
import { StaleSyncBanner } from '@/components/StaleSyncBanner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteBanner />
      <SiteHeader />
      <StaleSyncBanner />
      <main id="main">{children}</main>
    </>
  );
}
