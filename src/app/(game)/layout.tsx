import { SiteHeader } from '@/components/SiteHeader';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader minimal />
      <main id="main">{children}</main>
    </>
  );
}
