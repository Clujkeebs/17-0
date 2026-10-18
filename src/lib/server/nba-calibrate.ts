import { eq, gte, isNotNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { ERAS, ERA_PICKS_MAX, ERA_RESPINS, NBA_SLOTS, TEAM_RESPINS, fitMultiplier, gradeNbaRoster, type EraKey, type NbaPick, type NbaSlot } from '@/lib/game/eightytwo';
import { createRng } from '@/lib/game/prng';
import { getRedis } from './redis';
import { NBA_FLOOR_KEY, NBA_FLOOR_KEY_2K, getNbaFloor } from './nba-floor';
import { describeStats, statsFromWins } from '@/lib/game/difficulty';

type Cand = { pid: number; name: string; position: string; teamId: number; season: number; value: number; apg?: number };
/** A careful drafter using both re-spins goes 82-0 about this often (was 6 percent; owners asked for harder). */
const TARGET_P17 = 0.03;
const RESPIN_BELOW = 85;

/** Every 120 slot assignments of five players; the best one is what a careful player would set. */
const PERMS: number[][] = [];
(function perm(a: number[], rest: number[]) { if (!rest.length) { PERMS.push(a); return; } rest.forEach((x, i) => perm([...a, x], [...rest.slice(0, i), ...rest.slice(i + 1)])); })([], [0, 1, 2, 3, 4]);

export function bestLineup(c: Cand[]): NbaPick[] {
  let best: number[] = PERMS[0], bv = -1;
  for (const p of PERMS) {
    const v = p.reduce((s, ci, si) => s + c[ci].value * fitMultiplier(c[ci].position, NBA_SLOTS[si], c[ci].apg), 0);
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
      if (!cur || r.ps.value > cur.value) m.set(r.p.id, { pid: r.p.id, name: r.p.fullName, position: r.p.position, teamId: r.ps.teamId, season: r.ps.season, value: r.ps.value, apg: r.ps.apg });
      byTeam.set(r.ps.teamId, m);
    }
    out.set(e.key, new Map([...byTeam].filter(([, m]) => m.size >= 5).map(([t, m]) => [t, [...m.values()].sort((a, b) => b.value - a.value)])));
  }
  return out;
}

function simulateWins(b: Awaited<ReturnType<typeof boards>>, mode: 'greedy' | 'respin' | 'random', games: number, floor: number): number[] {
  const eras = ERAS.map((e) => e.key).filter((k) => (b.get(k)?.size ?? 0) > 0);
  const wins: number[] = [];
  for (let g = 0; g < games; g++) {
    const rng = createRng(`nbacal:${mode}:${g}`);
    let eraLeft = mode === 'respin' && eras.length > 1 ? ERA_RESPINS : 0, teamLeft = mode === 'respin' ? TEAM_RESPINS : 0;
    const used = new Set<number>(), picks: Cand[] = [], perEra = new Map<EraKey, number>();
    // Same rule as the game: a player already on the roster cannot be drafted again from another team or era.
    const mine = (c: Cand) => picks.some((x) => x.pid === c.pid);
    // Same rule as the game: each era gives one pick (Standard has one era, so the rule does not apply there).
    const live = () => (eras.length === 1 ? eras : eras.filter((x) => (perEra.get(x) ?? 0) < ERA_PICKS_MAX));
    const spin = (era?: EraKey) => {
      const e = era ?? rng.pick(live());
      const teams = [...b.get(e)!.keys()].filter((t) => !used.has(t));
      return { e, t: rng.pick(teams) };
    };
    for (let round = 0; round < 5; round++) {
      let { e, t } = spin();
      if (mode === 'respin') {
        const top = () => (b.get(e)!.get(t)!.find((c) => !mine(c)) ?? b.get(e)!.get(t)![0]).value;
        while (top() < RESPIN_BELOW && (teamLeft || (eraLeft && live().length > 1))) {
          if (teamLeft) { teamLeft--; ({ e, t } = spin(e)); } else { eraLeft--; const cur = e; ({ e, t } = spin(rng.pick(live().filter((x) => x !== cur)))); }
        }
      }
      const list = b.get(e)!.get(t)!.filter((c) => !mine(c));
      picks.push(mode === 'random' ? rng.pick(list) : list[0]);
      used.add(t); perEra.set(e, (perEra.get(e) ?? 0) + 1);
    }
    const r = gradeNbaRoster(`c${g}`, mode === 'random' ? picks.map((c, i) => ({ ...c, slot: NBA_SLOTS[i] })) : bestLineup(picks), floor);
    wins.push(r.wins);
  }
  return wins;
}

/** The share of simulated seasons that go 82-0. */
function simulate(b: Awaited<ReturnType<typeof boards>>, mode: 'greedy' | 'respin' | 'random', games: number, floor: number) {
  const wins = simulateWins(b, mode, games, floor);
  return wins.length ? wins.filter((w) => w === 82).length / wins.length : 0;
}

/** Standard boards: each franchise's current roster on NBA 2K overalls, as one era. */
async function boards2k() {
  const rows = await db.select().from(schema.nbaPlayers).where(isNotNull(schema.nbaPlayers.rating2k));
  const byTeam = new Map<number, Cand[]>();
  for (const p of rows) {
    if (p.rating2kTeamId == null) continue;
    byTeam.set(p.rating2kTeamId, [...(byTeam.get(p.rating2kTeamId) ?? []), { pid: p.id, name: p.fullName, position: p.rating2kPosition ?? p.position, teamId: p.rating2kTeamId, season: 0, value: p.rating2k! }]);
  }
  const era = new Map([...byTeam].filter(([, l]) => l.length >= 5).map(([t, l]) => [t, l.sort((a, b) => b.value - a.value)]));
  return new Map<EraKey, Map<number, Cand[]>>(ERAS.map((e) => [e.key, e.key === '2020s' ? era : new Map()]));
}

/** The same fit for Standard: 2K overalls, current rosters, two team re-spins. */
export async function tune2kFloor(games = 1500): Promise<number | null> {
  const b = await boards2k();
  if ((b.get('2020s')?.size ?? 0) < 20) { console.warn('[nba] not enough 2K ratings to calibrate yet'); return null; }
  let lo = 50, hi = 99;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (simulate(b, 'respin', games, mid) > TARGET_P17) lo = mid; else hi = mid; }
  const floor = Math.ceil(hi * 10) / 10;
  const check = { respin: simulate(b, 'respin', games, floor), greedy: simulate(b, 'greedy', games, floor), random: simulate(b, 'random', games, floor) };
  await getRedis().set(NBA_FLOOR_KEY_2K, String(floor));
  console.log('[nba] 2K win floor', floor, 'P82', Object.entries(check).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' '));
  return floor;
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

/** Difficulty review for 82-0: a careful (re-spinning), a Hard (no re-spins) and a random drafter at the live lines. */
export async function reportNbaDifficulty(games = 800) {
  const policies: [string, 'respin' | 'greedy' | 'random'][] = [['careful', 'respin'], ['hard', 'greedy'], ['random', 'random']];
  const classic = await boards();
  if (!ERAS.some((e) => (classic.get(e.key)?.size ?? 0) < 10)) {
    const floor = await getNbaFloor('classic');
    for (const [name, mode] of policies) console.log('[difficulty] sim 82-0 classic', name, describeStats(statsFromWins(simulateWins(classic, mode, games, floor), 82)));
  }
  const standard = await boards2k();
  if ((standard.get('2020s')?.size ?? 0) >= 20) {
    const floor = await getNbaFloor('standard');
    for (const [name, mode] of policies) console.log('[difficulty] sim 82-0 standard', name, describeStats(statsFromWins(simulateWins(standard, mode, games, floor), 82)));
  }
}
