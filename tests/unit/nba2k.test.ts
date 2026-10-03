import { describe, expect, it } from 'vitest';
import { lastKey, nameKey, parse2k } from '@/lib/server/nba2k';

describe('2K ratings parsing and name matching', () => {
  it('reads players from the page data blob', () => {
    const data = { props: { pageProps: { data: [
      { Player: 'Tyrese Maxey', Team: 'Philadelphia 76ers', Position: 'PG', Overall: 92 },
      { Player: 'No Rating', Team: 'X', Position: 'C', Overall: 0 },
    ] } } };
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;
    expect(parse2k(html)).toEqual([{ name: 'Tyrese Maxey', team: 'Philadelphia 76ers', position: 'PG', overall: 92 }]);
    expect(parse2k('<html></html>')).toEqual([]);
  });

  it('ignores accents, punctuation and suffixes', () => {
    expect(nameKey('Nikola Jokić')).toBe(nameKey('Nikola Jokic'));
    expect(nameKey("Ja'Kobi Gillespie")).toBe(nameKey('JaKobi Gillespie'));
    expect(nameKey('Jaren Jackson Jr.')).toBe(nameKey('Jaren Jackson'));
  });

  it('last-name key lets nicknames match', () => {
    expect(lastKey('Nicolas Claxton')).toBe(lastKey('Nic Claxton'));
    expect(lastKey('Ron Holland')).toBe(lastKey('Ronald Holland II'));
    expect(lastKey('Mohamed Bamba')).toBe(lastKey('Mo Bamba'));
  });
});
