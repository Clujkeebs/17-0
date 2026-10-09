import { db, schema } from '@/db';
import { positionGroup } from '@/lib/game/attributes';
import { FORMATS, MAX_RESPINS, boardOrder, gradePick, gradeRoster, isFantasy, slotAccepts, type FormatKey, type Pick, type PoolKey } from '@/lib/game/seventeen';
import { LEGEND_FRANCHISE } from '@/lib/game/legends';
import { fantasyValue } from '@/lib/game/fantasy';
import { createRng } from '@/lib/game/prng';
import { eq } from 'drizzle-orm';
import { getRedis } from './redis';

type Mode = 'greedy' | 'reroll' | 'random';
// greedy: best player on each team, no re-rolls (Hard mode). reroll: the same, but spends both re-rolls on any
// team whose best available player grades under REROLL_BELOW, which is how people actually play Easy. random: no skill.
const REROLL_BELOW = 88;

/** Every team's draftable picks for a format, built once from the live database. All-time adds both kinds of legends. */
async function boards(format: FormatKey, pool: PoolKey = 'current') {
  const fantasy = isFantasy(format);
  const allTime = pool === 'all-time' && !fantasy;
  const players = await db.select().from(schema.players).where(eq(schema.players.isActive, true));
  const coaches = fantasy ? [] : await db.select().from(schema.coaches);
  const teams = [...new Set(players.map((p) => p.teamId).filter(Boolean))] as number[];
  if (allTime) {
    const [teamRows, hist] = await Promise.all([db.select().from(schema.teams), db.select().from(schema.nflLegends)]);
    for (const p of players.filter((x) => x.isAllTimeGreat)) p.teamId = teamRows.find((t) => t.abbreviation === LEGEND_FRANCHISE[p.slug])?.id ?? null;
    for (const l of hist) players.push({ ...players[0], id: l.id, teamId: l.teamId, fullName: l.fullName, position: l.position, legendGrade: l.grade, legendGroup: l.group } as never);
  }
  const byTeam = new Map<number, Pick[]>();
  for (const t of teams) {
    const list: Pick[] = players.filter((p) => p.teamId === t && (allTime || !p.isAllTimeGreat)).map((p) => ({
      slot: 'QB', teamId: t, name: p.fullName, group: ((p as { legendGroup?: string }).legendGroup ?? positionGroup(p.position)) as Pick['group'], attributes: p.attributes as never,
      ...((p as { legendGrade?: number }).legendGrade !== undefined ? { legendGrade: (p as { legendGrade?: number }).legendGrade } : {}),
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
export async function calibrate(format: FormatKey = '6', games = 3000, winFloor?: number, pool: PoolKey = 'current') {
  const b = await boards(format, pool);
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

export const ALL_TIME_FLOOR_KEY = (format: FormatKey) => `seventeen:win-floor:all-time:${format}`;
const TARGET_P17_ALL_TIME = 0.05;
/** Until the worker fits one, All-time sits a little above the current-rosters line. */
const ALL_TIME_DEFAULT_BUMP = 2;

/**
 * All-time is meant to be harder: legends raise every board, so its win line is fit separately, the lowest
 * floor at which a re-rolling drafter goes 17-0 no more than about 5 percent of the time (current rosters: 11).
 */
export async function tuneAllTimeFloors(games = 1500): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const format of ['6', '12', '16'] as const) {
    const b = await boards(format, 'all-time');
    let lo = 50, hi = 99;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (simulate(format, b, 'reroll', games, mid).p17 > TARGET_P17_ALL_TIME) lo = mid; else hi = mid;
    }
    const floor = Math.ceil(hi * 100) / 100;
    const check = { reroll: simulate(format, b, 'reroll', games, floor).p17, greedy: simulate(format, b, 'greedy', games, floor).p17, random: simulate(format, b, 'random', games, floor).p17 };
    await getRedis().set(ALL_TIME_FLOOR_KEY(format), String(floor));
    console.log('[all-time] win floor', format, floor, 'P17', Object.entries(check).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' '));
    out[format] = floor;
  }
  return out;
}

/** The All-time floor for a roster size, or the current-rosters floor plus a small bump until calibrated. */
export async function getAllTimeFloor(format: FormatKey): Promise<number> {
  const fallback = FORMATS[format].winFloor + ALL_TIME_DEFAULT_BUMP;
  try { const v = Number(await getRedis().get(ALL_TIME_FLOOR_KEY(format))); return Number.isFinite(v) && v > 0 ? v : fallback; }
  catch { return fallback; }
}

export const FLOOR_53_KEY = (pool: PoolKey) => `seventeen:win-floor:53:${pool}`;
const TARGET_P17_53 = 0.06;

/**
 * The 53 is too big for the slot-by-slot simulator, but a pick's grade does not depend on its slot, so each
 * player is graded once and a board's best pick is the best player whose position still has an open spot (the
 * deepest-weight spot first). Re-rolls go on boards whose best pick for a starting spot grades under 80.
 */
export async function tune53Floors(games = 1200): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const fmt = FORMATS['53'];
  for (const pool of ['current', 'all-time'] as const) {
    const b = await boards('53', pool);
    if (b.teams.length < 20) { console.warn('[53] not enough teams to calibrate'); continue; }
    const graded = new Map([...b.byTeam].map(([t, list]) => [t, list.map((p, i) => ({ p, key: `${t}:${i}:${p.name}`, g: gradePick(p) })).sort((x, y) => y.g - x.g)]));
    const rosters: Pick[][] = [];
    for (let g = 0; g < games; g++) {
      const { teams, reserves } = boardOrder(`c53${g}`, b.teams, '53');
      const queue = [...reserves];
      const open = [...fmt.slots].sort((a, c) => c.weight - a.weight).map((d) => d.key);
      const taken = new Set<string>(); const picks: Pick[] = [];
      const best = (t: number) => (graded.get(t) ?? []).find((x) => !taken.has(x.key) && open.some((k) => slotAccepts(k, x.p.group, '53')));
      for (let i = 0; i < teams.length; i++) {
        let t = teams[i]; let c = best(t);
        const starter = (x: typeof c) => !!x && fmt.slots.find((d) => d.key === open.find((k) => slotAccepts(k, x.p.group, '53')))!.weight >= 0.02;
        while (queue.length && (!c || (starter(c) && c.g < 80))) { t = queue.shift()!; c = best(t) ?? c; }
        // Mirrors the game: a board with nobody eligible moves to the next team that has someone.
        for (let j = 0; !c && j < b.teams.length; j++) c = best(b.teams[j]);
        if (!c) break;
        const slot = open.find((k) => slotAccepts(k, c!.p.group, '53'))!;
        picks.push({ ...c.p, slot }); taken.add(c.key); open.splice(open.indexOf(slot), 1);
      }
      if (picks.length === fmt.slots.length) rosters.push(picks);
    }
    const p17 = (floor: number) => rosters.filter((r, i) => gradeRoster(`s${i}`, r, undefined, undefined, [], '53', floor).wins === 17).length / (rosters.length || 1);
    let lo = 40, hi = 99;
    for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (p17(mid) > TARGET_P17_53) lo = mid; else hi = mid; }
    const floor = Math.ceil(hi * 100) / 100;
    await getRedis().set(FLOOR_53_KEY(pool), String(floor));
    console.log('[53] win floor', pool, floor, 'P17', `${(p17(floor) * 100).toFixed(1)}%`, `n=${rosters.length}`);
    out[pool] = floor;
  }
  return out;
}

export async function get53Floor(pool: PoolKey): Promise<number> {
  try { const v = Number(await getRedis().get(FLOOR_53_KEY(pool))); return Number.isFinite(v) && v > 0 ? v : FORMATS['53'].winFloor; }
  catch { return FORMATS['53'].winFloor; }
}
