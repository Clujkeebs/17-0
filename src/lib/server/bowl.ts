import { and, desc, eq, gt } from 'drizzle-orm';
import { db, schema } from '@/db';
import { loadGameData } from '@/lib/minigames/data';
import { compactAttrs, POSITIONS, SHAPE, summary, type League, type Pos, type SeedPlayer, type SeedTeam } from '@/lib/game/bowl-franchise';

/** Real rosters for a new GM league: every team, and its best players at each spot (a few spares too). */
export async function leagueSeed(): Promise<{ teams: SeedTeam[]; players: SeedPlayer[] }> {
  const data = await loadGameData();
  const teams: SeedTeam[] = data.teams.map((t) => ({ abbr: t.abbr, name: t.name, city: t.city, color: t.color, logo: t.logoUrl, conf: t.conference, div: t.division }));
  const players: SeedPlayer[] = [];
  for (const t of data.teams) {
    const mine = data.players.filter((p) => p.teamId === t.id);
    for (const pos of POSITIONS) {
      const at = mine.filter((p) => (pos === 'K' ? p.position === 'K' : p.group === pos)).sort((a, b) => b.ovr - a.ovr).slice(0, SHAPE[pos as Pos]);
      for (const p of at) players.push({ id: p.id, n: p.name, p: pos, o: p.ovr, age: p.age, num: p.jersey, img: p.img, a: compactAttrs(pos, p.attrs as Record<string, number | undefined>, p.ovr), t: t.abbr });
    }
  }
  return { teams, players };
}

const MAX_BYTES = 700_000;

/** Loose shape check so a broken or hostile save never lands in the table. */
function looksLikeLeague(x: unknown): x is League {
  const L = x as League;
  return !!L && typeof L === 'object' && L.v === 1 && typeof L.you === 'string' && L.you.length <= 5 && Array.isArray(L.teams) && L.teams.length >= 8 && L.teams.length <= 40
    && Array.isArray(L.hist) && typeof L.year === 'number' && typeof L.saved === 'number' && L.teams.some((t) => t?.abbr === L.you);
}

export async function getSave(userId: string) {
  const [row] = await db.select({ data: schema.bowlSaves.data }).from(schema.bowlSaves).where(eq(schema.bowlSaves.userId, userId)).limit(1);
  return (row?.data as League | undefined) ?? null;
}

export async function putSave(userId: string, raw: string): Promise<{ ok: true } | { error: string }> {
  if (raw.length > MAX_BYTES) return { error: 'That save is too big.' };
  let L: unknown;
  try { L = JSON.parse(raw); } catch { return { error: 'Invalid save.' }; }
  if (!looksLikeLeague(L)) return { error: 'Invalid save.' };
  let s: ReturnType<typeof summary>;
  try { s = summary(L); } catch { return { error: 'Invalid save.' }; }
  // Sanity limits on the numbers the rankings show.
  const seasons = Math.max(0, Math.min(500, s.seasons | 0));
  const titles = Math.max(0, Math.min(seasons, s.titles | 0));
  const wins = Math.max(0, Math.min(17 * (seasons + 1), s.w | 0)), losses = Math.max(0, Math.min(17 * (seasons + 1), s.l | 0));
  const row = { data: L, team: s.team.slice(0, 5), titles, seasons, wins, losses, updatedAt: new Date() };
  await db.insert(schema.bowlSaves).values({ userId, ...row }).onConflictDoUpdate({ target: schema.bowlSaves.userId, set: row });
  return { ok: true };
}

export async function deleteSave(userId: string) {
  await db.delete(schema.bowlSaves).where(eq(schema.bowlSaves.userId, userId));
}

/** GM rankings: titles, then wins. Hidden accounts never show. */
export async function gmRankings(limit = 25) {
  const u = schema.users, b = schema.bowlSaves;
  return db.select({ username: u.username, team: b.team, titles: b.titles, seasons: b.seasons, wins: b.wins, losses: b.losses })
    .from(b).innerJoin(u, eq(u.id, b.userId))
    .where(and(eq(u.lbHidden, false), gt(b.seasons, 0)))
    .orderBy(desc(b.titles), desc(b.wins), desc(b.seasons)).limit(limit);
}
