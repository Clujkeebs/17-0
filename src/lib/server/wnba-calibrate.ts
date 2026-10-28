import { eq, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import {
  WNBA_ERAS, WNBA_ERA_PICKS_MAX, WNBA_ERA_RESPINS, WNBA_MIN_GP, WNBA_ROUNDS, WNBA_SLOTS, WNBA_TEAM_RESPINS, gradeWnbaRoster, wnbaFit, wnbaPosition,
  type WnbaMode, type WnbaPick, type WnbaSlot,
} from '@/lib/game/fortyfour';
import { createRng } from '@/lib/game/prng';
import { getRedis } from './redis';
import { getWnbaFloor, wnbaFloorKey } from './wnba-floor';
import { eraTeams, lineValue, seasonGames } from './wnba-data';
import { describeStats, statsFromWins } from '@/lib/game/difficulty';

type Cand = { pid: number; name: string; position: string; teamId: number; season: number; value: number; apg: number };
/** A careful drafter using both re-spins goes 44-0 about this often (the same line 82-0 and 162-0 are held to). */
const TARGET_PERFECT = 0.03;
const RESPIN_BELOW = 80;

/** Every 120 slot assignments of five players; the best one is what a careful player would set. */
const PERMS: number[][] = [];
(function perm(a: number[], rest: number[]) { if (!rest.length) { PERMS.push(a); return; } rest.forEach((x, i) => perm([...a, x], [...rest.slice(0, i), ...rest.slice(i + 1)])); })([], [0, 1, 2, 3, 4]);

export function bestLineup(c: Cand[]): WnbaPick[] {
  let best: number[] = PERMS[0], bv = -1;
  for (const p of PERMS) {
    const v = p.reduce((s, ci, si) => s + c[ci].value * wnbaFit(c[ci].position, WNBA_SLOTS[si], c[ci].apg), 0);
    if (v > bv) { bv = v; best = p; }
  }
  return best.map((ci, si) => ({ ...c[ci], slot: WNBA_SLOTS[si] as WnbaSlot }));
}

/** Boards by spin ('now' is the Right now season alone, otherwise the five eras): each franchise's players at their best season there. */
async function boards(mode: WnbaMode) {
  const { nowSeason } = await eraTeams();
  const games = await seasonGames();
  const rows = await db.select({ ps: schema.wnbaPlayerSeasons, p: schema.wnbaPlayers }).from(schema.wnbaPlayerSeasons)
    .innerJoin(schema.wnbaPlayers, eq(schema.wnbaPlayers.id, schema.wnbaPlayerSeasons.playerId))
    .where(gte(schema.wnbaPlayerSeasons.gp, WNBA_MIN_GP));
  const spans = mode === 'now' ? (nowSeason == null ? [] : [{ key: 'now', from: nowSeason, to: nowSeason }]) : WNBA_ERAS.map((e) => ({ key: e.key as string, from: e.from, to: e.to }));
  const out = new Map<string, Map<number, Cand[]>>();
  for (const e of spans) {
    const byTeam = new Map<number, Map<number, Cand>>();
    for (const r of rows) {
      if (r.ps.season < e.from || r.ps.season > e.to) continue;
      const value = lineValue(r.ps, games);
      const m = byTeam.get(r.ps.teamId) ?? new Map<number, Cand>();
      const cur = m.get(r.p.id);
      if (!cur || value > cur.value) m.set(r.p.id, { pid: r.p.id, name: r.p.fullName, position: wnbaPosition(r.p.position, r.ps), teamId: r.ps.teamId, season: r.ps.season, value, apg: r.ps.apg });
      byTeam.set(r.ps.teamId, m);
    }
    out.set(e.key, new Map([...byTeam].filter(([, m]) => m.size >= 5).map(([t, m]) => [t, [...m.values()].sort((a, b) => b.value - a.value)])));
  }
  return out;
}

function simulateWins(b: Awaited<ReturnType<typeof boards>>, policy: 'greedy' | 'respin' | 'random', games: number, floor: number): number[] {
  const eras = [...b.keys()].filter((k) => (b.get(k)?.size ?? 0) > 0);
  const oneEra = eras.length === 1;
  const wins: number[] = [];
  for (let g = 0; g < games; g++) {
    const rng = createRng(`wnbacal:${policy}:${g}`);
    let eraLeft = policy === 'respin' && !oneEra ? WNBA_ERA_RESPINS : 0, teamLeft = policy === 'respin' ? WNBA_TEAM_RESPINS : 0;
    const used = new Set<number>(), picks: Cand[] = [], perEra = new Map<string, number>();
    // Same rule as the game: a player already on the roster cannot be drafted again from another team or era.
    const mine = (c: Cand) => picks.some((x) => x.pid === c.pid);
    // Same rule as the game: each era gives one pick (Right now has a single era, so the rule does not apply there).
    const live = () => (oneEra ? eras : eras.filter((x) => (perEra.get(x) ?? 0) < WNBA_ERA_PICKS_MAX));
    const spin = (era?: string) => {
      const e = era ?? rng.pick(live());
      const teams = [...b.get(e)!.keys()].filter((t) => !used.has(t));
      return { e, t: rng.pick(teams) };
    };
    for (let round = 0; round < WNBA_ROUNDS; round++) {
      let { e, t } = spin();
      if (policy === 'respin') {
        const top = () => (b.get(e)!.get(t)!.find((c) => !mine(c)) ?? b.get(e)!.get(t)![0]).value;
        while (top() < RESPIN_BELOW && (teamLeft || (eraLeft && live().length > 1))) {
          if (teamLeft) { teamLeft--; ({ e, t } = spin(e)); } else { eraLeft--; const cur = e; ({ e, t } = spin(rng.pick(live().filter((x) => x !== cur)))); }
        }
      }
      const list = b.get(e)!.get(t)!.filter((c) => !mine(c));
      picks.push(policy === 'random' ? rng.pick(list) : list[0]);
      used.add(t); perEra.set(e, (perEra.get(e) ?? 0) + 1);
    }
    const r = gradeWnbaRoster(`c${g}`, policy === 'random' ? picks.map((c, i) => ({ ...c, slot: WNBA_SLOTS[i] })) : bestLineup(picks), floor);
    wins.push(r.wins);
  }
  return wins;
}

/** The share of simulated seasons that go 44-0. */
function simulate(b: Awaited<ReturnType<typeof boards>>, policy: 'greedy' | 'respin' | 'random', games: number, floor: number) {
  const wins = simulateWins(b, policy, games, floor);
  return wins.length ? wins.filter((w) => w === 44).length / wins.length : 0;
}

/** Whether a mode's boards are deep enough to fit: every era needs a spread of franchises, Right now needs a full season of them. */
const thin = (b: Awaited<ReturnType<typeof boards>>, mode: WnbaMode) => (mode === 'now' ? (b.get('now')?.size ?? 0) < 8 : WNBA_ERAS.some((e) => (b.get(e.key)?.size ?? 0) < 8));

/** Re-fits the 44-0 win lines (Eras, and Right now on this season alone) after each sync and stores them for grading. */
export async function tuneWnbaFloor(games = 1200): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const mode of ['eras', 'now'] as const) {
    const b = await boards(mode);
    if (thin(b, mode)) { console.warn('[wnba] not enough history to calibrate', mode, 'yet'); continue; }
    let lo = 40, hi = 99;
    for (let i = 0; i < 13; i++) { const mid = (lo + hi) / 2; if (simulate(b, 'respin', games, mid) > TARGET_PERFECT) lo = mid; else hi = mid; }
    // Round up: rounding down can step back over a jump in the odds.
    const floor = Math.ceil(hi * 10) / 10;
    const check = { respin: simulate(b, 'respin', games, floor), greedy: simulate(b, 'greedy', games, floor), random: simulate(b, 'random', games, floor) };
    await getRedis().set(wnbaFloorKey(mode), String(floor));
    console.log('[wnba] win floor', mode, floor, 'P44', Object.entries(check).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' '));
    out[mode] = floor;
  }
  return out;
}

/** Difficulty review for 44-0: a careful (re-spinning), a Hard (no re-spins) and a random drafter at the live lines. */
export async function reportWnbaDifficulty(games = 600) {
  const policies: [string, 'respin' | 'greedy' | 'random'][] = [['careful', 'respin'], ['hard', 'greedy'], ['random', 'random']];
  for (const mode of ['eras', 'now'] as const) {
    const b = await boards(mode);
    if (thin(b, mode)) continue;
    const floor = await getWnbaFloor(mode);
    for (const [name, policy] of policies) console.log('[difficulty] sim 44-0', mode, name, describeStats(statsFromWins(simulateWins(b, policy, games, floor), 44)));
  }
}
