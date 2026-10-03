import { describe, expect, it } from 'vitest';
import { matchName, top100Games } from '@/lib/minigames/top100/games';
import type { TopData, TopEntry } from '@/lib/minigames/top100/data';

const list: TopEntry[] = Array.from({ length: 100 }, (_, i) => ({ rank: i + 1, name: `Player Number${i}`, hint: 'QB · KC', value: 99 - i * 0.1 }));
list[0] = { rank: 1, name: 'Patrick Mahomes II', hint: 'QB · KC', value: 99 };
list[1] = { rank: 2, name: 'Josh Allen', hint: 'QB · BUF', value: 98 };
list[2] = { rank: 3, name: 'Josh Allen', hint: 'EDGE · JAX', value: 97.9 };
list[3] = { rank: 4, name: 'Nikola Jokić', hint: 'C', value: 97 };
const data = { 'nfl-now': list, 'nfl-all': list, 'nba-now': list, 'nba-all': list, 'mlb-now': list, 'mlb-all': list } as TopData;

describe('Top 100', () => {
  it('matches full names, unique last names, accents and suffixes; refuses shared last names', () => {
    expect(matchName(list, 'patrick mahomes')).toBe(1);
    expect(matchName(list, 'Mahomes')).toBe(1);
    expect(matchName(list, 'jokic')).toBe(4);
    expect(matchName(list, 'Allen')).toBe('ambiguous');
    expect(matchName(list, 'Josh Allen')).toBe(2);
    expect(matchName(list, 'Brady')).toBeNull();
    expect(matchName(list, 'al')).toBeNull();
  });
  it('scores players found, then time; hints never include names', () => {
    const g = top100Games[0];
    const p = g.generate('x', data);
    expect(JSON.stringify(g.publicView(p))).not.toContain('Mahomes');
    const fast = g.score(p, { guesses: ['Mahomes', 'jokic', 'nobody'] }, { elapsedMs: 60_000 });
    const slow = g.score(p, { guesses: ['Mahomes', 'jokic'] }, { elapsedMs: 600_000 });
    const more = g.score(p, { guesses: ['Mahomes', 'jokic', 'Player Number50'] }, { elapsedMs: 900_000 });
    expect(fast.summary).toBe('2/100 · 1:00');
    expect(fast.score).toBeGreaterThan(slow.score);
    expect(more.score).toBeGreaterThan(fast.score);
    expect(g.check!(p, { name: 'Allen' }, data)).toMatchObject({ hit: false });
    expect(g.check!(p, { name: 'Mahomes' }, data)).toEqual({ hit: true, rank: 1, name: 'Patrick Mahomes II' });
  });
});
