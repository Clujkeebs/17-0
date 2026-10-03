import { db, schema } from '@/db';
import { positionGroup } from '@/lib/game/attributes';
import { FORMATS, MAX_RESPINS, gradePick, gradeRoster, isFantasy, slotAccepts, type FormatKey, type Pick } from '@/lib/game/seventeen';
import { fantasyValue } from '@/lib/game/fantasy';
import { createRng } from '@/lib/game/prng';
import { eq } from 'drizzle-orm';
import { getRedis } from './redis';

type Mode = 'greedy' | 'reroll' | 'random';
// greedy: best player on each team, no re-rolls (Hard mode). reroll: the same, but spends both re-rolls on any
// team whose best available player grades under REROLL_BELOW, which is how people actually play Easy. random: no skill.
const REROLL_BELOW = 88;

/** Every team's draftable picks for a format, built once from the live database. */
async function boards(format: FormatKey) {
  const fantasy = isFantasy(format);
  const players = await db.select().from(schema.players).where(eq(schema.players.isActive, true));
  const coaches = fantasy ? [] : await db.select().from(schema.coaches);
  const teams = [...new Set(players.map((p) => p.teamId).filter(Boolean))] as number[];
  const byTeam = new Map<number, Pick[]>();
  for (const t of teams) {
    const list: Pick[] = players.filter((p) => p.teamId === t).map((p) => ({
      slot: 'QB', teamId: t, name: p.fullName, group: positionGroup(p.position), attributes: p.attributes as never,
      ...(fantasy ? { fantasy: fantasyValue(p.fantasyPpg, p.fantasyGames, p.fantasyProjPpg, p.fantasyRecent) } : {}),
    }));
    for (const c of coaches.filter((c) => c.teamId === t)) list.push({ slot: 'HC', teamId: t, name: c.fullName, group: 'HC', coachImpact: c.coachImpactScore });
    byTeam.set(t, list);
  }
  return { teams, byTeam };
}

function simulate(format: FormatKey, b: Awaited<ReturnType<typeof boards>>, mode: Mode, games: number, winFloor?: number) {
  const fmt = FORMATS[format];
  // Fantasy drafters chase points; everyone else chases the grade.
  const value = (p: Pick) => (isFantasy(format) ? p.fantasy ?? 0 : gradePick(p));
  const dist = new Array(18).fill(0); let st = 0;
  for (let g = 0; g < games; g++) {
    const rng = createRng(`c${mode}${g}`); const order = rng.shuffle(b.teams);
    const board = order.slice(0, fmt.slots.length); const reserves = order.slice(fmt.slots.length, fmt.slots.length + MAX_RESPINS);
    const picks: Pick[] = []; const open = new Set(fmt.slots.map((d) => d.key));
    const bestOn = (t: number) => {
      const opts = b.byTeam.get(t)!.flatMap((p) => [...open].filter((s) => slotAccepts(s, p.group, format)).map((s) => ({ ...p, slot: s })));
      let best: Pick | null = null, bv = -1;
      for (const o of opts) { const v = value(o); if (v > bv) { bv = v; best = o; } }
      return { opts, best, grade: best ? gradePick(best) : 0 };
    };
    for (let t of board) {
      let r = bestOn(t);
      while (mode === 'reroll' && r.grade < REROLL_BELOW && reserves.length) { t = reserves.shift()!; r = bestOn(t); }
      const best = mode === 'random' ? (r.opts.length ? rng.pick(r.opts) : null) : r.best;
      if (best) { picks.push(best); open.delete(best.slot); }
    }
    if (picks.length < fmt.slots.length) continue;
    const r = gradeRoster(`s${g}`, picks, undefined, undefined, [], format, winFloor); dist[r.wins]++; st += r.teamStrength;
  }
  const n = dist.reduce((a, b) => a + b, 0) || 1;
  return { n, dist, strength: st / n, p17: dist[17] / n };
}

/** Logs the win distribution for greedy, re-rolling and random drafting against the live data, for one format. */
export async function calibrate(format: FormatKey = '6', games = 3000, winFloor?: number) {
  const b = await boards(format);
  const out: Record<string, { strength: number; p17: number }> = {};
  for (const mode of ['greedy', 'reroll', 'random'] as const) {
    const r = simulate(format, b, mode, games, winFloor);
    out[mode] = { strength: r.strength, p17: r.p17 };
    console.log('[calibrate]', format, mode, `n=${r.n}`, r.strength.toFixed(1), 'P17', (r.p17 * 100).toFixed(1) + '%', r.dist.join(','));
  }
  return out;
}

export const FANTASY_FLOOR_KEY = 'fantasy:win-floor';
const TARGET_P17 = 0.11;

/**
 * Fantasy points move every week, so the fantasy win line is re-fit after each points sync: the lowest floor
 * (in points per week) at which a re-rolling drafter goes 17-0 no more than about 11 percent of the time.
 */
export async function tuneFantasyFloor(games = 1500): Promise<number | null> {
  const b = await boards('fantasy');
  const valued = [...b.byTeam.values()].flat().filter((p) => (p.fantasy ?? 0) > 0).length;
  if (valued < 150) { console.warn('[fantasy] not enough players with points to calibrate', valued); return null; }
  let lo = 20, hi = 200;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (simulate('fantasy', b, 'reroll', games, mid).p17 > TARGET_P17) lo = mid; else hi = mid;
  }
  const floor = Math.round(hi * 10) / 10;
  const check = { reroll: simulate('fantasy', b, 'reroll', games, floor).p17, greedy: simulate('fantasy', b, 'greedy', games, floor).p17, random: simulate('fantasy', b, 'random', games, floor).p17 };
  await getRedis().set(FANTASY_FLOOR_KEY, String(floor));
  console.log('[fantasy] win floor', floor, 'P17', Object.entries(check).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' '));
  return floor;
}

/** The current fantasy floor, or the code default until the worker has calibrated one. */
export async function getFantasyFloor(): Promise<number> {
  try { const v = Number(await getRedis().get(FANTASY_FLOOR_KEY)); return Number.isFinite(v) && v > 0 ? v : FORMATS.fantasy.winFloor; }
  catch { return FORMATS.fantasy.winFloor; }
}
