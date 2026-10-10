import { describe, expect, it } from 'vitest';
import { seasonWins } from '@/lib/game/prng';

describe('season wins', () => {
  it('a roster past the perfect line always goes unbeaten, whatever the luck', () => {
    for (const luck of [-3, -2, -1, 0, 1]) expect(seasonWins(17.4, 17, luck)).toBe(17);
    expect(seasonWins(82, 82, -3)).toBe(82);
  });
  it('below the line, luck moves the record a little either way', () => {
    expect(seasonWins(15.6, 17, -2)).toBe(14);
    expect(seasonWins(15.6, 17, 1)).toBe(17);
    expect(seasonWins(-3, 17, -2)).toBe(0);
  });
});
