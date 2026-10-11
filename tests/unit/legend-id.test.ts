import { describe, expect, it } from 'vitest';
import { legendId } from '@/lib/server/nfl-history';

describe('legend ids', () => {
  it('are stable across rebuilds and unique per player and franchise', () => {
    expect(legendId(16716, 14)).toBe(legendId(16716, 14));
    expect(legendId(16716, 14)).not.toBe(legendId(16716, 15));
    expect(legendId(16716, 14)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
