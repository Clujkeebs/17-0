import type { Ranked } from './rank';

/** What the interactive fantasy tools need per player. */
export type Slim = Pick<Ranked, 'id' | 'slug' | 'name' | 'pos' | 'team' | 'teamColor' | 'img' | 'value' | 'vor' | 'overall' | 'posRank'>;
export const slim = (p: Ranked): Slim => ({ id: p.id, slug: p.slug, name: p.name, pos: p.pos, team: p.team, teamColor: p.teamColor, img: p.img, value: p.value, vor: p.vor, overall: p.overall, posRank: p.posRank });

/** A player with the numbers behind his value: recent form, season, projection and the waiver signals. */
export type Wide = Slim & Pick<Ranked, 'recent' | 'ppg' | 'proj' | 'games' | 'trend'> & { rostered: number | null };
export const wide = (p: Ranked): Wide => ({ ...slim(p), recent: p.recent, ppg: p.ppg, proj: p.proj, games: p.games, trend: p.trend, rostered: p.rostered ?? null });
