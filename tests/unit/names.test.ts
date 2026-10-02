import { describe, expect, it } from 'vitest';
import { lastName } from '@/lib/names';

describe('lastName', () => {
  it('skips generational suffixes', () => {
    expect(lastName('Patrick Surtain II')).toBe('Surtain');
    expect(lastName('Marvin Harrison Jr.')).toBe('Harrison');
    expect(lastName('Ken Griffey Sr')).toBe('Griffey');
    expect(lastName('Michael Jordan')).toBe('Jordan');
    expect(lastName('Nene')).toBe('Nene');
  });
});
