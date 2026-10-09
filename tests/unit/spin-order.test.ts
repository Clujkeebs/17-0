import { describe, expect, it } from 'vitest';
import { firstAllowed, spinKey } from '@/lib/game/spin-order';

const teams = Array.from({ length: 30 }, (_, i) => i + 1);

describe('re-spins that match for everybody', () => {
  it('the same seed, round and re-spin number always land on the same team', () => {
    const k = spinKey('82', 'daily-2026-10-09', 2, 'team', 1);
    expect(firstAllowed(k, teams, () => true)).toBe(firstAllowed(k, teams, () => true));
  });
  it('a different re-spin number or round is a different spin', () => {
    const a = Array.from({ length: 8 }, (_, n) => firstAllowed(spinKey('82', 's', 0, 'team', n), teams, () => true));
    expect(new Set(a).size).toBeGreaterThan(1);
    expect(spinKey('82', 's', 0, 'team', 0)).not.toBe(spinKey('82', 's', 1, 'team', 0));
  });
  it('players who used different teams still agree unless the team is on their board', () => {
    const k = spinKey('17-0', 's', 3, 'team', 0);
    const first = firstAllowed(k, teams, () => true)!;
    // Another player has a different team already: same answer.
    const other = teams.find((t) => t !== first)!;
    expect(firstAllowed(k, teams, (t) => t !== other)).toBe(first);
    // Only a player who already has that team gets the next one in the same order.
    const second = firstAllowed(k, teams, (t) => t !== first)!;
    expect(second).not.toBe(first);
  });
  it('era and team re-spins are separate sequences', () => {
    expect(spinKey('82', 's', 0, 'era', 0)).not.toBe(spinKey('82', 's', 0, 'team', 0));
  });
});
