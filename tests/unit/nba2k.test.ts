import { describe, expect, it } from 'vitest';
import { currentTeams, lastKey, nameKey, parse2k, rosterAthletes, teamNow } from '@/lib/server/nba2k';

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

describe('current teams from ESPN rosters', () => {
  const roster = (...players: [string, string][]) => ({ athletes: players.map(([id, fullName]) => ({ id, fullName })) });

  it('reads a flat basketball roster and a grouped one', () => {
    expect(rosterAthletes(roster(['6450', 'Kawhi Leonard'], ['2993874', 'Kyle Anderson']))).toEqual([{ id: 6450, name: 'Kawhi Leonard' }, { id: 2993874, name: 'Kyle Anderson' }]);
    expect(rosterAthletes({ athletes: [{ position: 'guards', items: [{ id: '1', fullName: 'A One' }] }, { position: 'bigs', items: [{ id: '2', fullName: 'B Two' }] }] })).toEqual([{ id: 1, name: 'A One' }, { id: 2, name: 'B Two' }]);
    expect(rosterAthletes(null)).toEqual([]);
    expect(rosterAthletes({ athletes: [{ id: 'x', fullName: 'No Id' }, { id: '5' }] })).toEqual([]);
  });

  it('files each player under the team whose roster he is on', async () => {
    const pages: Record<string, unknown> = {
      '/teams': { sports: [{ leagues: [{ teams: [{ team: { id: '28' } }, { team: { id: '12' } }] }] }] },
      '/teams/28/roster': roster(['6450', 'Kawhi Leonard']),
      '/teams/12/roster': roster(['3992', 'James Harden']),
    };
    const fake = (async (url: string) => {
      const hit = pages[url.replace(/^.*basketball\/nba/, '')];
      return { ok: hit !== undefined, json: async () => hit };
    }) as unknown as typeof fetch;
    const map = await currentTeams(fake);
    expect(map.get(6450)).toBe(28);
    expect(map.get(3992)).toBe(12);
    expect(map.size).toBe(2);
  });

  it('comes back empty when ESPN cannot be read', async () => {
    const down = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect((await currentTeams(down)).size).toBe(0);
    const blocked = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    expect((await currentTeams(blocked)).size).toBe(0);
  });

  it('prefers the roster over the 2K table and keeps 2K for anyone on no roster', () => {
    expect(teamNow(28, 12)).toBe(28);
    expect(teamNow(undefined, 12)).toBe(12);
    expect(teamNow(28, null)).toBe(28);
    expect(teamNow(undefined, null)).toBeNull();
  });
});
