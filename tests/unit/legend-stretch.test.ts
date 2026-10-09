import { describe, expect, it } from 'vitest';
import { PER_TEAM, TOP_STRETCH, stretchTop } from '@/lib/game/legend-grade';

describe('All-time grade stretch', () => {
  const range = Array.from({ length: 101 }, (_, i) => 50 + i * 0.45); // today's grades, 50 to 95
  it('leaves the bottom nine tenths on today\'s scale', () => {
    expect(stretchTop(range, 0.5)).toBeCloseTo(72.5, 1);
    expect(stretchTop(range, TOP_STRETCH)).toBeCloseTo(90.5, 1);
  });
  it('takes the best season in history to 99, rising steadily', () => {
    expect(stretchTop(range, 1)).toBe(99);
    expect(stretchTop(range, 0.95)).toBeGreaterThan(stretchTop(range, 0.92));
    expect(stretchTop(range, 0.95)).toBeLessThan(99);
  });
  it('keeps a deep bench of greats per franchise', () => {
    expect(Object.values(PER_TEAM).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(30);
  });
});
