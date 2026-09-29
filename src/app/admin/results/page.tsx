import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { ResultActions } from '../AdminClient';
import { fmtTime } from '../fmt';

export const metadata: Metadata = { title: 'Flagged results', description: 'Review flagged game results.', alternates: { canonical: '/admin/results' } };

export default async function FlaggedResultsPage() {
  const rows = await db.select({
    id: schema.gameResults.id, username: schema.gameResults.username, gameType: schema.gameResults.gameType, score: schema.gameResults.score,
    isDaily: schema.gameResults.isDaily, dailyDate: schema.gameResults.dailyDate, createdAt: schema.gameResults.createdAt, resultData: schema.gameResults.resultData,
  }).from(schema.gameResults).where(eq(schema.gameResults.flagged, true)).orderBy(desc(schema.gameResults.createdAt)).limit(200);

  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Flagged results</h1>
      <p className="muted">Flagged runs are hidden from leaderboards until unflagged. Delete removes the row for good.</p>
      {rows.length === 0 ? <p>Nothing flagged.</p> : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table>
            <thead><tr><th scope="col">When</th><th scope="col">User</th><th scope="col">Game</th><th scope="col" className="num">Score</th><th scope="col">Data</th><th scope="col">Action</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtTime(r.createdAt)}</td>
                  <td>{r.username ?? <span className="muted">anonymous</span>}</td>
                  <td>{r.gameType}{r.isDaily ? ` (daily ${r.dailyDate ?? ''})` : ''}</td>
                  <td className="num">{r.score}</td>
                  <td>
                    <details>
                      <summary>View</summary>
                      <pre className="num" style={{ fontSize: '.75rem', maxWidth: 420, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.resultData, null, 2)}</pre>
                    </details>
                  </td>
                  <td><ResultActions id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
