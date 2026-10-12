/**
 * Difficulty math shared by the calibrators and the reports: how a set of season records is summarised.
 * Everything here is a fraction of the season (0 to 1), so 17-0, 82-0 and 162-0 read the same way.
 */
export interface WinStats { n: number; perfect: number; mean: number; p25: number; median: number; p75: number; p90: number }

const EMPTY: WinStats = { n: 0, perfect: 0, mean: 0, p25: 0, median: 0, p75: 0, p90: 0 };

/** Summary of a record distribution: dist[w] is how many seasons ended with w wins. */
export function statsFromDist(dist: readonly number[], games: number): WinStats {
  const n = dist.reduce((a, b) => a + b, 0);
  if (!n) return EMPTY;
  const at = (p: number) => { let c = 0; for (let w = 0; w < dist.length; w++) { c += dist[w]; if (c >= p * n) return w / games; } return 1; };
  const mean = dist.reduce((s, c, w) => s + c * w, 0) / n / games;
  return { n, perfect: (dist[games] ?? 0) / n, mean, p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9) };
}

/** The same summary from a list of win totals. */
export function statsFromWins(wins: readonly number[], games: number): WinStats {
  const dist = new Array<number>(games + 1).fill(0);
  for (const w of wins) dist[Math.max(0, Math.min(games, Math.round(w)))]++;
  return statsFromDist(dist, games);
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
export const describeStats = (s: WinStats) => `n=${s.n} perfect ${pct(s.perfect)} median ${pct(s.median)} mean ${pct(s.mean)} p25 ${pct(s.p25)} p90 ${pct(s.p90)}`;

/**
 * Keeping every mode equally hard. The simulated drafters keep each mode's win line in step with the data (ratings
 * change), but real players are not simulated drafters, so a daily balance step looks at what real Casual Easy runs
 * actually reached and nudges each mode's win line until the best tenth of runs finish at the same place everywhere:
 * 16-1 in 17-0, 77-5 in 82-0, 152-10 in 162-0 (94 percent of the season). That puts a perfect season at a few in a
 * hundred, the way 6-man 17-0 already plays. The nudge is an offset added to the win line, in the line's own points.
 * It works from team strengths, not records, so it does not depend on what line the runs were graded against.
 */
export const TARGET_TOP_TENTH = 0.94;
/** At least this many runs, from at least this many players, before a mode is adjusted at all. */
export const MIN_RUNS = 20;
export const MIN_PLAYERS = 5;
/** A player counts their latest few runs in a mode, so a handful of heavy players cannot set the line. */
export const PER_PLAYER = 3;
/** How far the offset may ever sit from the fitted line, as a share of the season's span. */
export const OFFSET_LIMIT = 0.15;
/** The most the offset moves in one day, in points, on the 17-0 span of 26 (other spans scale with it). */
export const STEP_LIMIT = 0.5;
const clampTo = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
/** How much to trust n runs: 20 runs count about a third, 250 about nine tenths. */
export const trust = (n: number) => n / (n + 40);

/** The p-th quantile (0 to 1) of a list of numbers, interpolating between neighbours. */
export function quantile(values: readonly number[], p: number): number {
  if (!values.length) return NaN;
  const v = [...values].sort((a, b) => a - b);
  const at = Math.max(0, Math.min(1, p)) * (v.length - 1);
  const lo = Math.floor(at), hi = Math.ceil(at);
  return v[lo] + (v[hi] - v[lo]) * (at - lo);
}

/** Keep each player's latest `per` runs. Runs come newest first. */
export function lastRunsPerPlayer<T extends { who: string }>(runs: readonly T[], per = PER_PLAYER): T[] {
  const seen = new Map<string, number>();
  return runs.filter((r) => { const c = (seen.get(r.who) ?? 0) + 1; seen.set(r.who, c); return c <= per; });
}

/** The key a mode's offset is stored under, from a result's fields. Results from before formats existed were 6-man current. */
export function modeKey(game: string, f: { format?: string; pool?: string; edition?: string; mode?: string }): string | null {
  if (game === '17-0') return `17-0:${f.format || '6'}:${f.format === 'fantasy' ? 'current' : f.pool || 'current'}`;
  if (game === '82-0') return `82-0:${f.edition === 'standard' ? 'standard' : 'classic'}`;
  if (game === '162-0') return `162-0:${f.mode === 'now' ? 'now' : 'eras'}`;
  return null;
}

/**
 * Where the offset should sit today: the win line that would put the best tenth of these team strengths at the
 * target, as a distance from the line in force without any offset, shrunk toward zero when there are few runs.
 */
export function wantedOffset(strengths: readonly number[], base: number, span: number): number {
  if (!strengths.length) return 0;
  const line = quantile(strengths, 0.9) - TARGET_TOP_TENTH * span;
  return clampTo((line - base) * trust(strengths.length), OFFSET_LIMIT * span);
}

/** One daily step: half way to where it should be, never more than the step limit, and nothing at all for a sliver. */
export function nextOffset(current: number, wanted: number, span: number): number {
  const gap = wanted - current;
  if (Math.abs(gap) < 0.1) return current;
  return current + clampTo(gap * 0.5, (STEP_LIMIT * span) / 26);
}
