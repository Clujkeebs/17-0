import { describe, expect, it } from 'vitest';
import { BUILD_TRAITS, benchOf, bestBuild, hoopsBuildPlayer, norm } from '@/lib/minigames/college/build';
import { CFB_SKILLS, bestCfbBuild, cfbBench, cfbBuildPlayer } from '@/lib/minigames/college/games';
import type { NbaGameData, NSeason } from '@/lib/minigames/nba/data';
import type { CfbData, CfbLine } from '@/lib/minigames/college/data';

const season = (t: number, year: number, i: number): NSeason => ({
  key: `h${t}:${year}:${i}`, playerId: t * 1000 + year * 10 + i, name: `Hooper ${t}-${year}-${i}`, position: 'G', img: null, teamId: t, season: year, seasonLabel: `${year - 1}-${String(year).slice(2)}`,
  team: `T${t}`, teamName: `Team ${t}`, teamColor: '#336699', logoUrl: null, gp: 30, mpg: 28,
  ppg: 6 + ((t * 7 + i * 5 + year) % 19), rpg: 2 + ((t + i * 3) % 9), apg: 1 + ((t * 2 + i) % 7), spg: 0.5 + ((i + t) % 4) * 0.4, bpg: 0.2 + ((i * 2 + t) % 5) * 0.4, value: 60 + i * 3 + (t % 4),
});
const hoops: NbaGameData = { rated: [], seasons: Array.from({ length: 12 }, (_, t) => [2019, 2021, 2023].flatMap((y) => Array.from({ length: 8 }, (_, i) => season(t + 1, y, i)))).flat() };

describe('Build a Player: college basketball', () => {
  const g = hoopsBuildPlayer({ slug: 'cbb-build-a-player', sport: 'cbb', league: "men's college basketball", name: 'Build a Player: College Hoops', tagline: 'x' });
  it('deals five programs with six players each, the same every time for one seed', () => {
    const a = g.generate('seed-1', hoops), b = g.generate('seed-1', hoops), c = g.generate('seed-2', hoops);
    expect(a.rounds).toHaveLength(5);
    expect(a.rounds.every((r) => r.options.length === 6)).toBe(true);
    expect(new Set(a.rounds.map((r) => r.team.abbr)).size).toBe(5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });
  it('the public view hides nothing a player needs and nothing a cheater could use', () => {
    const view = g.publicView(g.generate('seed-1', hoops)) as { traits: unknown[]; rounds: { options: Record<string, unknown>[] }[] };
    expect(view.traits).toHaveLength(5);
    expect(Object.keys(view.rounds[0].options[0])).toEqual(expect.arrayContaining(['name', 'ppg', 'rpg', 'apg', 'spg', 'bpg']));
    expect(JSON.stringify(view)).not.toContain('bench');
  });
  it('the best build scores a perfect, and nothing beats it', () => {
    const p = g.generate('seed-3', hoops);
    const best = bestBuild(p.rounds, p.bench);
    const top = g.score(p, best.picks);
    expect(top.perfect).toBe(true);
    // Every way of dealing the five skills to the five programs, with the best player for each, is at most the best.
    const traits = BUILD_TRAITS.map((t) => t.key);
    const shuffles = [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [2, 0, 4, 1, 3], [1, 2, 3, 4, 0]];
    for (const order of shuffles) {
      const answer = order.map((t, i) => ({ pick: (i * 2) % 6, trait: traits[t] }));
      expect(g.score(p, answer).score).toBeLessThanOrEqual(top.score);
    }
  });
  it('scores against a star level taken from the data: a board of stars at everything is about 100', () => {
    const bench = benchOf(hoops);
    const star = season(1, 2023, 0);
    const o = { ...star, ppg: bench.ppg, rpg: bench.rpg, apg: bench.apg, spg: bench.spg, bpg: bench.bpg };
    for (const t of BUILD_TRAITS) expect(norm(o, t.key, bench)).toBeCloseTo(1, 10);
  });
  it('refuses a half-made build', () => {
    const p = g.generate('seed-4', hoops);
    const ok = BUILD_TRAITS.map((t, i) => ({ pick: 0, trait: t.key, i }));
    expect(() => g.score(p, ok.slice(0, 4))).toThrow(/every program/);
    expect(() => g.score(p, ok.map((a) => ({ pick: a.pick, trait: BUILD_TRAITS[0].key })))).toThrow(/each skill once/);
    expect(() => g.score(p, ok.map((a) => ({ pick: 9, trait: a.trait })))).toThrow(/Pick a player/);
  });
  it('says the data is loading when there are not five programs', () => {
    expect(() => g.generate('x', { rated: [], seasons: hoops.seasons.filter((s) => s.teamId <= 3) })).toThrow(/still loading/);
  });
});

const cats = CFB_SKILLS.map((s) => s.key);
const cfbLine = (team: number, year: number, c: number): CfbLine => ({
  key: `cfb${team}:${year}:${cats[c]}`, playerId: team * 100000 + year * 10 + c, name: `Star ${cats[c]} ${team}-${year}`, position: 'X', img: null, teamId: team, season: year, team: `S${team}`, teamName: `School ${team}`, teamColor: '#112233', logoUrl: null,
  category: cats[c], value: [3200, 1400, 1100, 11, 6, 120][c] * (0.6 + ((team * 3 + year + c) % 9) / 12), display: null, rank: 1,
});
const cfb: CfbData = { lines: Array.from({ length: 9 }, (_, t) => [2018, 2019, 2021].flatMap((y) => cats.map((_, c) => cfbLine(t + 1, y, c)))).flat() };

describe('Build a Player: college football', () => {
  it('deals five schools, each offering all six skills in a fixed order', () => {
    const p = cfbBuildPlayer.generate('s1', cfb);
    expect(p.rounds).toHaveLength(5);
    expect(new Set(p.rounds.map((r) => r.school.abbr)).size).toBe(5);
    for (const r of p.rounds) expect(r.options.map((o) => o.category)).toEqual(cats);
    expect(JSON.stringify(p)).toBe(JSON.stringify(cfbBuildPlayer.generate('s1', cfb)));
  });
  it('the best build is perfect and no five different skills beat it', () => {
    const p = cfbBuildPlayer.generate('s2', cfb);
    const best = bestCfbBuild(p.rounds, p.bench);
    expect(cfbBuildPlayer.score(p, best.picks).perfect).toBe(true);
    for (const a of [[0, 1, 2, 3, 4], [5, 4, 3, 2, 1], [1, 0, 5, 3, 2]]) expect(cfbBuildPlayer.score(p, a).score).toBeLessThanOrEqual(cfbBuildPlayer.score(p, best.picks).score);
  });
  it('a star level comes from the data', () => {
    const b = cfbBench(cfb);
    for (const c of cats) expect(b[c]).toBeGreaterThan(0);
    expect(b.passingYards).toBeGreaterThan(b.rushingYards);
  });
  it('wants five different skills', () => {
    const p = cfbBuildPlayer.generate('s3', cfb);
    expect(() => cfbBuildPlayer.score(p, [0, 1, 2, 3])).toThrow(/every team/);
    expect(() => cfbBuildPlayer.score(p, [0, 0, 1, 2, 3])).toThrow(/different skills/);
    expect(() => cfbBuildPlayer.score(p, [0, 1, 2, 3, 9])).toThrow(/different skills/);
  });
  it('says the stats are loading when fewer than five schools have a full set', () => {
    expect(() => cfbBuildPlayer.generate('x', { lines: cfb.lines.filter((l) => l.teamId <= 3) })).toThrow(/still loading/);
  });
});
