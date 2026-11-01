import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { historySources } from '@/lib/server/nba-history';
import { photoCredits } from '@/lib/server/nba-photos';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'Credits', description: 'Credits for the free-licensed player photos and the basketball history used on Unbeaten.', alternates: { canonical: '/credits' } };

/** Every Wikimedia Commons photo the soccer games use, and the Wikipedia articles behind 82-0's '60s, '70s and '80s, each with its license. */
export default async function Credits() {
  const rows = await db.select({ name: schema.soccerLeaders.name, credit: schema.soccerPhotos.credit, page: schema.soccerPhotos.page })
    .from(schema.soccerPhotos).innerJoin(schema.soccerLeaders, eq(schema.soccerLeaders.playerId, schema.soccerPhotos.playerId))
    .where(eq(schema.soccerPhotos.source, 'wiki')).catch(() => []);
  const seen = new Set<string>();
  const sources = historySources();
  const nbaPhotos = photoCredits();
  const list = rows.filter((r) => !seen.has(r.name) && seen.add(r.name)).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="container section" style={{ maxWidth: 820 }}>
      <span className="eyebrow">Sources</span>
      <h1>Credits</h1>
      <h2>Photos</h2>
      <p className="muted">NFL, NBA, WNBA, MLB and most soccer player photos come from public team and league sources and are used to identify the players. Where those have no photo, soccer players get a free-licensed photo from Wikimedia Commons, credited below. Each links to the player&apos;s Wikipedia article.</p>
      {list.length === 0 ? <p>No Commons photos in use yet.</p> : (
        <ul className="credits-list">
          {list.map((r) => <li key={r.name}><a href={r.page ?? '#'} target="_blank" rel="noopener noreferrer">{r.name}</a>: {r.credit}</li>)}
        </ul>
      )}
      <h2 style={{ marginTop: 40 }}>Basketball history</h2>
      <p className="muted">The &apos;60s, &apos;70s and &apos;80s in <a href="/games/82-0">82-0</a> cover the 1959-60 through 1988-89 NBA seasons. ESPN has next to nothing for most of those years, so the rosters and each player&apos;s per-game numbers come from English Wikipedia, from its team-season articles and the career tables in the players&apos; own articles. That text is available under the <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution-ShareAlike 4.0 License</a>.</p>
      <p className="muted">We changed it. The numbers were copied once, checked against each other where two articles list the same season, and left out when they could not be right. Each season is then graded by us against its own league, so those grades are ours and not Wikipedia&apos;s. ABA seasons are not included. The articles are listed here, each with its history and authors on Wikipedia. Where a player has a photo, it comes from Wikimedia Commons and its author and licence follow his name.</p>
      <details style={{ marginTop: 12 }}>
        <summary>The {sources.length} player articles</summary>
        <ul className="credits-list" style={{ columns: '2 18rem' }}>
          {sources.map((r) => (
            <li key={r.article}>
              <a href={`https://en.wikipedia.org/wiki/${encodeURI(r.article)}`} target="_blank" rel="noopener noreferrer">{r.name}</a>
              {r.credit && <>{'. Photo: '}{r.page ? <a href={r.page} target="_blank" rel="noopener noreferrer">{r.credit}</a> : r.credit}</>}
            </li>
          ))}
        </ul>
      </details>
      <h2 style={{ marginTop: 40 }}>NBA photos</h2>
      <p className="muted">ESPN has no photo for many players of the 1990s and 2000s. Where English Wikipedia&apos;s article on the player shows a free-licensed photo from Wikimedia Commons, the game uses it, credited here with its author and licence.</p>
      <details style={{ marginTop: 12 }}>
        <summary>The {nbaPhotos.length} photos</summary>
        <ul className="credits-list" style={{ columns: '2 18rem' }}>
          {nbaPhotos.map((r) => <li key={r.name + r.credit}>{r.name}: {r.page ? <a href={r.page} target="_blank" rel="noopener noreferrer">{r.credit}</a> : r.credit}</li>)}
        </ul>
      </details>
    </div>
  );
}
