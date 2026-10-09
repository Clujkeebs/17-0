import { and, eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { MLB_FIRST_SEASON, batValue, kindOf, pitchValue, type BatLine, type LeagueNorms, type MlbKind, type PitchLine } from '@/lib/game/onesixtytwo';
import { getRedis } from './redis';

/**
 * 162-0 data from MLB's public Stats API (statsapi.mlb.com): every franchise's full-season roster since 1970
 * with each player's regular-season line for that team. Values are measured against that season's league
 * (OPS for hitters, ERA for pitchers), so eras compare fairly. Runs in the worker; finished seasons are
 * skipped on later runs and the latest season is always refreshed.
 */
const API = 'https://statsapi.mlb.com/api/v1';
/** Bump when the value formulas change: stored seasons are cleared and rebuilt. */
const DATA_VERSION = 2;
/** Bumped when batValue or pitchValue change: one full pass re-reads every season and overwrites values in place (no wipe, so 162-0 stays playable). */
const VALUE_VERSION = 2;

/** The latest season with games: the current year from late March on. */
export function latestMlbSeason(now = new Date()): number {
  return now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

type Json = Record<string, any>;
async function get(url: string, fetchImpl: typeof fetch, tries = 3): Promise<Json | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetchImpl(url, { signal: AbortSignal.timeout(30_000) });
      if (r.status === 404) return null;
      if (r.ok) return (await r.json()) as Json;
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 500 * (i + 1)));
  }
  return null;
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

const num = (x: unknown) => { const n = typeof x === 'string' ? parseFloat(x) : typeof x === 'number' ? x : NaN; return Number.isFinite(n) ? n : 0; };
/** "123.1" innings means 123 and one third. */
export const innings = (x: unknown) => { const s = String(x ?? '0'); const [w, f] = s.split('.'); return num(w) + num(f ?? '0') / 3; };

/** The split for this team when a traded player has several; otherwise his only one. */
function splitFor(stats: Json[] | undefined, group: 'hitting' | 'pitching', teamId: number): Json | null {
  const g = (stats ?? []).find((x) => x.group?.displayName === group);
  const splits = (g?.splits ?? []) as Json[];
  return splits.find((s) => s.team?.id === teamId)?.stat ?? (splits.length === 1 ? splits[0].stat : null);
}
export function batLine(st: Json | null): BatLine | null {
  if (!st) return null;
  const pa = num(st.plateAppearances);
  return pa > 0 ? { pa, ops: num(st.ops), hr: num(st.homeRuns), sb: num(st.stolenBases), avg: num(st.avg), obp: num(st.obp), slg: num(st.slg), rbi: num(st.rbi) } : null;
}
export function pitchLine(st: Json | null): PitchLine | null {
  if (!st) return null;
  const ip = innings(st.inningsPitched);
  return ip > 0 ? { gs: num(st.gamesStarted), g: num(st.gamesPlayed ?? st.gamesPitched), ip, era: num(st.era), so: num(st.strikeOuts), sv: num(st.saves), w: num(st.wins), whip: num(st.whip) } : null;
}

/** League OPS (weighted by plate appearances) and ERA (weighted by innings) from every qualifying line that season. */
export function leagueNorms(rows: { bat: BatLine | null; pitch: PitchLine | null }[]): LeagueNorms {
  let paSum = 0, opsSum = 0, ipSum = 0, erSum = 0;
  for (const r of rows) {
    if (r.bat && r.bat.pa >= 50) { paSum += r.bat.pa; opsSum += r.bat.ops * r.bat.pa; }
    if (r.pitch && r.pitch.ip >= 10) { ipSum += r.pitch.ip; erSum += (r.pitch.era * r.pitch.ip) / 9; }
  }
  return { ops: paSum ? opsSum / paSum : 0.72, era: ipSum ? (erSum * 9) / ipSum : 4 };
}

export async function syncMlb(opts: { from?: number; to?: number; fetchImpl?: typeof fetch } = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const latest = latestMlbSeason();
  const from = opts.from ?? MLB_FIRST_SEASON, to = opts.to ?? latest;
  const lock = await getRedis().set('mlb:sync-lock', '1', 'EX', 3 * 3600, 'NX').catch(() => 'OK');
  if (!lock) { console.log('[mlb] sync already running'); return null; }
  const [ver] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '162-0'), eq(schema.gameConfigs.configKey, 'data_version'))).limit(1);
  if (Number(ver?.configValue ?? 0) < DATA_VERSION) {
    await db.delete(schema.mlbPlayerSeasons);
    if (ver) await db.update(schema.gameConfigs).set({ configValue: DATA_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, ver.id));
    else await db.insert(schema.gameConfigs).values({ gameType: '162-0', configKey: 'data_version', configValue: DATA_VERSION, updatedBy: 'mlb-sync' });
    await getRedis().del('mlb:era-teams').catch(() => {});
    console.log('[mlb] cleared stored seasons for a rebuild, data version', DATA_VERSION);
  }
  const [vv] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '162-0'), eq(schema.gameConfigs.configKey, 'value_version'))).limit(1);
  const rescore = Number(vv?.configValue ?? 1) < VALUE_VERSION && from === MLB_FIRST_SEASON;
  if (rescore) console.log('[mlb] rescoring every season, value version', VALUE_VERSION);
  const done = rescore ? new Set<number>() : new Set((await db.select({ s: schema.mlbPlayerSeasons.season, n: dsql<number>`count(distinct ${schema.mlbPlayerSeasons.teamId})::int` })
    .from(schema.mlbPlayerSeasons).groupBy(schema.mlbPlayerSeasons.season)).filter((r) => r.n >= 24).map((r) => r.s));
  let rows = 0, seasons = 0;
  try {
    for (let season = to; season >= from; season--) {
      if (season < latest - 1 && done.has(season)) continue;
      const teams = ((await get(`${API}/teams?sportId=1&season=${season}`, fetchImpl))?.teams ?? []) as Json[];
      const lines: { playerId: number; name: string; position: string; teamId: number; bat: BatLine | null; pitch: PitchLine | null }[] = [];
      await pool(teams, 4, async (t) => {
        const ts = { teamId: Number(t.id), season, name: String(t.teamName ?? t.clubName ?? t.name), location: String(t.franchiseName ?? t.locationName ?? ''), abbreviation: String(t.abbreviation ?? ''), syncedAt: new Date() };
        await db.insert(schema.mlbTeamSeasons).values(ts).onConflictDoUpdate({ target: [schema.mlbTeamSeasons.teamId, schema.mlbTeamSeasons.season], set: ts });
        const r = await get(`${API}/teams/${t.id}/roster?season=${season}&rosterType=fullSeason&hydrate=person(stats(type=season,season=${season},group=[hitting,pitching]))`, fetchImpl);
        for (const e of (r?.roster ?? []) as Json[]) {
          const p = e.person ?? {};
          if (!p.id || !p.fullName) continue;
          lines.push({ playerId: Number(p.id), name: String(p.fullName), position: String(e.position?.abbreviation ?? p.primaryPosition?.abbreviation ?? 'DH'), teamId: Number(t.id),
            bat: batLine(splitFor(p.stats, 'hitting', Number(t.id))), pitch: pitchLine(splitFor(p.stats, 'pitching', Number(t.id))) });
        }
      });
      const lg = leagueNorms(lines);
      for (const l of lines) {
        const kind = kindOf(l.bat, l.pitch);
        if (!kind) continue;
        // Two-way players count where they were better.
        const asBat = l.bat && l.bat.pa >= 250 ? batValue(l.bat, lg, pitcherPos(l.position) ? 'DH' : l.position) : -1;
        const asPitch = kind !== 'bat' && l.pitch ? pitchValue(l.pitch, lg, kind) : -1;
        const useBat = asBat >= asPitch;
        const k: MlbKind = useBat ? 'bat' : kind;
        const position = useBat ? (pitcherPos(l.position) ? 'DH' : l.position) : kind.toUpperCase();
        await db.insert(schema.mlbPlayers).values({ id: l.playerId, fullName: l.name, position: l.position }).onConflictDoUpdate({ target: schema.mlbPlayers.id, set: { fullName: l.name, position: l.position } });
        const row = { playerId: l.playerId, teamId: l.teamId, season, kind: k, position, line: (useBat ? l.bat : l.pitch) as object, value: useBat ? asBat : asPitch };
        await db.insert(schema.mlbPlayerSeasons).values(row).onConflictDoUpdate({ target: [schema.mlbPlayerSeasons.playerId, schema.mlbPlayerSeasons.teamId, schema.mlbPlayerSeasons.season], set: row });
        rows++;
      }
      seasons++;
      console.log(`[mlb] season ${season}: ${teams.length} teams, league OPS ${lg.ops.toFixed(3)} ERA ${lg.era.toFixed(2)}, ${rows} rows so far`);
    }
    if (rescore) {
      if (vv) await db.update(schema.gameConfigs).set({ configValue: VALUE_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, vv.id));
      else await db.insert(schema.gameConfigs).values({ gameType: '162-0', configKey: 'value_version', configValue: VALUE_VERSION, updatedBy: 'mlb-sync' });
      console.log('[mlb] rescore done, value version', VALUE_VERSION);
    }
  } finally {
    await getRedis().del('mlb:sync-lock').catch(() => {});
  }
  const [c] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.mlbPlayerSeasons);
  const summary = { from, to, seasons, rowsWritten: rows, totalPlayerSeasons: c.n };
  console.log('[mlb] sync done', JSON.stringify(summary));
  return summary;
}
const pitcherPos = (p: string) => ['P', 'SP', 'RP', 'TWP'].includes(p.toUpperCase());

/** Logs a famous team so a deploy can be eyeballed: the 1998 Yankees should show Jeter, Williams, Cone, Rivera near the top. */
export async function mlbSpotCheck(teamId = 147, season = 1998) {
  const rows = await db.select({ name: schema.mlbPlayers.fullName, pos: schema.mlbPlayerSeasons.position, value: schema.mlbPlayerSeasons.value })
    .from(schema.mlbPlayerSeasons).innerJoin(schema.mlbPlayers, eq(schema.mlbPlayers.id, schema.mlbPlayerSeasons.playerId))
    .where(and(eq(schema.mlbPlayerSeasons.teamId, teamId), eq(schema.mlbPlayerSeasons.season, season)));
  console.log(`[mlb] spot check ${season} team ${teamId}`, rows.sort((a, b) => b.value - a.value).slice(0, 10).map((r) => `${r.name} ${r.pos} v${r.value}`).join('; '));
}
