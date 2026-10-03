/**
 * Fantasy hub math, shared by the rankings, waiver, cheat sheet and trade pages. Values are PPR points per game
 * (recent form, season and projection blended by fantasyValue). Overall order uses value over replacement:
 * how far a player is above the last starter at his position in a league of a given size.
 */
export type FPos = 'QB' | 'RB' | 'WR' | 'TE';
export const F_POS: FPos[] = ['QB', 'RB', 'WR', 'TE'];

export interface FPlayer {
  id: string; slug: string; name: string; pos: FPos; team: string; teamColor: string; logoUrl: string | null; img: string | null;
  value: number; recent: number | null; ppg: number | null; proj: number | null; games: number; popularity: number | null; trend: number;
}
export interface Ranked extends FPlayer { vor: number; overall: number; posRank: number }

/** League shape for value over replacement: team count and whether a second QB can start (superflex). */
export interface League { teams: number; superflex: boolean }
export const DEFAULT_LEAGUE: League = { teams: 12, superflex: false };

/**
 * Starters per team at each position in a PPR lineup, counting the FLEX as half a back and half a receiver.
 * In superflex nearly every team starts a second QB there, so QB demand almost doubles.
 */
export const startersFor = (l: League): Record<FPos, number> => ({ QB: l.superflex ? 1.9 : 1, RB: 2.5, WR: 2.5, TE: 1 });

/** The value of the last starter at each position: what a team can find for free. */
export function replacementLevels(players: Pick<FPlayer, 'pos' | 'value'>[], l: League = DEFAULT_LEAGUE): Record<FPos, number> {
  const starters = startersFor(l);
  return Object.fromEntries(F_POS.map((pos) => {
    const list = players.filter((x) => x.pos === pos).map((x) => x.value).sort((a, b) => b - a);
    const i = Math.min(list.length - 1, Math.round(starters[pos] * l.teams));
    return [pos, list[i] ?? 0];
  })) as Record<FPos, number>;
}

export function rankPlayers(players: FPlayer[], teams = 12, superflex = false): Ranked[] {
  const repl = replacementLevels(players, { teams, superflex });
  const ranked = players.map((p) => ({ ...p, vor: Math.round((p.value - repl[p.pos]) * 10) / 10, overall: 0, posRank: 0 }));
  ranked.sort((a, b) => b.vor - a.vor || b.value - a.value);
  ranked.forEach((p, i) => { p.overall = i + 1; });
  for (const pos of F_POS) ranked.filter((p) => p.pos === pos).sort((a, b) => b.value - a.value).forEach((p, i) => { p.posRank = i + 1; });
  return ranked;
}

/** Overall pick numbers for one draft slot in a snake draft. */
export function snakePicks(slot: number, teams: number, rounds: number): number[] {
  return Array.from({ length: rounds }, (_, r) => r * teams + (r % 2 === 0 ? slot : teams - slot + 1));
}

/**
 * Trade value of one player for the rest of the season: points per game above a waiver-level starter at his
 * position, so two average players do not add up to one star. Never below a small floor, because a starter
 * always has some use.
 */
export const tradeValue = (p: Pick<Ranked, 'vor'>) => Math.max(0.5, p.vor);
/** Extra players in the bigger package count at half: each one costs a roster spot someone has to clear. */
export const EXTRA_WEIGHT = 0.5;

type TradeP = Pick<FPlayer, 'id' | 'pos' | 'value'>;
export interface TradeLine { id: string; value: number; weight: number }
export interface TradeEval { give: number; get: number; diff: number; pct: number; verdict: 'Fair' | 'You win it' | 'You lose it'; giveLines: TradeLine[]; getLines: TradeLine[] }

function sideValue(side: TradeP[], other: number, repl: Record<FPos, number>): { total: number; lines: TradeLine[] } {
  const lines = side.map((p) => ({ id: p.id, value: tradeValue({ vor: p.value - repl[p.pos] }), weight: 1 })).sort((a, b) => b.value - a.value);
  lines.forEach((l, i) => { if (i >= Math.max(1, other)) l.weight = EXTRA_WEIGHT; });
  return { total: lines.reduce((s, l) => s + l.value * l.weight, 0), lines };
}

/** Both sides of a trade in one league: totals, the gap, and a verdict (within 10 percent is fair). */
export function evaluateTrade(give: TradeP[], get: TradeP[], repl: Record<FPos, number>): TradeEval {
  const a = sideValue(give, get.length, repl), b = sideValue(get, give.length, repl);
  const diff = b.total - a.total, pct = a.total + b.total > 0 ? Math.abs(diff) / Math.max(a.total, b.total) : 0;
  const r = (n: number) => Math.round(n * 10) / 10;
  return { give: r(a.total), get: r(b.total), diff: r(diff), pct: Math.round(pct * 100), verdict: pct < 0.1 ? 'Fair' : diff > 0 ? 'You win it' : 'You lose it', giveLines: a.lines, getLines: b.lines };
}

/** Older two-list form (12 teams, values already over replacement), kept for the rankings tests. */
export function tradeVerdict(give: Ranked[], get: Ranked[]) {
  const a = give.reduce((s, p) => s + tradeValue(p), 0), b = get.reduce((s, p) => s + tradeValue(p), 0);
  const diff = b - a, pct = a + b > 0 ? Math.abs(diff) / Math.max(a, b) : 0;
  const verdict = pct < 0.1 ? 'Fair' : diff > 0 ? 'You win it' : 'You lose it';
  return { give: Math.round(a * 10) / 10, get: Math.round(b * 10) / 10, verdict, pct: Math.round(pct * 100) };
}

/**
 * Who to add so a lopsided trade comes out fair: up to `n` players from the pool (not already in the deal),
 * added to the side that is short, ranked by how close the new gap is to zero.
 */
export function balancers<T extends TradeP>(pool: T[], give: TradeP[], get: TradeP[], repl: Record<FPos, number>, n = 3): { side: 'give' | 'get'; players: T[] } | null {
  const now = evaluateTrade(give, get, repl);
  if (now.verdict === 'Fair' || !give.length || !get.length) return null;
  const side: 'give' | 'get' = now.diff > 0 ? 'give' : 'get';
  const used = new Set([...give, ...get].map((p) => p.id));
  const scored = pool.filter((p) => !used.has(p.id)).map((p) => {
    const e = side === 'give' ? evaluateTrade([...give, p], get, repl) : evaluateTrade(give, [...get, p], repl);
    return { p, gap: Math.abs(e.diff), fair: e.verdict === 'Fair' };
  }).filter((x) => x.gap < Math.abs(now.diff));
  scored.sort((x, y) => Number(y.fair) - Number(x.fair) || x.gap - y.gap);
  return scored.length ? { side, players: scored.slice(0, n).map((x) => x.p) } : null;
}

/** Waiver wire: players outside the commonly rostered pool (Sleeper popularity past the top 150) who are producing or trending. */
export function waiverTargets(ranked: Ranked[], limit = 40): Ranked[] {
  return ranked
    .filter((p) => (p.popularity == null || p.popularity > 150) && (p.trend > 0 || p.value >= 8))
    .sort((a, b) => b.value + Math.log10(1 + b.trend) * 2 - (a.value + Math.log10(1 + a.trend) * 2))
    .slice(0, limit);
}
