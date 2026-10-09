import { describe, expect, it } from 'vitest';
import { bestLine, builtLine, soccerBuildPlayer } from '@/lib/minigames/soccer/games';
import type { SLeader } from '@/lib/minigames/soccer/data';

const L = (playerId: number, club: string, goals: number, assists: number, matches: number): SLeader => ({
  key: `${playerId}`, playerId, name: `P${playerId}`, league: 'eng.1', season: 2025, seasonLabel: '2025-26', goals, assists, matches,
  club, clubAbbr: club, clubColor: '#000', clubLogo: null, img: '' });
const rounds = [
  { club: L(1, 'A', 0, 0, 0), options: [L(1, 'A', 30, 2, 30), L(2, 'A', 5, 1, 38)] },
  { club: L(3, 'B', 0, 0, 0), options: [L(3, 'B', 4, 15, 30), L(4, 'B', 2, 1, 20)] },
  { club: L(5, 'C', 0, 0, 0), options: [L(5, 'C', 1, 1, 38), L(6, 'C', 3, 3, 10)] },
];

describe('Build a Soccer Player', () => {
  it('adds up rates over the fit player\'s matches', () => {
    const l = builtLine(rounds, [{ pick: 0, trait: 'finishing' }, { pick: 0, trait: 'playmaking' }, { pick: 0, trait: 'fitness' }]);
    expect(l.matches).toBe(38);
    expect(l.goals).toBe(38);   // 1 goal a match over 38
    expect(l.assists).toBe(19); // 0.5 a match over 38
  });
  it('the best build is at least as good as any build', () => {
    const best = bestLine(rounds);
    const mine = builtLine(rounds, [{ pick: 1, trait: 'fitness' }, { pick: 0, trait: 'playmaking' }, { pick: 1, trait: 'finishing' }]);
    expect(best.total).toBeGreaterThanOrEqual(mine.total);
    expect(best.total).toBe(57);
  });
  it('refuses a trait used twice', () => {
    expect(() => soccerBuildPlayer.score({ rounds }, [{ pick: 0, trait: 'finishing' }, { pick: 0, trait: 'finishing' }, { pick: 0, trait: 'fitness' }])).toThrow(/each trait/i);
  });
});
