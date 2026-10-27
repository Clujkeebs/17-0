import { describe, expect, it } from 'vitest';
import { buildProfiles, coachReport, rankAmong, teamReport, type PlayerLite } from '@/lib/seo/league';

// Three small teams: team 1 has the best quarterback and the weakest line, team 3 is the reverse.
const mk = (teamId: number, rows: [string, string, number][]): PlayerLite[] => rows.map(([position, name, overallRating], i) => ({ teamId, position, fullName: name, slug: `${name.toLowerCase().replace(/\s/g, '-')}-${i}`, overallRating }));
const league: PlayerLite[] = [
  ...mk(1, [['QB', 'Ann Arm', 95], ['RB', 'Bo Back', 80], ['WR', 'Cy Catch', 85], ['WR', 'Di Deep', 82], ['WR', 'Ed Edge', 79], ['TE', 'Fay Flex', 76], ['LT', 'Gus Guard', 70], ['LG', 'Hal Hog', 69], ['C', 'Ian Iron', 68], ['RG', 'Jay Jam', 67], ['RT', 'Kit Kick', 66]]),
  ...mk(2, [['QB', 'Lee Long', 85], ['RB', 'Max Mule', 88], ['WR', 'Ned Net', 84], ['WR', 'Oz Open', 80], ['WR', 'Pat Pass', 78], ['TE', 'Quin Quick', 83], ['LT', 'Ray Rock', 80], ['LG', 'Sam Slab', 79], ['C', 'Tom Tank', 78], ['RG', 'Uli Unit', 77], ['RT', 'Vic Vault', 76]]),
  ...mk(3, [['QB', 'Wes Wing', 78], ['RB', 'Xan Xtra', 75], ['WR', 'Yul Yard', 77], ['WR', 'Zed Zone', 74], ['WR', 'Abe Able', 72], ['TE', 'Bea Bold', 70], ['LT', 'Cal Cliff', 90], ['LG', 'Don Dome', 89], ['C', 'Eli Elm', 88], ['RG', 'Fin Fort', 87], ['RT', 'Gil Gate', 86]]),
];

describe('team reports', () => {
  const profiles = buildProfiles(league);
  it('rates a unit by its starters and ranks it across the league', () => {
    expect(profiles.get(1)!.units.QB).toBe(95);
    expect(profiles.get(1)!.units.OL).toBe(68); // (70 + 69 + 68 + 67 + 66) / 5
    expect(profiles.get(3)!.units.OL).toBe(88);
    expect(rankAmong([68, 78, 88], 68)).toBe(3);
  });
  it('says which unit is strongest and weakest and where a spin is worth the most', () => {
    const r = teamReport({ name: 'Arms', teamId: 1, profiles, coach: { fullName: 'Pat Coach', score: 90, rank: 4, of: 32 } })!;
    expect(r.unitsText).toContain('strongest unit is the quarterback group at 95.0, 1st of 3 teams');
    expect(r.unitsText).toContain('weakest is the offensive line group at 68.0, 3rd of 3');
    expect(r.playersText).toContain('Ann Arm (QB, 95)');
    expect(r.playersText).toMatch(/ and /);
    expect(r.playersText).toContain('Pat Coach grades 90, 4th of 32');
    expect(r.draftText).toContain('worth the most at QB');
    expect(r.draftText).toContain('30 percent of team strength');
    expect(r.overview).toContain('11 active players');
  });
  it('stays quiet when the data is too thin', () => {
    expect(teamReport({ name: 'X', teamId: 9, profiles })).toBeNull();
    expect(teamReport({ name: 'X', teamId: 1, profiles: buildProfiles(league.filter((p) => p.teamId === 1)) })).toBeNull();
  });
});

describe('coach reports', () => {
  const base = { name: 'Pat Coach', raw: 61.4, biggest: { label: 'Roster avg OVR', points: 26.3 }, currentScores: [80, 84, 88, 92, 97], isCurrent: true, teamName: 'Arms' };
  it('explains the raw score, the rank-scaled grade and what it is worth in 17-0', () => {
    const r = coachReport({ ...base, score: 92 });
    expect(r.paragraphs[0]).toContain('raw score of 61.4');
    expect(r.paragraphs[1]).toContain('ranks 2nd of 5 and grades 92 with the Arms');
    expect(r.paragraphs[2]).toContain('average current head coach grades 88.2');
    expect(r.paragraphs[2]).toContain('+0.34 points of team strength');
    expect(r.vsAverage).toBe(0.2);
  });
  it('treats a coach below the average as a cost, and a legend on the legend scale', () => {
    const low = coachReport({ ...base, score: 80, name: 'Low Coach' });
    expect(low.paragraphs[2]).toContain('-0.74 points of team strength');
    expect(low.paragraphs[2]).toContain('fewer than an average coach');
    const legend = coachReport({ ...base, score: 99, isCurrent: false, teamName: null, name: 'Old Legend' });
    expect(legend.paragraphs[1]).toContain('is a legend');
  });
});
