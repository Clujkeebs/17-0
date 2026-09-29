export const SITEMAP_IDS = ['static', 'players', 'teams', 'coaches', 'positions', 'games', 'blog', 'compare'] as const;
export type SitemapId = (typeof SITEMAP_IDS)[number];
