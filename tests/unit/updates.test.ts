import { describe, expect, it } from 'vitest';
import { SITE_STARTED, UPDATES } from '@/content/updates';
import { BLOG_POSTS } from '@/content/blog';
import { plainText } from '@/lib/blog-text';

const today = () => new Date().toISOString().slice(0, 10);

describe('updates', () => {
  it('has real dates, newest first, none before the site began or in the future', () => {
    expect(UPDATES.length).toBeGreaterThanOrEqual(10);
    for (const u of UPDATES) {
      expect(u.date, u.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(u.date)), u.title).toBe(false);
      expect(u.date >= SITE_STARTED, `${u.title} predates the site`).toBe(true);
      expect(u.date <= today(), `${u.title} is dated in the future`).toBe(true);
    }
    const dates = UPDATES.map((u) => u.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('keeps the house voice: no dashes, no banned words, plain sentences', () => {
    const banned = /\b(unlock(s|ed|ing)?|elevate[sd]?|seamless(ly)?|game-changing|next level|dream roster|powerful|intuitive|practice)\b/i;
    for (const u of UPDATES) {
      for (const t of [u.title, u.body]) {
        expect(t, `${u.title}: dash`).not.toMatch(/[–—]/);
        expect(t, `${u.title}: banned word`).not.toMatch(banned);
        expect(t, `${u.title}: placeholder`).not.toMatch(/lorem|TODO|TBD|\$\{|undefined/i);
      }
      expect(u.title.length, u.title).toBeLessThanOrEqual(80);
      expect(u.body.split(/\s+/).length, u.title).toBeGreaterThanOrEqual(12);
    }
  });

  it('has no duplicate entries', () => {
    const keys = UPDATES.map((u) => `${u.date}|${u.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('blog dates', () => {
  it('no post claims a date from before the site existed, and no post is dated in the future', () => {
    for (const p of BLOG_POSTS) {
      expect(p.date >= SITE_STARTED, `${p.slug} is dated ${p.date}, before the site began`).toBe(true);
      expect(p.date <= today(), `${p.slug} is dated in the future`).toBe(true);
      if (p.updated) expect(p.updated <= today(), `${p.slug} update date is in the future`).toBe(true);
    }
  });

  it('plain text of a post never contains the dash characters either', () => {
    for (const p of BLOG_POSTS) expect(plainText(p.title), p.slug).not.toMatch(/[–—]/);
  });
});
