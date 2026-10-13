import { sql as dsql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyDateET } from '@/lib/game/daily';
import { FORMATS, isFantasy, type FormatKey, type PoolKey } from '@/lib/game/seventeen';
import { NBA_WIN_SPAN } from '@/lib/game/eightytwo';
import { MLB_WIN_SPAN } from '@/lib/game/onesixtytwo';
import { WNBA_WIN_SPAN } from '@/lib/game/fortyfour';
import { MIN_PLAYERS, MIN_RUNS, TARGET_TOP_TENTH, lastRunsPerPlayer, modeKey, nextOffset, quantile, wantedOffset } from '@/lib/game/difficulty';
import { get53Floor, getAllTimeFloor, getFantasyFloor } from './calibrate';
import { getNbaFloor } from './nba-floor';
import { getMlbFloor } from './mlb-floor';
import { getWnbaFloor } from './wnba-floor';
import { getRedis } from './redis';
import { BALANCE_DAY_KEY, BALANCE_OFF_KEY, META_KEY, OFFSET_KEY, getOffset } from './difficulty-offset';

/** Every mode that has a win line of its own. */
export const BALANCE_MODES: string[] = [
  ...(['6', '12', '16', '53'] as const).flatMap((f) => (['current', 'all-time'] as const).map((p) => `17-0:${f}:${p}`)),
  '17-0:fantasy:current', '82-0:classic', '82-0:standard', '162-0:eras', '162-0:now', '44-0:eras', '44-0:now',
];
const WINDOW_DAYS = 30;

/** A mode's win line without any offset, and the span it is measured against. */
export async function baseLine(mode: string): Promise<{ base: number; span: number } | null> {
  const [game, a, b] = mode.split(':');
  if (game === '17-0') {
    const format = a as FormatKey, pool = b as PoolKey, fmt = FORMATS[format];
    if (!fmt) return null;
    const base = isFantasy(format) ? await getFantasyFloor() : format === '53' ? await get53Floor(pool) : pool === 'all-time' ? await getAllTimeFloor(format) : fmt.winFloor;
    return { base, span: fmt.winSpan };
  }
  if (game === '82-0') return { base: await getNbaFloor(a === 'standard' ? 'standard' : 'classic'), span: NBA_WIN_SPAN };
  if (game === '162-0') return { base: await getMlbFloor(a === 'now' ? 'now' : 'eras'), span: MLB_WIN_SPAN };
  if (game === '44-0') return { base: await getWnbaFloor(a === 'now' ? 'now' : 'eras'), span: WNBA_WIN_SPAN };
  return null;
}

export interface BalanceMeta { at: string; runs: number; players: number; top: number | null; base: number; wanted: number | null; offset: number; skipped?: string }

/** Eastern hour of the day, 0 to 23. */
const etHour = (d: Date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(d));

/**
 * The daily balance step. For each mode, takes the team strengths (for Fantasy, points above replacement) of the last 30 days of real Casual, Easy runs (each
 * player's latest three), finds the win line that would put the best tenth of them at 94 percent of the season, and
 * moves the mode's offset half way there, at most half a point a day, never more than 15 percent of the span from the
 * simulated line. Quiet unless there are 20 runs from 5 players. Runs once a day in the small hours Eastern so a day's
 * Today boards are graded against one line; `force` (the owner button) runs it now, and `dry` only looks: it records
 * what each mode wants and logs it, and changes nothing.
 */
export async function balanceDifficulty(opts: { force?: boolean; dry?: boolean; now?: Date } = {}): Promise<{ status: 'paused' | 'waiting' | 'done' | 'ran'; changed: string[] }> {
  const redis = getRedis(), now = opts.now ?? new Date();
  if (!opts.force && !opts.dry) {
    if (await redis.get(BALANCE_OFF_KEY)) return { status: 'paused', changed: [] };
    if (etHour(now) >= 6) return { status: 'waiting', changed: [] };
    if ((await redis.get(BALANCE_DAY_KEY)) === dailyDateET(now)) return { status: 'done', changed: [] };
  }
  const changed: string[] = [];
  try {
    const rows = await db.execute<{ game: string; format: string; pool: string; edition: string; who: string; strength: number }>(dsql`
      select game_type as game,
             coalesce(result_data->>'format', '') as format,
             coalesce(result_data->>'pool', result_data->>'mode', '') as pool,
             coalesce(result_data->>'edition', '') as edition,
             coalesce(user_id::text, session_id::text, id::text) as who,
             (case when result_data->>'format' = 'fantasy' then result_data->>'edge' else result_data->>'teamStrength' end)::float8 as strength
      from game_results
      where game_type in ('17-0', '82-0', '162-0', '44-0') and not is_daily and not flagged
        and not coalesce((result_data->>'hard')::boolean, false) and result_data ? 'teamStrength'
        and (coalesce(result_data->>'format', '') <> 'fantasy' or result_data ? 'edge')
        and created_at > now() - make_interval(days => ${WINDOW_DAYS})
      order by created_at desc
      limit 20000`);
    const byMode = new Map<string, { who: string; strength: number }[]>();
    for (const r of rows) {
      const key = modeKey(r.game, { format: r.format, pool: r.pool, edition: r.edition, mode: r.pool });
      if (!key || !Number.isFinite(r.strength)) continue;
      const list = byMode.get(key) ?? [];
      list.push({ who: r.who, strength: r.strength });
      byMode.set(key, list);
    }
    for (const mode of BALANCE_MODES) {
      const line = await baseLine(mode);
      if (!line) continue;
      const runs = lastRunsPerPlayer(byMode.get(mode) ?? []);
      const players = new Set(runs.map((r) => r.who)).size;
      const current = await getOffset(mode);
      const meta: BalanceMeta = { at: now.toISOString(), runs: runs.length, players, top: null, base: line.base, wanted: null, offset: current };
      if (runs.length < MIN_RUNS || players < MIN_PLAYERS) {
        meta.skipped = `needs ${MIN_RUNS} runs from ${MIN_PLAYERS} players, has ${runs.length} from ${players}`;
      } else {
        const strengths = runs.map((r) => r.strength);
        meta.top = Math.round(quantile(strengths, 0.9) * 10) / 10;
        meta.wanted = Math.round(wantedOffset(strengths, line.base, line.span) * 100) / 100;
        const next = Math.round(nextOffset(current, meta.wanted, line.span) * 100) / 100;
        if (!opts.dry && next !== current) { meta.offset = next; await redis.set(OFFSET_KEY(mode), String(next)); changed.push(mode); }
        console.log(opts.dry ? '[difficulty] balance preview' : '[difficulty] balance', mode, `runs=${runs.length} players=${players} top-tenth=${meta.top} line=${line.base}`,
          `target ${(TARGET_TOP_TENTH * 100).toFixed(0)}% wants offset ${meta.wanted >= 0 ? '+' : ''}${meta.wanted}, offset ${current} -> ${next}${opts.dry ? ' (not applied)' : ''}`);
      }
      await redis.set(META_KEY(mode), JSON.stringify(meta), 'EX', 45 * 86400);
    }
    if (!opts.dry) await redis.set(BALANCE_DAY_KEY, dailyDateET(now));
  } catch (e) { console.warn('[difficulty] balance failed', (e as Error).message); }
  return { status: 'ran', changed };
}

/** Every mode's line, offset and last findings, for the owner page. */
export async function difficultyOverview() {
  const redis = getRedis();
  const paused = !!(await redis.get(BALANCE_OFF_KEY).catch(() => null));
  const day = await redis.get(BALANCE_DAY_KEY).catch(() => null);
  const modes = await Promise.all(BALANCE_MODES.map(async (mode) => {
    const [line, offset, raw] = await Promise.all([baseLine(mode).catch(() => null), getOffset(mode), redis.get(META_KEY(mode)).catch(() => null)]);
    let meta: BalanceMeta | null = null;
    try { meta = raw ? (JSON.parse(raw) as BalanceMeta) : null; } catch { /* ignore */ }
    return { mode, base: line ? Math.round(line.base * 100) / 100 : null, span: line?.span ?? null, offset, meta };
  }));
  return { paused, day, modes };
}

/** Back to the simulated lines everywhere. */
export async function resetDifficulty(): Promise<number> {
  const redis = getRedis();
  const keys = BALANCE_MODES.flatMap((m) => [OFFSET_KEY(m), META_KEY(m)]);
  return redis.del(...keys, BALANCE_DAY_KEY);
}
