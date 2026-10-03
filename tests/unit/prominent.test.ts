import { describe, expect, it } from 'vitest';
import { FOOTBALL_STARS, starIds, topBy } from '@/lib/minigames/prominent';
import { higherLower } from '@/lib/minigames/games/higher-lower';
import { topOfLists } from '@/lib/minigames/soccer/games';
import type { GPlayer } from '@/lib/minigames/types';
import type { SLeader } from '@/lib/minigames/soccer/data';

describe('Higher or Lower uses known names only', () => {
  it('topBy and starIds keep the best by rank', () => {
    expect(topBy([3, 9, 1, 7], (x) => x, 2)).toEqual([9, 7]);
    const rows = [{ id: 1, v: 90 }, { id: 1, v: 60 }, { id: 2, v: 80 }, { id: 3, v: 70 }];
    expect([...starIds(rows, (r) => r.id, (r) => r.v, 2)].sort()).toEqual([1, 2]);
  });

  it('football: no linemen or kickers, only the top of each group, no repeats', () => {
    const groups = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K'] as const;
    const players: GPlayer[] = groups.flatMap((g) => Array.from({ length: 60 }, (_, i) => ({
      id: `${g}${i}`, name: `${g} ${i}`, slug: `${g}-${i}`, position: g, group: g, ovr: 99 - (i % 40), teamId: 1, team: 'T', teamName: 'Team', teamColor: '#000', logoUrl: null,
      conference: 'AFC', division: 'East', college: null, age: null, yearsPro: null, heightInches: null, weightLbs: null, jersey: null, archetype: null, img: null,
      attrs: { speed: 70 + (i % 25), strength: 70 + (i % 20), awareness: 70 + (i % 22), acceleration: 70 + (i % 24), jumping: 70 + (i % 21) },
    })));
    for (const seed of ['a', 'b', 'c']) {
      const { rounds } = higherLower.generate(seed, { players, teams: [] });
      const ids = rounds.flatMap((r) => [r.a.id, r.b.id]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const p of rounds.flatMap((r) => [r.a, r.b])) {
        expect(FOOTBALL_STARS[p.group]).toBeDefined();
        const rank = players.filter((q) => q.group === p.group && q.ovr > p.ovr).length;
        expect(rank).toBeLessThan(FOOTBALL_STARS[p.group]);
      }
    }
  });

  it('soccer: only the top of each league season list', () => {
    const leaders: SLeader[] = Array.from({ length: 50 }, (_, i) => ({ key: `k${i}`, playerId: i, name: `P${i}`, league: 'eng.1', season: 2025, seasonLabel: 'Premier League 2025-26', goals: 50 - i, assists: i % 3, matches: 30, club: '', clubAbbr: '', clubColor: '#000', clubLogo: null, img: '' }));
    const kept = topOfLists(leaders);
    expect(kept.length).toBeLessThanOrEqual(20);
    expect(kept.map((l) => l.playerId)).toContain(0);
    expect(kept.map((l) => l.playerId)).not.toContain(40);
  });
});
