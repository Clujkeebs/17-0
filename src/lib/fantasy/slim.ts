import type { Ranked } from './rank';

/** What the interactive fantasy tools need per player. */
export type Slim = Pick<Ranked, 'id' | 'slug' | 'name' | 'pos' | 'team' | 'teamColor' | 'img' | 'value' | 'vor' | 'overall' | 'posRank'>;
export const slim = (p: Ranked): Slim => ({ id: p.id, slug: p.slug, name: p.name, pos: p.pos, team: p.team, teamColor: p.teamColor, img: p.img, value: p.value, vor: p.vor, overall: p.overall, posRank: p.posRank });
