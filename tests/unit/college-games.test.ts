import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/game/prng';
import type { NbaGameData, NSeason } from '@/lib/minigames/nba/data';
import type { CfbData, CfbLine } from '@/lib/minigames/college/data';
import { CFB_CATEGORIES, cbbBlindResume, cbbHigherLower, cbbWhoLed, cbbWhoseTeam, cfbBlindResume, cfbHigherLower, cfbWhoLed, cfbWhoseTeam, collegeGames, wcbbHigherLower } from '@/lib/minigames/college/games';

/** Twenty schools, six seasons, every stored category, with a made-up spread of numbers and unique players. */
function footballData(): CfbData {
  const rng = createRng('cfb-fixture');
  const lines: CfbLine[] = [];
  let pid = 1;
  const caps: Record<string, number> = { passingYards: 3, rushingYards: 4, receivingYards: 5, sacks: 3, interceptions: 3, totalTackles: 4 };
  for (let t = 1; t <= 20; t++) for (let season = 2018; season <= 2023; season++) for (const [category, cap] of Object.entries(caps)) {
    const top = CFB_CATEGORIES[category].min * (1.3 + rng.next() * 0.5);
    for (let rank = 1; rank <= cap; rank++) {
      const value = Math.round((top * (1 - (rank - 1) * 0.17) + rng.next() * 3) * 10) / 10;
      lines.push({ key: `cfb${pid}:${season}:${category}`, playerId: pid++, name: `Test ${category} ${t}-${season}-${rank}`, position: 'RB', img: null, teamId: 100 + t, season, team: `T${t}`, teamName: `Test School ${t}`,
        teamColor: '#336699', logoUrl: null, category, value, display: category.endsWith('Yards') ? `${Math.round(value / 5)} ATT, ${Math.round(value)} YDS, 5 TD` : String(value), rank });
    }
  }
  return { lines };
}
function hoopsData(): NbaGameData {
  const rng = createRng('hoops-fixture');
  const seasons: NSeason[] = [];
  let pid = 1;
  for (let t = 1; t <= 24; t++) for (const season of [2016, 2018, 2020, 2022, 2024]) for (let i = 0; i < 8; i++) {
    const ppg = 6 + (8 - i) * 2 + rng.next() * 2;
    seasons.push({ key: `c${pid}:${t}:${season}`, playerId: pid++, name: `Test Hooper ${t}-${season}-${i}`, position: 'G', img: null, teamId: t, season, seasonLabel: `${season - 1}-${String(season % 100).padStart(2, '0')}`,
      team: `H${t}`, teamName: `Test Hoops ${t}`, teamColor: '#884422', logoUrl: null, gp: 30, mpg: 28, ppg, rpg: 3 + rng.next() * 5, apg: 2 + rng.next() * 3, spg: 1, bpg: 0.5, value: 60 + (8 - i) * 4 + rng.next() * 3 });
  }
  return { seasons, rated: [] };
}

describe('college football games', () => {
  const data = footballData();
  const games = [cfbHigherLower, cfbBlindResume, cfbWhoLed, cfbWhoseTeam];

  it('every game builds a full puzzle for many seeds, and the same seed gives the same one', () => {
    for (const g of games) {
      for (let i = 0; i < 12; i++) {
        const p = g.generate(`s${i}`, data) as { rounds: unknown[] };
        expect(p.rounds.length, `${g.slug} ${i}`).toBe(g.slug.endsWith('higher-lower') ? 10 : 6);
      }
      expect(g.generate('same', data)).toEqual(g.generate('same', data));
    }
  });
  it('public views never carry the stat being asked about', () => {
    const hl = cfbHigherLower.publicView(cfbHigherLower.generate('v', data)) as { rounds: { a: object; b: object }[] };
    for (const r of hl.rounds) for (const c of [r.a, r.b]) expect(Object.keys(c).sort()).toEqual(['id', 'img', 'logoUrl', 'name', 'position', 'team', 'teamColor', 'teamName']);
    const wl = cfbWhoLed.publicView(cfbWhoLed.generate('v', data)) as { rounds: { options: { name: string }[] }[] };
    for (const r of wl.rounds) expect(JSON.stringify(r)).not.toMatch(/YDS|ATT/);
  });
  it('scores every round: the right pick is worth a point, a wrong one nothing', () => {
    for (const g of games.filter((x) => !x.slug.endsWith('higher-lower'))) {
      const p = g.generate('score', data) as { rounds: { correct: number; options: unknown[] }[] };
      const all = p.rounds.map((r) => r.correct);
      expect(g.score(p as never, all as never).score, g.slug).toBe(6);
      expect(g.score(p as never, p.rounds.map((r) => (r.correct + 1) % r.options.length) as never).score, g.slug).toBe(0);
      expect(() => g.score(p as never, all.slice(1) as never)).toThrow();
    }
    const hl = cfbHigherLower.generate('hl', data);
    const right = hl.rounds.map((r) => (r.a.value > r.b.value ? 'a' : 'b'));
    expect(cfbHigherLower.score(hl, right).score).toBe(10);
    expect(cfbHigherLower.score(hl, right.map((x) => (x === 'a' ? 'b' : 'a'))).score).toBeLessThan(10);
  });
  it('Who Led? answers with the leader and offers only teammates of that team and stat', () => {
    const p = cfbWhoLed.generate('wl', data);
    for (const r of p.rounds) {
      expect(r.options).toHaveLength(4);
      const teams = new Set(r.options.map((o) => o.teamName));
      expect(teams.size).toBe(1);
      expect(r.notes.every((n) => n.length > 0)).toBe(true);
      const winner = r.options[r.correct];
      expect(winner.name).toMatch(/-1$/); // rank 1 in the fixture's naming
    }
  });
  it('Whose Team? names the school the player was at', () => {
    const p = cfbWhoseTeam.generate('wt', data);
    for (const r of p.rounds) {
      expect(new Set(r.options.map((o) => o.name)).size).toBe(4);
      const who = /Test \w+ (\d+)-(\d+)-/.exec(r.prompt.replace('Which school did ', '').replace(/ play for.*/, ''));
      expect(who).toBeTruthy();
      expect(r.options[r.correct].name).toBe(`Test School ${who![1]}`);
    }
  });
});

describe('college basketball games', () => {
  const data = hoopsData();
  it('build and score on college data', () => {
    for (const g of [cbbHigherLower, cbbBlindResume, cbbWhoLed, cbbWhoseTeam, wcbbHigherLower]) {
      const p = g.generate('hoops', data) as { rounds: unknown[] };
      expect(p.rounds.length, g.slug).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('registration', () => {
  it('twelve games, unique slugs, each named for its league', () => {
    expect(collegeGames).toHaveLength(12);
    expect(new Set(collegeGames.map((g) => g.slug)).size).toBe(12);
    expect(collegeGames.filter((g) => g.sport === 'cfb')).toHaveLength(4);
    expect(collegeGames.filter((g) => g.sport === 'cbb')).toHaveLength(4);
    expect(collegeGames.filter((g) => g.sport === 'wcbb')).toHaveLength(4);
    expect(collegeGames.filter((g) => g.name.includes("Women's"))).toHaveLength(4);
  });
});
