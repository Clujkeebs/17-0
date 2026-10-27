import type { MetadataRoute } from 'next';
import { and, eq, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { SITE } from '@/lib/site';
import { POSITION_GROUPS } from '@/lib/game/attributes';
import { BUILD_POSITIONS } from '@/lib/game/build';
import { BLOG_POSTS } from '@/content/blog';
import { GAMES } from '@/lib/game-registry';
import { INDEXABLE_MIN_OVERALL } from '@/lib/seo/indexing';
import { safe } from '@/lib/seo/safe';
import { SITEMAP_IDS, type SitemapId } from '@/lib/seo/sitemap-ids';
import { currentSeason } from '@/lib/seo/seasons';

export const revalidate = 86400;

export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

const u = (path: string) => `${SITE.url}${path}`;
type Entry = MetadataRoute.Sitemap[number];

const STATIC: [string, Entry['changeFrequency'], number][] = [
  ['/', 'daily', 1], ['/games', 'daily', 0.9], ['/fantasy', 'daily', 0.8], ['/fantasy/mock-draft', 'weekly', 0.7], ['/fantasy/start-sit', 'weekly', 0.7], ['/fantasy/rankings', 'daily', 0.8],
  ['/fantasy/waivers', 'daily', 0.7], ['/fantasy/trade', 'weekly', 0.7], ['/fantasy/cheat-sheet', 'weekly', 0.6], ['/fantasy/draft-order', 'monthly', 0.5], ['/fantasy/tier-list', 'weekly', 0.6],
  ['/leaderboard', 'hourly', 0.7], ['/pickem', 'daily', 0.8],
  ['/players', 'daily', 0.8], ['/teams', 'weekly', 0.7], ['/coaches', 'weekly', 0.6], ['/positions', 'weekly', 0.7],
  ['/compare', 'weekly', 0.5], ['/blog', 'weekly', 0.8], ['/seasons', 'monthly', 0.4], ['/about', 'monthly', 0.4], ['/updates', 'weekly', 0.5], ['/contact', 'yearly', 0.2],
  ['/legal/terms', 'yearly', 0.1], ['/legal/privacy', 'yearly', 0.1], ['/legal/cookies', 'yearly', 0.1],
  ['/legal/disclaimer', 'yearly', 0.1], ['/legal/dmca', 'yearly', 0.1], ['/legal/accessibility', 'yearly', 0.1],
];

/** The five draft games lead; every other quick game comes from the registry, so a new game is listed without touching this file. */
const FLAGSHIP = new Set(['17-0', 'build-a-player', '82-0', '162-0', '44-0']);

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = (await props.id) as SitemapId;
  const now = new Date();
  switch (id) {
    case 'static':
      return [
        ...STATIC.map(([path, changeFrequency, priority]) => ({ url: u(path), lastModified: now, changeFrequency, priority })),
        ...GAMES.map((g) => ({ url: u(`/games/${g.slug}`), lastModified: now, changeFrequency: 'daily' as const, priority: FLAGSHIP.has(g.slug) ? 0.9 : 0.7 })),
        { url: u(`/seasons/${currentSeason()}`), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
      ];
    case 'players': {
      const rows = await safe(() => db.select({ slug: schema.players.slug, at: schema.players.lastSyncedAt }).from(schema.players).where(and(eq(schema.players.isActive, true), gte(schema.players.overallRating, INDEXABLE_MIN_OVERALL))), []);
      return rows.map((r) => ({ url: u(`/players/${r.slug}`), lastModified: r.at, changeFrequency: 'weekly', priority: 0.6 }));
    }
    case 'teams': {
      const rows = await safe(() => db.select({ slug: schema.teams.slug }).from(schema.teams), []);
      return rows.map((r) => ({ url: u(`/teams/${r.slug}`), lastModified: now, changeFrequency: 'weekly', priority: 0.6 }));
    }
    case 'coaches': {
      const rows = await safe(() => db.select({ slug: schema.coaches.slug }).from(schema.coaches), []);
      return rows.map((r) => ({ url: u(`/coaches/${r.slug}`), lastModified: now, changeFrequency: 'monthly', priority: 0.5 }));
    }
    case 'positions':
      return POSITION_GROUPS.map((g) => ({ url: u(`/positions/${g.toLowerCase()}`), lastModified: now, changeFrequency: 'weekly', priority: 0.6 }));
    case 'games':
      // The per-team 17-0 pages repeat what each team page already says, so they carry noindex and stay out of here.
      return BUILD_POSITIONS.map((p) => ({ url: u(`/games/build-a-player/${p.toLowerCase()}`), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 }));
    case 'blog':
      return BLOG_POSTS.map((p) => ({ url: u(`/blog/${p.slug}`), lastModified: new Date(`${p.updated ?? p.date}T12:00:00Z`), changeFrequency: 'monthly', priority: 0.7 }));
    default:
      return [];
  }
}
