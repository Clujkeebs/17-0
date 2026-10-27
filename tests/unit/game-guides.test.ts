import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAMES } from '@/lib/game-registry';
import { familyOf, guideFor } from '@/content/game-guides';
import { getPost } from '@/content/blog';

// The five draft games have their own FAQ, and the Bowl is retired.
const OWN_PAGE = new Set(['17-0', '82-0', '162-0', '44-0', 'build-a-player', 'unbeaten-bowl']);
const quick = GAMES.filter((g) => !OWN_PAGE.has(g.slug));

describe('game guides', () => {
  it('gives every quick game a guide with something to say', () => {
    for (const g of quick) {
      const guide = guideFor(g.slug);
      expect(guide, `${g.slug} has no guide (family ${familyOf(g.slug)})`).not.toBeNull();
      expect(guide!.about.join(' ').split(/\s+/).length, `${g.slug} about`).toBeGreaterThan(55);
      expect(guide!.tips.length, `${g.slug} tips`).toBeGreaterThanOrEqual(3);
      expect(guide!.name).toBe(g.name);
    }
  });

  it('keeps the house voice', () => {
    const banned = /\b(unlock(s|ed|ing)?|elevate[sd]?|seamless(ly)?|game-changing|next level|dream roster|powerful|intuitive)\b/i;
    for (const g of quick) {
      const guide = guideFor(g.slug)!;
      for (const t of [...guide.about, ...guide.tips]) {
        expect(t, `${g.slug}: dash`).not.toMatch(/[–—]/);
        expect(t, `${g.slug}: banned word`).not.toMatch(banned);
        expect(t, `${g.slug}: unfilled template`).not.toMatch(/\$\{|undefined|\[object/);
      }
    }
  });

  it('links only to pages that exist, never to itself', () => {
    const slugs = new Set(GAMES.map((g) => g.slug));
    for (const g of quick) {
      const guide = guideFor(g.slug)!;
      for (const l of [...guide.read, ...guide.more]) {
        if (l.href.startsWith('/blog/')) expect(getPost(l.href.slice(6)), `${g.slug} -> ${l.href}`).not.toBeNull();
        else if (l.href.startsWith('/games/')) { expect(slugs.has(l.href.slice(7)), `${g.slug} -> ${l.href}`).toBe(true); expect(l.href).not.toBe(`/games/${g.slug}`); }
        else throw new Error(`${g.slug} links to ${l.href}`);
      }
    }
  });

  it('says different things on pages for different games', () => {
    const texts = quick.map((g) => guideFor(g.slug)!.about.join(' '));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('is rendered by every quick game page and no others', () => {
    const root = join(process.cwd(), 'src/app/(game)/games');
    for (const dir of readdirSync(root)) {
      const file = join(root, dir, 'page.tsx');
      if (!existsSync(file)) continue;
      const has = readFileSync(file, 'utf8').includes('<GameGuide');
      expect(has, `${dir} ${has ? 'renders' : 'is missing'} the guide`).toBe(!OWN_PAGE.has(dir));
    }
  });
});
