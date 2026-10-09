import { positionGroup, type PositionGroup } from './attributes';

/**
 * All-time legends from ESPN's NFL history (team-season stat leaders since 1980). Each season is scored for the
 * player's position group, divided by that season's starter level (so a 1984 passing year is not buried by
 * 2020s passing, and strike years are not punished), then placed on the grade range today's players get at
 * the same group. Offensive linemen and kickers have no stats and are never built here.
 */
export const STAT_KEYS = ['passingYards', 'passingTouchdowns', 'quarterbackRating', 'rushingYards', 'rushingTouchdowns', 'receivingYards', 'receptions', 'receivingTouchdowns', 'sacks', 'interceptions', 'totalTackles'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Partial<Record<StatKey, number>>;
export type LegendGroup = Exclude<PositionGroup, 'OL' | 'K'>;
export const LEGEND_GROUPS: LegendGroup[] = ['QB', 'RB', 'WR', 'TE', 'DL', 'EDGE', 'LB', 'CB', 'S'];
/** How many legends each franchise brings at each group. */
/** How many greats each franchise keeps per group: deep enough that an All-time board is mostly greats. */
export const PER_TEAM: Record<LegendGroup, number> = { QB: 3, RB: 4, WR: 5, TE: 3, DL: 4, EDGE: 4, LB: 4, CB: 4, S: 4 };

const v = (s: Stats, k: StatKey) => s[k] ?? 0;

/** The group a season counts at. Outside linebackers who rushed the passer count as edge rushers. */
export function legendGroup(position: string, s: Stats): LegendGroup | null {
  const pos = position.toUpperCase();
  if (pos === 'OLB' || pos === 'LB') return v(s, 'sacks') >= 7 ? 'EDGE' : 'LB';
  const g = positionGroup(pos);
  if (g === 'OL' && !['OL', 'T', 'G', 'C', 'LT', 'LG', 'RG', 'RT'].includes(pos)) return null; // unknown position
  return g === 'OL' || g === 'K' ? null : g;
}

/** Raw season score for a group, or null when the season is too thin to count (a backup's cameo). */
export function seasonScore(g: LegendGroup, s: Stats): number | null {
  switch (g) {
    case 'QB': return v(s, 'passingYards') < 1500 ? null : v(s, 'passingYards') / 25 + v(s, 'passingTouchdowns') * 4 + v(s, 'quarterbackRating') * 0.8 + v(s, 'rushingYards') / 20;
    case 'RB': return v(s, 'rushingYards') < 400 ? null : v(s, 'rushingYards') / 10 + v(s, 'rushingTouchdowns') * 6 + v(s, 'receivingYards') / 12;
    case 'WR': case 'TE': return v(s, 'receivingYards') < 300 ? null : v(s, 'receivingYards') / 10 + v(s, 'receptions') * 0.5 + v(s, 'receivingTouchdowns') * 6;
    case 'EDGE': case 'DL': return v(s, 'sacks') < 3 && v(s, 'totalTackles') < 40 ? null : v(s, 'sacks') * 6 + v(s, 'totalTackles') * 0.3;
    case 'LB': return v(s, 'totalTackles') < 50 ? null : v(s, 'totalTackles') + v(s, 'sacks') * 4 + v(s, 'interceptions') * 6;
    case 'CB': case 'S': return v(s, 'interceptions') < 2 && v(s, 'totalTackles') < 50 ? null : v(s, 'interceptions') * 8 + v(s, 'totalTackles') * 0.3;
  }
}

const n0 = (x: number) => Math.round(x).toLocaleString('en-US');
/** The line a player row shows, e.g. "1,848 rush yds, 15 TD". */
export function seasonLine(g: LegendGroup, s: Stats): string {
  switch (g) {
    case 'QB': return `${n0(v(s, 'passingYards'))} pass yds, ${v(s, 'passingTouchdowns')} TD`;
    case 'RB': return `${n0(v(s, 'rushingYards'))} rush yds, ${v(s, 'rushingTouchdowns')} TD`;
    case 'WR': case 'TE': return `${v(s, 'receptions')} rec, ${n0(v(s, 'receivingYards'))} yds, ${v(s, 'receivingTouchdowns')} TD`;
    case 'EDGE': case 'DL': return `${v(s, 'sacks')} sacks, ${v(s, 'totalTackles')} tkl`;
    case 'LB': return `${v(s, 'totalTackles')} tkl, ${v(s, 'sacks')} sacks, ${v(s, 'interceptions')} INT`;
    case 'CB': case 'S': return `${v(s, 'interceptions')} INT, ${v(s, 'totalTackles')} tkl`;
  }
}

export interface HistSeason { key: string; group: LegendGroup; season: number; stats: Stats }
const STARTERS = 32;

/** Value at quantile q (0-1) of an ascending list. */
const quantile = (asc: number[], q: number) => {
  if (!asc.length) return 0;
  const i = Math.min(asc.length - 1, Math.max(0, q * (asc.length - 1)));
  const lo = Math.floor(i), hi = Math.ceil(i);
  return asc[lo] + (asc[hi] - asc[lo]) * (i - lo);
};

/**
 * Grades every season. `current` holds today's grades per group (any order). A season's score is divided by
 * the average of that season's top 32 at the group (starter level), its rank among all seasons at the group
 * becomes a percentile, and the percentile is read off today's grade range at that group.
 */
/**
 * Today's grade range tops out in the mid 90s, but the best seasons in NFL history should read as 99s. The
 * bottom nine tenths map onto today's range as they are; the top tenth stretches from there up to 99.
 */
export const TOP_STRETCH = 0.9;
export function stretchTop(range: number[], q: number): number {
  if (q <= TOP_STRETCH) return quantile(range, q);
  const base = quantile(range, TOP_STRETCH);
  return base + (99 - base) * ((q - TOP_STRETCH) / (1 - TOP_STRETCH));
}

export function gradeSeasons(seasons: HistSeason[], current: Partial<Record<LegendGroup, number[]>>): Map<string, number> {
  const scored = seasons.flatMap((s) => { const sc = seasonScore(s.group, s.stats); return sc == null ? [] : [{ ...s, sc }]; });
  const level = new Map<string, number>();
  const bySeason = new Map<string, number[]>();
  for (const s of scored) { const k = `${s.group}:${s.season}`; (bySeason.get(k) ?? bySeason.set(k, []).get(k)!).push(s.sc); }
  for (const [k, list] of bySeason) { const top = list.sort((a, b) => b - a).slice(0, STARTERS); level.set(k, top.reduce((a, b) => a + b, 0) / top.length); }
  const out = new Map<string, number>();
  for (const g of LEGEND_GROUPS) {
    const mine = scored.filter((s) => s.group === g).map((s) => ({ key: s.key, r: s.sc / (level.get(`${g}:${s.season}`) || 1) })).sort((a, b) => a.r - b.r);
    const range = [...(current[g] ?? [])].sort((a, b) => a - b);
    if (!range.length) continue;
    // Ties share the lowest rank so equal seasons grade the same.
    let first = 0;
    mine.forEach((s, i) => {
      if (i > 0 && s.r !== mine[i - 1].r) first = i;
      const q = mine.length > 1 ? first / (mine.length - 1) : 1;
      out.set(s.key, Math.round(Math.min(99, stretchTop(range, q)) * 10) / 10);
    });
  }
  return out;
}
