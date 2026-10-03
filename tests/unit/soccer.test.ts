import { describe, expect, it } from 'vitest';
import { currentSeason, parseLeaderLine, seasonLabel } from '@/lib/server/soccer-sync';

describe('soccer sync helpers', () => {
  it('reads ESPN leader lines', () => {
    expect(parseLeaderLine('M: 35, G: 27: A: 8')).toEqual({ matches: 35, goals: 27, assists: 8 });
    expect(parseLeaderLine('M: 38, G: 22')).toEqual({ matches: 38, goals: 22, assists: 0 });
    expect(parseLeaderLine('nonsense')).toBeNull();
    expect(parseLeaderLine(undefined)).toBeNull();
  });
  it('knows which season a league is in', () => {
    expect(currentSeason('eng.1', new Date('2026-10-03T12:00:00Z'))).toBe(2026);
    expect(currentSeason('eng.1', new Date('2026-03-01T12:00:00Z'))).toBe(2025);
    expect(currentSeason('usa.1', new Date('2026-03-01T12:00:00Z'))).toBe(2026);
    expect(seasonLabel('eng.1', 2025)).toBe('2025-26');
    expect(seasonLabel('usa.1', 2025)).toBe('2025');
  });
});
