import { SiteHeader } from '@/components/SiteHeader';
import { StaleSyncBanner } from '@/components/StaleSyncBanner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <StaleSyncBanner />
      <main id="main">{children}</main>
    </>
  );
}
