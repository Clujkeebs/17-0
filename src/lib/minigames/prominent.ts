/**
 * Higher or Lower is only fun when you know both names. These pick the well-known slice of each data set:
 * the best players by rank (not a fixed rating cutoff, so it holds when ratings shift).
 */

/** The top `n` of a list by `score`, best first. */
export function topBy<T>(xs: T[], score: (x: T) => number, n: number): T[] {
  return [...xs].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** Football: how many per position group count as known names. Linemen and kickers are left out. */
export const FOOTBALL_STARS: Record<string, number> = { QB: 28, RB: 18, WR: 30, TE: 10, EDGE: 16, DL: 6, LB: 8, CB: 12, S: 8 };

/** Ids of the players whose best season (by `value`) ranks in the top `n`. */
export function starIds<T>(rows: T[], id: (x: T) => number, value: (x: T) => number, n: number): Set<number> {
  const best = new Map<number, number>();
  for (const r of rows) best.set(id(r), Math.max(best.get(id(r)) ?? -Infinity, value(r)));
  return new Set(topBy([...best.entries()], ([, v]) => v, n).map(([k]) => k));
}
