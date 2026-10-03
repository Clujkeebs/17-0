import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS, rarity } from '@/lib/shop';
import { FLAIR_KEYS } from '@/components/Flair';

const css = readFileSync('src/app/globals.css', 'utf8');
const selector = (kind: string, key: string) => kind === 'color' ? `.nm-c-${key}` : kind === 'font' ? `.nm-f-${key}` : `.${key}`;

describe('shop catalog', () => {
  it('has unique keys and every item has its look', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.key)).size).toBe(SHOP_ITEMS.length);
    for (const i of SHOP_ITEMS) {
      if (i.kind === 'title') continue;
      if (i.kind === 'flair') { expect(FLAIR_KEYS, i.key).toContain(i.key); continue; }
      expect(new RegExp(`\\${selector(i.kind, i.key)}[\\s,{]`).test(css), `${i.kind} ${i.key} has no CSS`).toBe(true);
    }
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
});
