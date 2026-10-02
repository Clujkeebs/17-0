import { db, schema } from '@/db';
import { positionGroup } from '@/lib/game/attributes';
import { FORMATS, gradePick, gradeRoster, slotAccepts, type FormatKey, type Pick } from '@/lib/game/seventeen';
import { createRng } from '@/lib/game/prng';
import { eq } from 'drizzle-orm';

/** Logs the win distribution for greedy and random drafting against the live ratings, for one roster format. */
export async function calibrate(format: FormatKey = '6', games = 3000) {
const fmt = FORMATS[format];
const players = await db.select().from(schema.players).where(eq(schema.players.isActive, true));
const coaches = await db.select().from(schema.coaches);
const teams = [...new Set(players.map((p) => p.teamId).filter(Boolean))] as number[];
const byTeam = new Map<number, Pick[]>();
for (const t of teams) {
  const list: Pick[] = players.filter((p) => p.teamId === t).map((p) => ({ slot: 'QB', teamId: t, name: p.fullName, group: positionGroup(p.position), attributes: p.attributes as never }));
  for (const c of coaches.filter((c) => c.teamId === t)) list.push({ slot: 'HC', teamId: t, name: c.fullName, group: 'HC', coachImpact: c.coachImpactScore });
  byTeam.set(t, list);
}
const out: Record<string, { strength: number; p17: number }> = {};
for (const mode of ['greedy', 'random']) {
  const dist = new Array(18).fill(0); let st = 0;
  for (let g = 0; g < games; g++) {
    const rng = createRng(`c${mode}${g}`); const board = rng.shuffle(teams).slice(0, fmt.slots.length);
    const picks: Pick[] = []; const open = new Set(fmt.slots.map((d) => d.key));
    for (const t of board) {
      const opts = byTeam.get(t)!.flatMap((p) => [...open].filter((s) => slotAccepts(s, p.group, format)).map((s) => ({ ...p, slot: s })));
      let best: Pick | null = null, bv = -1;
      if (mode === 'random') best = rng.pick(opts); else for (const o of opts) { const v = gradePick(o); if (v > bv) { bv = v; best = o; } }
      if (best) { picks.push(best); open.delete(best.slot); }
    }
    if (picks.length < fmt.slots.length) continue;
    const r = gradeRoster(`s${g}`, picks, undefined, undefined, [], format); dist[r.wins]++; st += r.teamStrength;
  }
  const n = dist.reduce((a, b) => a + b, 0) || 1;
  out[mode] = { strength: st / n, p17: dist[17] / n };
  console.log('[calibrate]', format, mode, `n=${n}`, (st / n).toFixed(1), 'P17', (dist[17] / n * 100).toFixed(1) + '%', dist.join(','));
}
return out;
}
