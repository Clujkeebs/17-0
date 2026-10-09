import { describe, expect, it } from 'vitest';
import { gameOrder, longestStreak } from '@/components/game/SeasonPlayback';

describe('season playback order', () => {
  it('has exactly the graded record and replays the same for the same result', () => {
    for (const [w, g] of [[0, 82], [61, 82], [82, 82], [140, 162]]) {
      const o = gameOrder('res-1', w, g);
      expect(o).toHaveLength(g);
      expect(o.filter(Boolean)).toHaveLength(w);
      expect(gameOrder('res-1', w, g)).toEqual(o);
    }
    expect(gameOrder('res-1', 60, 82)).not.toEqual(gameOrder('res-2', 60, 82));
  });
  it('counts the longest win streak', () => {
    expect(longestStreak([true, true, false, true, true, true, false])).toBe(3);
    expect(longestStreak(gameOrder('x', 82, 82))).toBe(82);
  });
});
