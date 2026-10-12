import { clamp, createRng, type Rng } from './prng';
import { bowlTeam, type BowlTeam } from './bowl';

/**
 * Unbeaten Bowl GM mode: run a franchise season after season. Real NFL rosters to start; after that the league
 * is yours: contracts and a salary cap, injuries, a draft of made-up prospects, free agency, coaching credits for
 * training players, facilities and coordinators, press conferences, standings, playoffs and power rankings.
 * Everything is pure and seeded so a save is just this JSON; the page keeps it in the browser and, when signed
 * in, on the account.
 */

export const F_VERSION = 1;
export type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'EDGE' | 'LB' | 'CB' | 'S' | 'K';
export const POSITIONS: Pos[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K'];
/** How many players of each position a team carries: 36 to start, room for 40. */
export const SHAPE: Record<Pos, number> = { QB: 2, RB: 2, WR: 4, TE: 2, OL: 7, DL: 4, EDGE: 3, LB: 4, CB: 4, S: 3, K: 1 };
const MIN: Record<Pos, number> = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 5, DL: 2, EDGE: 2, LB: 3, CB: 3, S: 2, K: 1 };
export const ROSTER_MAX = 40;
export const DRAFT_ROUNDS = 3;
export const PLAYOFF_ROUNDS = ['Wild card', 'Divisional round', 'Conference final', 'Unbeaten Bowl'] as const;

export interface SStats { pa: number; pc: number; py: number; ptd: number; int: number; ra: number; ry: number; rtd: number; rec: number; ryd: number; rectd: number; sk: number }
export interface FPlayer {
  id: string; n: string; p: Pos;
  /** Overall now, and when `a` was captured (attributes move with the overall). */
  o: number; o0: number; pot: number; age: number; num: number | null;
  a: Record<string, number>;
  /** Salary in $M a year and years left including this one. */
  sal: number; yrs: number;
  /** Games still out injured. */
  inj: number;
  img?: string | null;
  /** Made up for this league (draft prospects and reserves). */
  gen?: 1;
  /** Round and year drafted, for rookies you picked. */
  dr?: string;
}
export interface FTeam {
  abbr: string; name: string; city: string; color: string; logo: string | null; conf: string; div: string;
  roster: FPlayer[]; w: number; l: number; t: number; pf: number; pa: number;
  /** Money still owed to players who were cut, counted against this season's cap. */
  dead: number;
  /** Power ranking last week and this week. */
  pr0?: number; pr?: number;
}
export interface Match { h: string; a: string; hs?: number; as?: number; ot?: 1 }
export interface Press { q: string; answers: { text: string; fans: number; chem: number }[] }
export interface SeasonLine { year: number; w: number; l: number; t: number; finish: string; champ: string; leaders: string[] }
export interface Draft { pool: FPlayer[]; order: string[]; pick: number; log: { abbr: string; id: string; n: string; p: Pos; o: number; pick: number }[] }
export interface Playoffs { round: number; seeds: Record<string, string[]>; games: Match[]; past: Match[][]; alive: string[]; champ?: string }

export type Phase = 'season' | 'playoffs' | 'recap' | 'resign' | 'draft' | 'fa';
export interface League {
  v: number; id: string; year: number; you: string; coach: string; phase: Phase;
  week: number; teams: FTeam[]; sched: Match[][]; po: Playoffs | null; cap: number;
  /** Coaching credits, fan support and team chemistry (0-100). */
  cc: number; fans: number; chem: number;
  fac: { train: number; rehab: number; stadium: number };
  staff: { oc: number; dc: number };
  hist: SeasonLine[]; draft: Draft | null; fa: FPlayer[];
  news: string[]; press: Press | null; trained: string[];
  stats: Record<string, SStats>;
  /** Where your team finished last season (for the draft order and the schedule). */
  saved: number;
}

// ---------- attributes ----------

type Raw = Record<string, number | undefined>;
const avgOf = (...xs: (number | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === 'number'); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : undefined; };

/** The handful of attributes the game reads, per position, from the full ratings. */
export function compactAttrs(p: Pos, a: Raw, ovr: number): Record<string, number> {
  const f = (v: number | undefined) => Math.round(v ?? ovr);
  switch (p) {
    case 'QB': return { tp: f(a.throwPower), ac: f(avgOf(a.throwAccuracyShort, a.throwAccuracyMid, a.throwAccuracyDeep)), sp: f(a.speed) };
    case 'RB': case 'WR': case 'TE': return { sp: f(a.speed), ca: f(a.catching), rr: f(a.routeRunning), el: f(avgOf(a.jukeMove, a.agility, a.breakTackle)), tr: f(a.trucking ?? a.strength) };
    case 'OL': return { pb: f(a.passBlock), rb: f(a.runBlock) };
    case 'DL': case 'EDGE': return { ru: f(Math.max(a.powerMoves ?? 0, a.finesseMoves ?? 0, a.blockShedding ?? 0) || undefined) };
    case 'LB': case 'CB': case 'S': return { co: f(Math.max(a.manCoverage ?? 0, a.zoneCoverage ?? 0) || undefined), tk: f(avgOf(a.tackle, a.pursuit)), sp: f(a.speed) };
    case 'K': return { kp: f(a.kickPower), ka: f(a.kickAccuracy) };
  }
}

/** Attributes for a made-up player, from his overall and position. */
const TEMPLATE: Record<Pos, Record<string, number>> = {
  QB: { tp: 2, ac: 0, sp: -12 }, RB: { sp: 5, ca: -10, rr: -14, el: 4, tr: 0 }, WR: { sp: 6, ca: 1, rr: 0, el: -2, tr: -18 },
  TE: { sp: -8, ca: -2, rr: -6, el: -14, tr: 2 }, OL: { pb: 0, rb: 0 }, DL: { ru: 1 }, EDGE: { ru: 2 },
  LB: { co: -8, tk: 3, sp: -6 }, CB: { co: 2, tk: -12, sp: 6 }, S: { co: -1, tk: -2, sp: 2 }, K: { kp: 2, ka: 0 },
};
function genAttrs(p: Pos, ovr: number, rng: Rng) {
  const out: Record<string, number> = {};
  for (const [k, d] of Object.entries(TEMPLATE[p])) out[k] = clamp(Math.round(ovr + d + (rng.next() - 0.5) * 8), 30, 99);
  return out;
}

/** Back to the full attribute names the game engine reads, moved by how far the overall has changed. */
function expand(pl: FPlayer): Raw {
  const d = pl.o - pl.o0, g = (k: string) => (pl.a[k] === undefined ? undefined : clamp(pl.a[k] + d, 25, 99));
  switch (pl.p) {
    case 'QB': return { throwPower: g('tp'), throwAccuracyShort: g('ac'), throwAccuracyMid: g('ac'), throwAccuracyDeep: g('ac'), speed: g('sp') };
    case 'RB': case 'WR': case 'TE': return { speed: g('sp'), catching: g('ca'), routeRunning: g('rr'), jukeMove: g('el'), agility: g('el'), breakTackle: g('el'), trucking: g('tr') };
    case 'OL': return { passBlock: g('pb'), runBlock: g('rb') };
    case 'DL': case 'EDGE': return { powerMoves: g('ru'), finesseMoves: g('ru'), blockShedding: g('ru') };
    case 'LB': case 'CB': case 'S': return { manCoverage: g('co'), zoneCoverage: g('co'), tackle: g('tk'), pursuit: g('tk'), speed: g('sp') };
    case 'K': return { kickPower: g('kp'), kickAccuracy: g('ka') };
  }
}

// ---------- money ----------

const POS_MAX: Record<Pos, number> = { QB: 52, EDGE: 30, WR: 30, CB: 22, OL: 21, DL: 24, LB: 16, S: 15, TE: 16, RB: 13, K: 5 };
/** What a player asks for a year, in $M. Game money, not real contracts. */
export function salaryFor(p: Pos, ovr: number, age: number): number {
  const x = clamp((ovr - 60) / 39, 0, 1);
  const s = (0.8 + POS_MAX[p] * x ** 2.4) * (age >= 31 ? 0.82 : age <= 23 ? 0.9 : 1);
  return Math.round(s * 10) / 10;
}
export const payroll = (t: FTeam) => Math.round((t.roster.reduce((s, p) => s + p.sal, 0) + t.dead) * 10) / 10;
export const capSpace = (L: League, t: FTeam) => Math.round((L.cap - payroll(t)) * 10) / 10;
const yearsFor = (age: number, rng: Rng) => (age >= 32 ? 1 : age >= 29 ? 1 + rng.int(0, 2) : 2 + rng.int(0, 3));

// ---------- names for made-up players ----------

const FIRST = ['Jalen', 'Marcus', 'Tyler', 'Darius', 'Caleb', 'Isaiah', 'Brandon', 'Jordan', 'Malik', 'Trey', 'Devin', 'Austin', 'Cole', 'Xavier', 'Andre', 'Elijah', 'Grant', 'Mason', 'Quinton', 'Tre', 'Javon', 'Logan', 'Bryce', 'Dante', 'Keenan', 'Owen', 'Reggie', 'Silas', 'Terrell', 'Wyatt', 'Zion', 'Cam', 'DeShawn', 'Ezra', 'Hunter', 'Jace', 'Kobe', 'Luke', 'Nico', 'Rashad', 'Tavon', 'Vance', 'Brady', 'Chase', 'Dominic', 'Gavin', 'Jamal', 'Kyler', 'Micah', 'Preston'];
const LAST = ['Banks', 'Whitfield', 'Okafor', 'Delgado', 'Pryor', 'Hollins', 'Mercer', 'Strickland', 'Ashby', 'Calloway', 'Dunmore', 'Fairley', 'Gentry', 'Hargrove', 'Ingram', 'Jessup', 'Kinsey', 'Langford', 'Maddox', 'Norwood', 'Oakes', 'Pettaway', 'Quarles', 'Rambo', 'Sutter', 'Tolliver', 'Underwood', 'Vickers', 'Waddell', 'Yancey', 'Abernathy', 'Bledsoe', 'Crowder', 'Easley', 'Frazier', 'Galloway', 'Hightower', 'Kirkland', 'Lockett', 'Mosley', 'Nwosu', 'Orr', 'Pendleton', 'Redd', 'Sims', 'Tatum', 'Vaughn', 'Winfield', 'Booker', 'Coleman', 'Dixon', 'Ellison', 'Fontenot', 'Grimes', 'Haskins', 'Jefferson', 'Kemp', 'Lucas', 'McKinney', 'Ruffin'];
const genName = (rng: Rng) => `${rng.pick(FIRST)} ${rng.pick(LAST)}`;

function makePlayer(rng: Rng, p: Pos, ovr: number, age: number, pot: number, id: string): FPlayer {
  return { id, n: genName(rng), p, o: ovr, o0: ovr, pot: Math.max(pot, ovr), age, num: null, a: genAttrs(p, ovr, rng), sal: Math.max(0.8, salaryFor(p, ovr, age)), yrs: 1 + rng.int(0, 1), inj: 0, gen: 1 };
}

// ---------- building a league ----------

export interface SeedTeam { abbr: string; name: string; city: string; color: string; logo: string | null; conf: string; div: string }
export interface SeedPlayer { id: string; n: string; p: Pos; o: number; age: number | null; num: number | null; img: string | null; a: Record<string, number>; t: string }

/** Potential: young players have room to grow; veterans are what they are. */
function potentialFor(ovr: number, age: number, rng: Rng) {
  const room = age <= 22 ? 14 : age <= 24 ? 10 : age <= 26 ? 5 : age <= 28 ? 2 : 0;
  return clamp(ovr + Math.round(room * (0.4 + rng.next() * 0.8)), ovr, 99);
}

export function newLeague(seed: string, teams: SeedTeam[], players: SeedPlayer[], you: string, coach: string): League {
  const rng = createRng(`fr:${seed}`);
  const out: FTeam[] = teams.map((t) => {
    const mine = players.filter((p) => p.t === t.abbr);
    const roster: FPlayer[] = [];
    for (const pos of POSITIONS) {
      const at = mine.filter((p) => p.p === pos).sort((a, b) => b.o - a.o).slice(0, SHAPE[pos]);
      for (const sp of at) {
        const age = sp.age ?? 27;
        roster.push({ id: sp.id, n: sp.n, p: pos, o: sp.o, o0: sp.o, pot: potentialFor(sp.o, age, rng), age, num: sp.num, a: sp.a, sal: salaryFor(pos, sp.o, age), yrs: yearsFor(age, rng), inj: 0, img: sp.img });
      }
      // Short at a spot (thin data, a missing kicker): a made-up reserve fills it.
      for (let i = at.length; i < MIN[pos]; i++) roster.push(makePlayer(rng, pos, 58 + rng.int(0, 6), 23 + rng.int(0, 6), 66, `r:${t.abbr}:${pos}:${i}`));
    }
    return { ...t, roster, w: 0, l: 0, t: 0, pf: 0, pa: 0, dead: 0 };
  });
  // The cap leaves a typical team some room and every team at least a little.
  const pays = out.map((t) => payroll(t)).sort((a, b) => a - b);
  const cap = Math.ceil(Math.max(pays[Math.floor(pays.length / 2)] * 1.12, pays[pays.length - 1] + 4, 150));
  const L: League = {
    v: F_VERSION, id: seed, year: new Date().getUTCFullYear(), you, coach: coach.slice(0, 24) || 'Coach', phase: 'season', week: 0,
    teams: out, sched: [], po: null, cap, cc: 10, fans: 50, chem: 60, fac: { train: 1, rehab: 1, stadium: 1 }, staff: { oc: 1, dc: 1 },
    hist: [], draft: null, fa: [], news: [], press: null, trained: [], stats: {}, saved: 0,
  };
  // Last year's finish within each division decides parts of the schedule; for the first season, roster strength.
  const strength = new Map(out.map((t) => [t.abbr, ratingsOf(L, t).offense + ratingsOf(L, t).defense]));
  L.sched = makeSchedule(L, (a, b) => (strength.get(b.abbr) ?? 0) - (strength.get(a.abbr) ?? 0));
  rankTeams(L);
  L.news.unshift(`${coach.slice(0, 24) || 'The new coach'} takes over the ${teamOf(L, you).city} ${teamOf(L, you).name}.`);
  return L;
}

export const teamOf = (L: League, abbr: string) => L.teams.find((t) => t.abbr === abbr)!;
export const myTeam = (L: League) => teamOf(L, L.you);

// ---------- ratings ----------

/** Who starts: the best healthy players at each spot (what the game puts on the field). */
export function depth(t: FTeam): Record<Pos, FPlayer[]> {
  const out = {} as Record<Pos, FPlayer[]>;
  for (const pos of POSITIONS) out[pos] = t.roster.filter((p) => p.p === pos).sort((a, b) => Number(a.inj > 0) - Number(b.inj > 0) || b.o - a.o);
  return out;
}
const STARTERS: Record<Pos, number> = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 5, DL: 2, EDGE: 2, LB: 3, CB: 3, S: 2, K: 1 };
export function starters(t: FTeam): Set<string> {
  const d = depth(t), s = new Set<string>();
  for (const pos of POSITIONS) d[pos].filter((p) => p.inj === 0).slice(0, STARTERS[pos]).forEach((p) => s.add(p.id));
  return s;
}

/** The game's view of a team: its healthy players, plus your coordinators and chemistry if it is yours. */
export function ratingsOf(L: League, t: FTeam): BowlTeam {
  // Healthy players; at a spot where everyone is hurt, the best of them plays anyway.
  const healthy = t.roster.filter((p) => p.inj === 0);
  const pool = [...healthy, ...POSITIONS.filter((pos) => !healthy.some((p) => p.p === pos)).flatMap((pos) => t.roster.filter((p) => p.p === pos).sort((a, b) => b.o - a.o).slice(0, 2))];
  const b = bowlTeam({ id: 0, abbr: t.abbr, name: t.name, city: t.city, color: t.color, logoUrl: t.logo },
    pool.map((p) => ({ name: p.n, position: p.p, group: p.p, ovr: p.o, teamId: 0, jersey: p.num, attrs: expand(p) })));
  if (!b) throw new Error(`${t.abbr} cannot field a team.`);
  if (t.abbr !== L.you) return b;
  const vibe = Math.round((L.chem - 50) / 25);
  const o = L.staff.oc - 1 + vibe, d = L.staff.dc - 1 + vibe;
  const up = (v: number, by: number) => clamp(v + by, 25, 99);
  b.qb = { ...b.qb, acc: up(b.qb.acc, o), arm: up(b.qb.arm, Math.round(o / 2)) };
  b.targets = b.targets.map((s) => ({ ...s, hands: up(s.hands, o), route: up(s.route, o) }));
  b.rb = { ...b.rb, elus: up(b.rb.elus, o) };
  b.ol = { pass: up(b.ol.pass, o), run: up(b.ol.run, o) };
  b.def = { ...b.def, rush: up(b.def.rush, d), cover: up(b.def.cover, d), tackle: up(b.def.tackle, d), speed: up(b.def.speed, Math.round(d / 2)) };
  b.offense += o; b.defense += d;
  return b;
}

// ---------- schedule ----------

const DIVS = ['East', 'North', 'South', 'West'];
const divIdx = (t: FTeam) => Math.max(0, DIVS.findIndex((d) => t.div.endsWith(d)));

/**
 * The NFL's formula: six division games, four against a division in your conference and four against one in the
 * other, two against same-place teams in the other two divisions of your conference, and one more same-place
 * game across. 17 games over 18 weeks, so everyone gets a bye.
 */
export function makeSchedule(L: League, order: (a: FTeam, b: FTeam) => number): Match[][] {
  const y = L.year, rng = createRng(`fr:${L.id}:sched:${y}`);
  const confs = [...new Set(L.teams.map((t) => t.conf))].sort();
  const grid = new Map<string, FTeam[]>(); // conf:div -> teams by place
  for (const t of L.teams) {
    const k = `${t.conf}:${divIdx(t)}`;
    grid.set(k, [...(grid.get(k) ?? []), t]);
  }
  for (const [k, ts] of grid) grid.set(k, [...ts].sort(order));
  const div = (c: string, d: number) => grid.get(`${c}:${((d % 4) + 4) % 4}`) ?? [];
  const games: Match[] = [];
  const add = (h: FTeam | undefined, a: FTeam | undefined) => { if (h && a && h !== a) games.push({ h: h.abbr, a: a.abbr }); };
  const pairings = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]][y % 3];
  confs.forEach((c, ci) => {
    for (let d = 0; d < 4; d++) {
      const ts = div(c, d);
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) { add(ts[i], ts[j]); add(ts[j], ts[i]); }
    }
    for (const [d1, d2] of pairings) {
      const A = div(c, d1), B = div(c, d2);
      A.forEach((a, i) => B.forEach((b, j) => ((i + j + y) % 2 ? add(a, b) : add(b, a))));
      // The two divisions not paired: same-place games.
      const others = [0, 1, 2, 3].filter((x) => x !== d1 && x !== d2);
      for (const o of others) A.forEach((a, i) => { const b = div(c, o)[i]; if (b && d1 < o) ((i + y) % 2 ? add(a, b) : add(b, a)); });
      for (const o of others) B.forEach((b, i) => { const a = div(c, o)[i]; if (a && d2 < o) ((i + y + 1) % 2 ? add(b, a) : add(a, b)); });
    }
    if (ci === 0 && confs[1]) {
      for (let d = 0; d < 4; d++) {
        const A = div(c, d), B = div(confs[1], d + y), C = div(confs[1], d + y + 2);
        A.forEach((a, i) => B.forEach((b, j) => ((i + j + y) % 2 ? add(a, b) : add(b, a))));
        A.forEach((a, i) => { const b = C[i]; if (b) (y % 2 ? add(a, b) : add(b, a)); });
      }
    }
  });
  return toWeeks(games, rng);
}

/**
 * Splits the games into 18 weeks, each team at most once a week. Week by week, teams with the most games left go
 * first (a team with as many games as weeks left has to play), with retries on a dead end.
 */
function toWeeks(games: Match[], rng: Rng): Match[][] {
  for (let weeks = 18; weeks <= 22; weeks++) {
    for (let tries = 0; tries < 60; tries++) {
      let left = rng.shuffle(games);
      const out: Match[][] = [];
      let ok = true;
      for (let w = 0; w < weeks && ok; w++) {
        const rem = new Map<string, number>();
        for (const g of left) for (const t of [g.h, g.a]) rem.set(t, (rem.get(t) ?? 0) + 1);
        const must = [...rem].filter(([, n]) => n >= weeks - w).map(([t]) => t);
        let best: Match[] | null = null;
        for (let k = 0; k < 40; k++) {
          const used = new Set<string>(), week: Match[] = [];
          const order = rng.shuffle(left).sort((x, y) => Math.max(rem.get(y.h)!, rem.get(y.a)!) + rem.get(y.h)! + rem.get(y.a)! - (Math.max(rem.get(x.h)!, rem.get(x.a)!) + rem.get(x.h)! + rem.get(x.a)!));
          for (const g of order) if (!used.has(g.h) && !used.has(g.a)) { week.push(g); used.add(g.h); used.add(g.a); }
          if (must.every((t) => used.has(t)) && (!best || week.length > best.length)) best = week;
          if (best && best.length * 2 >= rem.size - 1) break;
        }
        if (!best) { ok = false; break; }
        const taken = new Set(best);
        left = left.filter((g) => !taken.has(g));
        out.push(best);
      }
      if (ok && left.length === 0) return out;
    }
  }
  throw new Error('Could not build a schedule.');
}

// ---------- games ----------

/** Points for one side from a run of drives: offense against defense, a little for home. */
function drives(off: BowlTeam, def: BowlTeam, n: number, home: boolean, rng: Rng) {
  const edge = (off.offense - def.defense) / 100;
  const pTd = clamp(0.3 + edge * 1.4 + (home ? 0.015 : 0), 0.08, 0.55), pFg = 0.18;
  let pts = 0;
  for (let i = 0; i < n; i++) {
    const r = rng.next();
    pts += r < pTd ? (rng.next() < 0.94 ? 7 : 6) : r < pTd + pFg ? 3 : 0;
  }
  return pts;
}

export function simMatch(L: League, m: Match, rng: Rng, playoff: boolean): Match {
  const H = ratingsOf(L, teamOf(L, m.h)), A = ratingsOf(L, teamOf(L, m.a));
  // The final is on a neutral field.
  const home = !(playoff && L.po?.round === 3);
  let hs = drives(H, A, 7, home, rng), as = drives(A, H, 7, false, rng), ot: 1 | undefined;
  if (hs === as) {
    const pH = clamp(0.5 + (H.offense + H.defense - A.offense - A.defense) / 100, 0.2, 0.8);
    if (playoff || rng.next() < 0.75) { ot = 1; if (rng.next() < pH) hs += 3; else as += 3; }
  }
  return { ...m, hs, as, ot };
}

/** Overtime for a game you played that ended level. Playoff games always produce a winner. */
export function overtime(L: League, m: Match, rng: Rng, playoff: boolean): Match {
  if (m.hs !== m.as) return m;
  const sim = simMatch(L, { h: m.h, a: m.a }, rng, playoff);
  if (sim.hs === sim.as) return { ...m };
  return { ...m, hs: (m.hs ?? 0) + (sim.hs! > sim.as! ? 3 : 0), as: (m.as ?? 0) + (sim.as! > sim.hs! ? 3 : 0), ot: 1 };
}

const emptyStats = (): SStats => ({ pa: 0, pc: 0, py: 0, ptd: 0, int: 0, ra: 0, ry: 0, rtd: 0, rec: 0, ryd: 0, rectd: 0, sk: 0 });
export function addStats(L: League, id: string, s: Partial<SStats>) {
  const cur = L.stats[id] ?? emptyStats();
  for (const [k, v] of Object.entries(s)) (cur as unknown as Record<string, number>)[k] += v ?? 0;
  L.stats[id] = cur;
}

/** A simulated game of yours still fills in a box score, spread by who starts and how good they are. */
function simBox(L: League, pts: number, rng: Rng) {
  const t = myTeam(L), d = depth(t);
  const qb = d.QB.find((p) => p.inj === 0), rb = d.RB.find((p) => p.inj === 0);
  const tg = [...d.WR.filter((p) => p.inj === 0).slice(0, 3), ...d.TE.filter((p) => p.inj === 0).slice(0, 1)];
  const tds = Math.floor(pts / 7), passTd = Math.round(tds * 0.62), rushTd = tds - passTd;
  const py = Math.round(150 + pts * 4 + (rng.next() - 0.5) * 80), ry = Math.round(70 + pts * 1.6 + (rng.next() - 0.5) * 50);
  const pa = 28 + rng.int(0, 10), pc = Math.round(pa * (0.58 + rng.next() * 0.12));
  if (qb) addStats(L, qb.id, { pa, pc, py, ptd: passTd, int: rng.next() < 0.5 ? 1 : 0, sk: rng.int(0, 3) });
  if (rb) addStats(L, rb.id, { ra: 18 + rng.int(0, 8), ry: Math.round(ry * 0.8), rtd: rushTd });
  const wsum = tg.reduce((s, p) => s + p.o, 0) || 1;
  let left = py, recs = pc, tdl = passTd;
  tg.forEach((p, i) => {
    const share = p.o / wsum, last = i === tg.length - 1;
    const yd = last ? left : Math.round(py * share), rc = last ? recs : Math.round(pc * share), td = last ? tdl : Math.min(tdl, rng.next() < share * 1.5 ? 1 : 0);
    left -= yd; recs -= rc; tdl -= td;
    addStats(L, p.id, { rec: rc, ryd: yd, rectd: td });
  });
}

// ---------- the week ----------

const PRESS_WIN: Press[] = [
  { q: 'Big win today. Is this team a contender?', answers: [{ text: 'One game at a time.', fans: 0, chem: 3 }, { text: 'Nobody in this league wants to play us.', fans: 5, chem: -2 }, { text: 'Credit to the players. They earned it.', fans: 1, chem: 4 }] },
  { q: 'The offense looked sharp. What clicked?', answers: [{ text: 'The line gave us all day.', fans: 0, chem: 4 }, { text: 'Good scheme. I will take some credit.', fans: 3, chem: -3 }, { text: 'We left points out there. Still work to do.', fans: -1, chem: 3 }] },
  { q: 'Your team keeps winning. Any message for the fans?', answers: [{ text: 'Keep showing up. You make this place loud.', fans: 5, chem: 0 }, { text: 'Buy your playoff tickets now.', fans: 4, chem: -1 }, { text: 'Nothing is won yet.', fans: -1, chem: 3 }] },
];
const PRESS_LOSS: Press[] = [
  { q: 'Tough loss. What went wrong?', answers: [{ text: 'That is on me. I have to coach better.', fans: -1, chem: 5 }, { text: 'Some guys did not show up today.', fans: 2, chem: -6 }, { text: 'It is one game. We will be fine.', fans: 0, chem: 1 }] },
  { q: 'Fans are getting restless. Is your job safe?', answers: [{ text: 'I believe in this locker room.', fans: 1, chem: 4 }, { text: 'Changes are coming. Count on it.', fans: 4, chem: -4 }, { text: 'I do not worry about that.', fans: -2, chem: 1 }] },
  { q: 'The defense gave up a lot today. Your thoughts?', answers: [{ text: 'We will fix it in practice this week.', fans: 0, chem: 3 }, { text: 'We need better players on that side.', fans: 3, chem: -5 }, { text: 'They made plays. Tip your cap.', fans: -1, chem: 2 }] },
];

/** Standings order: win share, then point difference, then points. */
const pct = (t: FTeam) => (t.w + t.t / 2) / Math.max(1, t.w + t.l + t.t);
export const byRecord = (a: FTeam, b: FTeam) => pct(b) - pct(a) || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf || a.abbr.localeCompare(b.abbr);

/** Weekly power rankings: roster strength early, results more as the season goes. */
export function rankTeams(L: League) {
  const g = (t: FTeam) => t.w + t.l + t.t;
  const score = (t: FTeam) => { const r = ratingsOf(L, t); const n = g(t); return (r.offense + r.defense) / 2 + (n ? ((pct(t) - 0.5) * 40 + ((t.pf - t.pa) / n) * 0.4) * Math.min(1, n / 6) : 0); };
  const ranked = [...L.teams].sort((a, b) => score(b) - score(a));
  ranked.forEach((t, i) => { t.pr0 = t.pr ?? i + 1; t.pr = i + 1; });
}

/** The game this week for your team, or null on a bye or once you are out of the playoffs. */
export function myGame(L: League): Match | null {
  const games = L.phase === 'season' ? L.sched[L.week] ?? [] : L.phase === 'playoffs' ? L.po?.games ?? [] : [];
  return games.find((m) => m.h === L.you || m.a === L.you) ?? null;
}

export interface PlayedGame { pf: number; pa: number; stats?: Record<string, Partial<SStats>> }

/**
 * Finish the week: your game (played, or simulated when `mine` is null), everyone else's, injuries, development,
 * credits, fans, chemistry and the press conference.
 */
export function finishWeek(L0: League, mine: PlayedGame | null): League {
  const L: League = structuredClone(L0);
  const rng = createRng(`fr:${L.id}:${L.year}:${L.phase}:${L.week}:${L.po?.round ?? 0}`);
  const playoff = L.phase === 'playoffs';
  const games = playoff ? L.po!.games : L.sched[L.week];
  const done: Match[] = games.map((m) => {
    if (m.h !== L.you && m.a !== L.you) return simMatch(L, m, rng, playoff);
    const home = m.h === L.you;
    let r: Match;
    if (mine) {
      r = { ...m, hs: home ? mine.pf : mine.pa, as: home ? mine.pa : mine.pf };
      r = overtime(L, r, rng, playoff);
      for (const [id, s] of Object.entries(mine.stats ?? {})) addStats(L, id, s);
    } else {
      r = simMatch(L, m, rng, playoff);
      simBox(L, home ? r.hs! : r.as!, rng);
    }
    return r;
  });
  // Injuries heal a week, then new ones.
  const rehab = L.fac.rehab;
  for (const t of L.teams) for (const p of t.roster) if (p.inj > 0) p.inj -= 1;
  for (const m of done) {
    for (const abbr of [m.h, m.a]) {
      const t = teamOf(L, abbr);
      for (const p of t.roster) {
        if (p.inj > 0 || rng.next() > 0.011) continue;
        let weeks = 1 + Math.floor(rng.next() ** 2 * 7);
        if (abbr === L.you) weeks = Math.max(1, weeks - (rehab - 1));
        p.inj = weeks;
        if (abbr === L.you) L.news.unshift(`${p.p} ${p.n} is hurt, out ${weeks} ${weeks === 1 ? 'week' : 'weeks'}.`);
      }
    }
  }
  // Regular-season records (the playoffs are tracked in the bracket).
  for (const m of playoff ? [] : done) {
    const H = teamOf(L, m.h), A = teamOf(L, m.a);
    H.pf += m.hs!; H.pa += m.as!; A.pf += m.as!; A.pa += m.hs!;
    if (m.hs! > m.as!) { H.w++; A.l++; } else if (m.hs! < m.as!) { A.w++; H.l++; } else { H.t++; A.t++; }
  }
  // Young players grow during the season; your training facility helps yours.
  for (const t of L.teams) for (const p of t.roster) {
    if (p.o >= p.pot || p.age > 26) continue;
    const chance = 0.06 + (t.abbr === L.you ? (L.fac.train - 1) * 0.025 : 0.02);
    if (rng.next() < chance) { p.o += 1; if (t.abbr === L.you && p.o >= 80 && p.o % 5 === 0) L.news.unshift(`${p.n} is up to ${p.o} overall.`); }
  }
  // Your result: credits, fans, chemistry, a press conference.
  const mineDone = done.find((m) => m.h === L.you || m.a === L.you);
  if (mineDone) {
    const home = mineDone.h === L.you, us = home ? mineDone.hs! : mineDone.as!, them = home ? mineDone.as! : mineDone.hs!;
    const opp = teamOf(L, home ? mineDone.a : mineDone.h);
    const won = us > them, tie = us === them;
    const credits = (won ? 3 : tie ? 2 : 1) + (playoff && won ? 3 : 0) + Math.floor(L.fans / 35) + (home ? L.fac.stadium - 1 : 0);
    L.cc += credits;
    L.fans = clamp(L.fans + (won ? 3 : tie ? 0 : -3) + (won && us - them >= 21 ? 2 : 0), 0, 100);
    L.chem = clamp(L.chem + (won ? 2 : tie ? 0 : -2), 0, 100);
    L.news.unshift(`${won ? 'Won' : tie ? 'Tied' : 'Lost'} ${us}-${them} ${home ? 'vs' : 'at'} ${opp.abbr}${mineDone.ot ? ' in overtime' : ''}. +${credits} credits.`);
    const bank = won ? PRESS_WIN : PRESS_LOSS;
    L.press = tie ? null : bank[rng.int(0, bank.length - 1)];
  }
  L.news = L.news.slice(0, 40);
  if (playoff) {
    L.po!.games = done;
    return advancePlayoffs(L);
  }
  L.sched[L.week] = done;
  L.week++;
  rankTeams(L);
  if (L.week >= L.sched.length) startPlayoffs(L);
  return L;
}

export function answerPress(L0: League, i: number): League {
  const L = structuredClone(L0), a = L.press?.answers[i];
  if (!a) return L0;
  L.fans = clamp(L.fans + a.fans, 0, 100); L.chem = clamp(L.chem + a.chem, 0, 100); L.press = null;
  return L;
}

// ---------- playoffs ----------

export function seedConference(L: League, conf: string): string[] {
  const ts = L.teams.filter((t) => t.conf === conf);
  const divs = [...new Set(ts.map((t) => t.div))];
  const winners = divs.map((d) => ts.filter((t) => t.div === d).sort(byRecord)[0]).sort(byRecord);
  const rest = ts.filter((t) => !winners.includes(t)).sort(byRecord).slice(0, 3);
  return [...winners, ...rest].map((t) => t.abbr);
}

function startPlayoffs(L: League) {
  const confs = [...new Set(L.teams.map((t) => t.conf))].sort();
  const seeds = Object.fromEntries(confs.map((c) => [c, seedConference(L, c)]));
  const games: Match[] = [];
  for (const c of confs) { const s = seeds[c]; games.push({ h: s[1], a: s[6] }, { h: s[2], a: s[5] }, { h: s[3], a: s[4] }); }
  L.phase = 'playoffs';
  L.po = { round: 0, seeds, games, past: [], alive: Object.values(seeds).flat() };
  const inIt = L.po.alive.includes(L.you);
  const seed = inIt ? Object.values(seeds).find((s) => s.includes(L.you))!.indexOf(L.you) + 1 : 0;
  L.news.unshift(inIt ? `In the playoffs as the ${seed} seed.${seed === 1 ? ' First-round bye.' : ''}` : 'Season over. You missed the playoffs.');
  if (inIt) L.cc += 5;
}

function advancePlayoffs(L: League): League {
  const po = L.po!;
  const winners = po.games.map((m) => (m.hs! > m.as! ? m.h : m.a));
  const losers = po.games.map((m) => (m.hs! > m.as! ? m.a : m.h));
  po.past.push(po.games);
  po.alive = po.alive.filter((a) => !losers.includes(a));
  const seedOf = (a: string) => Object.values(po.seeds).find((s) => s.includes(a))!.indexOf(a);
  const confOf = (a: string) => Object.keys(po.seeds).find((c) => po.seeds[c].includes(a))!;
  if (po.round === 3) {
    po.champ = winners[0];
    return endSeason(L);
  }
  po.round++;
  const games: Match[] = [];
  if (po.round === 3) {
    const [a, b] = po.alive;
    const A = teamOf(L, a), B = teamOf(L, b);
    games.push(byRecord(A, B) <= 0 ? { h: a, a: b } : { h: b, a: a });
  } else {
    for (const c of Object.keys(po.seeds)) {
      const left = po.alive.filter((a) => confOf(a) === c).sort((x, y) => seedOf(x) - seedOf(y));
      if (po.round === 1) games.push({ h: left[0], a: left[3] }, { h: left[1], a: left[2] });
      else games.push({ h: left[0], a: left[1] });
    }
  }
  po.games = games;
  if (!po.alive.includes(L.you) && losers.includes(L.you)) L.news.unshift(`Eliminated in the ${PLAYOFF_ROUNDS[po.round - 1].toLowerCase()}.`);
  else if (po.alive.includes(L.you)) L.news.unshift(`On to the ${PLAYOFF_ROUNDS[po.round].toLowerCase()}.`);
  return L;
}

/** Sim everything left in the playoffs (when you are out). */
export function simPlayoffs(L0: League): League {
  let L = L0;
  while (L.phase === 'playoffs') L = finishWeek(L, null);
  return L;
}

function finishFor(L: League): string {
  const po = L.po;
  if (!po || !Object.values(po.seeds).flat().includes(L.you)) return 'Missed the playoffs';
  if (po.champ === L.you) return 'Won the Unbeaten Bowl';
  const lostAt = po.past.findIndex((round) => round.some((m) => (m.h === L.you || m.a === L.you) && (m.hs! > m.as! ? m.a : m.h) === L.you));
  return lostAt >= 0 ? `Lost in the ${PLAYOFF_ROUNDS[lostAt].toLowerCase()}` : 'Playoffs';
}

function endSeason(L: League): League {
  const t = myTeam(L), champ = L.po!.champ!;
  const finish = finishFor(L);
  if (champ === L.you) { L.cc += 15; L.fans = clamp(L.fans + 15, 0, 100); }
  const leaders = seasonLeaders(L).map((x) => `${x.label}: ${x.name}, ${x.line}`);
  L.hist.unshift({ year: L.year, w: t.w, l: t.l, t: t.t, finish, champ, leaders });
  const C = teamOf(L, champ);
  L.news.unshift(champ === L.you ? `Champions. The ${t.name} win the Unbeaten Bowl.` : `The ${C.city} ${C.name} win the Unbeaten Bowl.`);
  L.phase = 'recap';
  return L;
}

export function seasonLeaders(L: League) {
  const t = myTeam(L), name = (id: string) => t.roster.find((p) => p.id === id)?.n;
  const best = (k: keyof SStats) => Object.entries(L.stats).filter(([id]) => name(id)).sort((a, b) => b[1][k] - a[1][k])[0];
  const out: { label: string; name: string; line: string }[] = [];
  const p = best('py'), r = best('ry'), c = best('ryd');
  if (p && p[1].py) out.push({ label: 'Passing', name: name(p[0])!, line: `${p[1].py.toLocaleString('en-US')} yds, ${p[1].ptd} TD` });
  if (r && r[1].ry) out.push({ label: 'Rushing', name: name(r[0])!, line: `${r[1].ry.toLocaleString('en-US')} yds, ${r[1].rtd} TD` });
  if (c && c[1].ryd) out.push({ label: 'Receiving', name: name(c[0])!, line: `${c[1].rec} rec, ${c[1].ryd.toLocaleString('en-US')} yds` });
  return out;
}

// ---------- spending credits ----------

export const trainCost = (p: FPlayer) => 2 + Math.max(0, Math.floor((p.o - 60) / 8));
export const facilityCost = (level: number) => level * 10;
export const staffCost = (level: number) => level * 8;
export const DINNER_COST = 4;

export function train(L0: League, id: string): League {
  const L = structuredClone(L0), p = myTeam(L).roster.find((x) => x.id === id);
  if (!p) throw new Error('No such player.');
  if (L.trained.includes(id)) throw new Error(`${p.n} already trained this season.`);
  if (p.o >= 99) throw new Error(`${p.n} is maxed out.`);
  const cost = trainCost(p);
  if (L.cc < cost) throw new Error(`Training costs ${cost} credits.`);
  const rng = createRng(`fr:${L.id}:train:${L.year}:${id}`);
  const gain = (p.o < p.pot ? 2 : 1) + (rng.next() < (L.fac.train - 1) * 0.2 ? 1 : 0);
  L.cc -= cost; p.o = Math.min(99, p.o + gain); p.pot = Math.max(p.pot, p.o); L.trained.push(id);
  L.news.unshift(`${p.n} trains up to ${p.o} (+${gain}).`);
  return L;
}

export function upgradeFacility(L0: League, k: keyof League['fac']): League {
  const L = structuredClone(L0), lv = L.fac[k];
  if (lv >= 5) throw new Error('Already at the top level.');
  if (L.cc < facilityCost(lv)) throw new Error(`That costs ${facilityCost(lv)} credits.`);
  L.cc -= facilityCost(lv); L.fac[k] = lv + 1;
  return L;
}

export function upgradeStaff(L0: League, k: keyof League['staff']): League {
  const L = structuredClone(L0), lv = L.staff[k];
  if (lv >= 5) throw new Error('Already the best available.');
  if (L.cc < staffCost(lv)) throw new Error(`That costs ${staffCost(lv)} credits.`);
  L.cc -= staffCost(lv); L.staff[k] = lv + 1;
  return L;
}

export function teamDinner(L0: League): League {
  const L = structuredClone(L0);
  if (L.cc < DINNER_COST) throw new Error(`A team dinner costs ${DINNER_COST} credits.`);
  L.cc -= DINNER_COST; L.chem = clamp(L.chem + 8, 0, 100);
  return L;
}

/** Cutting a player: half of what is left on his deal stays on the cap this season. */
export function release(L0: League, id: string): League {
  const L = structuredClone(L0), t = myTeam(L), p = t.roster.find((x) => x.id === id);
  if (!p) throw new Error('No such player.');
  if (t.roster.filter((x) => x.p === p.p).length <= MIN[p.p]) throw new Error(`You need at least ${MIN[p.p]} at ${p.p}.`);
  t.roster = t.roster.filter((x) => x.id !== id);
  t.dead = Math.round((t.dead + p.sal * 0.5) * 10) / 10;
  L.fa.push({ ...p, sal: salaryFor(p.p, p.o, p.age), yrs: 0, inj: 0 });
  L.news.unshift(`Released ${p.p} ${p.n}.`);
  return L;
}

// ---------- offseason ----------

/** Aging and growth: young players move toward their potential, veterans slow down, the oldest retire. */
function ageOne(p: FPlayer, rng: Rng, trainBonus: number): 'retire' | null {
  p.age += 1;
  if (p.age <= 25) p.o = Math.min(p.pot, p.o + rng.int(1, 4) + trainBonus);
  else if (p.age <= 29) p.o = clamp(p.o + rng.int(-1, 2) + (p.o < p.pot ? 1 : 0), 40, 99);
  else if (p.age <= 32) p.o = clamp(p.o - rng.int(0, 3), 40, 99);
  else p.o = clamp(p.o - rng.int(2, 6), 40, 99);
  p.pot = Math.max(p.o, p.age >= 29 ? p.o : p.pot);
  const K = p.p === 'K' || p.p === 'QB';
  if (p.age >= (K ? 39 : 34) && rng.next() < 0.45 + (p.age - (K ? 39 : 34)) * 0.2) return 'retire';
  if (p.age >= 31 && p.o < 64) return 'retire';
  return null;
}

/** After the final: everyone ages, contracts run down, and your expiring players wait on you. */
export function startOffseason(L0: League): League {
  const L = structuredClone(L0);
  const rng = createRng(`fr:${L.id}:off:${L.year}`);
  const retired: string[] = [];
  for (const t of L.teams) {
    t.dead = 0;
    const keep: FPlayer[] = [];
    for (const p of t.roster) {
      p.inj = 0;
      const r = ageOne(p, rng, t.abbr === L.you ? L.fac.train - 1 : 0);
      if (r === 'retire') { if (t.abbr === L.you) retired.push(`${p.p} ${p.n}`); continue; }
      p.yrs -= 1;
      keep.push(p);
    }
    t.roster = keep;
  }
  for (const p of L.fa) ageOne(p, rng, 0);
  L.fa = L.fa.filter((p) => p.age < 35 && p.o >= 55);
  if (retired.length) L.news.unshift(`Retired: ${retired.join(', ')}.`);
  // Other teams: keep good players whose deals are up when the money works, let the rest go.
  for (const t of L.teams) {
    if (t.abbr === L.you) continue;
    for (const p of [...t.roster].filter((x) => x.yrs <= 0).sort((a, b) => b.o - a.o)) {
      const ask = salaryFor(p.p, p.o, p.age);
      if (p.o >= 68 && payroll(t) - p.sal + ask <= L.cap) { p.sal = ask; p.yrs = yearsFor(p.age, rng); }
      else { t.roster = t.roster.filter((x) => x !== p); L.fa.push({ ...p, sal: ask, yrs: 0 }); }
    }
  }
  L.phase = 'resign';
  return L;
}

/** Your players whose deals are up. */
export const expiring = (L: League) => myTeam(L).roster.filter((p) => p.yrs <= 0);
/** What a player wants to stay: more when the locker room is unhappy. */
export const askFor = (L: League, p: FPlayer) => Math.round(salaryFor(p.p, p.o, p.age) * (L.chem < 40 ? 1.15 : L.chem > 75 ? 0.92 : 1) * 10) / 10;

export function resign(L0: League, id: string): League {
  const L = structuredClone(L0), t = myTeam(L), p = t.roster.find((x) => x.id === id && x.yrs <= 0);
  if (!p) throw new Error('No such player.');
  const ask = askFor(L, p);
  if (payroll(t) - p.sal + ask > L.cap) throw new Error(`Not enough cap space for $${ask}M.`);
  p.sal = ask; p.yrs = yearsFor(p.age, createRng(`fr:${L.id}:re:${L.year}:${id}`));
  L.news.unshift(`Re-signed ${p.n}: ${p.yrs} ${p.yrs === 1 ? 'year' : 'years'}, $${ask}M a year.`);
  return L;
}

/** Done with re-signing: whoever is left goes to free agency, then the draft. */
export function toDraft(L0: League): League {
  const L = structuredClone(L0), t = myTeam(L);
  for (const p of t.roster.filter((x) => x.yrs <= 0)) { L.fa.push({ ...p, sal: salaryFor(p.p, p.o, p.age), yrs: 0 }); L.news.unshift(`${p.n} leaves in free agency.`); }
  t.roster = t.roster.filter((x) => x.yrs > 0);
  const rng = createRng(`fr:${L.id}:class:${L.year}`);
  // A class of made-up prospects; a few are special.
  const weights: [Pos, number][] = [['QB', 6], ['RB', 9], ['WR', 15], ['TE', 7], ['OL', 22], ['DL', 12], ['EDGE', 10], ['LB', 11], ['CB', 13], ['S', 9], ['K', 3]];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const pool: FPlayer[] = [];
  for (let i = 0; i < 150; i++) {
    let r = rng.next() * total, pos: Pos = 'WR';
    for (const [p, w] of weights) { r -= w; if (r <= 0) { pos = p; break; } }
    const star = rng.next();
    const ovr = Math.round(star > 0.97 ? 76 + rng.int(0, 6) : star > 0.85 ? 68 + rng.int(0, 7) : 55 + rng.int(0, 13));
    const age = 21 + rng.int(0, 2);
    const pot = clamp(ovr + 6 + Math.round(rng.next() ** 1.5 * 22), ovr, 99);
    const p = makePlayer(rng, pos, ovr, age, pot, `d:${L.year}:${i}`);
    pool.push({ ...p, yrs: 4, sal: 0.8 });
  }
  // Worst record picks first; playoff teams after, the champion last.
  const champ = L.po?.champ, out = L.po ? Object.values(L.po.seeds).flat() : [];
  const order = [...L.teams].sort((a, b) => {
    const pa = out.includes(a.abbr) ? 1 : 0, pb = out.includes(b.abbr) ? 1 : 0;
    if (a.abbr === champ) return 1; if (b.abbr === champ) return -1;
    return pa - pb || -byRecord(a, b);
  }).map((t) => t.abbr);
  L.draft = { pool, order, pick: 0, log: [] };
  L.phase = 'draft';
  return runAiPicks(L);
}

/** Shown potential: a letter grade from scouting, a little noisy. */
export function scoutGrade(L: League, p: FPlayer): string {
  const noise = createRng(`fr:${L.id}:scout:${p.id}`).int(-4, 4);
  const v = p.pot + noise;
  return v >= 90 ? 'A' : v >= 83 ? 'B' : v >= 76 ? 'C' : v >= 69 ? 'D' : 'F';
}

const NEED: Record<Pos, number> = SHAPE;
function aiChoice(L: League, t: FTeam, pool: FPlayer[]) {
  const have = (pos: Pos) => t.roster.filter((p) => p.p === pos).length;
  const val = (p: FPlayer) => p.o * 0.6 + p.pot * 0.4 + (have(p.p) < NEED[p.p] ? 4 : -6) - (p.p === 'K' ? 8 : 0);
  return [...pool].sort((a, b) => val(b) - val(a))[0];
}
const roundOf = (L: League, pick: number) => Math.floor(pick / L.draft!.order.length) + 1;
function rookieDeal(L: League, pick: number) { const n = L.draft!.order.length; return Math.round(Math.max(0.8, 6 - (pick / n) * 2.4 - (pick >= n ? 1.5 : 0)) * 10) / 10; }

function take(L: League, abbr: string, p: FPlayer) {
  const d = L.draft!, t = teamOf(L, abbr);
  d.pool = d.pool.filter((x) => x.id !== p.id);
  const round = roundOf(L, d.pick);
  t.roster.push({ ...p, sal: rookieDeal(L, d.pick), yrs: 4, dr: `R${round} ${L.year + 1}` });
  d.log.push({ abbr, id: p.id, n: p.n, p: p.p, o: p.o, pick: d.pick + 1 });
  if (abbr === L.you) L.news.unshift(`Drafted ${p.p} ${p.n} in round ${round}.`);
  d.pick++;
}

/** The other teams pick until it is your turn (or the draft ends). */
export function runAiPicks(L: League): League {
  const d = L.draft!;
  const total = d.order.length * DRAFT_ROUNDS;
  while (d.pick < total) {
    const abbr = d.order[d.pick % d.order.length];
    if (abbr === L.you) return L;
    take(L, abbr, aiChoice(L, teamOf(L, abbr), d.pool));
  }
  return toFreeAgency(L);
}

export const onTheClock = (L: League) => (L.draft && L.draft.pick < L.draft.order.length * DRAFT_ROUNDS ? L.draft.order[L.draft.pick % L.draft.order.length] : null);

export function draftPick(L0: League, id: string): League {
  const L = structuredClone(L0);
  if (onTheClock(L) !== L.you) throw new Error('Not your pick.');
  const p = L.draft!.pool.find((x) => x.id === id);
  if (!p) throw new Error('Already taken.');
  take(L, L.you, p);
  return runAiPicks(L);
}

/** Let the best player on your board be the pick. */
export function autoPick(L0: League): League {
  const L = structuredClone(L0);
  if (onTheClock(L) !== L.you) return L0;
  take(L, L.you, aiChoice(L, myTeam(L), L.draft!.pool));
  return runAiPicks(L);
}

function toFreeAgency(L: League): League {
  // Undrafted prospects worth a look join the pool.
  const undrafted = (L.draft?.pool ?? []).sort((a, b) => b.o - a.o).slice(0, 25).map((p) => ({ ...p, yrs: 0, sal: 0.8 }));
  L.fa = [...L.fa, ...undrafted].sort((a, b) => b.o - a.o).slice(0, 120);
  L.phase = 'fa';
  return L;
}

/** How keen a free agent is on you: winning and fans help. */
export function interest(L: League): number {
  const last = L.hist[0];
  const winPct = last ? (last.w + last.t / 2) / Math.max(1, last.w + last.l + last.t) : 0.5;
  return clamp(0.35 + L.fans / 250 + winPct * 0.35 + (last?.finish === 'Won the Unbeaten Bowl' ? 0.1 : 0), 0, 1);
}
export const faAsk = (L: League, p: FPlayer) => Math.round(p.sal * (interest(L) < 0.5 ? 1.2 : interest(L) > 0.75 ? 0.95 : 1.05) * 10) / 10;

export function sign(L0: League, id: string): League {
  const L = structuredClone(L0), t = myTeam(L), p = L.fa.find((x) => x.id === id);
  if (!p) throw new Error('Already signed elsewhere.');
  if (t.roster.length >= ROSTER_MAX) throw new Error(`Your roster is full (${ROSTER_MAX}). Release someone first.`);
  const ask = faAsk(L, p);
  if (payroll(t) + ask > L.cap) throw new Error(`Not enough cap space for $${ask}M.`);
  L.fa = L.fa.filter((x) => x.id !== id);
  const yrs = yearsFor(p.age, createRng(`fr:${L.id}:fa:${L.year}:${id}`));
  t.roster.push({ ...p, sal: ask, yrs, inj: 0 });
  L.news.unshift(`Signed ${p.p} ${p.n}: ${yrs} ${yrs === 1 ? 'year' : 'years'}, $${ask}M a year.`);
  return L;
}

/** Free agency closes: other teams fill holes, everyone trims to the limit, and a new season begins. */
export function startSeason(L0: League): League {
  const L = structuredClone(L0);
  const rng = createRng(`fr:${L.id}:new:${L.year}`);
  for (const t of L.teams) {
    // Fill every spot up to the minimum (and AI teams up to their usual shape when money allows).
    for (const pos of POSITIONS) {
      const want = t.abbr === L.you ? MIN[pos] : SHAPE[pos];
      while (t.roster.filter((p) => p.p === pos).length < want) {
        const fa = L.fa.filter((p) => p.p === pos).sort((a, b) => b.o - a.o).find((p) => t.abbr === L.you ? false : payroll(t) + p.sal <= L.cap);
        if (fa) { L.fa = L.fa.filter((x) => x !== fa); t.roster.push({ ...fa, yrs: yearsFor(fa.age, rng) }); }
        else {
          const p = makePlayer(rng, pos, 56 + rng.int(0, 6), 22 + rng.int(0, 5), 64, `r:${L.year}:${t.abbr}:${pos}:${t.roster.length}`);
          t.roster.push(p);
          if (t.abbr === L.you) L.news.unshift(`Signed ${pos} ${p.n} off the street to fill the roster.`);
        }
      }
    }
    if (t.abbr !== L.you) {
      while (t.roster.length > ROSTER_MAX) {
        const cut = [...t.roster].sort((a, b) => a.o - b.o).find((p) => t.roster.filter((x) => x.p === p.p).length > MIN[p.p]);
        if (!cut) break;
        t.roster = t.roster.filter((x) => x !== cut); L.fa.push({ ...cut, yrs: 0 });
      }
    }
    t.w = 0; t.l = 0; t.t = 0; t.pf = 0; t.pa = 0;
  }
  // Same-place games next year come from this year's division finish.
  const place = new Map<string, number>();
  for (const d of new Set(L.teams.map((t) => t.div))) L.teams.filter((t) => t.div === d).sort(byRecordFrom(L0)).forEach((t, i) => place.set(t.abbr, i));
  L.year += 1; L.week = 0; L.phase = 'season'; L.po = null; L.draft = null; L.press = null; L.trained = []; L.stats = {};
  L.fa = L.fa.slice(0, 80);
  L.sched = makeSchedule(L, (a, b) => (place.get(a.abbr) ?? 0) - (place.get(b.abbr) ?? 0));
  rankTeams(L);
  L.news.unshift(`The ${L.year} season begins.`);
  return L;
}
const byRecordFrom = (L0: League) => (a: FTeam, b: FTeam) => byRecord(teamOf(L0, a.abbr), teamOf(L0, b.abbr));

/** Over the roster limit? You must trim before the season starts. */
export const overLimit = (L: League) => Math.max(0, myTeam(L).roster.length - ROSTER_MAX);

/** A one-line summary for the GM rankings. */
export function summary(L: League) {
  const titles = L.hist.filter((h) => h.finish === 'Won the Unbeaten Bowl').length;
  const w = L.hist.reduce((s, h) => s + h.w, 0) + (L.phase === 'season' || L.phase === 'playoffs' ? myTeam(L).w : 0);
  const l = L.hist.reduce((s, h) => s + h.l, 0) + (L.phase === 'season' || L.phase === 'playoffs' ? myTeam(L).l : 0);
  return { team: L.you, titles, seasons: L.hist.length, w, l };
}
