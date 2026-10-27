// Blog posts as data, grouped in one file per topic. Rendered by src/app/(site)/blog. Keep copy free of em-dashes and en-dashes.
import { plainText } from '@/lib/blog-text';
import { CORE_POSTS } from './core';
import { STRATEGY_POSTS } from './strategy';
import { MATH_POSTS } from './math';
import { FANTASY_POSTS } from './fantasy';
import { PUZZLE_POSTS } from './puzzles';
import { SITE_POSTS } from './site';
import { BLOG_CATEGORIES, type BlogCategory, type BlogPost } from './types';

export * from './types';

const POSTS: BlogPost[] = [...CORE_POSTS, ...STRATEGY_POSTS, ...MATH_POSTS, ...FANTASY_POSTS, ...PUZZLE_POSTS, ...SITE_POSTS];

export const BLOG_POSTS: BlogPost[] = [...POSTS].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug) ?? null;

/** The first reads for someone new, in order. */
export const START_HERE = ['how-17-0-works', 'how-to-draft-a-17-0-roster', 'how-rare-is-a-perfect-season'];
export const startHerePosts = () => START_HERE.map(getPost).filter((p): p is BlogPost => !!p);

const words = (s: string) => plainText(s).split(/\s+/).filter(Boolean).length;
export const wordCount = (p: BlogPost) => p.sections.reduce((n, s) =>
  n + words(s.h2) + s.paragraphs.reduce((m, x) => m + words(x), 0) + (s.closing ?? []).reduce((m, x) => m + words(x), 0)
    + (s.list ?? []).reduce((m, x) => m + words(x), 0)
    + (s.table ? s.table.rows.reduce((m, r) => m + r.reduce((k, c) => k + words(c), 0), 0) : 0), 0);
export const readingMinutes = (p: BlogPost) => Math.max(1, Math.round(wordCount(p) / 230));

export const postsIn = (category: BlogCategory) => BLOG_POSTS.filter((p) => p.category === category);
export const categoriesWithPosts = () => BLOG_CATEGORIES.filter((c) => postsIn(c).length > 0);

/** Posts to read next: the same category first, then the newest of the rest. */
export function relatedPosts(p: BlogPost, n = 3): BlogPost[] {
  const others = BLOG_POSTS.filter((x) => x.slug !== p.slug);
  return [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)].slice(0, n);
}
