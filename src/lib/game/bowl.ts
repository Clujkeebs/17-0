import { clamp, createRng } from './prng';

/**
 * Unbeaten Bowl: an original retro football game on real NFL rosters. You run the offense; the other team's
 * drives are simulated from both rosters. Everything here is pure and shared by the server (scoring) and the
 * client (play), so the opponent's points are the same on both sides for a given seed and matchup.
 */

export const BOWL_DRIVES = 6;
/** What one of your drives can be worth: nothing, a field goal, a touchdown with a missed, made or two-point try. */
export const DRIVE_POINTS = [0, 3, 6, 7, 8] as const;

export interface BowlSkill { name: string; num: number | null; pos: string; ovr: number; spd: number; hands: number; route: number; elus: number; strength: number }
export interface BowlTeam {
  abbr: string; name: string; city: string; color: string; alt: string; logo: string | null;
  qb: { name: string; num: number | null; ovr: number; arm: number; acc: number; spd: number };
  rb: BowlSkill; targets: BowlSkill[];
  k: { name: string; power: number; acc: number };
  ol: { pass: number; run: number };
  def: { rush: number; cover: number; tackle: number; speed: number; names: string[] };
  /** One number per side for the drive sim. */
  offense: number; defense: number;
}

type RawPlayer = { name: string; position: string; group: string; ovr: number; teamId: number; jersey: number | null; attrs: Record<string, number | undefined> };
type RawTeam = { id: number; abbr: string; name: string; city: string; color: string; logoUrl: string | null };

const a = (p: RawPlayer | undefined, key: string, fallback?: number) => {
  const v = p?.attrs[key];
  return typeof v === 'number' ? v : fallback ?? p?.ovr ?? 60;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 60);
const top = (ps: RawPlayer[], g: string[], n: number) => ps.filter((p) => g.includes(p.group)).sort((x, y) => y.ovr - x.ovr).slice(0, n);

/** A team's game ratings from its real roster (current Madden attributes). */
export function bowlTeam(t: RawTeam, roster: RawPlayer[]): BowlTeam | null {
  const qb = top(roster, ['QB'], 1)[0], rb = top(roster, ['RB'], 1)[0];
  const wrs = top(roster, ['WR'], 2), te = top(roster, ['TE'], 1)[0];
  const k = roster.filter((p) => p.position === 'K').sort((x, y) => y.ovr - x.ovr)[0];
  if (!qb || !rb || wrs.length < 2 || !te) return null;
  const skill = (p: RawPlayer): BowlSkill => ({
    name: p.name, num: p.jersey, pos: p.group, ovr: p.ovr, spd: a(p, 'speed'), hands: a(p, 'catching'), route: a(p, 'routeRunning'),
    elus: Math.round((a(p, 'jukeMove') + a(p, 'agility') + a(p, 'breakTackle')) / 3), strength: a(p, 'trucking', a(p, 'strength')),
  });
  const ol = top(roster, ['OL'], 5), rushers = top(roster, ['DL', 'EDGE'], 4), cover = [...top(roster, ['CB'], 3), ...top(roster, ['S'], 2)], lbs = top(roster, ['LB'], 3);
  const rush = Math.round(avg(rushers.map((p) => Math.max(a(p, 'powerMoves'), a(p, 'finesseMoves'), a(p, 'blockShedding')))));
  const coverR = Math.round(avg(cover.map((p) => Math.max(a(p, 'manCoverage'), a(p, 'zoneCoverage')))));
  const tackle = Math.round(avg([...lbs, ...cover].map((p) => (a(p, 'tackle') + a(p, 'pursuit')) / 2)));
  const speed = Math.round(avg(cover.map((p) => a(p, 'speed'))));
  const team: BowlTeam = {
    abbr: t.abbr, name: t.name, city: t.city, color: t.color, alt: '#F5F5F4', logo: t.logoUrl,
    qb: { name: qb.name, num: qb.jersey, ovr: qb.ovr, arm: a(qb, 'throwPower'), acc: Math.round((a(qb, 'throwAccuracyShort') + a(qb, 'throwAccuracyMid') + a(qb, 'throwAccuracyDeep')) / 3), spd: a(qb, 'speed') },
    rb: skill(rb), targets: [...wrs.map(skill), skill(te)],
    k: { name: k?.name ?? 'Kicker', power: a(k, 'kickPower', 80), acc: a(k, 'kickAccuracy', 80) },
    ol: { pass: Math.round(avg(ol.map((p) => a(p, 'passBlock')))), run: Math.round(avg(ol.map((p) => a(p, 'runBlock')))) },
    def: { rush, cover: coverR, tackle, speed, names: [...rushers, ...cover].slice(0, 6).map((p) => p.name) },
    offense: 0, defense: 0,
  };
  team.offense = Math.round(qb.ovr * 0.4 + avg([rb.ovr, ...wrs.map((p) => p.ovr), te.ovr]) * 0.35 + team.ol.pass * 0.25);
  team.defense = Math.round(rush * 0.35 + coverR * 0.4 + tackle * 0.25);
  return team;
}

export function bowlTeams(teams: RawTeam[], players: RawPlayer[]): BowlTeam[] {
  return teams.map((t) => bowlTeam(t, players.filter((p) => p.teamId === t.id))).filter((x): x is BowlTeam => !!x).sort((x, y) => x.abbr.localeCompare(y.abbr));
}

/** Today: one matchup for everyone from the seed. Casual: you choose your team; the opponent comes from the seed. */
export function bowlMatchup(seed: string, teams: BowlTeam[], chosen?: string): { you: BowlTeam; opp: BowlTeam } {
  const rng = createRng(`bowl:${seed}`);
  const you = (chosen && teams.find((t) => t.abbr === chosen)) || rng.pick(teams);
  const others = teams.filter((t) => t.abbr !== you.abbr);
  const opp = createRng(`bowl:${seed}:opp:${you.abbr}`).pick(others);
  return { you, opp };
}

export interface OppDrive { points: number; text: string }

/** The other team's drives, fixed by the seed and both rosters: their offense against your defense. */
export function oppDrives(seed: string, you: BowlTeam, opp: BowlTeam): OppDrive[] {
  const rng = createRng(`bowl:${seed}:drives:${you.abbr}:${opp.abbr}`);
  const edge = (opp.offense - you.defense) / 100;
  const pTd = clamp(0.24 + edge * 1.4, 0.1, 0.5), pFg = 0.18;
  const tgt = (n: number) => opp.targets[n % opp.targets.length];
  return Array.from({ length: BOWL_DRIVES }, (_, i) => {
    const r = rng.next();
    if (r < pTd) {
      const kind = rng.next();
      const yards = 3 + Math.floor(rng.next() * 45);
      const how = kind < 0.6 ? `${last(opp.qb.name)} to ${last(tgt(i + Math.floor(rng.next() * 3)).name)}, ${yards}-yard TD` : `${last(opp.rb.name)} ${Math.max(1, Math.round(yards / 4))}-yard TD run`;
      const points = rng.next() < 0.94 ? 7 : 6;
      return { points, text: `${how}${points === 6 ? ' (kick missed)' : ''}` };
    }
    if (r < pTd + pFg) return { points: 3, text: `${last(opp.k.name)} ${28 + Math.floor(rng.next() * 25)}-yard field goal` };
    const stop = [`Three and out. ${you.def.names[0] ? last(you.def.names[0]) + ' gets home on third down.' : ''}`, `Punt. Your defense holds.`, `Turnover on downs.`, `Intercepted by ${you.def.names[Math.floor(rng.next() * you.def.names.length)] ? last(you.def.names[Math.floor(rng.next() * you.def.names.length)]) : 'your secondary'}.`, `Missed field goal.`];
    return { points: 0, text: rng.pick(stop).trim() };
  });
}

const last = (n: string) => n.split(' ').slice(-1)[0];

/** Field goal odds from the spot (yards from the goal line) and the kicker. */
export function fgChance(yardsToGoal: number, k: { power: number; acc: number }): number {
  const dist = yardsToGoal + 17;
  const reach = 42 + (k.power - 60) * 0.45; // a 99 leg is good to about 60 yards
  const base = 0.99 - Math.max(0, dist - 25) * (0.012 + (100 - k.acc) * 0.0004);
  return clamp(dist > reach + 6 ? 0 : dist > reach ? base * 0.45 : base, 0, 0.99);
}

/** Leaderboard score: wins first, then margin, then points scored. */
export function bowlScore(pf: number, pa: number): number {
  return (pf > pa ? 10_000 : pf === pa ? 5_000 : 0) + 100 * (pf - pa + 60) + pf;
}
