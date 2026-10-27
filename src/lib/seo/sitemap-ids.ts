export const SITEMAP_IDS = ['static', 'players', 'teams', 'coaches', 'positions', 'games', 'blog'] as const;
export type SitemapId = (typeof SITEMAP_IDS)[number];
