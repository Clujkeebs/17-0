import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'Photo credits', description: 'Credits for the free-licensed player photos used on Unbeaten.', alternates: { canonical: '/credits' } };

/** Every Wikimedia Commons photo the soccer games use, with its author and license. */
export default async function Credits() {
  const rows = await db.select({ name: schema.soccerLeaders.name, credit: schema.soccerPhotos.credit, page: schema.soccerPhotos.page })
    .from(schema.soccerPhotos).innerJoin(schema.soccerLeaders, eq(schema.soccerLeaders.playerId, schema.soccerPhotos.playerId))
    .where(eq(schema.soccerPhotos.source, 'wiki')).catch(() => []);
  const seen = new Set<string>();
  const list = rows.filter((r) => !seen.has(r.name) && seen.add(r.name)).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="container section" style={{ maxWidth: 820 }}>
      <span className="eyebrow">Credits</span>
      <h1>Photo credits</h1>
      <p className="muted">NFL, NBA, WNBA, MLB and most soccer player photos come from public team and league sources and are used to identify the players. Where those have no photo, soccer players get a free-licensed photo from Wikimedia Commons, credited below. Each links to the player&apos;s Wikipedia article.</p>
      {list.length === 0 ? <p>No Commons photos in use yet.</p> : (
        <ul className="credits-list">
          {list.map((r) => <li key={r.name}><a href={r.page ?? '#'} target="_blank" rel="noopener noreferrer">{r.name}</a>: {r.credit}</li>)}
        </ul>
      )}
    </div>
  );
}
