import { describe, expect, it } from 'vitest';
import { BADGES, BADGE_GROUPS, KONAMI, NO_FACTS, TIER_POINTS, badgeByKey, badgePoints, earnedBadges, weekdayOf, type BadgeFacts } from '@/lib/badges';
import { resultFacts, type DayRow, type HourRow, type ResultGroup } from '@/lib/badge-facts';

const keys = (f: Partial<BadgeFacts>) => earnedBadges({ ...NO_FACTS, ...f }).map((b) => b.key);

describe('achievements', () => {
  it('a new player has none; keys are unique; every achievement has a group and a tier', () => {
    expect(keys({})).toEqual([]);
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length);
    for (const b of BADGES) { expect(BADGE_GROUPS, b.key).toContain(b.group); expect(Object.keys(TIER_POINTS), b.key).toContain(b.tier); expect(b.label.length, b.key).toBeGreaterThan(2); }
    expect(BADGES.length).toBeGreaterThanOrEqual(60);
  });
  it('hidden ones are the secret group, carry a hint and still show once earned', () => {
    const hidden = BADGES.filter((b) => b.hidden);
    expect(hidden.length).toBeGreaterThanOrEqual(8);
    for (const h of hidden) { expect(h.group, h.key).toBe('Secret'); expect(h.hint, h.key).toBeTruthy(); }
    expect(BADGES.filter((b) => b.group === 'Secret').every((b) => b.hidden)).toBe(true);
    expect(keys({ nightGames: 5 })).toEqual(['night-owl', 'insomniac']);
  });
  it('each achievement comes from real play', () => {
    expect(keys({ perfect: { '17-0': 1 } })).toEqual(['unbeaten']);
    expect(keys({ seasonPerfect: { '17-0': 1, '82-0': 1, '162-0': 1 }, perfect: { '17-0': 1, '82-0': 1, '162-0': 1 } })).toEqual(['unbeaten', 'eighty-two', 'one-sixty-two', 'clean-sweep']);
    expect(keys({ puzzlesPerfect: ['sports-wordle'] })).toEqual(['wordsmith']);
    expect(keys({ puzzlesPerfect: ['sports-wordle', 'sports-connections', 'sports-strands', 'sports-crossword'] })).toEqual(['wordsmith', 'puzzle-master']);
    expect(keys({ longestStreak: 30 })).toEqual(['three-peat', 'on-fire', 'fortnight', 'iron-man']);
    expect(keys({ boardBest: 2 })).toEqual(['top-ten', 'podium']);
    expect(keys({ boardBest: 1 })).toEqual(['top-ten', 'podium', 'champion']);
    expect(keys({ boardBest: 11 })).toEqual([]);
    expect(keys({ sports: ['nfl', 'nba', 'mlb'] })).toEqual([]);
    expect(keys({ sports: ['nfl', 'nba', 'mlb', 'soccer'] })).toEqual(['all-sport']);
    expect(keys({ sports: ['nfl', 'nba', 'wnba', 'mlb', 'soccer', 'college'] })).toEqual(['all-sport', 'sports-nut']);
    expect(keys({ played: 1000, pointsEarned: 1000 })).toEqual(['first-down', 'getting-started', 'regular', 'five-hundred', 'grinder', 'high-roller']);
    expect(keys({ pickemRight: 50, pickemPicks: 80 })).toEqual(['picker', 'sharp-eye', 'oracle']);
    expect(keys({ itemsOwned: 25, pointsSpent: 5000 })).toEqual(['window-shopper', 'collector', 'hoarder', 'big-spender']);
    expect(keys({ dropsClaimed: 6, dropSniped: true })).toEqual(['drop-hunter', 'drop-collector', 'full-set', 'drop-sniper']);
    expect(keys({ secrets: [KONAMI] })).toEqual([KONAMI]);
    expect(keys({ accountDays: 365, joinedEarly: true, hasAvatar: true })).toEqual(['face-time', 'early-adopter', 'veteran', 'year-one']);
  });
  it('the Completionist counts forty ordinary achievements', () => {
    const lots: Partial<BadgeFacts> = {
      perfect: { '17-0': 1, '82-0': 1, '162-0': 1, 'build-a-player': 1, 'sports-wordle': 1 }, seasonPerfect: { '17-0': 1, '82-0': 1, '162-0': 1 }, perfectHard: 1, perfectAllTime: 1, perfect53: 1, perfectFantasy: 1,
      closeCalls: 1, strongSeasons: 10, played: 1000, games: 25, sports: ['nfl', 'nba', 'wnba', 'mlb', 'soccer', 'college'], longestStreak: 100, boardBest: 1, weekWins: 1, pickemPicks: 5, pickemRight: 60, pickemPerfectWeeks: 1,
      challengesMade: 1, challengePlays: 6, challengeWins: 1, challengeTakers: 12, pointsSpent: 6000, itemsOwned: 30, slotsWorn: 7, pointsEarned: 6000, dropsClaimed: 6, hasAvatar: true, joinedEarly: true, accountDays: 400,
      earlyGames: 1, nightGames: 6, weekendPairs: 1, mostTypesInADay: 6, mostInADay: 13, perfectMinis: 6, perfectGames: 11, puzzlesPerfect: ['sports-wordle', 'sports-connections', 'sports-strands', 'sports-crossword'],
    };
    const all = keys(lots);
    expect(all).toContain('completionist');
    expect(all.length).toBeGreaterThanOrEqual(41);
    // Plenty of achievements, but under forty: no Completionist.
    const some = keys({ played: 1000, games: 25, sports: ['nfl', 'nba', 'wnba', 'mlb', 'soccer', 'college'], longestStreak: 100, pickemRight: 60, accountDays: 400 });
    expect(some.length).toBeGreaterThan(8); expect(some.length).toBeLessThan(40);
    expect(some).not.toContain('completionist');
  });
  it('points come from the tier, and codes pay nothing', () => {
    expect(badgePoints(badgeByKey('unbeaten')!)).toBe(50);
    expect(badgePoints(badgeByKey('first-down')!)).toBe(10);
    expect(badgePoints(badgeByKey('clean-sweep')!)).toBe(100);
    expect(badgePoints(badgeByKey(KONAMI)!)).toBe(0);
  });
  it('weekday of an ET date', () => {
    expect(weekdayOf('2026-10-03')).toBe(6); // a Saturday
    expect(weekdayOf('2026-10-04')).toBe(0);
  });
});

describe('facts from results', () => {
  const g = (o: Partial<ResultGroup>): ResultGroup => ({ game: '17-0', daily: false, hard: false, format: '6', pool: 'current', wins: 10, flag: false, n: 1, ...o });
  const empty = { hours: [] as HourRow[], days: [] as DayRow[] };
  it('counts perfect seasons by variety, close calls, strong and dry seasons', () => {
    const f = resultFacts([
      g({ wins: 17, hard: true }), g({ wins: 17, pool: 'all-time' }), g({ wins: 17, format: '53', n: 2 }), g({ wins: 17, format: 'fantasy' }),
      g({ game: '82-0', wins: 82 }), g({ game: '82-0', wins: 81 }), g({ game: '162-0', wins: 130, n: 3 }), g({ wins: 0 }), g({ game: '82-0', wins: 1 }), g({ wins: 14 }),
    ], empty.hours, empty.days);
    expect(f.seasonPerfect).toEqual({ '17-0': 5, '82-0': 1 });
    expect(f.perfectHard).toBe(1); expect(f.perfectAllTime).toBe(1); expect(f.perfect53).toBe(2); expect(f.perfectFantasy).toBe(1);
    expect(f.closeCalls).toBe(1);
    expect(f.strongSeasons).toBe(5 + 1 + 1 + 3 + 1);   // perfect 17-0 x5, 82-0 x1, 81-0 x1, 130-32 x3 (80.2 percent), 14-3 x1; 0 and 1 wins do not count
    expect(f.drySeasons).toBe(2);
    expect(f.played).toBe(1 + 1 + 2 + 1 + 1 + 1 + 3 + 1 + 1 + 1);
  });
  it('even seasons: 8-9 and 9-8 in 17 games, exactly half in the long ones', () => {
    const f = resultFacts([g({ wins: 8 }), g({ wins: 9 }), g({ wins: 10 }), g({ game: '82-0', wins: 41 }), g({ game: '82-0', wins: 42 }), g({ game: '162-0', wins: 81 })], [], []);
    expect(f.evenSeasons).toBe(4);
  });
  it('minis count their own perfect results; Build a Player is counted apart; puzzles are tracked by name', () => {
    const f = resultFacts([
      g({ game: 'higher-lower', wins: null, flag: true, n: 3 }), g({ game: 'grid', wins: null, flag: true }), g({ game: 'build-a-player', wins: null, flag: true }), g({ game: 'sports-wordle', wins: null, flag: true }), g({ game: 'sports-strands', wins: null, flag: false }), g({ game: 'top-ten', wins: null }),
    ], [], []);
    expect(f.perfectMinis).toBe(3 + 1 + 1);               // Wordle counts as a mini, Build a Player does not
    expect(f.perfect['build-a-player']).toBe(1);
    expect(f.perfectGames).toBe(4);
    expect(f.puzzlesPerfect).toEqual(['sports-wordle']);
    expect(f.games).toBe(6);
  });
  it('time of day: night, early, midnight', () => {
    const f = resultFacts([], [{ h: 0, m: 2, n: 1 }, { h: 0, m: 30, n: 4 }, { h: 1, m: 0, n: 2 }, { h: 3, m: 59, n: 1 }, { h: 4, m: 0, n: 3 }, { h: 6, m: 59, n: 1 }, { h: 7, m: 0, n: 9 }], []);
    expect(f.midnightGames).toBe(1); expect(f.nightGames).toBe(3); expect(f.earlyGames).toBe(4);
  });
  it('days: the busiest day, weekends, hat tricks, perfect storms and back to back', () => {
    const day = (date: string, o: Partial<DayRow>): DayRow => ({ date, n: 1, types: 1, perfect: 0, seasonPerfect: 0, puzzlePerfect: 0, ...o });
    const f = resultFacts([], [], [
      day('2026-10-03', { n: 3, types: 2 }), day('2026-10-04', { n: 13, types: 6, perfect: 3, seasonPerfect: 2, puzzlePerfect: 1 }),   // a Saturday and its Sunday
      day('2026-10-10', { seasonPerfect: 1, perfect: 1 }), day('2026-10-11', { seasonPerfect: 1, perfect: 1 }), day('2026-10-13', { seasonPerfect: 1, perfect: 1 }),
    ]);
    expect(f.mostInADay).toBe(13); expect(f.mostTypesInADay).toBe(6);
    expect(f.weekendPairs).toBe(2);       // Oct 3 + 4 and Oct 10 + 11
    expect(f.hatTricks).toBe(1); expect(f.perfectStorms).toBe(1);
    expect(f.backToBack).toBe(1);         // Oct 10 and 11; the 13th stands alone
    expect(resultFacts([], [], []).mostInADay).toBe(0);
  });
});
