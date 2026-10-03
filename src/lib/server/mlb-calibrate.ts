import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { MLB_ERAS, MLB_ERA_RESPINS, MLB_SLOTS, MLB_TEAM_RESPINS, draftSlots, gradeMlbRoster, mlbFit, type MlbKind, type MlbMode, type MlbPick, type MlbSlot } from '@/lib/game/onesixtytwo';
import { createRng } from '@/lib/game/prng';
import { getRedis } from './redis';
import { mlbFloorKey } from './mlb-floor';
import { latestMlbSeason } from './mlb-sync';

type Cand = { name: string; position: string; kind: MlbKind; teamId: number; season: number; value: number };
/** A careful drafter using the re-spins goes 162-0 about this often. */
const TARGET_PERFECT = 0.06;
const RESPIN_BELOW = 85;

async function boards(mode: MlbMode) {
  const rows = await db.select({ ps: schema.mlbPlayerSeasons, p: schema.mlbPlayers }).from(schema.mlbPlayerSeasons)
    .innerJoin(schema.mlbPlayers, eq(schema.mlbPlayers.id, schema.mlbPlayerSeasons.playerId));
  const out = new Map<string, Map<number, Cand[]>>();
  const y = latestMlbSeason();
  for (const e of mode === 'now' ? [{ key: 'now', from: y, to: y }] : MLB_ERAS) {
    const byTeam = new Map<number, Map<number, Cand>>();
    for (const r of rows) {
      if (r.ps.season < e.from || r.ps.season > e.to) continue;
      const m = byTeam.get(r.ps.teamId) ?? new Map<number, Cand>();
      const cur = m.get(r.p.id);
      if (!cur || r.ps.value > cur.value) m.set(r.p.id, { name: r.p.fullName, position: r.ps.position, kind: r.ps.kind as MlbKind, teamId: r.ps.teamId, season: r.ps.season, value: r.ps.value });
      byTeam.set(r.ps.teamId, m);
    }
    out.set(e.key, new Map([...byTeam].filter(([, m]) => m.size >= 11).map(([t, m]) => [t, [...m.values()].sort((a, b) => b.value - a.value)])));
  }
  return out;
}

/** The best player on a board for the open spots, and the spot he would take. */
function bestFor(list: Cand[], open: Set<MlbSlot>): { c: Cand; slot: MlbSlot; v: number } | null {
  let best: { c: Cand; slot: MlbSlot; v: number } | null = null;
  // Same rule as the game: his own spot, or DH for a hitter.
  for (const c of list) for (const s of draftSlots(c.position, c.kind)) { if (!open.has(s)) continue; const v = c.value * mlbFit(c.position, c.kind, s); if (v > 0 && (!best || v > best.v)) best = { c, slot: s, v }; }
  return best;
}

function simulate(b: Awaited<ReturnType<typeof boards>>, mode: 'greedy' | 'respin' | 'random', games: number, floor: number) {
  const eras = [...b.keys()].filter((k) => (b.get(k)?.size ?? 0) > 0);
  const oneEra = eras.length === 1;
  let perfect = 0, n = 0;
  for (let g = 0; g < games; g++) {
    const rng = createRng(`mlbcal:${mode}:${g}`);
    let eraLeft = mode === 'respin' && !oneEra ? MLB_ERA_RESPINS : 0, teamLeft = mode === 'respin' ? MLB_TEAM_RESPINS : 0;
    const used = new Set<number>(), open = new Set<MlbSlot>(MLB_SLOTS), picks: MlbPick[] = [];
    const spin = (era?: string) => { const e = era ?? rng.pick(eras); const teams = [...b.get(e)!.keys()].filter((t) => !used.has(t)); return { e, t: rng.pick(teams) }; };
    for (let round = 0; round < MLB_SLOTS.length; round++) {
      let { e, t } = spin();
      if (mode === 'respin') {
        const top = () => bestFor(b.get(e)!.get(t)!, open)?.v ?? 0;
        if (top() < RESPIN_BELOW && teamLeft) { teamLeft--; ({ e, t } = spin(e)); }
        if (top() < RESPIN_BELOW && eraLeft) { eraLeft--; ({ e, t } = spin()); }
      }
      const list = b.get(e)!.get(t)!;
      let pick = bestFor(list, open);
      if (mode === 'random') { const ok = list.filter((c) => draftSlots(c.position, c.kind).some((s) => open.has(s))); const c = ok.length ? rng.pick(ok) : null; pick = c ? bestFor([c], open) : null; }
      if (!pick) break;
      picks.push({ ...pick.c, slot: pick.slot }); open.delete(pick.slot); used.add(t);
    }
    if (picks.length < MLB_SLOTS.length) continue;
    n++; if (gradeMlbRoster(`c${g}`, picks, floor).wins === 162) perfect++;
  }
  return n ? perfect / n : 0;
}

/** Re-fits the 162-0 win lines (Eras, and Right now on this season alone) after each sync and stores them for grading. */
export async function tuneMlbFloor(games = 1200): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const mode of ['eras', 'now'] as const) {
    const b = await boards(mode);
    if (mode === 'eras' && [...b.values()].some((m) => m.size < 12)) { console.warn('[mlb] not enough history to calibrate yet'); continue; }
    if (mode === 'now' && (b.get('now')?.size ?? 0) < 20) { console.warn('[mlb] this season is too thin for Right now yet'); continue; }
    let lo = 50, hi = 99;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (simulate(b, 'respin', games, mid) > TARGET_PERFECT) lo = mid; else hi = mid; }
    const floor = Math.ceil(hi * 10) / 10;
    const check = { respin: simulate(b, 'respin', games, floor), greedy: simulate(b, 'greedy', games, floor), random: simulate(b, 'random', games, floor) };
    await getRedis().set(mlbFloorKey(mode), String(floor));
    console.log('[mlb] win floor', mode, floor, 'P162', Object.entries(check).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(' '));
    out[mode] = floor;
  }
  return out;
}
