import type { PositionGroup } from './attributes';
import { clamp } from './prng';

/**
 * Fantasy edition scoring. Values are PPR points per game from Sleeper. Early in the season a few games say
 * little, so actual points are blended with the season projection, weighted as if the projection were
 * PROJ_WEIGHT games of evidence. By midseason the real numbers dominate.
 */
export const PROJ_WEIGHT = 3;

export function fantasyValue(ppg: number | null | undefined, games: number | null | undefined, projPpg: number | null | undefined): number {
  const gp = games ?? 0, has = ppg != null && gp > 0, proj = projPpg ?? null;
  if (has && proj != null) return round1((gp * ppg! + PROJ_WEIGHT * proj) / (gp + PROJ_WEIGHT));
  if (has) return round1(ppg!);
  return round1(proj ?? 0);
}

/** Points per game that earns an A+ at each spot: roughly a top-three PPR season. */
export const FANTASY_ELITE: Partial<Record<PositionGroup, number>> = { QB: 24, RB: 21, WR: 20, TE: 15 };

/** A 55-99 grade for one pick, relative to its position, so a 15 point tight end reads as elite. */
export function fantasyGrade(points: number, group: PositionGroup | 'HC'): number {
  const elite = FANTASY_ELITE[group as PositionGroup] ?? 20;
  return clamp(Math.round(55 + 44 * (points / elite)), 0, 99);
}

/** The fantasy win line is points per week. These defaults hold until the worker calibrates on live data. */
export const FANTASY_FLOOR_DEFAULT = 80;
export const FANTASY_SPAN = 60;

const round1 = (n: number) => Math.round(n * 10) / 10;
