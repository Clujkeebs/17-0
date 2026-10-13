import { describe, expect, it } from 'vitest';
import { CATS, PASS_PLAYS, PLAYBOOK, ROUTES, RUN_PLAYS, leadSpot, magnetAim, playOptions, receiverAtPoint, receivers, setupPlay, snap, step, throwAt, throwTo, toCanvas } from '@/components/minigames/bowl/engine';
import { simMyDrives, type BowlTeam } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';

const sk = (n: string, o: number) => ({ name: n, num: 7, pos: 'WR', ovr: o, spd: o, hands: o, route: o, elus: o, strength: o - 10 });
const team = (abbr: string, r: number): BowlTeam => ({ abbr, name: abbr, city: 'C', color: abbr === 'A' ? '#241773' : '#003594', alt: '#fff', logo: null,
  qb: { name: 'Q B', num: 1, ovr: r, arm: r, acc: r, spd: 70 }, rb: { ...sk('R B', r), pos: 'RB' }, targets: [sk('W One', r), sk('W Two', r - 3), { ...sk('T E', r - 8), pos: 'TE' }],
  k: { name: 'K', power: 85, acc: 85 }, ol: { pass: r, run: r }, def: { rush: r, cover: r, tackle: r, speed: r, names: [] }, offense: r, defense: r });

describe('the Unbeaten Bowl playbook', () => {
  it('has tons of routes and plays, every one built from routes that exist', () => {
    expect(Object.keys(ROUTES).length).toBeGreaterThanOrEqual(40);
    expect(PASS_PLAYS.length).toBeGreaterThanOrEqual(40);
    expect(RUN_PLAYS.length).toBeGreaterThanOrEqual(6);
    for (const p of PASS_PLAYS) {
      expect(p.routes).toHaveLength(4);
      for (const r of p.routes!) expect(ROUTES[r], `${p.name} uses ${r}`).toBeTruthy();
    }
    for (const [name, pts] of Object.entries(ROUTES)) {
      expect(pts.length, name).toBeGreaterThanOrEqual(2);
      for (const q of pts) { expect(Math.abs(q.y)).toBeLessThanOrEqual(30); expect(q.x).toBeLessThanOrEqual(50); }
    }
  });

  it('names every play once and files each under a known category', () => {
    expect(new Set(PLAYBOOK.map((p) => p.name)).size).toBe(PLAYBOOK.length);
    for (const p of PLAYBOOK) expect(CATS).toContain(p.cat);
    for (const c of CATS) expect(PLAYBOOK.some((p) => p.cat === c), c).toBe(true);
    expect(PLAYBOOK.filter((p) => p.pa).every((p) => p.cat === 'pa')).toBe(true);
    expect(PLAYBOOK.filter((p) => p.screen).every((p) => p.cat === 'screen')).toBe(true);
  });

  it('offers a different mix every down but always two passes and a run', () => {
    const rng = createRng('mix'); const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const o = playOptions(rng.next);
      expect(o.map((p) => p.call)).toEqual(['pass', 'pass', 'run']);
      expect(['quick', 'mid']).toContain(o[0].cat);
      expect(['deep', 'pa', 'screen']).toContain(o[1].cat);
      o.forEach((p) => seen.add(p.name));
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it('every pass concept and every run sets up and plays out to a result', () => {
    for (const [i, p] of PLAYBOOK.entries()) {
      const rng = createRng(`pb${i}`);
      const s = setupPlay(team('A', 85), team('B', 85), 40, 50, p.call === 'run' ? { ...p, side: 1 } : p, rng.next);
      snap(s);
      for (let t = 0; t < 14 && s.phase !== 'dead'; t += 1 / 60) {
        step(s, 1 / 60);
        if (p.call === 'pass' && s.phase === 'live' && s.t > 1.6) throwTo(s, s.bodies.indexOf(receivers(s)[0]));
      }
      expect(s.outcome, p.name).toBeTruthy();
    }
  });
});

describe('throwing is easier', () => {
  const live = (seed: string) => {
    const rng = createRng(seed);
    const s = setupPlay(team('A', 85), team('B', 85), 30, 40, { name: 'x', call: 'pass', routes: ['slant', 'out', 'seam', 'flat'] }, rng.next);
    snap(s); step(s, 1 / 60); step(s, 1 / 60);
    return s;
  };

  it('a tap on a receiver finds him, and a tap anywhere else finds nobody', () => {
    const s = live('tap');
    const r = receivers(s)[0], at = toCanvas(s, r.x, r.y);
    expect(receiverAtPoint(s, at.x, at.y - 9)).toBe(s.bodies.indexOf(r));
    expect(receiverAtPoint(s, at.x + 6, at.y - 4)).toBe(s.bodies.indexOf(r));
    expect(receiverAtPoint(s, 2, 2)).toBeNull();
  });

  it('a drag that points near a receiver locks onto his lead spot, and one that points at nothing does not', () => {
    const s = live('magnet');
    const idx = s.bodies.indexOf(receivers(s)[1]), spot = leadSpot(s, idx);
    const near = magnetAim(s, { x: spot.x + 2.5, y: spot.y - 2 });
    expect(near.target).toBe(idx);
    expect(near.at).toEqual(spot);
    expect(magnetAim(s, { x: spot.x - 30, y: spot.y }).target).toBeNull();
  });

  it('a tap-throw lands nearer its spot than a free throw to the same spot', () => {
    const miss = (assisted: boolean) => {
      let sum = 0;
      for (let i = 0; i < 300; i++) {
        const s = live(`acc${i}`);
        const at = leadSpot(s, s.bodies.indexOf(receivers(s)[0]));
        if (assisted) throwTo(s, s.bodies.indexOf(receivers(s)[0])); else throwAt(s, at);
        sum += Math.hypot(s.ball!.tx - at.x, s.ball!.ty - at.y);
      }
      return sum / 300;
    };
    expect(miss(true)).toBeLessThan(miss(false));
  });

  it('the receiver adjusts to the ball, so a pass a little off is still caught more often than not', () => {
    let caught = 0, n = 0;
    for (let i = 0; i < 160; i++) {
      const s = live(`adj${i}`);
      const idx = s.bodies.indexOf(receivers(s)[0]);
      const at = leadSpot(s, idx);
      throwAt(s, { x: at.x + 1.2, y: at.y + 1.0 });
      for (let t = 0; t < 4 && s.phase !== 'dead' && s.phase !== 'run'; t += 1 / 60) step(s, 1 / 60);
      n++; if (s.phase === 'run') caught++;
    }
    expect(caught / n).toBeGreaterThan(0.5);
  });
});

describe('quick sim', () => {
  it('plays six drives deterministically from the same luck, each with points and a box score', () => {
    const a = simMyDrives(createRng('sim1').next, team('A', 85), team('B', 85)), b = simMyDrives(createRng('sim1').next, team('A', 85), team('B', 85));
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    for (const d of a) {
      expect([0, 3, 6, 7]).toContain(d.points);
      expect(d.text.length).toBeGreaterThan(3);
      expect(Object.keys(d.stats).length).toBeGreaterThan(0);
      if (d.points >= 6) expect(Object.values(d.stats).some((l) => (l.rectd ?? 0) + (l.rtd ?? 0) > 0)).toBe(true);
    }
    expect(simMyDrives(createRng('sim1').next, team('A', 85), team('B', 85), 3)).toHaveLength(3);
  });

  it('scores more with a better offense against a worse defense, and is a notch below a strong human', () => {
    const avg = (you: number, opp: number) => { const rng = createRng(`avg${you}${opp}`); let sum = 0; for (let i = 0; i < 400; i++) sum += simMyDrives(rng.next, team('A', you), team('B', opp)).reduce((s, d) => s + d.points, 0); return sum / 400; };
    expect(avg(95, 75)).toBeGreaterThan(avg(75, 95) + 4);
    const even = avg(85, 85);
    expect(even).toBeGreaterThan(8); expect(even).toBeLessThan(24);
  });
});
