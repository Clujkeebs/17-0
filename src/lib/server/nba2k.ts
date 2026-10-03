import { desc, eq, isNotNull } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * NBA 2K overall ratings for current players, from nba2klab.com's public ratings table (robots.txt allows all
 * crawling; credited on every page that shows a 2K number). One page fetch a day; the table lives in the page's
 * Next.js data blob. Players are matched to ESPN's NBA players by name, with the team breaking ties.
 */
const URL_2K = 'https://www.nba2klab.com/nba2k-player-ratings';
export const SOURCE_2K = { name: 'NBA2KLab', url: URL_2K };

export interface Row2k { name: string; team: string; position: string; overall: number }

export function parse2k(html: string): Row2k[] {
  const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!raw) return [];
  const data = (JSON.parse(raw)?.props?.pageProps?.data ?? []) as { Player?: string; Team?: string; Position?: string; Overall?: number }[];
  return data
    .filter((d) => d.Player && typeof d.Overall === 'number' && d.Overall > 0)
    .map((d) => ({ name: String(d.Player), team: String(d.Team ?? ''), position: String(d.Position ?? 'F'), overall: Math.round(d.Overall!) }));
}

/** Name key that ignores accents, punctuation, case and Jr/Sr/II suffixes (Nikola Jokić = Nikola Jokic). */
export const nameKey = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.,']/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z]/g, '');

/** Last-name key, for the fallback match ("Nicolas Claxton" = "Nic Claxton" on the same team). */
export const lastKey = (s: string) => nameKey(s.replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, '').split(/\s+/).slice(-1)[0] ?? '');

export async function sync2k(fetchImpl: typeof fetch = fetch) {
  const r = await fetchImpl(URL_2K, { signal: AbortSignal.timeout(30_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; UnbeatenBot/1.0; +https://playunbeaten.com)' } });
  if (!r.ok) throw new Error(`2K ratings page HTTP ${r.status}`);
  const rows = parse2k(await r.text());
  if (rows.length < 300) throw new Error(`2K ratings page parsed only ${rows.length} players; layout may have changed`);

  // Current franchise names from ESPN ("Philadelphia 76ers"), latest season per franchise.
  const teams = await db.select().from(schema.nbaTeamSeasons).orderBy(desc(schema.nbaTeamSeasons.season));
  const teamByName = new Map<string, number>();
  for (const t of teams) { const k = nameKey(`${t.location} ${t.name}`); if (!teamByName.has(k)) teamByName.set(k, t.teamId); }

  // Candidates: anyone with an NBA season in the last two years, with the team(s) he played for.
  const latest = teams[0]?.season ?? new Date().getUTCFullYear();
  const recent = await db.select({ id: schema.nbaPlayers.id, name: schema.nbaPlayers.fullName, teamId: schema.nbaPlayerSeasons.teamId, season: schema.nbaPlayerSeasons.season })
    .from(schema.nbaPlayers).innerJoin(schema.nbaPlayerSeasons, eq(schema.nbaPlayerSeasons.playerId, schema.nbaPlayers.id));
  const byName = new Map<string, { id: number; teams: Set<number> }[]>();
  const byLastTeam = new Map<string, Set<number>>();
  for (const p of recent.filter((x) => x.season >= latest - 1)) {
    const k = nameKey(p.name);
    const list = byName.get(k) ?? [];
    let e = list.find((x) => x.id === p.id);
    if (!e) { e = { id: p.id, teams: new Set() }; list.push(e); byName.set(k, list); }
    e.teams.add(p.teamId);
    const lt = `${lastKey(p.name)}|${p.teamId}`;
    byLastTeam.set(lt, (byLastTeam.get(lt) ?? new Set()).add(p.id));
  }

  const now = new Date();
  const seen = new Set<number>();
  const unmatched: string[] = [];
  for (const row of rows) {
    const teamId = teamByName.get(nameKey(row.team)) ?? null;
    const cands = byName.get(nameKey(row.name)) ?? [];
    let pick = cands.length === 1 ? cands[0] : cands.find((c) => teamId != null && c.teams.has(teamId));
    // Nicknames: same last name on the same team, and only one such player.
    if (!pick && teamId != null) {
      const same = byLastTeam.get(`${lastKey(row.name)}|${teamId}`);
      if (same?.size === 1) pick = { id: [...same][0], teams: new Set([teamId]) };
    }
    if (!pick) { unmatched.push(row.name); continue; }
    seen.add(pick.id);
    await db.update(schema.nbaPlayers).set({ rating2k: row.overall, rating2kPosition: row.position, rating2kTeamId: teamId, rating2kUpdatedAt: now }).where(eq(schema.nbaPlayers.id, pick.id));
  }
  // Players who dropped out of 2K's table lose their rating.
  const stale = await db.select({ id: schema.nbaPlayers.id }).from(schema.nbaPlayers).where(isNotNull(schema.nbaPlayers.rating2k));
  for (const s of stale) if (!seen.has(s.id)) await db.update(schema.nbaPlayers).set({ rating2k: null, rating2kTeamId: null }).where(eq(schema.nbaPlayers.id, s.id));
  const summary = { parsed: rows.length, matched: seen.size, unmatched: unmatched.length };
  console.log('[2k] synced', JSON.stringify(summary));
  if (unmatched.length) console.log('[2k] unmatched', unmatched.slice(0, 60).join(', '));
  return summary;
}
