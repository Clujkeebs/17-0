import { and, between, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { isListedPosition } from '@/lib/game/eightytwo';
import { HISTORY_FIRST, HISTORY_LAST, historyValues, type HistoryLine } from '@/lib/game/nba-history';
import history from '../../../data/nba-history/history.json';
import { getRedis } from './redis';

/**
 * Loads the '60s, '70s and '80s of 82-0 into the NBA tables. The lines are facts copied once from Wikipedia's career tables
 * (data/nba-history/history.json); ESPN's sync starts with 1990 and never touches the seasons before. Runs from the
 * web seed at boot, writes only when the version below is ahead of the stored one, and owns every row from 1960 to 1989.
 * Bump HISTORY_VERSION when the data file or the way its values are computed changes.
 */
export const HISTORY_VERSION = 2;
const CONFIG_KEY = 'history_version';

type TeamRow = [season: number, franchise: number, location: string, name: string, abbr: string, color: string, logo: string | null];
type PlayerRow = [id: number, name: string, position: string, wikipedia: string, born: string | null, photo?: string | null, photoCredit?: string | null, photoPage?: string | null];
type LineRow = [player: number, franchise: number, season: number, gp: number, mpg: number | null, ppg: number, rpg: number, apg: number, spg: number | null, bpg: number | null, fg: number | null, ft: number | null];
const data = history as unknown as { teams: TeamRow[]; players: PlayerRow[]; lines: LineRow[] };

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** One 82-0 value per stored line, era-adjusted. Pure apart from the data file, so tests can read it. */
export function historyRows() {
  const lines: HistoryLine[] = data.lines.map((l) => ({
    season: l[2], gp: l[3], mpg: l[4] ?? 0, ppg: l[5], rpg: l[6], apg: l[7], spg: l[8] ?? 0, bpg: l[9] ?? 0, tov: null, fgPct: l[10], tpPct: null, ftPct: l[11],
  }));
  const values = historyValues(lines);
  return data.lines.map((l, i) => ({ playerId: l[0], teamId: l[1], season: l[2], gp: l[3], mpg: l[4] ?? 0, ppg: l[5], rpg: l[6], apg: l[7], spg: l[8] ?? 0, bpg: l[9] ?? 0, tov: null, fgPct: l[10], tpPct: null, ftPct: l[11], value: values[i] }));
}

/** Every Wikipedia article the history draws on, by player name, for the credits page. */
export const historySources = () => data.players.map(([, name, , article, , photo, credit, page]) => ({ name, article, photo: photo ?? null, credit: credit ?? null, page: page ?? null })).sort((a, b) => a.name.localeCompare(b.name));

export async function loadNbaHistory(): Promise<{ skipped: true } | { teams: number; players: number; lines: number }> {
  const [ver] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '82-0'), eq(schema.gameConfigs.configKey, CONFIG_KEY))).limit(1);
  if (Number(ver?.configValue ?? 0) >= HISTORY_VERSION) return { skipped: true };

  const rows = historyRows();
  await db.transaction(async (tx) => {
    // This loader owns 1960 to 1979 outright: a new version replaces the rows rather than patching them.
    await tx.delete(schema.nbaPlayerSeasons).where(between(schema.nbaPlayerSeasons.season, HISTORY_FIRST, HISTORY_LAST));
    await tx.delete(schema.nbaTeamSeasons).where(between(schema.nbaTeamSeasons.season, HISTORY_FIRST, HISTORY_LAST));
    for (const part of chunk(data.teams, 300)) {
      await tx.insert(schema.nbaTeamSeasons).values(part.map(([season, teamId, location, name, abbreviation, color, logoUrl]) => ({ teamId, season, name, location, abbreviation, color, logoUrl })));
    }
    // A player ESPN already holds keeps ESPN's record; only a position ESPN left as "NA" is filled in.
    const ids = data.players.map((p) => p[0]);
    const existing = new Map<number, string>();
    for (const part of chunk(ids, 500)) for (const r of await tx.select({ id: schema.nbaPlayers.id, position: schema.nbaPlayers.position }).from(schema.nbaPlayers).where(inArray(schema.nbaPlayers.id, part))) existing.set(r.id, r.position);
    const fresh = data.players.filter((p) => !existing.has(p[0]));
    for (const part of chunk(fresh, 300)) await tx.insert(schema.nbaPlayers).values(part.map(([id, fullName, position, , , photo]) => ({ id, fullName, position, headshot: photo ?? null })));
    // Players kept from an earlier load take the name, position and photo of this one; ESPN's players keep ESPN's photo.
    for (const p of data.players) {
      if (!existing.has(p[0])) continue;
      if (p[0] >= 1_000_000_000) await tx.update(schema.nbaPlayers).set({ fullName: p[1], position: p[2], headshot: p[5] ?? null }).where(eq(schema.nbaPlayers.id, p[0]));
      else if (p[5]) await tx.update(schema.nbaPlayers).set({ headshot: p[5] }).where(and(eq(schema.nbaPlayers.id, p[0]), isNull(schema.nbaPlayers.headshot)));
    }
    for (const p of data.players) if (existing.has(p[0]) && !isListedPosition(existing.get(p[0])!)) await tx.update(schema.nbaPlayers).set({ position: p[2] }).where(eq(schema.nbaPlayers.id, p[0]));
    for (const part of chunk(rows, 400)) await tx.insert(schema.nbaPlayerSeasons).values(part);
    if (ver) await tx.update(schema.gameConfigs).set({ configValue: HISTORY_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, ver.id));
    else await tx.insert(schema.gameConfigs).values({ gameType: '82-0', configKey: CONFIG_KEY, configValue: HISTORY_VERSION, updatedBy: 'nba-history' });
  });
  // The era list and the win line were built without these seasons. Forget both; the worker fits the line again.
  try { await getRedis().del('nba:era-teams', 'nba:win-floor'); } catch { /* no Redis: the caches expire on their own */ }
  return { teams: data.teams.length, players: data.players.length, lines: rows.length };
}
