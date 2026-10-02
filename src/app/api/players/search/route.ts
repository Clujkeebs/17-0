import { and, desc, eq, ilike } from 'drizzle-orm';
import { db, schema } from '@/db';
import { resolvePlayerImage } from '@/lib/server/images';
import { json } from '@/lib/server/request';

export const runtime = 'nodejs';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');

/**
 * Live search for the Players page: every active player the page lists, legends included. A name matches when
 * one of its words starts with what you typed; best overall first. Ratings are public on this page.
 */
export async function GET(req: Request) {
  const q = norm(new URL(req.url).searchParams.get('q') ?? '').trim();
  if (!q) return json({ results: [] });
  const first = q.split(' ')[0];
  const [rows, teams] = await Promise.all([
    db.select().from(schema.players).where(and(eq(schema.players.isActive, true), ilike(schema.players.fullName, `%${first}%`))).orderBy(desc(schema.players.overallRating)).limit(200),
    db.select().from(schema.teams),
  ]);
  const tmap = new Map(teams.map((t) => [t.id, t]));
  const results = rows
    .filter((p) => norm(p.fullName).split(' ').some((w) => w.startsWith(first)) && norm(p.fullName).includes(q))
    .slice(0, 10)
    .map((p) => {
      const t = p.teamId != null ? tmap.get(p.teamId) : undefined;
      return {
        slug: p.slug, name: p.fullName, position: p.position, ovr: p.overallRating,
        team: t?.abbreviation ?? '', teamName: t ? `${t.city} ${t.name}` : p.isAllTimeGreat ? 'All-time legend' : 'Free agent',
        teamColor: t?.primaryColor ?? '#0A0A0A', logoUrl: t?.logoUrl ?? null, img: resolvePlayerImage(p),
      };
    });
  return json({ results }, { cacheSeconds: 300 });
}
