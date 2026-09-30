import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/auth';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  description: 'Unbeaten administration.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const LINKS = [
  ['/admin', 'Sync'], ['/admin/formulas', 'Formulas'], ['/admin/subscribers', 'Subscribers'],
  ['/admin/rate-limits', 'Rate limits'], ['/admin/results', 'Flagged results'], ['/admin/messages', 'Messages'], ['/admin/audit', 'Audit log'],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  if (!s) notFound();
  return (
    <>
      <SiteHeader minimal />
      <nav aria-label="Admin" className="container" style={{ borderBottom: '1px solid var(--steel)', padding: '12px var(--gutter)' }}>
        <ul className="nav" style={{ flexWrap: 'wrap' }}>
          {LINKS.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
        </ul>
      </nav>
      <main id="main">{children}</main>
    </>
  );
}
