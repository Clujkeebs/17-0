import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { fmtTime } from '../fmt';

export const metadata: Metadata = { title: 'Feedback', description: 'Footer questionnaire responses.', alternates: { canonical: '/admin/feedback' } };

export default async function FeedbackPage() {
  const rows = await db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt)).limit(300);
  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(2) : null;
  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Feedback</h1>
      <p className="muted">Newest 300 responses.{avg && <> Average rating <strong className="num">{avg}</strong>.</>}</p>
      {rows.length === 0 ? <p>No responses yet.</p> : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table>
            <thead><tr><th scope="col">When</th><th scope="col">Rating</th><th scope="col">Page</th><th scope="col">Note</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtTime(r.createdAt)}</td>
                  <td className="num">{r.rating}</td>
                  <td>{r.page}</td>
                  <td style={{ whiteSpace: 'pre-wrap', maxWidth: 520 }}>{r.message || <span className="muted">none</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
