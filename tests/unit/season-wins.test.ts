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

import { scarcityGrade } from '@/lib/game/seventeen';
describe('position scarcity', () => {
  it('the best player at a thin position counts as a 99; ordinary players barely move', () => {
    expect(scarcityGrade(93, 93)).toBe(99);
    expect(scarcityGrade(88, 93)).toBeGreaterThan(92);
    expect(scarcityGrade(62, 93)).toBeLessThan(63);
    expect(scarcityGrade(97, 99)).toBe(97);
    expect(scarcityGrade(80)).toBe(80);
  });
});
