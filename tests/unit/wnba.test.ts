import { describe, expect, it } from 'vitest';
import { latestWnbaSeason } from '@/lib/server/wnba-sync';
import { valueAt } from '@/lib/minigames/nba/games';
import { wnbaGames } from '@/lib/minigames/wnba/games';
import type { NbaGameData } from '@/lib/minigames/nba/data';

describe('WNBA', () => {
  it('counts a season once its regular season starts in May', () => {
    expect(latestWnbaSeason(new Date('2026-10-09T12:00:00Z'))).toBe(2026);
    expect(latestWnbaSeason(new Date('2026-03-01T12:00:00Z'))).toBe(2025);
    expect(latestWnbaSeason(new Date('2026-05-20T12:00:00Z'))).toBe(2026);
  });
  it('places cut-offs by rank, not fixed values', () => {
    const data = { rated: [], seasons: Array.from({ length: 100 }, (_, i) => ({ value: 50 + i * 0.3 })) } as unknown as NbaGameData;
    expect(valueAt(data, 0.5)).toBeCloseTo(65, 5);
    expect(valueAt(data, 0.9)).toBeCloseTo(77, 5);
  });
  it('registers four games under their own slugs and sport', () => {
    expect(wnbaGames.map((g) => g.slug)).toEqual(['wnba-higher-lower', 'wnba-blind-resume', 'wnba-who-led', 'wnba-whose-team']);
    expect(wnbaGames.every((g) => g.sport === 'wnba')).toBe(true);
  });
});
