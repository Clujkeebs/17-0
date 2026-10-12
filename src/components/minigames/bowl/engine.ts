import type { BowlSkill, BowlTeam } from '@/lib/game/bowl';

/**
 * Unbeaten Bowl, one play at a time. A top-down simulation in yards (x from your goal line to theirs, y across the
 * field), drawn as pixel art in a 3/4 view that shows the whole width of the field. Ratings drive everything:
 * route speed and quickness against coverage, blocking against the rush, arm and accuracy, hands, tackling and
 * elusiveness. You pick the play, then drag back like a slingshot to throw, or steer and juke with the ball.
 */

export const FIELD_W = 53.3;
const MID = FIELD_W / 2;
export const RES_W = 384, RES_H = 240;
export const VIEW_W = 34; // yards across the canvas
const PXX = RES_W / VIEW_W;
const TOP = 14;
const PXY = (RES_H - TOP - 10) / FIELD_W; // the field's full width fits, squashed for the 3/4 view

type Vec = { x: number; y: number };
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Top speed in yards a second from a 40-99 rating: about 6.5 for a lineman, 10 for a burner. */
const speedOf = (rating: number, base = 6.2, top = 4) => base + (clamp(rating, 40, 99) / 99) * top;

export type Role = 'OL' | 'QB' | 'RB' | 'WR' | 'TE' | 'DL' | 'LB' | 'CB' | 'S';
export interface Body {
  role: Role; side: 'off' | 'def'; x: number; y: number; vx: number; vy: number;
  route?: Vec[]; leg?: number; skill?: BowlSkill; label?: string; name?: string; skin: string;
  /** Defense: whom he covers (index), or a deep zone. Offense line: whom he blocks. */
  man?: number; zone?: 'deep-l' | 'deep-r' | 'deep-m'; blitz?: boolean; block?: number;
  /** A pass rusher's time to beat his block. */
  beatAt?: number;
  stunned?: number; lastTry?: number; stride: number;
}

export type PlayCall = 'pass' | 'run';
export interface Play { name: string; call: PlayCall; routes?: string[]; run?: 'inside' | 'outside' | 'draw' | 'counter'; side?: 1 | -1 }
export type Outcome =
  | { kind: 'gain'; yards: number; text: string }
  | { kind: 'td'; text: string }
  | { kind: 'incomplete'; text: string }
  | { kind: 'int'; text: string }
  | { kind: 'sack'; yards: number; text: string };

export interface Ball { x: number; y: number; z: number; sx: number; sy: number; tx: number; ty: number; t: number; dur: number; peak: number }
export interface PlayState {
  phase: 'pre' | 'live' | 'air' | 'run' | 'dead';
  play: Play; call: PlayCall; t: number; los: number; firstAt: number;
  bodies: Body[]; carrier: number | null; qb: number;
  ball: Ball | null;
  steerY: number | null; juke: number; jukeDir: number; jukeCd: number; dive: number; outcome: Outcome | null;
  shake: number; particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
  you: BowlTeam; opp: BowlTeam; rng: () => number; twoPoint: boolean;
  /** The receiver a pass went to, for the box score. */
  thrown: number | null;
  /** Slingshot aim while dragging: where the ball would land. */
  aim: Vec | null;
  cam: number; coverage: 'man' | 'zone'; blitz: boolean; flash: string | null; flashT: number;
  /** When the ball was caught (defenders need a beat to turn upfield). */
  catchAt: number;
}

// ------------------------------------------------------------------ playbook

/** Route shapes, relative to where the receiver lines up: x downfield, y toward the middle of the field. */
const ROUTES: Record<string, Vec[]> = {
  go: [{ x: 3, y: 0 }, { x: 40, y: 0 }],
  slant: [{ x: 3, y: 0 }, { x: 16, y: 9 }],
  out: [{ x: 8, y: 0 }, { x: 8.6, y: -12 }],
  in: [{ x: 9, y: 0 }, { x: 9.6, y: 16 }],
  post: [{ x: 11, y: 0 }, { x: 34, y: 10 }],
  corner: [{ x: 11, y: 0 }, { x: 28, y: -11 }],
  curl: [{ x: 12, y: 0 }, { x: 10.5, y: 1.2 }],
  comeback: [{ x: 15, y: 0 }, { x: 13, y: -4 }],
  hitch: [{ x: 6, y: 0 }, { x: 5, y: 0.6 }],
  drag: [{ x: 2, y: 1.5 }, { x: 5, y: 22 }],
  dig: [{ x: 13, y: 0 }, { x: 14, y: 18 }],
  seam: [{ x: 3, y: 0.5 }, { x: 36, y: 1.5 }],
  flat: [{ x: 2, y: -2 }, { x: 4, y: -12 }],
  wheel: [{ x: 1, y: -8 }, { x: 6, y: -11 }, { x: 34, y: -12 }],
  swing: [{ x: -1, y: -6 }, { x: 3, y: -12 }],
  check: [{ x: 3, y: -3 }, { x: 5, y: -3 }],
  stick: [{ x: 6, y: 0 }, { x: 6.3, y: -1 }],
};
/** Pass concepts: routes for WR1, WR2, TE, RB. */
const PASS_PLAYS: Play[] = [
  { name: 'Slants', call: 'pass', routes: ['slant', 'slant', 'seam', 'flat'] },
  { name: 'Four verticals', call: 'pass', routes: ['go', 'go', 'seam', 'check'] },
  { name: 'Curl flat', call: 'pass', routes: ['curl', 'curl', 'flat', 'swing'] },
  { name: 'Mesh', call: 'pass', routes: ['drag', 'drag', 'corner', 'flat'] },
  { name: 'Post dig', call: 'pass', routes: ['post', 'dig', 'out', 'check'] },
  { name: 'Smash', call: 'pass', routes: ['hitch', 'corner', 'drag', 'swing'] },
  { name: 'Outs', call: 'pass', routes: ['out', 'out', 'seam', 'check'] },
  { name: 'Comeback post', call: 'pass', routes: ['comeback', 'post', 'stick', 'wheel'] },
  { name: 'Ins and outs', call: 'pass', routes: ['in', 'out', 'stick', 'flat'] },
];
const RUN_PLAYS: Play[] = [
  { name: 'Inside zone', call: 'run', run: 'inside' },
  { name: 'Outside zone', call: 'run', run: 'outside' },
  { name: 'Draw', call: 'run', run: 'draw' },
  { name: 'Counter', call: 'run', run: 'counter' },
];

/** Three plays to choose from before each snap: two passes and a run, different each time. */
export function playOptions(rng: () => number): Play[] {
  const pick = <T,>(xs: T[], n: number) => { const a = [...xs]; const out: T[] = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };
  const side: 1 | -1 = rng() < 0.5 ? 1 : -1;
  return [...pick(PASS_PLAYS, 2), { ...pick(RUN_PLAYS, 1)[0], side }];
}

// ------------------------------------------------------------------ setup

const SKINS = ['#F3CDA6', '#E2B07A', '#C88A55', '#A86B3C', '#80502C', '#5C3820'];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const skinFor = (key: string) => SKINS[hash(key) % SKINS.length];

/** Sets up a snap: formation, routes, the defense's call and who covers whom. */
export function setupPlay(you: BowlTeam, opp: BowlTeam, los: number, firstAt: number, play: Play, rng: () => number, twoPoint = false): PlayState {
  const bodies: Body[] = [];
  const add = (b: Omit<Body, 'vx' | 'vy' | 'stride'>) => { bodies.push({ ...b, vx: 0, vy: 0, stride: 0 }); return bodies.length - 1; };
  const run = play.call === 'run';
  const ol: number[] = [];
  for (const dy of [-4.4, -2.2, 0, 2.2, 4.4]) ol.push(add({ role: 'OL', side: 'off', x: los - 0.9, y: MID + dy, skin: skinFor(`ol${dy}${you.abbr}`) }));
  const qb = add({ role: 'QB', side: 'off', x: los - (run ? 1.6 : 5), y: MID, name: you.qb.name, skin: skinFor(you.qb.name) });
  const rbY = run ? MID : MID + 2;
  const rb = add({ role: 'RB', side: 'off', x: los - (run ? 4.2 : 6.5), y: rbY, skill: you.rb, name: you.rb.name, skin: skinFor(you.rb.name), label: '4' });
  // WR1 wide left, WR2 wide right, TE off the right tackle.
  const spots = [MID - 15, MID + 15, MID + 7];
  const recv: number[] = [];
  you.targets.forEach((sk, i) => {
    const y = spots[i], toward = y < MID ? 1 : -1;
    const shape = play.call === 'pass' ? ROUTES[play.routes![i]] : i === 2 ? [] : [{ x: 6, y: 0 }, { x: 14, y: 0 }];
    const route = shape.map((p) => ({ x: los - 0.9 + p.x, y: clamp(y + p.y * toward, 1.2, FIELD_W - 1.2) }));
    recv.push(add({ role: i === 2 ? 'TE' : 'WR', side: 'off', x: los - (i === 2 ? 0.9 : 0.6), y, route, leg: 0, skill: sk, name: sk.name, label: String(i + 1), skin: skinFor(sk.name) }));
  });
  if (play.call === 'pass') {
    const toward = rbY < MID ? 1 : -1;
    bodies[rb].route = ROUTES[play.routes![3]].map((p) => ({ x: bodies[rb].x + p.x, y: clamp(rbY + p.y * -toward, 1.2, FIELD_W - 1.2) }));
    bodies[rb].leg = 0;
  }
  // Defense: four down linemen, three linebackers, two corners, two safeties.
  const coverage: 'man' | 'zone' = rng() < 0.55 ? 'man' : 'zone';
  const blitz = !twoPoint && rng() < 0.22;
  const dl: number[] = [];
  for (const dy of [-4.8, -1.6, 1.6, 4.8]) dl.push(add({ role: 'DL', side: 'def', x: los + 0.9, y: MID + dy, skin: skinFor(`dl${dy}${opp.abbr}`) }));
  const cbOff = coverage === 'man' ? 2 + rng() * 2 : 6 + rng() * 2;
  add({ role: 'CB', side: 'def', x: los + cbOff, y: spots[0] + 0.6, man: recv[0], skin: skinFor(`cb1${opp.abbr}`) });
  add({ role: 'CB', side: 'def', x: los + cbOff, y: spots[1] - 0.6, man: recv[1], skin: skinFor(`cb2${opp.abbr}`) });
  const lbTE = add({ role: 'LB', side: 'def', x: los + 4.5, y: spots[2] + 1, man: recv[2], skin: skinFor(`lb1${opp.abbr}`) });
  const lbRB = add({ role: 'LB', side: 'def', x: los + 5, y: MID - 2.5, man: rb, blitz, skin: skinFor(`lb2${opp.abbr}`) });
  const lbMid = add({ role: 'LB', side: 'def', x: los + 5, y: MID + 1.5, skin: skinFor(`lb3${opp.abbr}`) });
  if (coverage === 'man') {
    add({ role: 'S', side: 'def', x: los + 13, y: MID, zone: 'deep-m', skin: skinFor(`s1${opp.abbr}`) });
    add({ role: 'S', side: 'def', x: los + 9, y: MID + 7, skin: skinFor(`s2${opp.abbr}`) });
  } else {
    add({ role: 'S', side: 'def', x: los + 13, y: MID - 9, zone: 'deep-l', skin: skinFor(`s1${opp.abbr}`) });
    add({ role: 'S', side: 'def', x: los + 13, y: MID + 9, zone: 'deep-r', skin: skinFor(`s2${opp.abbr}`) });
  }
  // Blocking. Pass: the line takes the four rushers (the center helps), and on a blitz the back stays in.
  // Run: the guards and tackles take the down linemen, the center climbs to the middle linebacker, the tight end
  // seals the other one.
  if (run) {
    [dl[0], dl[1], lbMid, dl[2], dl[3]].forEach((d, i) => { bodies[ol[i]].block = d; });
    bodies[recv[2]].block = lbRB; bodies[recv[2]].route = undefined;
  } else {
    ol.forEach((o, i) => { bodies[o].block = dl[[0, 1, 1, 2, 3][i]]; });
    if (blitz && rng() < 0.55) { bodies[rb].route = undefined; bodies[rb].block = lbRB; }
  }
  void lbTE;
  // How long each man takes to beat his block: the line's blocking against the rush (or the tackling), with luck.
  const pb = run ? you.ol.run : you.ol.pass;
  for (const d of dl) bodies[d].beatAt = clamp((run ? 2.1 : 2.9) * (1 + (pb - opp.def.rush) / 55) * (0.75 + rng() * 0.6), run ? 0.9 : 1.6, run ? 3.6 : 5.5);
  for (const d of [lbMid, lbRB]) bodies[d].beatAt = clamp(1.7 * (1 + (you.ol.run - opp.def.tackle) / 55) * (0.7 + rng() * 0.6), 0.8, 3);
  return {
    phase: 'pre', play, call: play.call, t: 0, los, firstAt, bodies, carrier: null, qb, ball: null, steerY: null, juke: 0, jukeDir: 0, jukeCd: 0, dive: 0,
    outcome: null, shake: 0, particles: [], you, opp, rng, twoPoint, thrown: null, aim: null, cam: los + 8, coverage, blitz, flash: null, flashT: 0, catchAt: -1,
  };
}

export const receivers = (s: PlayState) => s.bodies.filter((b) => b.role === 'WR' || b.role === 'TE' || (b.role === 'RB' && s.call === 'pass'));

export function snap(s: PlayState) { if (s.phase === 'pre') { s.phase = 'live'; s.t = 0; } }

/** How far this QB can throw, in yards. */
export const armRange = (s: PlayState) => 30 + (clamp(s.you.qb.arm, 40, 99) / 99) * 32;

/** Throw to a spot on the field: the ball flies at the QB's arm speed and lands off target by accuracy, distance and pressure. */
export function throwAt(s: PlayState, at: Vec, assisted = false) {
  if (s.phase !== 'live' || s.carrier === s.qb) return;
  const qb = s.bodies[s.qb];
  const d0 = Math.min(dist(qb, at), armRange(s));
  const dir = Math.atan2(at.y - qb.y, at.x - qb.x);
  const target = { x: qb.x + Math.cos(dir) * d0, y: qb.y + Math.sin(dir) * d0 };
  const v = 15 + (clamp(s.you.qb.arm, 40, 99) / 99) * 12;
  const pressure = pressureOn(s);
  const sigma = (0.5 + d0 * 0.05) * (1.28 - s.you.qb.acc / 100) * (pressure > 0.7 ? 1.8 : 1) * (assisted ? 1.25 : 1);
  const g = () => (s.rng() + s.rng() + s.rng() - 1.5) * 1.35;
  const tx = target.x + g() * sigma, ty = target.y + g() * sigma;
  s.ball = { x: qb.x, y: qb.y, z: 2, sx: qb.x, sy: qb.y, tx, ty, t: 0, dur: Math.max(0.25, d0 / v), peak: clamp(d0 * 0.16, 1.2, 9) };
  s.phase = 'air'; s.aim = null;
  // Who the pass was meant for, for the box score: the receiver nearest the landing spot when it gets there.
  let best = -1, bd = 99;
  s.bodies.forEach((b, i) => { if (b.side === 'off' && (b.route || b.role === 'RB')) { const p = { x: b.x + b.vx * s.ball!.dur, y: b.y + b.vy * s.ball!.dur }; const dd = dist(p, { x: tx, y: ty }); if (dd < bd) { bd = dd; best = i; } } });
  s.thrown = best >= 0 && bd < 6 ? best : null;
}

/** Where a receiver will be in t seconds: along the rest of his route at his speed, then on in a straight line. */
export function predict(r: Body, t: number): Vec {
  const v = speedOf(r.skill?.spd ?? 70) * (0.88 + (r.skill?.route ?? 70) / 900);
  let pos: Vec = { x: r.x, y: r.y }, left = v * t, leg = r.leg ?? 0;
  const route = r.route ?? [];
  while (left > 0 && leg < route.length) {
    const d = dist(pos, route[leg]);
    if (d <= left) { left -= d; pos = { ...route[leg] }; leg++; } else { const k = left / d; pos = { x: pos.x + (route[leg].x - pos.x) * k, y: pos.y + (route[leg].y - pos.y) * k }; left = 0; }
  }
  if (left > 0 && Math.abs(r.vx) > 3 && route.length && leg >= route.length) pos = { x: pos.x + (r.vx > 0 ? left : 0), y: pos.y };
  return pos;
}

/** Keyboard throw: lead a receiver the way a QB would (less precise than aiming yourself). */
export function throwTo(s: PlayState, idx: number) {
  if (s.phase !== 'live') return;
  const qb = s.bodies[s.qb], r = s.bodies[idx];
  const v = 15 + (clamp(s.you.qb.arm, 40, 99) / 99) * 12;
  let t = dist(qb, r) / v, at = predict(r, t);
  for (let i = 0; i < 4; i++) { t = dist(qb, at) / v; at = predict(r, t); }
  throwAt(s, at, true);
}

/** The QB tucks it and runs. */
export function scramble(s: PlayState) {
  if (s.phase !== 'live') return;
  s.carrier = s.qb; s.phase = 'run'; s.aim = null;
}

/** A sharp cut in a direction (-1 up, 1 down, 0 either): beats a nearby tackler if the runner is elusive enough. */
export function juke(s: PlayState, dir = 0) {
  if (s.phase !== 'run' || s.jukeCd > 0) return;
  s.juke = 0.3; s.jukeCd = 1.1; s.jukeDir = dir || (s.rng() < 0.5 ? -1 : 1);
  const c = s.bodies[s.carrier!], sk = c.skill ?? ({ elus: 60 } as BowlSkill);
  for (const d of s.bodies) {
    if (d.side !== 'def' || (d.stunned ?? 0) > 0 || dist(d, c) > 2.4) continue;
    if (s.rng() < clamp(0.45 + ((sk.elus ?? 60) - s.opp.def.tackle) / 120, 0.2, 0.85)) { d.stunned = 0.7; burst(s, d, '#A3E635', 6); }
  }
}

/** Dive forward for the last yard or two. Ends the play. */
export function dive(s: PlayState) { if (s.phase === 'run' && s.dive <= 0) s.dive = 0.35; }

/** Steer the runner toward a spot across the field (null: straight ahead). */
export function steer(s: PlayState, y: number | null) { s.steerY = y; }

// ------------------------------------------------------------------ simulation

function seek(b: Body, to: Vec, speed: number, dt: number, accel = 24) {
  const dx = to.x - b.x, dy = to.y - b.y, d = Math.hypot(dx, dy) || 1;
  const sp = Math.min(speed, d / Math.max(dt, 1e-3));
  const ax = clamp((dx / d) * sp - b.vx, -accel * dt, accel * dt), ay = clamp((dy / d) * sp - b.vy, -accel * dt, accel * dt);
  b.vx += ax; b.vy += ay; b.x += b.vx * dt; b.y += b.vy * dt;
  b.stride += Math.hypot(b.vx, b.vy) * dt;
}
function hold(b: Body, dt: number) { b.vx *= Math.max(0, 1 - dt * 8); b.vy *= Math.max(0, 1 - dt * 8); b.x += b.vx * dt; b.y += b.vy * dt; }

function burst(s: PlayState, at: Vec, color: string, n = 10) {
  for (let i = 0; i < n; i++) s.particles.push({ x: at.x, y: at.y, vx: (s.rng() - 0.5) * 9, vy: (s.rng() - 0.5) * 9, life: 0.45 + s.rng() * 0.4, color });
}
function end(s: PlayState, o: Outcome) { s.outcome = o; s.phase = 'dead'; s.aim = null; }
const last = (n?: string) => (n ?? '').split(' ').slice(-1)[0];

/** 0 to 1: how close the rush is to the QB. */
function pressureOn(s: PlayState) {
  const qb = s.bodies[s.qb];
  const near = s.bodies.filter((b) => b.side === 'def' && (b.role === 'DL' || b.blitz)).reduce((m, b) => Math.min(m, dist(b, qb)), 99);
  return clamp(1 - (near - 1) / 5, 0, 1);
}

export function step(s: PlayState, dt: number) {
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
  s.particles = s.particles.filter((p) => p.life > 0);
  s.shake = Math.max(0, s.shake - dt * 3);
  s.flashT = Math.max(0, s.flashT - dt);
  // Camera: ahead of the QB before the throw, on the ball in the air, on the runner after.
  const focus = s.ball ? s.ball.x + 3 : s.carrier !== null ? s.bodies[s.carrier].x + 6 : s.bodies[s.qb].x + 11;
  s.cam += (clamp(focus, VIEW_W / 2 - 10, 110 - VIEW_W / 2 + 10) - s.cam) * Math.min(1, dt * 4);
  if (s.phase === 'pre' || s.phase === 'dead') return;
  s.t += dt;
  const qb = s.bodies[s.qb];
  const runPlay = s.call === 'run';
  const carrier = s.carrier !== null ? s.bodies[s.carrier] : null;

  // ---- offense
  s.bodies.forEach((b, i) => {
    if (b.side !== 'off' || i === s.carrier) return;
    if (b.role === 'QB') {
      if (runPlay) { if (s.t < 0.6) seek(b, { x: s.los - 2.6, y: MID - 0.4 }, 4, dt); else seek(b, { x: s.los - 4, y: MID - 3 * (s.play.side ?? 1) }, 5, dt); }
      else seek(b, { x: s.los - 7, y: MID }, 5.5, dt, 18); // drop back
      return;
    }
    if (b.role === 'RB' && runPlay && s.carrier === null) {
      // Take the handoff.
      seek(b, { x: qb.x - 0.3, y: qb.y + 0.3 }, 7, dt);
      if (s.t > (s.play.run === 'draw' ? 1.0 : 0.4) && dist(b, qb) < 1.3) { s.carrier = i; s.phase = 'run'; b.vx = 5; s.flash = 'HANDOFF'; s.flashT = 0.6; }
      return;
    }
    if (b.route && !(runPlay && b.role === 'TE')) {
      const wp = b.route[b.leg ?? 0];
      const sk = b.skill;
      const v = speedOf(sk?.spd ?? 70) * (0.88 + (sk?.route ?? 70) / 900);
      // Once the ball is caught or handed off, everyone turns into a blocker.
      if (carrier) { const d = nearestDef(s, carrier, 9); if (d) { seek(b, { x: d.x - 0.6, y: d.y }, v * 0.8, dt); return; } }
      if (wp) { seek(b, wp, v, dt, 26 + (sk?.route ?? 70) / 8); if (dist(b, wp) < 0.5) b.leg = (b.leg ?? 0) + 1; }
      else if (Math.hypot(b.vx, b.vy) > 1 && (b.route.length < 2 || Math.abs(b.vx) > 3)) { b.x += b.vx * dt; b.y += b.vy * dt; b.stride += Math.hypot(b.vx, b.vy) * dt; }
      else hold(b, dt);
      b.y = clamp(b.y, 0.6, FIELD_W - 0.6);
      return;
    }
    if (b.role === 'OL' || b.role === 'TE' || (b.role === 'RB' && b.block !== undefined)) {
      // Engaged blockers are moved with their man (in the defense pass).
      if (b.block !== undefined && engaged(s, b, s.bodies[b.block])) return;
      const tgt = b.block !== undefined && !beaten(s, s.bodies[b.block]) ? s.bodies[b.block] : nearestDef(s, b);
      if (!tgt) { hold(b, dt); return; }
      if (runPlay && carrier) {
        // Lead block: get between the nearest threat and the runner.
        const th = nearestDef(s, carrier, 6) ?? tgt;
        seek(b, { x: (th.x + carrier.x) / 2 + 0.5, y: th.y }, 5.5, dt);
      } else seek(b, { x: tgt.x - 0.9, y: tgt.y + (tgt.y - b.y) * 0.2 }, runPlay ? 5 : 3.5, dt, 14);
      return;
    }
    hold(b, dt);
  });

  // ---- defense
  const defSpd = speedOf(s.opp.def.speed, 6.0, 3.8);
  const lag = clamp(0.32 - (s.opp.def.cover - 70) * 0.006, 0.1, 0.42); // reaction to a receiver's cut
  s.bodies.forEach((d, di) => {
    if (d.side !== 'def') return;
    if (d.stunned && d.stunned > 0) { d.stunned -= dt; hold(d, dt); return; }
    // A blocked man: held up by the lineman in front of him until he sheds (rushers) or the play goes past.
    const blocker = s.bodies.find((o) => o.side === 'off' && (o.role === 'OL' || o.role === 'TE') && dist(o, d) < 1.6 && o.x < d.x + 0.6);
    const mine = s.bodies.filter((o) => o.side === 'off' && o.block === di && engaged(s, o, d));
    if (mine.length && !beaten(s, d)) {
      const tgt = carrier ?? qb;
      {
        // Engaged: the rusher works toward the ball but his blockers stay square in front of him, giving ground
        // slowly, so the pocket bends instead of breaking.
        if (runPlay && s.carrier === null || runPlay && carrier && carrier.x < s.los + 3) {
          // The line drives its men off the ball and away from the hole, opening a lane.
          const side = s.play.side ?? 1;
          const holeY = s.play.run === 'outside' ? MID + 9 * side : s.play.run === 'counter' ? MID - 4 * side : MID + 1.4 * side;
          const away = d.y === holeY ? 1 : Math.sign(d.y - holeY);
          const win = clamp(0.35 + (s.you.ol.run - s.opp.def.rush) / 60, 0.1, 0.9);
          seek(d, { x: d.x - 0.2, y: d.y + away * 2 }, 1 + win * 3.2, dt, 12);
        } else seek(d, { x: d.x - 1, y: d.y + clamp(tgt.y - d.y, -1, 1) }, runPlay ? 0.9 : 0.75, dt, 8);
        mine.forEach((o, k) => {
          o.vx = 0; o.vy = 0;
          o.y += (d.y + (mine.length > 1 ? (k ? 0.5 : -0.5) : 0) - o.y) * Math.min(1, dt * 10);
          o.x = d.x - 0.95;
          o.stride += dt * 1.5;
        });
        return;
      }
    }
    if (d.role === 'DL' || (d.blitz && !runPlay)) {
      // Free rusher (beaten his man, or a blitzer after reading the snap).
      if (d.blitz && s.t < 0.35) { hold(d, dt); return; }
      const tgt = carrier ?? qb;
      const v = d.blitz ? defSpd * 0.85 : speedOf(s.opp.def.rush, 5.4, 2.6);
      seek(d, lead(tgt, d, v), v, dt);
      return;
    }
    if (carrier) {
      // Pursuit: take an angle on the runner; blocked defenders are slowed until they shed.
      // Read, then react: linebackers first, the secondary after.
      const react = runPlay ? (d.role === 'LB' ? 1.1 : d.role === 'S' ? 1.25 : 1.15) : (d.role === 'LB' ? 0.2 : 0.3);
      if (s.t < (s.catchAt >= 0 ? s.catchAt + 0.4 : react)) { seek(d, { x: d.x - 0.3, y: d.y + (carrier.y - d.y) * 0.15 }, 3, dt); return; }
      if (blocker && s.rng() > dt * (0.8 + (s.opp.def.rush - s.you.ol.run) / 60)) { seek(d, { x: d.x - 0.2, y: d.y + (carrier.y - d.y) * 0.15 }, 1.6, dt, 8); return; }
      const v = defSpd * (0.94 + s.opp.def.tackle / 1500);
      seek(d, lead(carrier, d, v), v, dt);
      return;
    }
    if (s.ball) {
      // The ball is in the air: break on where it is going, after a beat.
      const land = { x: s.ball.tx, y: s.ball.ty };
      const read = 0.32 - (s.opp.def.cover - 60) / 400;
      if (s.ball.t > read && dist(d, land) < 14) { seek(d, land, defSpd * 1.02, dt); return; }
    }
    if (d.man !== undefined && s.coverage === 'man') {
      const r = s.bodies[d.man];
      if (!r.route) { seek(d, { x: r.x + 0.6, y: r.y }, defSpd * 0.7, dt); return; }
      // Keep a cushion that closes as he comes off the line, trail his cuts by a beat (the lag), stay on his hip;
      // faster receivers pull away on go routes.
      const cushion = clamp(3.2 - (r.x - s.los) * 0.22, 0.7, 3.2);
      const want = { x: Math.max(r.x - r.vx * lag + cushion, s.los + 1), y: r.y - r.vy * lag + (r.y < MID ? 0.35 : -0.35) };
      seek(d, want, defSpd * (0.96 + (s.opp.def.cover - 70) / 500), dt, 18 + s.opp.def.cover / 9);
      return;
    }
    if (d.role === 'S' || d.zone) {
      // Deep help: stay deeper than the deepest receiver on his side.
      const half = d.zone === 'deep-l' ? (r: Body) => r.y < MID + 4 : d.zone === 'deep-r' ? (r: Body) => r.y > MID - 4 : () => true;
      const deep = receivers(s).filter(half).reduce<Body | null>((m, r) => (!m || r.x > m.x ? r : m), null);
      const y = deep ? deep.y + (MID - deep.y) * 0.25 : d.y;
      seek(d, { x: Math.max(s.los + 9, (deep?.x ?? s.los) + 5), y }, defSpd * 0.92, dt);
      return;
    }
    // Zone underneath: sit in a spot and close on the nearest receiver who enters it.
    const home = { x: s.los + (d.role === 'CB' ? 7 : 5.5), y: clamp(d.y, 4, FIELD_W - 4) };
    const near = receivers(s).filter((r) => dist(r, home) < 8).sort((a, b) => dist(a, d) - dist(b, d))[0];
    seek(d, near ? { x: near.x + 0.8, y: near.y } : home, defSpd * 0.9, dt);
  });

  // ---- sack
  if (s.phase === 'live' && s.call === 'pass') {
    for (const d of s.bodies) {
      if (d.side !== 'def' || (d.stunned ?? 0) > 0 || dist(d, qb) > 0.85) continue;
      if ((d.lastTry ?? -9) < s.t - 0.5 && s.rng() < clamp(0.25 + (s.you.qb.spd - 70) / 200, 0.08, 0.4)) { d.lastTry = s.t; d.stunned = 0.6; burst(s, qb, '#A3E635', 6); continue; }
      const loss = Math.max(1, Math.round(s.los - qb.x + 1 + s.rng() * 2));
      s.shake = 1; burst(s, qb, '#E7E5E4', 14);
      return end(s, { kind: 'sack', yards: -loss, text: `Sacked. ${last(s.you.qb.name)} goes down for a loss of ${loss}.` });
    }
  }

  // ---- the ball in the air
  if (s.phase === 'air' && s.ball) {
    const B = s.ball;
    B.t += dt;
    const k = Math.min(1, B.t / B.dur);
    B.x = B.sx + (B.tx - B.sx) * k; B.y = B.sy + (B.ty - B.sy) * k; B.z = 2 + Math.sin(Math.PI * k) * B.peak - k;
    // A low ball can be batted on the way.
    if (k > 0.25 && k < 0.92 && B.z < 2.4) {
      const d = s.bodies.find((x) => x.side === 'def' && dist(x, B) < 0.7);
      if (d && s.rng() < 0.08) { burst(s, B, '#F5F5F4', 8); return end(s, { kind: 'incomplete', text: 'Batted down.' }); }
    }
    if (k >= 1) return catchBall(s);
  }

  // ---- the ball carrier
  if (s.phase === 'run' && carrier) {
    s.juke = Math.max(0, s.juke - dt); s.jukeCd = Math.max(0, s.jukeCd - dt);
    const sk = carrier.skill ?? ({ spd: s.you.qb.spd, elus: 62, strength: 60 } as BowlSkill);
    const top = speedOf(sk.spd, 5.6, 4.6) * (s.juke > 0 ? 1.18 : 1);
    if (s.dive > 0) {
      s.dive -= dt; carrier.x += 6 * dt; carrier.stride += 6 * dt;
      if (s.dive <= 0) return end(s, carrier.x >= 100 ? { kind: 'td', text: `Touchdown! ${last(carrier.name)} dives in.` } : gained(s, carrier, 'Dives forward'));
    } else {
      // Run plays aim for the hole first; then the player steers.
      let want = s.steerY ?? carrier.y;
      if (runPlay && carrier.role === 'RB' && s.steerY === null && carrier.x < s.los + 1.5) {
        const side = s.play.side ?? 1;
        want = s.play.run === 'outside' ? MID + 9 * side : s.play.run === 'counter' ? (s.t < 1 ? MID + 2 * side : MID - 4 * side) : MID + 1.4 * side;
      }
      if (s.juke > 0) want = carrier.y + s.jukeDir * 6;
      const vy = clamp((want - carrier.y) * 3, -top * 0.8, top * 0.8);
      const vx = Math.sqrt(Math.max(0, top * top - vy * vy));
      const acc = Math.min(1, dt * (s.juke > 0 ? 14 : 6));
      carrier.vx += (vx - carrier.vx) * acc; carrier.vy += (vy - carrier.vy) * acc;
      carrier.x += carrier.vx * dt; carrier.y += carrier.vy * dt; carrier.stride += Math.hypot(carrier.vx, carrier.vy) * dt;
    }
    if (carrier.x >= 100) { burst(s, carrier, s.you.color, 34); s.shake = 0.6; return end(s, { kind: 'td', text: `Touchdown! ${last(carrier.name ?? s.you.qb.name)} takes it in.` }); }
    if (carrier.y < 0.3 || carrier.y > FIELD_W - 0.3) return end(s, gained(s, carrier, 'Out of bounds'));
    for (const d of s.bodies) {
      if (d.side !== 'def' || (d.stunned ?? 0) > 0 || dist(d, carrier) > 0.8) continue;
      if (s.t - (d.lastTry ?? -9) < 0.5) continue;
      if (s.bodies.some((o) => o.side === 'off' && o.block === s.bodies.indexOf(d) && engaged(s, o, d))) continue; // tied up by a blocker
      d.lastTry = s.t;
      // Break it: elusiveness and a juke, or power against the tackle.
      const power = ((sk.strength ?? 60) - s.opp.def.tackle) / 260;
      const brk = clamp(0.14 + ((sk.elus ?? 60) - s.opp.def.tackle) / 220 + Math.max(0, power) + (s.juke > 0 ? 0.4 : 0), 0.03, 0.75);
      if (s.rng() < brk) { d.stunned = 0.9; carrier.vx *= 0.75; burst(s, d, '#A3E635', 6); s.shake = 0.3; s.flash = 'BROKEN TACKLE'; s.flashT = 0.7; }
      else {
        // Falls forward: bigger, stronger runners get an extra yard or two through the tackle.
        carrier.x += clamp(((sk.strength ?? 60) - 55) / 45, 0, 1) * 1.6 + s.rng() * 0.9;
        s.shake = 0.7; burst(s, carrier, '#D6D3D1', 12); return end(s, gained(s, carrier, 'Tackled'));
      }
    }
  }
}

function catchBall(s: PlayState) {
  const B = s.ball!, land = { x: B.tx, y: B.ty };
  const offs = s.bodies.map((b, i) => ({ b, i })).filter(({ b }) => b.side === 'off' && b.role !== 'OL' && b.role !== 'QB');
  const r = offs.sort((a, b) => dist(a.b, land) - dist(b.b, land))[0];
  const d = s.bodies.filter((b) => b.side === 'def').sort((a, b) => dist(a, land) - dist(b, land))[0];
  const rd = r ? dist(r.b, land) : 99, dd = d ? dist(d, land) : 99;
  // A defender who gets there first can pick it.
  if (dd < 1.1 && dd < rd + 0.3 && s.rng() < clamp(0.16 + (s.opp.def.cover - 60) / 200 - (rd < 1 ? 0.06 : 0), 0.08, 0.42)) {
    burst(s, land, s.opp.color, 14); s.shake = 0.6;
    return end(s, { kind: 'int', text: `Intercepted. ${r && rd < 3 ? `The pass for ${last(r.b.name)} is picked off.` : 'Thrown right to him.'}` });
  }
  if (!r || rd > 1.7) { burst(s, land, '#F5F5F4', 6); return end(s, { kind: 'incomplete', text: `Incomplete. ${rd > 4 ? 'Nobody there.' : 'Off his fingertips.'}` }); }
  const hands = r.b.skill?.hands ?? 70;
  const contested = dd < 0.9 ? 0.45 : dd < 1.8 ? 0.72 : 1;
  const p = (0.52 + hands / 220) * contested * (rd < 0.8 ? 1 : 0.72);
  if (s.rng() < p) {
    s.carrier = r.i; s.phase = 'run'; s.ball = null; s.thrown = r.i; s.catchAt = s.t;
    r.b.vx = Math.max(r.b.vx, 3);
    if (contested < 1) { s.flash = 'WHAT A CATCH'; s.flashT = 0.8; }
    return;
  }
  burst(s, land, '#F5F5F4', 6);
  return end(s, { kind: 'incomplete', text: dd < 1.8 ? 'Broken up. The defender gets a hand in.' : `Dropped. ${last(r.b.name)} cannot hang on.` });
}

/** A blocker in contact with his man (within reach and in front of him). */
function engaged(s: PlayState, o: Body, d: Body) { return dist(o, d) < 1.6 && o.x < d.x + 0.3 && !beaten(s, d); }
/** Has this defender shed his block? Double teams hold longer. */
function beaten(s: PlayState, d: Body) {
  const n = s.bodies.filter((o) => o.side === 'off' && o.block === s.bodies.indexOf(d)).length;
  return s.t >= (d.beatAt ?? 99) * (n > 1 ? 1.4 : 1);
}

/** Where to run to cut someone off. */
function lead(t: Body, from: Body, speed: number): Vec {
  const tt = clamp(dist(t, from) / Math.max(1, speed), 0, 1.2);
  return { x: t.x + t.vx * tt * 0.8, y: t.y + t.vy * tt * 0.8 };
}
function nearestDef(s: PlayState, to: Vec, within = 99) {
  let best: Body | null = null, bd = within;
  for (const d of s.bodies) if (d.side === 'def' && (d.stunned ?? 0) <= 0) { const dd = dist(d, to); if (dd < bd && d.x > to.x - 2) { bd = dd; best = d; } }
  return best;
}

function gained(s: PlayState, c: Body, how: string): Outcome {
  const yards = Math.round(c.x - s.los);
  const who = last(c.name ?? s.you.qb.name);
  return { kind: 'gain', yards, text: `${how}. ${who} ${yards >= 0 ? `for ${yards}` : `loses ${-yards}`}${Math.abs(yards) === 1 ? ' yard' : ' yards'}.` };
}

// ------------------------------------------------------------------ drawing

const rgb = (hex: string) => { const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const shade = (hex: string, f: number) => { const [r, g, b] = rgb(hex).map((v) => clamp(Math.round(v * f), 0, 255)); return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
const lum = (hex: string) => { const [r, g, b] = rgb(hex); return (r * 0.3 + g * 0.59 + b * 0.11) / 255; };

interface Kit { jersey: string; trim: string; helmet: string; pants: string; socks: string }
function kits(s: PlayState): { off: Kit; def: Kit } {
  const off: Kit = { jersey: s.you.color, trim: '#F5F5F4', helmet: shade(s.you.color, 0.85), pants: '#E7E5E4', socks: s.you.color };
  const clash = Math.abs(lum(s.opp.color) - lum(s.you.color)) < 0.16;
  const def: Kit = clash
    ? { jersey: '#F5F5F4', trim: s.opp.color, helmet: shade(s.opp.color, 0.85), pants: shade(s.opp.color, 0.9), socks: s.opp.color }
    : { jersey: s.opp.color, trim: '#F5F5F4', helmet: shade(s.opp.color, 0.85), pants: '#D6D3D1', socks: s.opp.color };
  return { off, def };
}

/**
 * A standard player build, feet at (x, y): helmet with a face mask (no face), shoulder pads, jersey with trim,
 * bare forearms in the player's skin tone, pants, socks and cleats. Four-frame run cycle from the stride.
 */
function player(ctx: CanvasRenderingContext2D, x: number, y: number, kit: Kit, skin: string, facing: 1 | -1, stride: number, moving: boolean, big = false) {
  const X = Math.round(x), Y = Math.round(y);
  const f = moving ? Math.floor(stride * 2.2) % 4 : 0;
  const px = (dx: number, dy: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(facing > 0 ? X + dx : X - dx - w + 1, Y + dy, w, h); };
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 4, Y, 9, 2); ctx.fillRect(X - 3, Y + 2, 7, 1);
  if (big) { ctx.fillStyle = 'rgba(253,224,71,.35)'; ctx.fillRect(X - 6, Y - 17, 13, 18); }
  // Legs: back and front, swinging.
  const legA = [0, 1, 0, -1][f], legB = -legA;
  px(-2 + legA, -5, 2, 3, kit.pants); px(-2 + legA, -2, 2, 1, kit.socks); px(-2 + legA, -1, 2, 1, '#111111');
  px(1 + legB, -5, 2, 3, kit.pants); px(1 + legB, -2, 2, 1, kit.socks); px(1 + legB, -1, 2, 1, '#111111');
  // Torso: jersey with pads on top and trim at the waist.
  px(-3, -11, 7, 6, kit.jersey);
  px(-4, -11, 9, 2, kit.jersey);
  px(-4, -11, 9, 1, shade(kit.jersey, 1.2));
  px(-3, -6, 7, 1, kit.trim);
  // Arms: sleeve then skin, swinging opposite the legs.
  const arm = [0, -1, 0, 1][f];
  px(-5, -10 + arm, 1, 2, kit.jersey); px(-5, -8 + arm, 1, 2, skin);
  px(5, -10 - arm, 1, 2, kit.jersey); px(5, -8 - arm, 1, 2, skin);
  // Neck, helmet with a stripe, and a face mask on the side he faces.
  px(0, -12, 2, 1, skin);
  px(-2, -16, 5, 4, kit.helmet);
  px(-2, -16, 5, 1, shade(kit.helmet, 1.3));
  px(0, -16, 1, 4, shade(kit.helmet, 1.6));
  px(3, -15, 1, 3, '#D4D4D4'); px(2, -13, 2, 1, '#A3A3A3');
}

/** Field yards to canvas pixels for the current camera. */
const sxOf = (s: PlayState) => (x: number) => (x - (s.cam - VIEW_W / 2)) * PXX + (s.shake > 0 ? Math.sin(s.t * 60) * s.shake * 2 : 0);
const syOf = (y: number) => TOP + y * PXY;

export function draw(ctx: CanvasRenderingContext2D, s: PlayState, frame: number, showArt: boolean) {
  const sx = sxOf(s), sy = syOf;
  const ox = s.cam - VIEW_W / 2;
  ctx.imageSmoothingEnabled = false;
  // The crowd behind the far sideline.
  ctx.fillStyle = '#1C1917'; ctx.fillRect(0, 0, RES_W, TOP);
  const crowd = ['#44403C', '#57534E', '#78716C', shade(s.you.color, 0.75)];
  for (let i = 0; i < RES_W; i += 3) { ctx.fillStyle = crowd[Math.abs(i * 7 + Math.floor(ox * 3)) % 4]; ctx.fillRect(i, 3 + ((i * 13) % 5), 2, 2); }
  // Turf in five-yard bands, end zones in team colors.
  for (let yd = Math.floor(ox / 5) * 5 - 5; yd < ox + VIEW_W + 5; yd += 5) {
    ctx.fillStyle = yd < 0 ? shade(s.you.color, 0.72) : yd >= 100 ? shade(s.opp.color, 0.72) : (Math.floor(yd / 5) % 2 ? '#2F8034' : '#2A7530');
    ctx.fillRect(Math.floor(sx(yd)), TOP, Math.ceil(5 * PXX) + 1, RES_H - TOP);
  }
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  for (let yd = Math.ceil(ox / 5) * 5; yd <= ox + VIEW_W; yd += 5) {
    if (yd < 0 || yd > 100) continue;
    ctx.fillRect(Math.round(sx(yd)), Math.round(sy(0)), yd % 50 === 0 ? 2 : 1, Math.round(FIELD_W * PXY));
    if (yd % 10 === 0 && yd > 0 && yd < 100) {
      const n = String(yd <= 50 ? yd : 100 - yd);
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n, sx(yd), sy(9)); ctx.fillText(n, sx(yd), sy(FIELD_W - 9));
    }
  }
  for (let yd = Math.ceil(ox); yd <= ox + VIEW_W; yd++) {
    if (yd <= 0 || yd >= 100 || yd % 5 === 0) continue;
    for (const hy of [1, MID - 3.1, MID + 3.1, FIELD_W - 1]) ctx.fillRect(Math.round(sx(yd)), Math.round(sy(hy)), 1, 2);
  }
  ctx.fillStyle = '#F5F5F4'; ctx.fillRect(0, Math.round(sy(0)) - 1, RES_W, 2); ctx.fillRect(0, Math.round(sy(FIELD_W)), RES_W, 2);
  for (const [x0, team] of [[-10, s.you], [100, s.opp]] as const) {
    if (x0 + 10 < ox || x0 > ox + VIEW_W) continue;
    ctx.save(); ctx.translate(sx(x0 + 5), sy(MID)); ctx.rotate(x0 < 0 ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(team.name.toUpperCase().slice(0, 11), 0, 0); ctx.restore();
  }
  // Line of scrimmage (blue) and the line to gain (yellow).
  if (!s.twoPoint && s.firstAt < 100) { ctx.fillStyle = '#FACC15'; ctx.fillRect(Math.round(sx(s.firstAt)), Math.round(sy(0)), 2, Math.round(FIELD_W * PXY)); }
  ctx.fillStyle = '#3B82F6'; ctx.fillRect(Math.round(sx(s.los)), Math.round(sy(0)), 2, Math.round(FIELD_W * PXY));
  // Play art before the snap: every route, and the run's path.
  if (showArt) {
    const dots = (from: Vec, to: Vec) => { const n = Math.max(2, Math.ceil(dist(from, to) * 1.6)); for (let i = 0; i < n; i += 2) ctx.fillRect(Math.round(sx(from.x + ((to.x - from.x) * i) / n)), Math.round(sy(from.y + ((to.y - from.y) * i) / n)), 2, 1); };
    const arrow = (at: Vec, prev: Vec) => { const a = Math.atan2((at.y - prev.y) * PXY, (at.x - prev.x) * PXX); const X = sx(at.x), Y = sy(at.y); ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * 4, Y + Math.sin(a) * 4); ctx.lineTo(X + Math.cos(a + 2.5) * 4, Y + Math.sin(a + 2.5) * 4); ctx.lineTo(X + Math.cos(a - 2.5) * 4, Y + Math.sin(a - 2.5) * 4); ctx.fill(); };
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (const b of s.bodies) {
      if (b.side !== 'off' || !b.route?.length || s.call === 'run') continue;
      let from: Vec = b;
      for (const wp of b.route) { dots(from, wp); from = wp; }
      arrow(b.route[b.route.length - 1], b.route[b.route.length - 2] ?? b);
    }
    if (s.call === 'run') {
      const rb = s.bodies.find((b) => b.role === 'RB')!, side = s.play.side ?? 1;
      const hole = { x: s.los + 1, y: s.play.run === 'outside' ? MID + 9 * side : s.play.run === 'counter' ? MID - 4 * side : MID + 1.4 * side };
      ctx.fillStyle = 'rgba(253,224,71,.95)'; dots(rb, hole); const tip = { x: hole.x + 6, y: hole.y }; dots(hole, tip); arrow(tip, hole);
    }
  }
  // Aim: the slingshot arc and where it lands.
  if (s.aim && s.phase === 'live') {
    const qb = s.bodies[s.qb];
    const d0 = Math.min(dist(qb, s.aim), armRange(s)), a = Math.atan2(s.aim.y - qb.y, s.aim.x - qb.x);
    const to = { x: qb.x + Math.cos(a) * d0, y: qb.y + Math.sin(a) * d0 }, peak = clamp(d0 * 0.16, 1.2, 9);
    for (let i = 1; i < 24; i++) {
      const k = i / 24, X = sx(qb.x + (to.x - qb.x) * k), Y = sy(qb.y + (to.y - qb.y) * k) - 8 - Math.sin(Math.PI * k) * peak * PXX * 0.45;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.95)' : 'rgba(253,224,71,.95)'; ctx.fillRect(Math.round(X), Math.round(Y), 2, 2);
    }
    const X = sx(to.x), Y = sy(to.y);
    ctx.strokeStyle = '#FDE047'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X, Y, 7, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FDE047'; ctx.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 2, 2);
  }
  // Players, back to front.
  const { off, def } = kits(s);
  const order = [...s.bodies.keys()].sort((a, b) => s.bodies[a].y - s.bodies[b].y);
  for (const i of order) {
    const b = s.bodies[i];
    const moving = Math.hypot(b.vx, b.vy) > 0.6;
    const facing: 1 | -1 = b.side === 'off' ? (b.vx < -1.5 ? -1 : 1) : (b.vx > 1.5 ? 1 : -1);
    player(ctx, sx(b.x), sy(b.y), b.side === 'off' ? off : def, b.skin, facing, b.stride, moving, i === s.carrier && s.phase === 'run');
    const tag = (text: string, color: string) => {
      ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const w = Math.ceil(ctx.measureText(text).width) + 4, X = Math.round(sx(b.x)), Y = Math.round(sy(b.y)) - 26;
      ctx.fillStyle = 'rgba(10,10,10,.82)'; ctx.fillRect(X - Math.ceil(w / 2), Y, w, 8);
      ctx.fillStyle = color; ctx.fillText(text, X + 0.5, Y + 7);
    };
    if ((s.phase === 'pre' || s.phase === 'live') && s.call === 'pass' && b.label && b.side === 'off') tag(`${b.label} ${last(b.name).toUpperCase()}`, '#FDE047');
    else if (i === s.carrier && s.phase === 'run') tag(last(b.name ?? s.you.qb.name).toUpperCase(), '#FFFFFF');
  }
  // Ball: in the air with its shadow, or tucked.
  if (s.ball) {
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(Math.round(sx(s.ball.x)) - 1, Math.round(sy(s.ball.y)), 4, 2);
    const bx = Math.round(sx(s.ball.x)), by = Math.round(sy(s.ball.y) - s.ball.z * PXX * 0.45 - 8);
    ctx.fillStyle = '#7C3A12'; ctx.fillRect(bx - 2, by - 1, 5, 3); ctx.fillStyle = '#F5F5F4'; ctx.fillRect(bx, by, 1, 1);
  } else if (s.phase !== 'pre') {
    const h = s.carrier !== null ? s.bodies[s.carrier] : s.bodies[s.qb];
    ctx.fillStyle = '#7C3A12'; ctx.fillRect(Math.round(sx(h.x)) + 3, Math.round(sy(h.y)) - 9, 3, 2);
  }
  for (const p of s.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(Math.round(sx(p.x)), Math.round(sy(p.y)) - 6, 2, 2); }
  ctx.globalAlpha = 1;
  const banner = (word: string, size: number, color: string) => {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0A0A0A'; ctx.fillText(word, RES_W / 2 + 2, RES_H / 2 + 2);
    ctx.fillStyle = color; ctx.fillText(word, RES_W / 2, RES_H / 2);
  };
  if (s.phase === 'dead' && s.outcome) {
    const o = s.outcome;
    const word = o.kind === 'td' ? 'TOUCHDOWN!' : o.kind === 'int' ? 'INTERCEPTED' : o.kind === 'sack' ? 'SACKED' : o.kind === 'incomplete' ? 'INCOMPLETE' : s.los + o.yards >= s.firstAt && !s.twoPoint ? 'FIRST DOWN' : null;
    if (word) banner(word, o.kind === 'td' ? 28 : 17, o.kind === 'td' ? (Math.floor(frame / 8) % 2 ? '#FDE047' : '#FFFFFF') : o.kind === 'gain' ? '#FDE047' : '#FCA5A5');
  } else if (s.flash && s.flashT > 0) {
    ctx.globalAlpha = clamp(s.flashT * 2, 0, 1); banner(s.flash, 13, '#FFFFFF'); ctx.globalAlpha = 1;
  }
  // Pocket clock: how close the rush is.
  if (s.phase === 'live' && s.call === 'pass') {
    const p = pressureOn(s);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(6, TOP + 4, 62, 5);
    ctx.fillStyle = p < 0.5 ? '#22C55E' : p < 0.8 ? '#F59E0B' : '#EF4444'; ctx.fillRect(7, TOP + 5, Math.round(60 * (1 - p)), 3);
  }
  if (s.phase === 'pre') {
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const t = s.play.name.toUpperCase();
    ctx.fillStyle = 'rgba(10,10,10,.75)'; ctx.fillRect(4, RES_H - 14, ctx.measureText(t).width + 8, 11);
    ctx.fillStyle = '#FDE047'; ctx.fillText(t, 8, RES_H - 12);
  }
}

/** Canvas pixel to field yards, for taps and drags. */
export function toField(s: PlayState, px: number, py: number): Vec {
  return { x: s.cam - VIEW_W / 2 + px / PXX, y: (py - TOP) / PXY };
}
/** Is this canvas point on a player's sprite (which stands up from his feet)? */
export function onSprite(s: PlayState, b: Body, px: number, py: number) {
  const X = sxOf(s)(b.x), Y = syOf(b.y);
  return Math.abs(px - X) < 10 && py > Y - 22 && py < Y + 5;
}
/** A drag on the canvas as a throw target: pull back from where you touched, the ball goes the other way. */
export function aimFrom(s: PlayState, start: { px: number; py: number }, now: { px: number; py: number }): Vec {
  const qb = s.bodies[s.qb];
  return { x: qb.x + ((start.px - now.px) / PXX) * 2.4, y: clamp(qb.y + ((start.py - now.py) / PXY) * 1.1, 0.5, FIELD_W - 0.5) };
}
/** The runner's spot across the field for a finger at this canvas height. */
export const fieldY = (py: number) => clamp((py - TOP) / PXY, 0.5, FIELD_W - 0.5);

/** Box score lines from a finished play, keyed by player name. */
export type StatLine = Partial<Record<'pa' | 'pc' | 'py' | 'ptd' | 'int' | 'ra' | 'ry' | 'rtd' | 'rec' | 'ryd' | 'rectd' | 'sk', number>>;
export function playStats(s: PlayState): Record<string, StatLine> {
  const o = s.outcome;
  if (!o || s.twoPoint) return {};
  const qb = s.you.qb.name, out: Record<string, StatLine> = {};
  const add = (n: string, l: StatLine) => { const c = (out[n] ??= {}); for (const [k, v] of Object.entries(l)) c[k as keyof StatLine] = (c[k as keyof StatLine] ?? 0) + (v ?? 0); };
  const yards = o.kind === 'td' ? Math.round(100 - s.los) : o.kind === 'gain' ? o.yards : 0;
  if (o.kind === 'sack') { add(qb, { sk: 1 }); return out; }
  const passed = s.ball !== null || s.thrown !== null || o.kind === 'int' || (o.kind === 'incomplete');
  if (passed && s.call === 'pass') {
    if (o.kind === 'int') { add(qb, { pa: 1, int: 1 }); return out; }
    if (o.kind === 'incomplete') { add(qb, { pa: 1 }); return out; }
    if (s.carrier !== null && s.carrier === s.thrown) {
      const r = s.bodies[s.thrown].name ?? '';
      add(qb, { pa: 1, pc: 1, py: yards, ptd: o.kind === 'td' ? 1 : 0 });
      if (r) add(r, { rec: 1, ryd: yards, rectd: o.kind === 'td' ? 1 : 0 });
      return out;
    }
  }
  if (s.carrier !== null) {
    const c = s.bodies[s.carrier], n = c.name ?? qb;
    add(n, { ra: 1, ry: yards, rtd: o.kind === 'td' ? 1 : 0 });
  }
  return out;
}
