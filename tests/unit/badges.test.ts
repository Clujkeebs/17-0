import { describe, expect, it } from 'vitest';
import { BADGES, earnedBadges, weekdayOf, type BadgeFacts } from '@/lib/badges';

const none: BadgeFacts = { perfect: {}, played: 0, sports: [], longestStreak: 0, boardBest: null, weekWins: 0, pickemPerfectWeeks: 0, challengeWins: 0, pointsEarned: 0 };
const keys = (f: Partial<BadgeFacts>) => earnedBadges({ ...none, ...f }).map((b) => b.key);

describe('badges', () => {
  it('a new player has none; keys are unique', () => {
    expect(keys({})).toEqual([]);
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length);
  });
  it('each badge comes from real play', () => {
    expect(keys({ perfect: { '17-0': 1 } })).toEqual(['unbeaten']);
    expect(keys({ perfect: { 'sports-crossword': 2 } })).toEqual(['wordsmith']);
    expect(keys({ longestStreak: 30 })).toEqual(['on-fire', 'iron-man']);
    expect(keys({ boardBest: 2 })).toEqual(['podium']);
    expect(keys({ boardBest: 1 })).toEqual(['podium', 'champion']);
    expect(keys({ sports: ['nfl', 'nba', 'mlb'] })).toEqual([]);
    expect(keys({ sports: ['nfl', 'nba', 'mlb', 'soccer'] })).toEqual(['all-sport']);
    expect(keys({ played: 1000, pointsEarned: 1000 })).toEqual(['regular', 'grinder', 'high-roller']);
  });
  it('weekday of an ET date', () => {
    expect(weekdayOf('2026-10-03')).toBe(6); // a Saturday
    expect(weekdayOf('2026-10-04')).toBe(0);
  });
});
