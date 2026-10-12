import { describe, expect, it } from 'vitest';
import { playOptions, predict, receivers, setupPlay, snap, step, throwAt, throwTo } from '@/components/minigames/bowl/engine';
import type { BowlTeam } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';

const sk = (n: string, o: number) => ({ name: n, num: 1, pos: 'WR', ovr: o, spd: o, hands: o, route: o, elus: o, strength: o - 10 });
const team = (abbr: string, r: number): BowlTeam => ({ abbr, name: abbr, city: 'C', color: abbr === 'A' ? '#241773' : '#003594', alt: '#fff', logo: null,
  qb: { name: 'Q B', num: 1, ovr: r, arm: r, acc: r, spd: 70 }, rb: { ...sk('R B', r), pos: 'RB' }, targets: [sk('W One', r), sk('W Two', r - 3), { ...sk('T E', r - 8), pos: 'TE' }],
  k: { name: 'K', power: 85, acc: 85 }, ol: { pass: r, run: r }, def: { rush: r, cover: r, tackle: r, speed: r, names: [] }, offense: r, defense: r });

/** Plays a few hundred snaps with a simple bot (throws to the most open receiver, runs the called play). */
function simulate(rating: number, plays = 240) {
  const you = team('A', rating), opp = team('B', 85), rng = createRng(`engine${rating}`), R = () => rng.next();
  const st = { att: 0, comp: 0, yds: 0, runs: 0, ryds: 0, ended: 0 };
  for (let n = 0; n < plays; n++) {
    const pass = n % 3 !== 0;
    const play = pass
      ? { name: 'x', call: 'pass' as const, routes: [['slant', 'go', 'curl', 'post', 'out', 'dig'][n % 6], ['curl', 'post', 'slant', 'go', 'in', 'comeback'][n % 6], 'seam', 'flat'] }
      : { name: 'r', call: 'run' as const, run: (['inside', 'outside', 'draw', 'counter'] as const)[n % 4], side: (n % 2 ? 1 : -1) as 1 | -1 };
    const s = setupPlay(you, opp, 30, 40, play, R); snap(s);
    let thrown = false;
    for (let t = 0; t < 20 && s.phase !== 'dead'; t += 1 / 60) {
      step(s, 1 / 60);
      if (pass && !thrown && s.phase === 'live' && s.t > 1.4) {
        const best = receivers(s).map((b) => ({ b, o: Math.min(...s.bodies.filter((d) => d.side === 'def').map((d) => Math.hypot(d.x - b.x, d.y - b.y))) })).sort((a, b) => b.o - a.o)[0];
        if (best.o > 2.6 || s.t > 2.8) { throwTo(s, s.bodies.indexOf(best.b)); thrown = true; }
      }
    }
    const o = s.outcome;
    if (!o) continue;
    st.ended++;
    if (pass) { if (o.kind !== 'sack') { st.att++; if (o.kind === 'gain' || o.kind === 'td') { st.comp++; st.yds += o.kind === 'td' ? 70 : o.yards; } } }
    else { st.runs++; st.ryds += o.kind === 'td' ? 70 : o.kind === 'gain' ? o.yards : 0; }
  }
  return { ...st, comp: st.comp / st.att, ypa: st.yds / st.att, ypc: st.ryds / st.runs };
}

describe('Unbeaten Bowl play engine', () => {
  it('every play ends, and the football looks like football', () => {
    const mid = simulate(85);
    expect(mid.ended).toBe(240);
    expect(mid.comp).toBeGreaterThan(0.45); expect(mid.comp).toBeLessThan(0.85);
    expect(mid.ypa).toBeGreaterThan(3); expect(mid.ypa).toBeLessThan(10);
    expect(mid.ypc).toBeGreaterThan(2.2); expect(mid.ypc).toBeLessThan(6.5);
  });

  it('a better team gains more yards than a worse one', () => {
    const lo = simulate(72), hi = simulate(94);
    expect(hi.ypa + hi.ypc).toBeGreaterThan(lo.ypa + lo.ypc);
  });

  it('is deterministic for a given seed', () => {
    expect(simulate(80, 60)).toEqual(simulate(80, 60));
  });

  it('a throw to a spot lands near it for an accurate passer and far for a poor one', () => {
    const miss = (acc: number) => {
      const t = team('A', 85); t.qb.acc = acc;
      const rng = createRng(`aim${acc}`); let sum = 0;
      for (let i = 0; i < 200; i++) {
        const s = setupPlay(t, team('B', 85), 30, 40, { name: 'x', call: 'pass', routes: ['go', 'go', 'seam', 'check'] }, () => rng.next());
        snap(s); step(s, 1 / 60);
        throwAt(s, { x: 45, y: 26 });
        sum += Math.hypot(s.ball!.tx - 45, s.ball!.ty - 26);
      }
      return sum / 200;
    };
    expect(miss(95)).toBeLessThan(miss(55));
  });

  it('route prediction follows the route, not a straight line', () => {
    const s = setupPlay(team('A', 85), team('B', 85), 30, 40, { name: 'x', call: 'pass', routes: ['out', 'go', 'seam', 'check'] }, createRng('p').next);
    const wr = s.bodies.find((b) => b.label === '1')!;
    const early = predict(wr, 0.4), late = predict(wr, 2);
    expect(late.x).toBeGreaterThan(early.x - 1);
    expect(Math.abs(late.y - wr.y)).toBeGreaterThan(5); // an out route breaks toward the sideline
  });

  it('offers two passes and a run, with a direction on the run', () => {
    const rng = createRng('opts');
    for (let i = 0; i < 20; i++) {
      const o = playOptions(rng.next);
      expect(o.map((p) => p.call)).toEqual(['pass', 'pass', 'run']);
      expect([1, -1]).toContain(o[2].side);
    }
  });
});
