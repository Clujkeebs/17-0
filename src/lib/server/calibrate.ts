import { db, schema } from '@/db';
import { positionGroup } from '@/lib/game/attributes';
import { SLOTS, gradePick, gradeRoster, slotAccepts, type Pick } from '@/lib/game/seventeen';
import { createRng } from '@/lib/game/prng';
import { eq } from 'drizzle-orm';

/** Logs the win distribution for greedy and random drafting against the live ratings. */
export async function calibrate() {
const players = await db.select().from(schema.players).where(eq(schema.players.isActive, true));
const coaches = await db.select().from(schema.coaches);
const teams = [...new Set(players.map((p) => p.teamId).filter(Boolean))] as number[];
const byTeam = new Map<number, Pick[]>();
for (const t of teams) {
  const list: Pick[] = players.filter((p) => p.teamId === t).map((p) => ({ slot: 'QB', teamId: t, name: p.fullName, group: positionGroup(p.position), attributes: p.attributes as never }));
  for (const c of coaches.filter((c) => c.teamId === t)) list.push({ slot: 'HC', teamId: t, name: c.fullName, group: 'HC', coachImpact: c.coachImpactScore });
  byTeam.set(t, list);
}
for (const mode of ['greedy', 'random']) {
  const dist = new Array(18).fill(0); let st = 0;
  for (let g = 0; g < 3000; g++) {
    const rng = createRng(`c${mode}${g}`); const six = rng.shuffle(teams).slice(0, 6);
    const picks: Pick[] = []; const open = new Set(SLOTS);
    for (const t of six) {
      const opts = byTeam.get(t)!.flatMap((p) => [...open].filter((s) => slotAccepts(s, p.group)).map((s) => ({ ...p, slot: s })));
      let best: Pick | null = null, bv = -1;
      if (mode === 'random') best = rng.pick(opts); else for (const o of opts) { const v = gradePick(o); if (v > bv) { bv = v; best = o; } }
      if (best) { picks.push(best); open.delete(best.slot); }
    }
    if (picks.length < 6) continue;
    const r = gradeRoster(`s${g}`, picks); dist[r.wins]++; st += r.teamStrength;
  }
  const n = dist.reduce((a, b) => a + b, 0);
  console.log('[calibrate]', mode, (st / n).toFixed(1), 'P17', (dist[17] / n * 100).toFixed(1) + '%', dist.join(','));
}

}
