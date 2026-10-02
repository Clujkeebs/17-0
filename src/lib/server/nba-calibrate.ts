import { eq, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { ERAS, NBA_SLOTS, fitMultiplier, gradeNbaRoster, type EraKey, type NbaPick, type NbaSlot } from '@/lib/game/eightytwo';
import { createRng } from '@/lib/game/prng';
import { getRedis } from './redis';
import { NBA_FLOOR_KEY } from './nba-game';

type Cand = { name: string; position: string; teamId: number; season: number; value: number };
const TARGET_P17 = 0.06;
const RESPIN_BELOW = 85;

/** Every 120 slot assignments of five players; the best one is what a careful player would set. */
const PERMS: number[][] = [];
(function perm(a: number[], rest: number[]) { if (!rest.length) { PERMS.push(a); return; } rest.forEach((x, i) => perm([...a, x], [...rest.slice(0, i), ...rest.slice(i + 1)])); })([], [0, 1, 2, 3, 4]);

export function bestLineup(c: Cand[]): NbaPick[] {
  let best: number[] = PERMS[0], bv = -1;
  for (const p of PERMS) {
    const v = p.reduce((s, ci, si) => s + c[ci].value * fitMultiplier(c[ci].position, NBA_SLOTS[si]), 0);
    if (v > bv) { bv = v; best = p; }
  }
  return best.map((ci, si) => ({ ...c[ci], slot: NBA_SLOTS[si] as NbaSlot }));
}

async function boards() {
  const rows = await db.select({ ps: schema.nbaPlayerSeasons, p: schema.nbaPlayers }).from(schema.nbaPlayerSeasons)
    .innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId))
    .where(gte(schema.nbaPlayerSeasons.gp, 20));
  const out = new Map<EraKey, Map<number, Cand[]>>();
  for (const e of ERAS) {
    const byTeam = new Map<number, Map<number, Cand>>();
    for (const r of rows) {
      if (r.ps.season < e.from || r.ps.season > e.to) continue;
      const m = byTeam.get(r.ps.teamId) ?? new Map<number, Cand>();
      const cur = m.get(r.p.id);
      if (!cur || r.ps.value > cur.value) m.set(r.p.id, { name: r.p.fullName, position: r.p.position, teamId: r.ps.teamId, season: r.ps.season, value: r.ps.value });
      byTeam.set(r.ps.teamId, m);
    }
    out.set(e.key, new Map([...byTeam].filter(([, m]) => m.size >= 5).map(([t, m]) => [t, [...m.values()].sort((a, b) => b.value - a.value)])));
  }
  return out;
}

function simulate(b: Awaited<ReturnType<typeof boards>>, mode: 'greedy' | 'respin' | 'random', games: number, floor: number) {
  const eras = ERAS.map((e) => e.key).filter((k) => (b.get(k)?.size ?? 0) > 0);
  let perfect = 0, n = 0;
  for (let g = 0; g < games; g++) {
    const rng = createRng(`nbacal:${mode}:${g}`);
    let eraLeft = mode === 'respin' ? 1 : 0, teamLeft = mode === 'respin' ? 1 : 0;
    const used = new Set<number>(), picks: Cand[] = [];
    const spin = (era?: EraKey) => {
      const e = era ?? rng.pick(eras);
      const teams = [...b.get(e)!.keys()].filter((t) => !used.has(t));
      return { e, t: rng.pick(teams) };
    };
    for (let round = 0; round < 5; round++) {
      let { e, t } = spin();
      if (mode === 'respin') {
        const top = () => b.get(e)!.get(t)![0].value;
        if (top() < RESPIN_BELOW && teamLeft) { teamLeft--; ({ e, t } = spin(e)); }
        if (top() < RESPIN_BELOW && eraLeft) { eraLeft--; ({ e, t } = spin()); }
      }
      const list = b.get(e)!.get(t)!;
      picks.push(mode === 'random' ? rng.pick(list) : list[0]);
      used.add(t);
    }
    const r = gradeNbaRoster(`c${g}`, mode === 'random' ? picks.map((c, i) => ({ ...c, slot: NBA_SLOTS[i] })) : bestLineup(picks), floor);
    n++; if (r.wins === 82) perfect++;
  }
  return perfect / n;
}

/** Fits the 82-0 win line to the stored history: about 6 percent perfect for a drafter who uses both re-spins well. */
export async function tuneNbaFloor(games = 1500): Promise<number | null> {
  const b = await boards();
  if (ERAS.some((e) => (b.get(e.key)?.size ?? 0) < 10)) { console.warn('[nba] not enough history to calibrate yet'); return null; }
  let lo = 50, hi = 99;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (simulate(b, 'respin', games, mid) > TARGET_P17) lo = mid; else hi = mid; }
  // Round up: rounding down can step back over a jump in the odds.
  const floor = Math.ceil(hi * 10) / 10;
  const check = { respin: simulate(b, 'respin', games, floor), greedy: simulate(b, 'greedy', games, floor), random: simulate(b, 'random', games, floor) };
  await getRedis().set(NBA_FLOOR_KEY, String(floor));
  console.log('[nba] win floor', floor, 'P82', Object.entries(check).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' '));
  return floor;
}
