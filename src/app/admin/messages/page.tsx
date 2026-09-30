import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { MessageActions } from '../AdminClient';
import { fmtTime } from '../fmt';

export const metadata: Metadata = { title: 'Messages', description: 'Contact form inbox.', alternates: { canonical: '/admin/messages' } };

export default async function MessagesPage() {
  const rows = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(200);
  const open = rows.filter((r) => r.status !== 'resolved').length;
  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Messages</h1>
      <p className="muted">Newest 200 contact form messages. {open} open.</p>
      {rows.length === 0 ? <p>Inbox zero. Enjoy it.</p> : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table>
            <thead><tr><th scope="col">When</th><th scope="col">Kind</th><th scope="col">From</th><th scope="col">Subject</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtTime(r.createdAt)}</td>
                  <td>{r.kind}</td>
                  <td>{r.name}<br /><a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}>{r.email}</a></td>
                  <td>
                    <details>
                      <summary>{r.subject}</summary>
                      <p style={{ whiteSpace: 'pre-wrap', maxWidth: 520 }}>{r.message}</p>
                    </details>
                  </td>
                  <td>{r.status === 'resolved' ? <span className="muted">resolved</span> : <strong>open</strong>}</td>
                  <td><MessageActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
