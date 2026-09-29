import type { Metadata } from 'next';
import { subscriberCounts } from '@/lib/server/newsletter';

export const metadata: Metadata = { title: 'Subscribers', description: 'Newsletter subscriber counts and export.', alternates: { canonical: '/admin/subscribers' } };

export default async function SubscribersPage() {
  const c = await subscriberCounts();
  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Subscribers</h1>
      <div className="row" style={{ gap: 40, margin: '24px 0' }}>
        <div className="stat"><span className="v">{c.total}</span><span className="l">Total rows</span></div>
        <div className="stat"><span className="v">{c.confirmed}</span><span className="l">Confirmed</span></div>
        <div className="stat"><span className="v">{c.pending}</span><span className="l">Pending</span></div>
        <div className="stat"><span className="v">{c.unsubscribed}</span><span className="l">Unsubscribed</span></div>
      </div>
      <p className="muted">Unsubscribed rows are hard-deleted 90 days after unsubscribing. Exports are logged in the audit log.</p>
      <a className="btn btn-primary" href="/api/admin/subscribers?format=csv" download>Export CSV</a>
    </div>
  );
}
