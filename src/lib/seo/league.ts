import { POSITION_GROUPS, positionGroup, type PositionGroup } from '@/lib/game/attributes';
import { SLOT_WEIGHTS } from '@/lib/game/seventeen';
import { ordinal } from './text';

/**
 * Plain-language reports for team and coach pages, computed from the stored ratings. Every sentence is a fact
 * about the data on the page (a rank, an average, a difference), so the text stays true when the ratings change.
 */

export interface PlayerLite { teamId: number | null; position: string; overallRating: number; fullName: string; slug: string }

/** Starters per unit on a typical depth chart. A unit's rating is the average of its best players, not of the whole group. */
export const STARTERS: Record<Exclude<PositionGroup, 'K'>, number> = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 2, EDGE: 2, LB: 3, CB: 3, S: 2 };
export const UNIT_NAMES: Record<Exclude<PositionGroup, 'K'>, string> = {
  QB: 'quarterback', RB: 'running back', WR: 'receiver', TE: 'tight end', OL: 'offensive line', DL: 'defensive tackle', EDGE: 'edge rusher', LB: 'linebacker', CB: 'cornerback', S: 'safety',
};
const UNITS = (POSITION_GROUPS.filter((g) => g !== 'K')) as Exclude<PositionGroup, 'K'>[];

const r1 = (x: number) => Math.round(x * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export interface TeamProfile {
  teamId: number; n: number; avg: number; top22: number;
  /** Average overall of each unit's starters. */
  units: Partial<Record<Exclude<PositionGroup, 'K'>, number>>;
  /** The highest-rated player in each unit. */
  best: Partial<Record<Exclude<PositionGroup, 'K'>, { name: string; slug: string; ovr: number; position: string }>>;
  top3: { name: string; slug: string; ovr: number; position: string }[];
}

export function buildProfiles(players: PlayerLite[]): Map<number, TeamProfile> {
  const byTeam = new Map<number, PlayerLite[]>();
  for (const p of players) if (p.teamId != null) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
  const out = new Map<number, TeamProfile>();
  for (const [teamId, list] of byTeam) {
    const sorted = [...list].sort((a, b) => b.overallRating - a.overallRating || a.slug.localeCompare(b.slug));
    const units: TeamProfile['units'] = {}, best: TeamProfile['best'] = {};
    for (const g of UNITS) {
      const inGroup = sorted.filter((p) => positionGroup(p.position) === g);
      if (!inGroup.length) continue;
      units[g] = r1(mean(inGroup.slice(0, STARTERS[g]).map((p) => p.overallRating)));
      const b = inGroup[0];
      best[g] = { name: b.fullName, slug: b.slug, ovr: b.overallRating, position: b.position };
    }
    out.set(teamId, {
      teamId, n: list.length, avg: r1(mean(list.map((p) => p.overallRating))), top22: r1(mean(sorted.slice(0, 22).map((p) => p.overallRating))),
      units, best, top3: sorted.slice(0, 3).map((p) => ({ name: p.fullName, slug: p.slug, ovr: p.overallRating, position: p.position })),
    });
  }
  return out;
}

/** 1-based rank of a value among others, higher is better, ties share the better rank. */
export const rankAmong = (values: number[], value: number) => values.filter((v) => v > value).length + 1;

export interface UnitRow { unit: Exclude<PositionGroup, 'K'>; label: string; rating: number; rank: number; of: number }

export interface TeamReport {
  overview: string;
  units: UnitRow[];
  unitsText: string;
  playersText: string;
  draftText: string | null;
}

/** The report for one team's page, or null when the league data is too thin to say anything. */
export function teamReport(args: { name: string; teamId: number; profiles: Map<number, TeamProfile>; coach?: { fullName: string; score: number; rank: number; of: number } | null }): TeamReport | null {
  const me = args.profiles.get(args.teamId);
  if (!me || me.n < 5 || args.profiles.size < 2) return null;
  const all = [...args.profiles.values()];
  const N = all.length;
  const avgRank = rankAmong(all.map((t) => t.avg), me.avg), topRank = rankAmong(all.map((t) => t.top22), me.top22);
  const overview = `The ${args.name} have ${me.n} active players on the roster, averaging ${me.avg.toFixed(1)} overall, ${ordinal(avgRank)} of ${N} teams. Their 22 best players average ${me.top22.toFixed(1)}, ${ordinal(topRank)} in the league.`;

  const units: UnitRow[] = UNITS.flatMap((unit) => {
    const rating = me.units[unit];
    if (rating == null) return [];
    const others = all.map((t) => t.units[unit]).filter((v): v is number => v != null);
    return [{ unit, label: UNIT_NAMES[unit], rating, rank: rankAmong(others, rating), of: others.length }];
  });
  const ranked = [...units].sort((a, b) => a.rank / a.of - b.rank / b.of || b.rating - a.rating);
  const strong = ranked[0], weak = ranked[ranked.length - 1];
  const unitsText = strong && weak && strong.unit !== weak.unit
    ? `Judged by their starters, the strongest unit is the ${strong.label} group at ${strong.rating.toFixed(1)}, ${ordinal(strong.rank)} of ${strong.of} teams. The weakest is the ${weak.label} group at ${weak.rating.toFixed(1)}, ${ordinal(weak.rank)} of ${weak.of}.`
    : '';

  const [a, b, c] = me.top3;
  const coachBit = args.coach ? ` Head coach ${args.coach.fullName} grades ${args.coach.score}, ${ordinal(args.coach.rank)} of ${args.coach.of} current head coaches.` : '';
  const named = [a, b, c].filter(Boolean).map((p) => `${p.name} (${p.position}, ${p.ovr})`);
  const joined = named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : named[0] ?? '';
  const playersText = named.length ? `The highest-rated players are ${joined}.${coachBit}` : coachBit.trim();

  // Where a spin on this team is worth the most in the six-man game: the slot where its best player ranks highest in the league.
  const slots: { slot: 'QB' | 'RB' | 'WR' | 'TE'; w: number }[] = [
    { slot: 'QB', w: SLOT_WEIGHTS.QB }, { slot: 'WR', w: SLOT_WEIGHTS.WR }, { slot: 'RB', w: SLOT_WEIGHTS.RB }, { slot: 'TE', w: SLOT_WEIGHTS.TE },
  ];
  const picks = slots.flatMap(({ slot, w }) => {
    const mine = me.best[slot];
    if (!mine) return [];
    const field = all.map((t) => t.best[slot]?.ovr).filter((v): v is number => v != null);
    return [{ slot, w, mine, rank: rankAmong(field, mine.ovr), of: field.length }];
  }).sort((x, y) => x.rank / x.of - y.rank / y.of || y.w - x.w);
  const top = picks[0];
  const draftText = top
    ? `In the six-man 17-0 game, a spin that lands on the ${args.name} is worth the most at ${top.slot}: ${top.mine.name} rates ${top.mine.ovr}, ${ordinal(top.rank)} among the best ${top.slot} options on ${top.of} teams. The ${top.slot} slot carries ${Math.round(top.w * 100)} percent of team strength.`
    : null;
  return { overview, units, unitsText, playersText, draftText };
}

export interface CoachReportInput {
  name: string;
  /** Raw formula total (before ranking). */
  raw: number;
  /** The largest single input, by points. */
  biggest: { label: string; points: number };
  score: number;
  /** Current head coaches' stored scores (those with a team). */
  currentScores: number[];
  isCurrent: boolean;
  teamName: string | null;
}

export interface CoachReport { paragraphs: string[]; vsAverage: number | null }

/** Plain-language reading of a coach's score. */
export function coachReport(i: CoachReportInput): CoachReport {
  const n = i.currentScores.length;
  const out: string[] = [];
  out.push(`The inputs below add up to a raw score of ${i.raw.toFixed(1)}. The largest piece is ${i.biggest.label.toLowerCase()}, worth ${i.biggest.points.toFixed(1)} points. The raw formula mostly lands between the 40s and the 60s, so it is used only to put coaches in order.`);
  if (i.isCurrent && n >= 2) {
    const rank = rankAmong(i.currentScores, i.score);
    out.push(`Current head coaches are then ranked and graded evenly from 80 for the lowest raw score to 97 for the highest. ${i.name} ranks ${ordinal(rank)} of ${n} and grades ${i.score}${i.teamName ? ` with the ${i.teamName}` : ''}.`);
  } else {
    out.push(`${i.name} is a legend, scored against a league-average roster and placed on the same scale as today's coaches. Legends can grade as high as 99. The grade is ${i.score}.`);
  }
  let vs: number | null = null;
  if (n >= 2) {
    const mean = i.currentScores.reduce((a, b) => a + b, 0) / n;
    const strength = (i.score - mean) * SLOT_WEIGHTS.HC;
    const wins = strength * (17 / 26);
    vs = Math.round(wins * 10) / 10;
    const dir = strength >= 0 ? 'above' : 'below';
    out.push(`The average current head coach grades ${mean.toFixed(1)}. In the six-man 17-0 game the coach slot is ${Math.round(SLOT_WEIGHTS.HC * 100)} percent of team strength, so ${i.name} sits ${Math.abs(i.score - mean).toFixed(1)} points ${dir} average, worth ${strength >= 0 ? '+' : '-'}${Math.abs(strength).toFixed(2)} points of team strength, about ${Math.abs(wins).toFixed(1)} projected ${Math.abs(wins) === 1 ? 'win' : 'wins'} ${strength >= 0 ? 'more' : 'fewer'} than an average coach.`);
  }
  out.push(`To move a raw score by hand: a playoff trip in the last three seasons adds 3 points, a Super Bowl win adds 6, each point of roster average adds 0.35, and each hundredth of win percentage over the last three seasons adds 0.35.`);
  return { paragraphs: out, vsAverage: vs };
}
