import type { BowlSkill, BowlTeam } from '@/lib/game/bowl';

/**
 * Unbeaten Bowl, one play at a time. A small top-down simulation in yards (x from your goal line to theirs,
 * y across the field) drawn as pixel art on a low-resolution canvas. Ratings drive everything: route speed,
 * separation, pocket time, throw speed and accuracy, catch odds, tackles and jukes.
 */

export const FIELD_W = 53.3;
const MID = FIELD_W / 2;
export const VIEW_W = 40; // yards across the canvas
export const RES_W = 384, RES_H = 240;
const PX = RES_W / VIEW_W;
const VIEW_H = RES_H / PX;

type Vec = { x: number; y: number };
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const speedOf = (rating: number, base = 6.2, top = 4) => base + (clamp(rating, 40, 99) / 99) * top;

export type Role = 'OL' | 'QB' | 'RB' | 'WR' | 'TE' | 'DL' | 'LB' | 'CB' | 'S';
export interface Body {
  role: Role; side: 'off' | 'def'; x: number; y: number; vx: number; vy: number;
  route?: Vec[]; leg?: number; target?: number; skill?: BowlSkill; label?: string;
  stunned?: number; lastTry?: number; idx?: number;
}

export type PlayCall = 'pass' | 'run';
export type Outcome =
  | { kind: 'gain'; yards: number; text: string }
  | { kind: 'td'; text: string }
  | { kind: 'incomplete'; text: string }
  | { kind: 'int'; text: string }
  | { kind: 'sack'; yards: number; text: string };

export interface PlayState {
  phase: 'pre' | 'live' | 'air' | 'run' | 'dead';
  call: PlayCall; t: number; los: number; firstAt: number;
  bodies: Body[]; carrier: number | null; qb: number;
  ball: { x: number; y: number; z: number; tx: number; ty: number; sx: number; sy: number; t: number; dur: number; target: number } | null;
  rushTime: number; steerY: number | null; juke: number; jukeCd: number; outcome: Outcome | null;
  shake: number; particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
  you: BowlTeam; opp: BowlTeam; rng: () => number; twoPoint: boolean;
}

const WR_ROUTES: [string, (s: number) => Vec[]][] = [
  ['go', () => [{ x: 34, y: 0 }]],
  ['slant', (s) => [{ x: 3, y: 0 }, { x: 20, y: 11 * s }]],
  ['out', (s) => [{ x: 9, y: 0 }, { x: 9.5, y: -14 * s }]],
  ['post', (s) => [{ x: 11, y: 0 }, { x: 34, y: 11 * s }]],
  ['curl', (s) => [{ x: 12, y: 0 }, { x: 10, y: 0.8 * s }]],
  ['dig', (s) => [{ x: 13, y: 0 }, { x: 13.5, y: 20 * s }]],
  ['corner', (s) => [{ x: 11, y: 0 }, { x: 26, y: -12 * s }]],
];
const TE_ROUTES: [string, (s: number) => Vec[]][] = [
  ['drag', (s) => [{ x: 2, y: 0 }, { x: 5, y: 22 * s }]],
  ['seam', () => [{ x: 30, y: 0 }]],
  ['flat', (s) => [{ x: 3, y: 0 }, { x: 4, y: -12 * s }]],
  ['stick', (s) => [{ x: 6, y: 0 }, { x: 6.5, y: 2 * s }]],
];

/** Sets up a snap: formation, routes and coverage for this play. */
export function setupPlay(you: BowlTeam, opp: BowlTeam, los: number, firstAt: number, call: PlayCall, rng: () => number, twoPoint = false): PlayState {
  const bodies: Body[] = [];
  const add = (b: Body) => { bodies.push({ ...b, idx: bodies.length }); return bodies.length - 1; };
  for (const dy of [-3.2, -1.6, 0, 1.6, 3.2]) add({ role: 'OL', side: 'off', x: los - 0.8, y: MID + dy, vx: 0, vy: 0 });
  const qb = add({ role: 'QB', side: 'off', x: los - (call === 'run' ? 3.5 : 5), y: MID, vx: 0, vy: 0, label: you.qb.name });
  add({ role: 'RB', side: 'off', x: los - 7, y: MID + 1.6, vx: 0, vy: 0, skill: you.rb });
  // Receivers split inside the view (about 25 yards tall), so all three are always tappable.
  const spots = [MID - 10.5, MID + 10.5, MID + 4.5];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  you.targets.forEach((sk, i) => {
    const y = spots[i], s = y < MID ? 1 : -1;
    const [, mk] = i === 2 ? pick(TE_ROUTES) : pick(WR_ROUTES);
    const route = mk(s).map((p) => ({ x: los - 0.8 + p.x, y: clamp(y + p.y * 0.75, MID - 11.5, MID + 11.5) }));
    add({ role: i === 2 ? 'TE' : 'WR', side: 'off', x: los - 0.8, y, vx: 0, vy: 0, route, leg: 0, skill: sk, label: String(i + 1) });
  });
  const firstTarget = bodies.findIndex((b) => b.role === 'WR');
  for (const dy of [-2.7, -0.9, 0.9, 2.7]) add({ role: 'DL', side: 'def', x: los + 0.8, y: MID + dy, vx: 0, vy: 0 });
  add({ role: 'CB', side: 'def', x: los + 6, y: spots[0], vx: 0, vy: 0, target: firstTarget });
  add({ role: 'CB', side: 'def', x: los + 6, y: spots[1], vx: 0, vy: 0, target: firstTarget + 1 });
  add({ role: 'LB', side: 'def', x: los + 4.5, y: spots[2], vx: 0, vy: 0, target: firstTarget + 2 });
  add({ role: 'LB', side: 'def', x: los + 5, y: MID - 2.5, vx: 0, vy: 0 });
  add({ role: 'LB', side: 'def', x: los + 5, y: MID + 2.5, vx: 0, vy: 0 });
  add({ role: 'S', side: 'def', x: los + 13, y: MID - 6, vx: 0, vy: 0 });
  add({ role: 'S', side: 'def', x: los + 13, y: MID + 6, vx: 0, vy: 0 });
  // Pocket time: your line's pass blocking against their rush.
  const rushTime = clamp(2.7 + (you.ol.pass - opp.def.rush) * 0.035, 1.7, 3.8);
  return { phase: 'pre', call, t: 0, los, firstAt, bodies, carrier: null, qb, ball: null, rushTime, steerY: null, juke: 0, jukeCd: 0, outcome: null, shake: 0, particles: [], you, opp, rng, twoPoint };
}

export const receivers = (s: PlayState) => s.bodies.filter((b) => b.role === 'WR' || b.role === 'TE');

/** Snap the ball. Run plays hand off to the back. */
export function snap(s: PlayState) {
  s.phase = 'live'; s.t = 0;
}

/** Throw to a receiver: the ball leads him, with error from the QB's accuracy, the distance and the pressure. */
export function throwTo(s: PlayState, idx: number) {
  if (s.phase !== 'live' || s.call !== 'pass') return;
  const qb = s.bodies[s.qb], r = s.bodies[idx];
  const v = 17 + (clamp(s.you.qb.arm, 40, 99) / 99) * 11;
  let t = dist(qb, r) / v;
  for (let i = 0; i < 3; i++) t = dist(qb, { x: r.x + r.vx * t, y: r.y + r.vy * t }) / v;
  const aim = { x: r.x + r.vx * t, y: r.y + r.vy * t };
  const pressure = clamp(s.t / s.rushTime, 0, 1);
  const sigma = (0.35 + dist(qb, aim) * 0.03) * (1.3 - s.you.qb.acc / 100) * (1 + (pressure > 0.75 ? 0.8 : 0));
  const g = () => (s.rng() + s.rng() + s.rng() - 1.5) * 1.4;
  s.ball = { x: qb.x, y: qb.y, z: 1.8, sx: qb.x, sy: qb.y, tx: aim.x + g() * sigma, ty: aim.y + g() * sigma, t: 0, dur: t, target: idx };
  s.phase = 'air';
}

/** The QB tucks it and runs. */
export function scramble(s: PlayState) {
  if (s.phase !== 'live') return;
  s.carrier = s.qb; s.phase = 'run';
}

export function juke(s: PlayState) {
  if (s.phase === 'run' && s.jukeCd <= 0) { s.juke = 0.38; s.jukeCd = 1.4; }
}

function seek(b: Body, to: Vec, speed: number, dt: number, accel = 22) {
  const dx = to.x - b.x, dy = to.y - b.y, d = Math.hypot(dx, dy) || 1;
  const want = { x: (dx / d) * Math.min(speed, d / dt), y: (dy / d) * Math.min(speed, d / dt) };
  const ax = clamp(want.x - b.vx, -accel * dt, accel * dt), ay = clamp(want.y - b.vy, -accel * dt, accel * dt);
  b.vx += ax; b.vy += ay; b.x += b.vx * dt; b.y += b.vy * dt;
}

function burst(s: PlayState, at: Vec, color: string, n = 10) {
  for (let i = 0; i < n; i++) s.particles.push({ x: at.x, y: at.y, vx: (s.rng() - 0.5) * 8, vy: (s.rng() - 0.5) * 8, life: 0.5 + s.rng() * 0.4, color });
}

function end(s: PlayState, o: Outcome) {
  s.outcome = o; s.phase = 'dead';
}

const last = (n?: string) => (n ?? '').split(' ').slice(-1)[0];

export function step(s: PlayState, dt: number) {
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
  s.particles = s.particles.filter((p) => p.life > 0);
  s.shake = Math.max(0, s.shake - dt * 3);
  if (s.phase === 'pre' || s.phase === 'dead') return;
  s.t += dt;
  const qb = s.bodies[s.qb];
  const defSpd = speedOf(s.opp.def.speed, 6.1, 3.6);
  const lag = clamp(0.38 - (s.opp.def.cover - 70) * 0.006, 0.12, 0.5);

  // Offense moves.
  for (const b of s.bodies) {
    if (b.side !== 'off' || s.bodies.indexOf(b) === s.carrier) continue;
    if (b.route && b.skill) {
      const wp = b.route[b.leg ?? 0];
      const v = speedOf(b.skill.spd) * (0.9 + b.skill.route / 1000);
      if (wp) { seek(b, wp, v, dt, 40); if (dist(b, wp) < 0.4) b.leg = (b.leg ?? 0) + 1; }
      else if (b.route.length === 1 || Math.abs(b.vx) > 1) { b.x += b.vx * dt; b.y += b.vy * dt; } // keep running deep
      else { b.vx *= 0.8; b.vy *= 0.8; }
      b.y = clamp(b.y, 0.6, FIELD_W - 0.6);
    } else if (b.role === 'RB' && s.call === 'run' && s.carrier === null) {
      seek(b, { x: qb.x, y: qb.y }, 7, dt);
      if (s.t > 0.45 && dist(b, qb) < 1.2) { s.carrier = s.bodies.indexOf(b); s.phase = 'run'; }
    } else if (b.role === 'RB') {
      seek(b, { x: s.los + 2, y: MID - 6 }, 6, dt); // check-down flat
    } else if (b.role === 'OL' && s.phase === 'run' && s.carrier !== null) {
      const car = s.bodies[s.carrier];
      seek(b, { x: car.x + 2.5, y: b.y + (car.y - b.y) * 0.2 }, 5, dt);
    }
  }

  // Defense.
  for (const b of s.bodies) {
    if (b.side !== 'def') continue;
    if (b.stunned && b.stunned > 0) { b.stunned -= dt; b.vx *= 0.85; b.vy *= 0.85; continue; }
    const pursuing = s.phase === 'run' && s.carrier !== null;
    if (pursuing) {
      const car = s.bodies[s.carrier!];
      const react = b.role === 'DL' ? 0 : b.role === 'LB' ? 0.25 : 0.5;
      const v = speedOf(s.opp.def.speed, 5.8, 3.9) * (0.92 + s.opp.def.tackle / 1200) * (s.call === 'run' && b.role === 'DL' && s.t < 1.2 ? 0.45 + (s.opp.def.rush - s.you.ol.run) / 200 : 1);
      if (s.t > react) seek(b, { x: car.x + car.vx * 0.3, y: car.y + car.vy * 0.3 }, v, dt);
      continue;
    }
    if (b.role === 'DL') {
      const p = clamp(s.t / s.rushTime, 0, 1.2);
      const from = { x: s.los + 0.8, y: b.y };
      const to = { x: qb.x + (b.y < MID ? -0.3 : 0.3), y: qb.y };
      b.x = from.x + (to.x - from.x) * p; b.y = from.y + (to.y - from.y) * Math.min(1, p);
      continue;
    }
    if (b.target !== undefined && s.bodies[b.target]) {
      const r = s.bodies[b.target];
      seek(b, { x: r.x - r.vx * lag + 1.2, y: r.y - r.vy * lag }, defSpd, dt, 16 + s.opp.def.cover / 10);
    } else if (b.role === 'S') {
      const deep = receivers(s).reduce((m, r) => (r.x > m.x ? r : m), receivers(s)[0]);
      seek(b, { x: Math.max(b.x, deep.x + 4), y: b.y + (deep.y - b.y) * 0.4 }, defSpd * 0.9, dt);
    } else {
      seek(b, { x: s.los + 4, y: qb.y + (b.y < MID ? -3 : 3) }, 4, dt); // spy
    }
  }

  // Sack: the rush gets home while the QB still holds it.
  if (s.phase === 'live' && s.call === 'pass' && s.t >= s.rushTime) {
    const loss = 4 + Math.floor(s.rng() * 6);
    s.shake = 1; burst(s, qb, '#E7E5E4', 14);
    return end(s, { kind: 'sack', yards: -loss, text: `Sacked. ${last(s.you.qb.name)} goes down for a loss of ${loss}.` });
  }

  // Ball in the air.
  if (s.phase === 'air' && s.ball) {
    const B = s.ball;
    B.t += dt;
    const k = Math.min(1, B.t / B.dur);
    B.x = B.sx + (B.tx - B.sx) * k; B.y = B.sy + (B.ty - B.sy) * k; B.z = 1.8 + Math.sin(Math.PI * k) * Math.min(6, B.dur * 4);
    if (k >= 1) {
      const r = s.bodies[B.target], land = { x: B.tx, y: B.ty };
      const near = s.bodies.filter((b) => b.side === 'def').reduce((m, b) => Math.min(m, dist(b, land)), 99);
      const rd = dist(r, land);
      if (near < 1.1 && s.rng() < 0.1 + (s.opp.def.cover - 60) / 300) {
        burst(s, land, s.opp.color, 12);
        return end(s, { kind: 'int', text: `Intercepted. The pass for ${last(r.skill?.name)} is picked off.` });
      }
      const hands = r.skill?.hands ?? 70;
      const p = rd < 1.9 ? (0.5 + hands / 210) * (near < 1 ? 0.55 : near < 2 ? 0.82 : 1) * (rd < 0.9 ? 1 : 0.78) : 0;
      if (s.rng() < p) {
        s.carrier = B.target; s.phase = 'run'; s.ball = null; s.t = Math.max(s.t, 1.5);
        r.vx = Math.max(r.vx, 3);
      } else {
        burst(s, land, '#F5F5F4', 6);
        return end(s, { kind: 'incomplete', text: rd < 1.9 ? `Dropped. ${last(r.skill?.name)} cannot hang on${near < 2 ? ' with a defender draped on him' : ''}.` : `Incomplete. Overthrown${near < 2 ? ' into coverage' : ''}.` });
      }
    }
  }

  // Ball carrier.
  if (s.phase === 'run' && s.carrier !== null) {
    const c = s.bodies[s.carrier];
    s.juke = Math.max(0, s.juke - dt); s.jukeCd = Math.max(0, s.jukeCd - dt);
    const sk = c.skill ?? { spd: s.you.qb.spd, elus: 60 } as BowlSkill;
    const v = speedOf(sk.spd, 5.9, 4.4) * (s.juke > 0 ? 1.35 : 1);
    const want = s.steerY ?? c.y;
    const vy = clamp((want - c.y) * 3.2, -v * 0.85, v * 0.85);
    const vx = Math.sqrt(Math.max(0, v * v - vy * vy));
    c.vx += (vx - c.vx) * Math.min(1, dt * 10); c.vy += (vy - c.vy) * Math.min(1, dt * 10);
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.x >= 100) { burst(s, c, s.you.color, 30); return end(s, { kind: 'td', text: `Touchdown! ${last(c.skill?.name ?? s.you.qb.name)} takes it in.` }); }
    if (c.y < 0.3 || c.y > FIELD_W - 0.3) return end(s, gained(s, c, 'Out of bounds'));
    for (const d of s.bodies) {
      if (d.side !== 'def' || (d.stunned ?? 0) > 0 || dist(d, c) > 0.9) continue;
      if (s.t - (d.lastTry ?? -9) < 0.6) continue;
      d.lastTry = s.t;
      const brk = clamp(0.1 + ((sk.elus ?? 60) - s.opp.def.tackle) / 260 + (s.juke > 0 ? 0.45 : 0), 0.04, 0.78);
      if (s.rng() < brk) {
        d.stunned = 1; c.vx *= 0.8; burst(s, d, '#A3E635', 6); s.shake = 0.3;
      } else {
        s.shake = 0.7; burst(s, c, '#D6D3D1', 12);
        return end(s, gained(s, c, 'Tackled'));
      }
    }
  }
}

function gained(s: PlayState, c: Body, how: string): Outcome {
  const yards = Math.round(c.x - s.los);
  const who = last(c.skill?.name ?? s.you.qb.name);
  return { kind: 'gain', yards, text: `${how}. ${who} ${yards >= 0 ? `for ${yards}` : `loses ${-yards}`}${yards === 1 || yards === -1 ? ' yard' : ' yards'}.` };
}

/* ------------------------------------------------------------------ drawing */

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`;
};
const lum = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };

/** A tiny pixel player: shadow, legs (two frames), jersey, helmet with a stripe and a face mask. */
function sprite(ctx: CanvasRenderingContext2D, x: number, y: number, jersey: string, helmet: string, facing: 1 | -1, frame: number, glow = false) {
  const X = Math.round(x), Y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(X - 3, Y + 3, 7, 2);
  if (glow) { ctx.fillStyle = 'rgba(253,224,71,.55)'; ctx.fillRect(X - 4, Y - 7, 9, 12); }
  ctx.fillStyle = '#E7E5E4'; // pants
  ctx.fillRect(X - 2, Y, 5, 2);
  ctx.fillStyle = shade(jersey, 0.45); // legs
  if (frame % 2) { ctx.fillRect(X - 2, Y + 2, 1, 2); ctx.fillRect(X + 2, Y + 2, 1, 1); } else { ctx.fillRect(X - 2, Y + 2, 1, 1); ctx.fillRect(X + 2, Y + 2, 1, 2); }
  ctx.fillStyle = jersey; ctx.fillRect(X - 3, Y - 4, 7, 4); // jersey
  ctx.fillStyle = shade(jersey, 0.7); ctx.fillRect(X - 3, Y - 1, 7, 1);
  ctx.fillStyle = helmet; ctx.fillRect(X - 2, Y - 7, 5, 3); // helmet
  ctx.fillStyle = shade(helmet, 1.35); ctx.fillRect(X, Y - 7, 1, 3); // stripe
  ctx.fillStyle = '#9CA3AF'; ctx.fillRect(facing > 0 ? X + 2 : X - 2, Y - 6, 1, 2); // face mask
}

export function draw(ctx: CanvasRenderingContext2D, s: PlayState, frame: number, showArt: boolean) {
  const focus = s.ball ? { x: s.ball.x, y: s.ball.y } : s.carrier !== null ? s.bodies[s.carrier] : s.bodies[s.qb];
  const shakeX = s.shake > 0 ? (Math.sin(frame * 1.7) * s.shake * 2) : 0;
  const cx = clamp(focus.x + (s.phase === 'pre' || s.phase === 'live' ? 9 : 5), VIEW_W / 2 - 10, 110 - VIEW_W / 2 + 10);
  const cy = clamp(focus.y, VIEW_H / 2, FIELD_W - VIEW_H / 2);
  const ox = cx - VIEW_W / 2, oy = cy - VIEW_H / 2;
  const sx = (x: number) => (x - ox) * PX + shakeX, sy = (y: number) => (y - oy) * PX;
  ctx.imageSmoothingEnabled = false;
  // Turf stripes every five yards, end zones in team colors.
  for (let yd = Math.floor(ox / 5) * 5 - 5; yd < ox + VIEW_W + 5; yd += 5) {
    ctx.fillStyle = yd < 0 ? shade(s.you.color, 0.75) : yd >= 100 ? shade(s.opp.color, 0.75) : (Math.floor(yd / 5) % 2 ? '#2F7D32' : '#2A7230');
    ctx.fillRect(Math.floor(sx(yd)), 0, Math.ceil(5 * PX) + 1, RES_H);
  }
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let yd = Math.ceil(ox / 5) * 5; yd <= ox + VIEW_W; yd += 5) {
    if (yd < 0 || yd > 100) continue;
    ctx.fillRect(Math.round(sx(yd)), 0, 1, RES_H);
    if (yd % 10 === 0 && yd > 0 && yd < 100) {
      const n = String(yd <= 50 ? yd : 100 - yd);
      ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(n, sx(yd), sy(8)); ctx.fillText(n, sx(yd), sy(FIELD_W - 7));
    }
  }
  // Hash marks.
  for (let yd = Math.ceil(ox); yd <= ox + VIEW_W; yd++) { if (yd < 0 || yd > 100) continue; ctx.fillRect(Math.round(sx(yd)), Math.round(sy(MID - 3.1)), 1, 1); ctx.fillRect(Math.round(sx(yd)), Math.round(sy(MID + 3.1)), 1, 1); }
  // Sidelines.
  ctx.fillStyle = '#F5F5F4'; ctx.fillRect(0, Math.round(sy(0)) - 1, RES_W, 1); ctx.fillRect(0, Math.round(sy(FIELD_W)), RES_W, 1);
  // Goal-line end zone lettering.
  for (const [x0, team] of [[-10, s.you], [100, s.opp]] as const) {
    if (x0 + 10 < ox || x0 > ox + VIEW_W) continue;
    ctx.save(); ctx.translate(sx(x0 + 5), sy(MID)); ctx.rotate(x0 < 0 ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(team.name.toUpperCase().slice(0, 10), 0, 0); ctx.restore();
  }
  // Line of scrimmage and the first-down line.
  if (!s.twoPoint) { ctx.fillStyle = '#FACC15'; ctx.fillRect(Math.round(sx(s.firstAt)), 0, 1, RES_H); }
  ctx.fillStyle = '#60A5FA'; ctx.fillRect(Math.round(sx(s.los)), 0, 1, RES_H);
  // Play art before the snap.
  if (showArt && s.call === 'pass') {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (const r of receivers(s)) {
      let from: Vec = r;
      for (const wp of r.route ?? []) {
        const n = Math.ceil(dist(from, wp) * 1.5);
        for (let i = 0; i < n; i += 2) ctx.fillRect(Math.round(sx(from.x + ((wp.x - from.x) * i) / n)), Math.round(sy(from.y + ((wp.y - from.y) * i) / n)), 1, 1);
        from = wp;
      }
    }
  }
  // Players, back to front.
  const defJersey = Math.abs(lum(s.opp.color) - lum(s.you.color)) < 0.12 ? '#F5F5F4' : s.opp.color;
  const order = [...s.bodies.keys()].sort((a, b) => s.bodies[a].y - s.bodies[b].y);
  for (const i of order) {
    const b = s.bodies[i];
    const off = b.side === 'off';
    const moving = Math.hypot(b.vx, b.vy) > 0.5 || s.phase === 'live';
    sprite(ctx, sx(b.x), sy(b.y), off ? s.you.color : defJersey, off ? shade(s.you.color, 0.8) : shade(s.opp.color, 0.8), off ? 1 : -1, moving ? Math.floor(frame / 6) + i : 0, i === s.carrier);
    const tag = (text: string, color: string) => {
      ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const w = Math.ceil(ctx.measureText(text).width) + 4, X = Math.round(sx(b.x)), Y = Math.round(sy(b.y)) - 16;
      ctx.fillStyle = 'rgba(10,10,10,.82)'; ctx.fillRect(X - Math.ceil(w / 2), Y, w, 8);
      ctx.fillStyle = color; ctx.fillText(text, X + 0.5, Y + 7);
    };
    if (s.phase !== 'run' && s.phase !== 'dead' && s.call === 'pass' && (b.role === 'WR' || b.role === 'TE') && b.label) tag(`${b.label} ${last(b.skill?.name).toUpperCase()}`, '#FDE047');
    else if (i === s.carrier && s.phase === 'run') tag(last(b.skill?.name ?? s.you.qb.name).toUpperCase(), '#FFFFFF');
  }
  // Ball.
  const ballAt = s.ball ? { x: s.ball.x, y: s.ball.y, z: s.ball.z } : s.carrier !== null ? { ...s.bodies[s.carrier], z: 0.8 } : { ...s.bodies[s.qb], z: 0.8 };
  if (s.ball) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(sx(ballAt.x)) - 1, Math.round(sy(ballAt.y)) + 2, 3, 1); }
  const bx = Math.round(sx(ballAt.x)), by = Math.round(sy(ballAt.y) - ballAt.z * PX * 0.6);
  ctx.fillStyle = '#7C3A12'; ctx.fillRect(bx - 1, by - 1, 3, 2); ctx.fillStyle = '#F5F5F4'; ctx.fillRect(bx, by - 1, 1, 1);
  // Particles.
  for (const p of s.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(Math.round(sx(p.x)), Math.round(sy(p.y)), 1, 1); }
  ctx.globalAlpha = 1;
  // The call, in big pixel letters.
  if (s.phase === 'dead' && s.outcome) {
    const word = s.outcome.kind === 'td' ? 'TOUCHDOWN!' : s.outcome.kind === 'int' ? 'INTERCEPTED' : s.outcome.kind === 'sack' ? 'SACKED' : s.outcome.kind === 'incomplete' ? 'INCOMPLETE' : s.outcome.yards + s.los >= s.firstAt ? 'FIRST DOWN' : null;
    if (word) {
      const big = s.outcome.kind === 'td';
      ctx.font = `bold ${big ? 26 : 16}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const flash = big && Math.floor(frame / 8) % 2 ? '#FDE047' : '#FFFFFF';
      ctx.fillStyle = '#0A0A0A'; ctx.fillText(word, RES_W / 2 + 2, RES_H / 2 + 2);
      ctx.fillStyle = big ? flash : s.outcome.kind === 'gain' ? '#FDE047' : '#FCA5A5'; ctx.fillText(word, RES_W / 2, RES_H / 2);
    }
  }
  // Pocket clock while the QB holds the ball.
  if (s.phase === 'live' && s.call === 'pass') {
    const p = clamp(s.t / s.rushTime, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, 60, 4);
    ctx.fillStyle = p < 0.6 ? '#22C55E' : p < 0.85 ? '#F59E0B' : '#EF4444'; ctx.fillRect(8, 8, Math.round(60 * (1 - p)), 4);
  }
}

/** Canvas pixel to field yards, for taps. */
export function toField(s: PlayState, px: number, py: number): Vec {
  const focus = s.ball ? { x: s.ball.x, y: s.ball.y } : s.carrier !== null ? s.bodies[s.carrier] : s.bodies[s.qb];
  const cx = clamp(focus.x + (s.phase === 'pre' || s.phase === 'live' ? 9 : 5), VIEW_W / 2 - 10, 110 - VIEW_W / 2 + 10);
  const cy = clamp(focus.y, VIEW_H / 2, FIELD_W - VIEW_H / 2);
  return { x: cx - VIEW_W / 2 + px / PX, y: cy - VIEW_H / 2 + py / PX };
}
