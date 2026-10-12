import { describe, expect, it } from 'vitest';
import { BOWL_DRIVES, bowlMatchup, bowlScore, bowlTeam, fgChance, oppDrives } from '@/lib/game/bowl';

const roster = (teamId: number, base: number) => [
  ['QB', 'QB'], ['HB', 'RB'], ['WR', 'WR'], ['WR', 'WR'], ['TE', 'TE'], ['K', 'K'],
  ...Array.from({ length: 5 }, () => ['LT', 'OL']), ...Array.from({ length: 4 }, () => ['RE', 'EDGE']), ['CB', 'CB'], ['CB', 'CB'], ['FS', 'S'], ['SS', 'S'], ['MLB', 'LB'],
].map(([position, group], i) => ({ name: `P${teamId}-${i}`, position, group, ovr: base + (i % 5), teamId, jersey: i, attrs: { speed: base, catching: base, throwPower: base, kickPower: base, kickAccuracy: base } }));
const team = (id: number, abbr: string, base: number) => bowlTeam({ id, abbr, name: abbr, city: 'Test', color: '#123456', logoUrl: null }, roster(id, base))!;

describe('Unbeaten Bowl engine', () => {
  const teams = [team(1, 'AAA', 90), team(2, 'BBB', 70), team(3, 'CCC', 80)];
  it('builds a team from a real roster shape', () => {
    expect(teams[0].targets).toHaveLength(3);
    expect(teams[0].offense).toBeGreaterThan(teams[1].offense);
  });
  it('the same seed gives the same matchup and the same opponent drives, on server and client', () => {
    const m1 = bowlMatchup('mini:unbeaten-bowl:2026-10-12', teams), m2 = bowlMatchup('mini:unbeaten-bowl:2026-10-12', teams);
    expect(m1.you.abbr).toBe(m2.you.abbr);
    expect(m1.opp.abbr).not.toBe(m1.you.abbr);
    expect(oppDrives('s', m1.you, m1.opp)).toEqual(oppDrives('s', m1.you, m1.opp));
    expect(oppDrives('s', m1.you, m1.opp)).toHaveLength(BOWL_DRIVES);
  });
  it('a stronger defense allows fewer points over many games', () => {
    const pts = (you: typeof teams[number], opp: typeof teams[number]) => Array.from({ length: 300 }, (_, i) => oppDrives(`x${i}`, you, opp).reduce((s, d) => s + d.points, 0)).reduce((s, x) => s + x, 0);
    expect(pts(teams[0], teams[1])).toBeLessThan(pts(teams[1], teams[0]));
  });
  it('field goals get harder with distance and need a leg', () => {
    expect(fgChance(10, { power: 90, acc: 90 })).toBeGreaterThan(fgChance(35, { power: 90, acc: 90 }));
    expect(fgChance(50, { power: 60, acc: 90 })).toBe(0);
  });
  it('a win always outranks a loss', () => {
    expect(bowlScore(10, 7)).toBeGreaterThan(bowlScore(48, 49));
  });
});
