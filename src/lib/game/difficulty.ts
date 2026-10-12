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
