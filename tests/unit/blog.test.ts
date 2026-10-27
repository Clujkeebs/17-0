import { describe, expect, it } from 'vitest';
import { BLOG_CATEGORIES, BLOG_POSTS, START_HERE, getPost, relatedPosts, startHerePosts, wordCount } from '@/content/blog';
import { linksIn, parseInline, plainText } from '@/lib/blog-text';
import { GAMES } from '@/lib/game-registry';

const textOf = (p: (typeof BLOG_POSTS)[number]) => [p.title, p.excerpt, ...p.sections.flatMap((s) => [s.h2, ...s.paragraphs, ...(s.list ?? []), ...(s.closing ?? []), ...(s.table ? [s.table.caption, ...s.table.head, ...s.table.rows.flat()] : [])])];

// Site paths a post may link to: static pages, plus checked slugs below.
const STATIC_PATHS = new Set(['/', '/about', '/contact', '/blog', '/players', '/teams', '/coaches', '/positions', '/compare', '/seasons', '/leaderboard', '/pickem', '/shop', '/games', '/credits', '/fantasy',
  '/fantasy/rankings', '/fantasy/waivers', '/fantasy/trade', '/fantasy/cheat-sheet', '/fantasy/mock-draft', '/fantasy/start-sit', '/fantasy/draft-order', '/fantasy/tier-list',
  '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/disclaimer', '/legal/dmca', '/legal/accessibility']);

describe('blog content', () => {
  it('has unique slugs, real dates and a known category on every post', () => {
    const slugs = BLOG_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of BLOG_POSTS) {
      expect(p.slug, p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.date, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (p.updated) expect(p.updated >= p.date, `${p.slug} updated before it was published`).toBe(true);
      expect(BLOG_CATEGORIES, p.slug).toContain(p.category);
      expect(p.excerpt.length, `${p.slug} excerpt`).toBeGreaterThan(60);
      expect(p.excerpt.length, `${p.slug} excerpt`).toBeLessThan(260);
      expect(p.sections.length, p.slug).toBeGreaterThanOrEqual(4);
      const h2s = p.sections.map((s) => s.h2);
      expect(new Set(h2s).size, `${p.slug} repeats a heading`).toBe(h2s.length);
    }
  });

  it('is long enough to be worth reading', () => {
    for (const p of BLOG_POSTS) expect(wordCount(p), `${p.slug} has ${wordCount(p)} words`).toBeGreaterThanOrEqual(p.date >= '2026-10-27' ? 750 : 600);
  });

  it('follows the house voice: no em or en dashes, no banned words, no placeholders', () => {
    const banned = /\b(unlock(s|ed|ing)?|elevate[sd]?|seamless(ly)?|game-changing|next level|dream roster|powerful|intuitive|lorem|todo|tbd|coming soon)\b/i;
    for (const p of BLOG_POSTS) for (const t of textOf(p)) {
      expect(t, `${p.slug}: dash in "${t.slice(0, 60)}"`).not.toMatch(/[–—]/);
      expect(t, `${p.slug}: banned word in "${t.slice(0, 60)}"`).not.toMatch(banned);
      expect(plainText(t), `${p.slug}: stray markup in "${t.slice(0, 60)}"`).not.toMatch(/\]\(|\[[^\]]*$/);
    }
  });

  it('only links to pages that exist', () => {
    const gameSlugs = new Set(GAMES.map((g) => g.slug));
    for (const p of BLOG_POSTS) for (const t of textOf(p)) for (const href of linksIn(t)) {
      const path = href.split('#')[0].split('?')[0];
      const ok = STATIC_PATHS.has(path)
        || (path.startsWith('/blog/') && !!getPost(path.slice(6)))
        || (path.startsWith('/games/') && gameSlugs.has(path.slice(7)));
      expect(ok, `${p.slug} links to ${href}`).toBe(true);
    }
  });

  it('tables are rectangular', () => {
    for (const p of BLOG_POSTS) for (const s of p.sections) if (s.table) {
      expect(s.table.rows.length, `${p.slug}: ${s.table.caption}`).toBeGreaterThan(0);
      for (const r of s.table.rows) expect(r.length, `${p.slug}: ${s.table.caption}`).toBe(s.table.head.length);
    }
  });

  it('has a start-here trio on the blog index and the home page, and every slug in it exists', () => {
    expect(START_HERE).toHaveLength(3);
    for (const slug of START_HERE) expect(getPost(slug), slug).not.toBeNull();
    expect(startHerePosts().map((p) => p.slug)).toEqual(START_HERE);
  });

  it('suggests related posts from the same category first', () => {
    const p = BLOG_POSTS.find((x) => x.category === 'Strategy')!;
    const rel = relatedPosts(p, 3);
    expect(rel).toHaveLength(3);
    expect(rel.every((x) => x.slug !== p.slug)).toBe(true);
    expect(rel[0].category).toBe('Strategy');
  });
});

describe('inline links', () => {
  it('turns [text](/path) into a link and leaves everything else as text', () => {
    expect(parseInline('Read [the guide](/blog/x) now.')).toEqual(['Read ', { text: 'the guide', href: '/blog/x' }, ' now.']);
    expect(parseInline('No links here.')).toEqual(['No links here.']);
    expect(parseInline('[a](/one) and [b](/two)')).toEqual([{ text: 'a', href: '/one' }, ' and ', { text: 'b', href: '/two' }]);
  });
  it('never links off the site', () => {
    expect(parseInline('[bad](https://example.com)')).toEqual(['[bad](https://example.com)']);
    expect(parseInline('[bad](//example.com)')).toEqual(['[bad](//example.com)']);
  });
  it('strips link markup for plain text and lists targets', () => {
    expect(plainText('A [link](/x) here')).toBe('A link here');
    expect(linksIn('[a](/one) [b](/two#t)')).toEqual(['/one', '/two#t']);
  });
});
