import { describe, expect, it } from 'vitest';
import history from '../../data/nba-history/history.json';
import { historyRows } from '@/lib/server/nba-history';
import { isListedPosition } from '@/lib/game/eightytwo';
import { HISTORY_FIRST, HISTORY_LAST } from '@/lib/game/nba-history';

type Line = [player: number, franchise: number, season: number, gp: number, mpg: number | null, ppg: number, rpg: number, apg: number, spg: number | null, bpg: number | null, fg: number | null, ft: number | null];
const d = history as unknown as {
  version: number;
  teams: [season: number, franchise: number, location: string, name: string, abbr: string, color: string, logo: string | null][];
  players: [id: number, name: string, position: string, wikipedia: string, born: string | null][];
  lines: Line[];
};

const player = (name: string) => d.players.find((p) => p[1] === name)!;
const season = (name: string, year: number, franchise?: number) => d.lines.find((l) => l[0] === player(name)[0] && l[2] === year && (franchise == null || l[1] === franchise))!;
const WARRIORS = 9, KINGS = 23, BUCKS = 15, SPURS = 24, CELTICS = 2, LAKERS = 13, SIXERS = 20;

describe('the 1960s, 1970s and 1980s data file', () => {
  it('has every NBA team of every season, and none of the ABA', () => {
    const per: Record<number, number> = {};
    for (const t of d.teams) per[t[0]] = (per[t[0]] ?? 0) + 1;
    expect(per).toEqual({ 1960: 8, 1961: 8, 1962: 9, 1963: 9, 1964: 9, 1965: 9, 1966: 9, 1967: 10, 1968: 12, 1969: 14, 1970: 14, 1971: 17, 1972: 17, 1973: 17, 1974: 17, 1975: 18, 1976: 18, 1977: 22, 1978: 22, 1979: 22, 1980: 22, 1981: 23, 1982: 23, 1983: 23, 1984: 23, 1985: 23, 1986: 23, 1987: 23, 1988: 23, 1989: 25 });
    expect(new Set(d.teams.map((t) => `${t[0]}:${t[1]}`)).size).toBe(d.teams.length);
    // The Nuggets, Pacers, Spurs and Nets (franchises 7, 11, 24, 17) joined the NBA with the 1976-77 season.
    for (const t of d.teams.filter((x) => [7, 11, 24, 17].includes(x[1]))) expect(t[0]).toBeGreaterThanOrEqual(1977);
    for (const t of d.teams) {
      expect(t[0]).toBeGreaterThanOrEqual(HISTORY_FIRST);
      expect(t[0]).toBeLessThanOrEqual(HISTORY_LAST);
      expect(t[2] && t[3] && t[4]).toBeTruthy();
      expect(t[5]).toMatch(/^#[0-9A-F]{6}$/);
      if (t[6]) expect(t[6]).toMatch(/^https:\/\/a\.espncdn\.com\/i\/teamlogos\/nba\/500\/[a-z]+\.png$/);
    }
  });

  it('names a franchise as it was called then', () => {
    const name = (year: number, franchise: number) => { const t = d.teams.find((x) => x[0] === year && x[1] === franchise)!; return `${t[2]} ${t[3]}`; };
    expect(name(1962, 9)).toBe('Philadelphia Warriors');
    expect(name(1965, 9)).toBe('San Francisco Warriors');
    expect(name(1975, 9)).toBe('Golden State Warriors');
    expect(name(1964, 1)).toBe('St. Louis Hawks');
    expect(name(1973, 23)).toBe('Kansas City-Omaha Kings');
    expect(name(1978, 12)).toBe('Buffalo Braves');
    expect(name(1978, 25)).toBe('Seattle SuperSonics');
    expect(name(1963, 27)).toBe('Chicago Zephyrs');
    expect(name(1979, 26)).toBe('New Orleans Jazz');
    expect(name(1980, 26)).toBe('Utah Jazz');
    expect(name(1981, 6)).toBe('Dallas Mavericks');
    expect(name(1984, 12)).toBe('San Diego Clippers');
    expect(name(1985, 12)).toBe('Los Angeles Clippers');
    expect(name(1985, 23)).toBe('Kansas City Kings');
    expect(name(1986, 23)).toBe('Sacramento Kings');
    // ESPN files the first Charlotte Hornets under the franchise that became the Pelicans.
    expect(name(1989, 3)).toBe('Charlotte Hornets');
    expect(name(1989, 14)).toBe('Miami Heat');
  });

  it('keeps one line per player, franchise and season, each with a player and a team season behind it', () => {
    const ids = d.players.map((p) => p[0]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
      // An integer column holds it: ESPN's ids are small, the rest are made from the article title.
      expect(id).toBeLessThan(2_147_483_647);
    }
    // Two people can share a name (there are two Eddie Johnsons), never a name and a birthday.
    const people = d.players.map((p) => `${p[1]}|${p[4]}`);
    expect(new Set(people).size).toBe(people.length);
    const teams = new Set(d.teams.map((t) => `${t[0]}:${t[1]}`));
    const known = new Set(ids);
    const seen = new Set<string>();
    for (const l of d.lines) {
      expect(known.has(l[0])).toBe(true);
      expect(teams.has(`${l[2]}:${l[1]}`)).toBe(true);
      const key = `${l[0]}:${l[1]}:${l[2]}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(d.players.every((p) => d.lines.some((l) => l[0] === p[0]))).toBe(true);
  });

  it('keeps every number inside what a player could have produced', () => {
    for (const [, , , gp, mpg, ppg, rpg, apg, spg, bpg, fg, ft] of d.lines) {
      expect(gp).toBeGreaterThanOrEqual(1);
      expect(gp).toBeLessThanOrEqual(90);
      if (mpg != null) { expect(mpg).toBeGreaterThanOrEqual(0); expect(mpg).toBeLessThanOrEqual(52); }
      expect(ppg).toBeGreaterThanOrEqual(0); expect(ppg).toBeLessThanOrEqual(55);
      expect(rpg).toBeGreaterThanOrEqual(0); expect(rpg).toBeLessThanOrEqual(32);
      expect(apg).toBeGreaterThanOrEqual(0); expect(apg).toBeLessThanOrEqual(16);
      if (spg != null) expect(spg).toBeLessThanOrEqual(5);
      if (bpg != null) expect(bpg).toBeLessThanOrEqual(8);
      for (const pct of [fg, ft]) if (pct != null) { expect(pct).toBeGreaterThanOrEqual(0); expect(pct).toBeLessThanOrEqual(1); }
    }
  });

  it('files every player under a position the engine knows', () => {
    for (const p of d.players) {
      expect(isListedPosition(p[2]), `${p[1]}: ${p[2]}`).toBe(true);
      expect(p[1]).not.toMatch(/[()]/);
      expect(p[3]).toBeTruthy();
    }
  });

  it('gives every team season a rotation to draft from, and every decade enough franchises to spin', () => {
    const by = new Map<string, number>();
    for (const l of d.lines) if (l[3] >= 20) by.set(`${l[2]}:${l[1]}`, (by.get(`${l[2]}:${l[1]}`) ?? 0) + 1);
    for (const t of d.teams) expect(by.get(`${t[0]}:${t[1]}`) ?? 0, `${t[0]} ${t[2]} ${t[3]}`).toBeGreaterThanOrEqual(8);
    for (const [from, to] of [[1960, 1969], [1970, 1979], [1980, 1989]]) {
      const franchises = new Map<number, Set<number>>();
      for (const l of d.lines) if (l[2] >= from && l[2] <= to && l[3] >= 20) franchises.set(l[1], (franchises.get(l[1]) ?? new Set()).add(l[0]));
      expect([...franchises.values()].filter((s) => s.size >= 5).length).toBeGreaterThanOrEqual(10);
    }
  });

  it('matches box scores everyone knows', () => {
    expect(season('Wilt Chamberlain', 1962, WARRIORS)).toMatchObject({ 3: 80, 4: 48.5, 5: 50.4, 6: 25.7, 7: 2.4 });
    expect(season('Wilt Chamberlain', 1967, SIXERS)).toMatchObject({ 5: 24.1, 6: 24.2, 7: 7.8 });
    expect(season('Oscar Robertson', 1962, KINGS)).toMatchObject({ 5: 30.8, 6: 12.5, 7: 11.4 });
    expect(season('Bill Russell', 1964, CELTICS)).toMatchObject({ 5: 15, 6: 24.7 });
    expect(season('Jerry West', 1966, LAKERS)).toMatchObject({ 5: 31.3 });
    expect(season('Kareem Abdul-Jabbar', 1972, BUCKS)).toMatchObject({ 3: 81, 5: 34.8, 6: 16.6, 7: 4.6 });
    expect(season('Kareem Abdul-Jabbar', 1974, BUCKS)).toMatchObject({ 8: 1.4, 9: 3.5 });
    expect(season('George Gervin', 1978, SPURS)).toMatchObject({ 3: 82, 4: 34.8, 5: 27.2, 6: 5.1, 7: 3.7 });
    expect(season('George Gervin', 1979, SPURS)).toMatchObject({ 5: 29.6 });
    expect(season('Julius Erving', 1977, SIXERS)).toMatchObject({ 5: 21.6 });
    expect(season('Larry Bird', 1985, CELTICS)).toMatchObject({ 3: 80, 5: 28.7, 6: 10.5, 7: 6.6 });
    expect(season('Kevin McHale', 1987, CELTICS)).toMatchObject({ 5: 26.1, 10: 0.604 });
    expect(season('Magic Johnson', 1987, LAKERS)).toMatchObject({ 5: 23.9, 7: 12.2 });
    expect(season('Michael Jordan', 1987, 4)).toMatchObject({ 3: 82, 5: 37.1 });
  });

  it('splits a season between two teams when a player was traded', () => {
    const wilt65 = d.lines.filter((l) => l[0] === player('Wilt Chamberlain')[0] && l[2] === 1965);
    expect(wilt65.map((l) => [l[1], l[3], l[5]]).sort()).toEqual([[SIXERS, 35, 30.1], [WARRIORS, 38, 38.9]]);
  });

  it('has no ABA seasons for the players who left it for the NBA', () => {
    // Erving played the ABA from 1972 to 1976, Gervin 1973 to 1976: only their NBA years are here.
    const years = (n: string) => d.lines.filter((l) => l[0] === player(n)[0]).map((l) => l[2]).sort((a, b) => a - b);
    expect(years('Julius Erving')).toEqual([1977, 1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987]);
    expect(years('George Gervin')).toEqual([1977, 1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986]);
  });
});

describe('the 1960s, 1970s and 1980s values', () => {
  const rows = historyRows();
  const name = new Map(d.players.map((p) => [p[0], p[1]]));

  it('has one value between 40 and 99 for every line', () => {
    expect(rows).toHaveLength(d.lines.length);
    for (const r of rows) { expect(r.value).toBeGreaterThanOrEqual(40); expect(r.value).toBeLessThanOrEqual(99); }
  });

  it('puts the greatest seasons on top and nobody else near them', () => {
    const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 10).map((r) => name.get(r.playerId));
    expect(top).toContain('Wilt Chamberlain');
    expect(top).toContain('Kareem Abdul-Jabbar');
    const wilt62 = rows.find((r) => r.playerId === player('Wilt Chamberlain')[0] && r.season === 1962)!;
    expect(wilt62.value).toBeGreaterThan(95);
    expect(rows.find((r) => r.playerId === player('George Gervin')[0] && r.season === 1978)!.value).toBeGreaterThan(80);
  });

  it('lands on the same scale as the seasons ESPN carries, so an era is no easier to draft from than another', () => {
    // ESPN's rotation seasons (40 games, 15 minutes) run median 71.4, 90th percentile 87.8, 99th 95.6.
    const v = rows.filter((r) => r.gp >= 40 && r.mpg >= 15).map((r) => r.value).sort((a, b) => a - b);
    const at = (p: number) => v[Math.floor(p * (v.length - 1))];
    expect(at(0.5)).toBeGreaterThan(69); expect(at(0.5)).toBeLessThan(74);
    expect(at(0.9)).toBeGreaterThan(85); expect(at(0.9)).toBeLessThan(90);
    expect(at(0.99)).toBeGreaterThan(93); expect(at(0.99)).toBeLessThan(98);
  });

  it('keeps ESPN\'s id for a player both sources hold, so he is one person across eras', () => {
    expect(player('Michael Jordan')[0]).toBe(1035);
    expect(player('Magic Johnson')[0]).toBe(2334);
  });

  it('holds no steals or blocks from before 1974, when the league did not count them', () => {
    for (const r of rows.filter((x) => x.season < 1974)) expect(r.spg === 0 && r.bpg === 0).toBe(true);
  });
});
