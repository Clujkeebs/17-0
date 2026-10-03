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

/** Starters per team at each position in a standard PPR lineup, counting the FLEX as half a back and half a receiver. */
const STARTERS: Record<FPos, number> = { QB: 1, RB: 2.5, WR: 2.5, TE: 1 };

export function rankPlayers(players: FPlayer[], teams = 12): Ranked[] {
  const byPos = new Map<FPos, FPlayer[]>(F_POS.map((p) => [p, players.filter((x) => x.pos === p).sort((a, b) => b.value - a.value)]));
  const replacement = new Map<FPos, number>(F_POS.map((p) => {
    const list = byPos.get(p)!;
    const i = Math.min(list.length - 1, Math.round(STARTERS[p] * teams));
    return [p, list[i]?.value ?? 0];
  }));
  const ranked = players.map((p) => ({ ...p, vor: Math.round((p.value - replacement.get(p.pos)!) * 10) / 10, overall: 0, posRank: 0 }));
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
 * Trade value of one player for the rest of the season: points above a waiver-level player, so two average
 * players do not add up to one star. Never below a small floor, because a starter always has some use.
 */
export const tradeValue = (p: Pick<Ranked, 'vor'>) => Math.max(0.5, p.vor);

export function tradeVerdict(give: Ranked[], get: Ranked[]) {
  const a = give.reduce((s, p) => s + tradeValue(p), 0), b = get.reduce((s, p) => s + tradeValue(p), 0);
  const diff = b - a, pct = a + b > 0 ? Math.abs(diff) / Math.max(a, b) : 0;
  const verdict = pct < 0.1 ? 'Fair' : diff > 0 ? 'You win it' : 'You lose it';
  return { give: Math.round(a * 10) / 10, get: Math.round(b * 10) / 10, verdict, pct: Math.round(pct * 100) };
}

/** Waiver wire: players outside the commonly rostered pool (Sleeper popularity past the top 150) who are producing or trending. */
export function waiverTargets(ranked: Ranked[], limit = 40): Ranked[] {
  return ranked
    .filter((p) => (p.popularity == null || p.popularity > 150) && (p.trend > 0 || p.value >= 8))
    .sort((a, b) => b.value + Math.log10(1 + b.trend) * 2 - (a.value + Math.log10(1 + a.trend) * 2))
    .slice(0, limit);
}
