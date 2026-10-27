import { describe, expect, it } from 'vitest';
import { headlineSize } from '@/lib/server/og/headline';

describe('share card headline', () => {
  it('keeps a record at full size', () => {
    for (const h of ['17-0', '15-2', '82-0', '44-0', '162-0']) expect(headlineSize(h)).toBe(210);
  });

  it('shrinks a longer line so it stays on one row of the 620px column', () => {
    const size = headlineSize('Streak 24');
    expect(size).toBeLessThan(210);
    // A glyph runs about half an em wide at this weight.
    expect(size * 'Streak 24'.length * 0.5).toBeLessThanOrEqual(620);
  });

  it('never goes below a readable floor', () => {
    expect(headlineSize('x'.repeat(60))).toBe(56);
  });
});
