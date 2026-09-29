import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { fmtTime } from '../fmt';

export const metadata: Metadata = { title: 'Audit log', description: 'Latest administrative and account events.', alternates: { canonical: '/admin/audit' } };

export default async function AuditPage() {
  const rows = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(200);
  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Audit log</h1>
      <p className="muted">Latest 200 entries.</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
        <table>
          <thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(r.createdAt)}</td>
                <td className="num" style={{ fontSize: '.8rem' }}>{r.actorId ?? '--'}</td>
                <td className="num">{r.action}</td>
                <td className="num" style={{ fontSize: '.8rem' }}>{[r.targetType, r.targetId].filter(Boolean).join(':') || '--'}</td>
                <td className="num" style={{ fontSize: '.75rem', maxWidth: 360, overflowWrap: 'anywhere' }}>{r.metadata ? JSON.stringify(r.metadata) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
