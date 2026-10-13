import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS, rarity } from '@/lib/shop';
import { FLAIR_KEYS } from '@/components/Flair';
import { EFFECT_BACK, FRAMED } from '@/components/Effect';
import { NAME_COLORS, NAME_FONTS, OWNER_COLOR, OWNER_FONT } from '@/lib/cosmetics';

const css = readFileSync('src/app/globals.css', 'utf8') + readFileSync('src/components/cosmetics.css', 'utf8');
const selector = (kind: string, key: string) => kind === 'color' ? `.nm-c-${key}` : kind === 'font' ? `.nm-f-${key}` : `.${key}`;
const has = (sel: string) => css.includes(`${sel} {`) || css.includes(`${sel},`);

describe('shop catalog', () => {
  it('has unique keys and every item has its look', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.key)).size).toBe(SHOP_ITEMS.length);
    for (const i of SHOP_ITEMS) {
      if (i.kind === 'title') continue;
      if (i.kind === 'flair') { expect(FLAIR_KEYS, i.key).toContain(i.key); continue; }
      if (i.kind === 'effect') {
        expect(existsSync(`public/cosmetics/fx/${i.key}.svg`), `effect ${i.key} has no art`).toBe(true);
        expect(existsSync(`public/cosmetics/fx/${i.key}.still.svg`), `effect ${i.key} has no still twin`).toBe(true);
        if (EFFECT_BACK.has(i.key)) expect(existsSync(`public/cosmetics/fx/${i.key}-back.svg`), `effect ${i.key} has no back layer`).toBe(true);
        continue;
      }
      // The free plain banner is pure CSS; every other banner is drawn art with a still twin.
      if (i.kind === 'banner' && !i.free) { expect(existsSync(`public/cosmetics/banners/${i.key}.svg`), `banner ${i.key} has no art`).toBe(true); expect(existsSync(`public/cosmetics/banners/${i.key}.still.svg`), `banner ${i.key} has no still twin`).toBe(true); }
      if (i.kind === 'border' && FRAMED.has(i.key)) expect(existsSync(`public/cosmetics/frames/${i.key}.svg`), `frame ${i.key} has no art`).toBe(true);
      expect(has(selector(i.kind, i.key)), `${i.kind} ${i.key} has no CSS`).toBe(true);
    }
  });
  it('draws no art that nothing sells', () => {
    const sold = new Set(SHOP_ITEMS.map((i) => i.key));
    // fx-ringfire is not an item: it burns on the flame and lava rings by itself.
    const keyOf = (f: string) => f.replace('.still.svg', '.svg').replace('.svg', '').replace(/-back$/, '');
    for (const f of readdirSync('public/cosmetics/fx').filter((n) => n.endsWith('.svg') && !n.endsWith('-back.svg') && !n.endsWith('-back.still.svg'))) {
      const k = keyOf(f);
      expect(sold.has(k) || k === 'fx-ringfire', `${f} is orphaned`).toBe(true);
    }
    for (const f of readdirSync('public/cosmetics/frames')) expect(sold.has(keyOf(f)), `${f} is orphaned`).toBe(true);
    for (const f of readdirSync('public/cosmetics/banners')) expect(sold.has(keyOf(f)), `${f} is orphaned`).toBe(true);
    for (const k of FRAMED) expect(SHOP_ITEMS.some((i) => i.kind === 'border' && i.key === k), `${k} is not a border item`).toBe(true);
  });
  it('every category has an owner exclusive and something limited', () => {
    for (const kind of ['color', 'font', 'border', 'banner', 'title', 'flair']) {
      const of = SHOP_ITEMS.filter((i) => i.kind === kind);
      expect(of.some((i) => i.limit), kind).toBe(true);
      if (kind !== 'font') expect(of.some((i) => i.ownerOnly), kind).toBe(true);
    }
  });
  it('rarity follows how an item is sold', () => {
    expect(rarity({ key: 'a', kind: 'title', label: 'A', price: 0, ownerOnly: true })).toBe('exclusive');
    expect(rarity({ key: 'a', kind: 'title', label: 'A', price: 100, limit: 20 })).toBe('limited');
    expect(rarity({ key: 'a', kind: 'title', label: 'A', price: 1500 })).toBe('legendary');
    expect(rarity({ key: 'a', kind: 'title', label: 'A', price: 100 })).toBe('common');
  });
  it('limited items never cost less than a common one', () => {
    for (const i of SHOP_ITEMS.filter((x) => x.limit)) expect(i.price, i.key).toBeGreaterThanOrEqual(1000);
  });
});

// --- Dark mode: every name color and font has a dark palette, and the colors stay readable on both backgrounds.
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const LIGHT_BG = '#F5F4F0';   // the warm paper tint, the worst case in the light theme
const DARK_BG = '#202023';    // the lifted panel colour, the worst case in the dark theme
const hexes = (rule: string) => [...rule.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0]);
const rules = (re: RegExp) => [...css.matchAll(re)];

describe('name colors in both themes', () => {
  const colorKeys = [...new Set([...SHOP_ITEMS.filter((i) => i.kind === 'color').map((i) => i.key), ...NAME_COLORS.map((c) => c.key), OWNER_COLOR])].filter((k) => k !== 'ink');
  it('every color has a light and a dark rule', () => {
    for (const k of colorKeys) {
      expect(css.includes(`.nm-c-${k} {`), `${k} light`).toBe(true);
      expect(css.includes(`:root[data-theme="dark"] .nm-c-${k} {`), `${k} dark`).toBe(true);
      expect(css.includes(`:root:not([data-theme="light"]) .nm-c-${k} {`), `${k} dark (system)`).toBe(true);
    }
  });
  it('every color keeps its contrast: 4.5:1 for flat colors, 3:1 for each stop of a gradient', () => {
    const bad: string[] = [];
    for (const k of colorKeys) {
      const light = rules(new RegExp(`^\\.nm-c-${k} \\{([^}]*)\\}`, 'gm'));
      const dark = rules(new RegExp(`^:root\\[data-theme="dark"\\] \\.nm-c-${k} \\{([^}]*)\\}`, 'gm'));
      expect(light.length, `${k} light rule`).toBeGreaterThan(0);
      for (const [pal, bg, set] of [['light', LIGHT_BG, light], ['dark', DARK_BG, dark]] as const) {
        for (const m of set) {
          const body = m[1];
          const gradient = /gradient/.test(body);
          if (!gradient && !/^\s*color:\s*#/.test(body)) continue; // a rule that only adds glow or motion
          // Radial layers are decoration (the stars in Galaxy), not the text color.
          for (const h of hexes(body.replace(/radial-gradient\([^)]*\)/g, ''))) if (contrast(h, bg) < (gradient ? 3 : 4.5)) bad.push(`${k} ${pal} ${h} ${contrast(h, bg).toFixed(2)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
  it('every font has a rule, and the streak and owner fonts too', () => {
    for (const k of [...NAME_FONTS.map((f) => f.key).filter((k) => k !== 'classic'), OWNER_FONT]) expect(css.includes(`.nm-f-${k} {`), k).toBe(true);
  });
});

describe('drop items', () => {
  it('are free, never sold or limited, and there is a small pool of them', () => {
    const drops = SHOP_ITEMS.filter((i) => i.dropOnly);
    expect(drops.length).toBeGreaterThanOrEqual(4);
    expect(drops.length).toBeLessThanOrEqual(10);
    for (const d of drops) {
      expect(d.price, d.key).toBe(0);
      expect(d.limit, d.key).toBeUndefined();
      expect(d.ownerOnly || d.giftOnly, d.key).toBeFalsy();
      expect(rarity(d), d.key).toBe('drop');
    }
    // A mix of kinds, so a drop is never the same sort of thing every time.
    expect(new Set(drops.map((d) => d.kind)).size).toBeGreaterThanOrEqual(4);
  });
});

describe('gifts', () => {
  it('every gifted item exists, is gift-only or sold, and usernames match loosely', async () => {
    const { GIFTS, giftsFor, shopItem } = await import('@/lib/shop');
    for (const g of Object.values(GIFTS)) for (const k of g.items) expect(shopItem(k), k).toBeTruthy();
    expect(giftsFor('B-Man')?.items).toContain('fx-bee');
    expect(giftsFor('Bees')?.items).toContain('banner-hive');
    expect(giftsFor('bot')?.items).toContain('fx-sparks');
    expect(giftsFor('somebody')).toBeNull();
  });
});
