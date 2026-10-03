import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { GROUP_RAW } from './data';
import { lastNameKey } from './espn-match';

/**
 * Fantasy points from Sleeper's public API (PPR). Sleeper's player list carries ESPN ids, which our players
 * already have, so most matches are exact; the rest match on team, position and name. Runs in the worker,
 * which can reach the API; the web service only reads the stored numbers.
 */
const API = 'https://api.sleeper.app/v1';
const SKILL = [...GROUP_RAW.QB, ...GROUP_RAW.RB, ...GROUP_RAW.WR, ...GROUP_RAW.TE];
const SLEEPER_SKILL = new Set(['QB', 'RB', 'FB', 'WR', 'TE']);

export interface SleeperPlayer { espn_id?: string | number | null; full_name?: string; first_name?: string; last_name?: string; position?: string; team?: string | null; search_rank?: number | null }
type StatLine = { pts_ppr?: number; gp?: number; gms_active?: number };

async function getJson<T>(url: string, fetchImpl: typeof fetch): Promise<T | null> {
  try {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(30_000), headers: { accept: 'application/json' } });
    if (!r.ok) { console.warn('[fantasy] HTTP', r.status, url); return null; }
    return (await r.json()) as T;
  } catch (e) { console.warn('[fantasy] fetch failed', url, (e as Error).message); return null; }
}

/** Season totals by Sleeper id: PPR points and games played. Falls back to adding up the weekly files. */
export async function seasonStats(season: string, week: number, fetchImpl: typeof fetch): Promise<Map<string, { pts: number; gp: number }>> {
  const out = new Map<string, { pts: number; gp: number }>();
  const total = await getJson<Record<string, StatLine>>(`${API}/stats/nfl/regular/${season}`, fetchImpl);
  for (const [id, s] of Object.entries(total ?? {})) {
    const gp = s.gp ?? s.gms_active ?? 0;
    if (gp > 0 && typeof s.pts_ppr === 'number') out.set(id, { pts: s.pts_ppr, gp });
  }
  if (out.size >= 100 || week <= 1) return out;
  out.clear();
  for (let w = 1; w < week; w++) {
    const wk = await getJson<Record<string, StatLine>>(`${API}/stats/nfl/regular/${season}/${w}`, fetchImpl);
    for (const [id, s] of Object.entries(wk ?? {})) {
      if (typeof s.pts_ppr !== 'number' || !((s.gp ?? s.gms_active ?? 0) > 0)) continue;
      const cur = out.get(id) ?? { pts: 0, gp: 0 };
      out.set(id, { pts: cur.pts + s.pts_ppr, gp: cur.gp + 1 });
    }
  }
  return out;
}

/** Season projections by Sleeper id, as PPR points per game. */
export async function seasonProjections(season: string, fetchImpl: typeof fetch): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const proj = await getJson<Record<string, StatLine>>(`${API}/projections/nfl/regular/${season}`, fetchImpl);
  for (const [id, s] of Object.entries(proj ?? {})) {
    if (typeof s.pts_ppr !== 'number' || s.pts_ppr <= 0) continue;
    const gp = s.gp && s.gp > 0 ? s.gp : 17;
    out.set(id, s.pts_ppr / gp);
  }
  return out;
}

/** Name key that ignores case, punctuation and suffixes, so Brian Robinson Jr. matches Brian Robinson. */
/** Each player's PPR points in every week he played, oldest first. */
export async function weeklyPoints(season: string, week: number, fetchImpl: typeof fetch): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  for (let w = 1; w < week; w++) {
    const wk = await getJson<Record<string, StatLine>>(`${API}/stats/nfl/regular/${season}/${w}`, fetchImpl);
    for (const [id, s] of Object.entries(wk ?? {})) {
      if (typeof s.pts_ppr !== 'number' || !((s.gp ?? s.gms_active ?? 0) > 0)) continue;
      out.set(id, [...(out.get(id) ?? []), s.pts_ppr]);
    }
  }
  return out;
}

/** Recent form: the last four games played, newest weighted 4, then 3, 2, 1. */
export function recentForm(weeks: number[] | undefined): number | null {
  if (!weeks?.length) return null;
  const last = weeks.slice(-4).reverse();
  const w = [4, 3, 2, 1].slice(0, last.length);
  return Math.round((last.reduce((s, v, i) => s + v * w[i], 0) / w.reduce((a, b) => a + b, 0)) * 10) / 10;
}

/** Adds in Sleeper leagues over the last two days, by Sleeper id. */
async function trendingAdds(fetchImpl: typeof fetch): Promise<Map<string, number>> {
  const rows = await getJson<{ player_id: string; count: number }[]>(`${API}/players/nfl/trending/add?lookback_hours=48&limit=300`, fetchImpl);
  return new Map((rows ?? []).map((r) => [String(r.player_id), r.count]));
}

const norm = (s: string) => s.toLowerCase().replace(/[.,']/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z]/g, '');

/** Pick the Sleeper id for one of our players: ESPN id first, then a unique same-team, same-position name match. */
export function matchSleeper(
  p: { espnId: string | null; fullName: string; position: string; team: string | null },
  byEspn: Map<string, string>,
  byTeamName: Map<string, string[]>,
): string | null {
  if (p.espnId && byEspn.has(p.espnId)) return byEspn.get(p.espnId)!;
  if (!p.team) return null;
  const exact = byTeamName.get(`${p.team}:${norm(p.fullName)}`) ?? [];
  if (exact.length === 1) return exact[0];
  const last = byTeamName.get(`${p.team}:last:${lastNameKey(p.fullName)}`) ?? [];
  return last.length === 1 ? last[0] : null;
}

export async function syncFantasy(fetchImpl: typeof fetch = fetch) {
  const state = await getJson<{ season?: string; league_season?: string; week?: number; season_type?: string }>(`${API}/state/nfl`, fetchImpl);
  if (!state) throw new Error('Sleeper state unavailable');
  const season = String(state.league_season ?? state.season);
  const week = state.season_type === 'regular' ? Number(state.week ?? 1) : state.season_type === 'post' ? 19 : 1;
  const [sleeperPlayers, stats, proj, weeks, trend] = await Promise.all([
    getJson<Record<string, SleeperPlayer>>(`${API}/players/nfl`, fetchImpl),
    seasonStats(season, week, fetchImpl),
    seasonProjections(season, fetchImpl),
    weeklyPoints(season, week, fetchImpl),
    trendingAdds(fetchImpl),
  ]);
  if (!sleeperPlayers) throw new Error('Sleeper player list unavailable');

  const byEspn = new Map<string, string>(), byTeamName = new Map<string, string[]>();
  const add = (k: string, id: string) => byTeamName.set(k, [...(byTeamName.get(k) ?? []), id]);
  for (const [id, sp] of Object.entries(sleeperPlayers)) {
    if (!sp.position || !SLEEPER_SKILL.has(sp.position)) continue;
    if (sp.espn_id != null && sp.espn_id !== '') byEspn.set(String(sp.espn_id), id);
    const name = sp.full_name ?? `${sp.first_name ?? ''} ${sp.last_name ?? ''}`.trim();
    if (sp.team && name) { add(`${sp.team}:${norm(name)}`, id); add(`${sp.team}:last:${lastNameKey(name)}`, id); }
  }

  const teams = await db.select({ id: schema.teams.id, abbr: schema.teams.abbreviation }).from(schema.teams);
  const abbr = new Map(teams.map((t) => [t.id, t.abbr]));
  const ours = await db.select({ id: schema.players.id, espnId: schema.players.espnId, fullName: schema.players.fullName, position: schema.players.position, teamId: schema.players.teamId })
    .from(schema.players).where(and(eq(schema.players.isActive, true), eq(schema.players.isAllTimeGreat, false), inArray(schema.players.position, SKILL)));

  const now = new Date();
  let matched = 0, withStats = 0, withProj = 0;
  const unmatched: string[] = [];
  for (const p of ours) {
    const sid = matchSleeper({ ...p, team: p.teamId ? abbr.get(p.teamId) ?? null : null }, byEspn, byTeamName);
    const st = sid ? stats.get(sid) : undefined, pj = sid ? proj.get(sid) : undefined;
    if (sid) matched++; else unmatched.push(p.fullName);
    if (st) withStats++;
    if (pj !== undefined) withProj++;
    await db.update(schema.players).set({
      fantasyPpg: st ? Math.round((st.pts / st.gp) * 10) / 10 : null,
      fantasyGames: st?.gp ?? 0,
      fantasyProjPpg: pj !== undefined ? Math.round(pj * 10) / 10 : null,
      fantasyRecent: sid ? recentForm(weeks.get(sid)) : null,
      sleeperId: sid,
      sleeperRank: sid ? sleeperPlayers[sid]?.search_rank ?? null : null,
      fantasyTrend: sid ? trend.get(sid) ?? 0 : null,
      fantasyUpdatedAt: now,
    }).where(eq(schema.players.id, p.id));
  }
  const summary = { season, week, players: ours.length, matched, withStats, withProj, sleeperStats: stats.size, sleeperProj: proj.size, weeksWithForm: weeks.size, trending: trend.size };
  console.log('[fantasy] synced', JSON.stringify(summary));
  if (unmatched.length) console.log('[fantasy] unmatched', unmatched.length, unmatched.slice(0, 60).join(', '));
  return summary;
}
