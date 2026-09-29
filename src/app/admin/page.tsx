import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { RunSyncButton } from './AdminClient';
import { fmtTime } from './fmt';

export const metadata: Metadata = { title: 'Sync', description: 'Ratings sync status.', alternates: { canonical: '/admin' } };

export default async function AdminHome() {
  const snaps = await db.select({
    id: schema.syncSnapshots.id, status: schema.syncSnapshots.status, parsedCount: schema.syncSnapshots.parsedCount,
    errors: schema.syncSnapshots.errors, createdAt: schema.syncSnapshots.createdAt, sourceUrl: schema.syncSnapshots.sourceUrl,
  }).from(schema.syncSnapshots).orderBy(desc(schema.syncSnapshots.createdAt)).limit(10);

  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Ratings sync</h1>
      <p className="muted">Latest 10 sync snapshots. A run fetches the EA Sports Madden NFL ratings source and updates players.</p>
      <div style={{ margin: '16px 0 24px' }}><RunSyncButton /></div>
      {snaps.length === 0 ? <p className="muted">No syncs recorded yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Started</th><th scope="col">Status</th><th scope="col" className="num">Parsed</th><th scope="col">Errors</th></tr></thead>
            <tbody>
              {snaps.map((s) => (
                <tr key={s.id}>
                  <td>{fmtTime(s.createdAt)}</td>
                  <td className={s.status === 'failed' || s.status === 'error' ? 'danger' : s.status === 'success' || s.status === 'ok' ? 'accent' : undefined}>{s.status}</td>
                  <td className="num">{s.parsedCount}</td>
                  <td>
                    {s.errors.length === 0 ? <span className="muted">None</span> : (
                      <details>
                        <summary>{s.errors.length} error{s.errors.length === 1 ? '' : 's'}</summary>
                        <ul className="num" style={{ fontSize: '.8rem', margin: '8px 0 0', paddingLeft: 18 }}>
                          {s.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
