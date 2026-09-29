import { ATTRIBUTE_LABELS, POSITION_GROUPS, POSITION_NAMES, type AttributeKey, type Attributes, type PositionGroup } from '@/lib/game/attributes';
import { DEFAULT_FORMULAS, formulaFor, type Weights } from '@/lib/game/formulas';

export const positionSlug = (g: PositionGroup) => g.toLowerCase();
export function groupFromSlug(slug: string): PositionGroup | null {
  const up = slug.toUpperCase();
  return (POSITION_GROUPS as readonly string[]).includes(up) ? (up as PositionGroup) : null;
}

export const GROUP_PLURAL: Record<PositionGroup, string> = {
  QB: 'quarterbacks', RB: 'running backs', WR: 'wide receivers', TE: 'tight ends', OL: 'offensive linemen',
  DL: 'interior defensive linemen', EDGE: 'edge rushers', LB: 'linebackers', CB: 'cornerbacks', S: 'safeties', K: 'kickers and punters',
};

/** Which formula the site uses for a group, and a short note when the group borrows another formula. */
export function weightsFor(g: PositionGroup): Weights {
  return DEFAULT_FORMULAS[formulaFor(g)];
}

export const FORMULA_NOTE: Partial<Record<PositionGroup, string>> = {
  EDGE: 'Edge rushers share the defensive line formula.',
  OL: 'Offensive linemen are not draftable in 17-0, so the site borrows the tight end formula as a rough blocking and awareness proxy.',
};

/** Supplementary attributes shown after the weighted ones, per group. */
const EXTRA: Record<PositionGroup, AttributeKey[]> = {
  QB: ['throwAccuracyShort', 'throwOnTheRun', 'agility', 'acceleration'],
  RB: ['agility', 'trucking', 'catching', 'strength'],
  WR: ['acceleration', 'spectacularCatch', 'jumping', 'agility'],
  TE: ['passBlock', 'strength', 'release', 'acceleration'],
  OL: ['passBlock', 'runBlock', 'strength', 'awareness', 'agility'],
  DL: ['strength', 'acceleration', 'hitPower', 'speed'],
  EDGE: ['speed', 'acceleration', 'strength', 'hitPower'],
  LB: ['speed', 'blockShedding', 'awareness', 'acceleration'],
  CB: ['acceleration', 'catching', 'jumping', 'awareness'],
  S: ['pursuit', 'catching', 'awareness', 'acceleration'],
  K: ['awareness', 'stamina', 'strength', 'speed'],
};

/** The 8 attributes most relevant to a position: formula weights first (heaviest first), then extras. */
export function keyAttributes(g: PositionGroup, attrs?: Attributes): AttributeKey[] {
  const weighted = (Object.entries(weightsFor(g)) as [AttributeKey, number][]).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const out: AttributeKey[] = [];
  for (const k of [...weighted, ...EXTRA[g]]) {
    if (out.length >= 8) break;
    if (out.includes(k)) continue;
    if (attrs && attrs[k] === undefined && !weighted.includes(k)) continue;
    out.push(k);
  }
  return out;
}

export const attrLabel = (k: AttributeKey) => ATTRIBUTE_LABELS[k];

export const POSITION_EXPLAINERS: Record<PositionGroup, string> = {
  QB: 'Quarterback is the one slot where accuracy beats arm. Deep and mid accuracy together carry 35 percent of the grade, and throwing under pressure plus awareness add another 30. Throw power matters, but a cannon without placement grades like a backup. Speed is a 10 percent tiebreaker, which is why a mobile passer with average accuracy rarely beats a statue who hits the window.',
  RB: 'The running back formula rewards what happens after the handoff. Ball carrier vision and carrying (ball security) each take 20 percent, speed another 20, and acceleration plus break tackle make up most of the rest. Juke move is only 10 percent. A back who sees the hole, holds the ball, and hits the second level quickly grades higher than a highlight-reel cutback artist.',
  WR: 'Hands come first. Catching is 25 percent of the receiver grade, with route running and speed at 20 each. Release off the line gets 15, and contested catches plus awareness close it out. A 4.3 sprinter who drops the ball grades worse than a technician with average speed and elite hands.',
  TE: 'Tight end is the most balanced formula on the site. Run blocking gets 20 percent, the same as catching, with route running, speed, awareness, and traffic catching sharing the rest. A pure receiving tight end loses a fifth of the grade if he cannot hold a block on the edge.',
  OL: 'Offensive linemen are not draftable in 17-0, and the EA Sports Madden NFL ratings overall is the best single number for them. For completeness, the site grades linemen with the tight end formula, which leans on run blocking and awareness. Treat that number as a proxy, not a verdict. The overall rating in the table is the one to trust.',
  DL: 'Interior defensive linemen are graded on the defensive line formula: block shedding at 25 percent, power and finesse moves at 20 each, then tackling, pursuit, and play recognition. Getting off the block is the whole job. A tackle who sheds quickly and has one reliable move grades well even with modest speed.',
  EDGE: 'Edge rushers use the same defensive line formula as interior linemen. Block shedding leads at 25 percent, with power moves and finesse moves at 20 each. That makes a two-move rusher more valuable than a speed-only one, since the formula does not weight speed at all. Tackle, pursuit, and play recognition decide the run game.',
  LB: 'Linebacker is the most spread-out defensive formula. Tackle, pursuit, and play recognition each take 20 percent, hit power 15, and coverage (zone 15, man 10) the remaining quarter. A thumper who cannot drop into a zone loses real points, and so does a coverage backer who misses tackles.',
  CB: 'Corners are graded mostly on coverage. Man coverage is 25 percent and zone 20, so 45 percent of the grade is pure coverage skill. Speed is another 20 and agility 15, with press and play recognition at 10 each. Ball skills are not in the formula, so interception totals do not move this number.',
  S: 'Safety is a hybrid formula. Zone coverage and play recognition lead at 20 percent each, then man coverage, tackling, hit power, and speed at 15 each. The formula wants a player who reads the play first and arrives with bad intentions, whether that is at the catch point or in the alley.',
  K: 'Kickers are the simplest grade on the site: kick power and kick accuracy, 50 percent each. In 17-0 the kicker slot is 5 percent of team strength, which sounds small until you notice that it is also the slot where the gap between the best and worst available player is widest.',
};

export { POSITION_GROUPS, POSITION_NAMES };
