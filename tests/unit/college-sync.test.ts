import { describe, expect, it } from 'vitest';
import { FOOTBALL_CATEGORIES, MBB_PROGRAMS, WBB_PROGRAMS, latestCollegeSeason, parseFootballLeaders, parseScorers } from '@/lib/server/college-sync';

const athlete = (id: number) => ({ $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2025/athletes/${id}?lang=en&region=us` });
const leader = (id: number, value: number, displayValue: string) => ({ athlete: athlete(id), value, displayValue, team: { $ref: 'http://x/teams/333?lang=en' } });

describe('college football leaders', () => {
  const feed = {
    categories: [
      { name: 'passingYards', leaders: [leader(1, 3268, '275/428, 3268 YDS, 26 TD, 5 INT'), leader(2, 410, '30/52, 410 YDS, 3 TD, 1 INT'), leader(3, 12, '1/2, 12 YDS, 0 TD, 0 INT')] },
      { name: 'rushingYards', leaders: [leader(4, 1347, '251 CAR, 1347 YDS, 12 TD'), leader(5, 900, '170 CAR, 900 YDS, 7 TD'), leader(6, 600, '120 CAR, 600 YDS, 5 TD'), leader(7, 80, '20 CAR, 80 YDS, 0 TD')] },
      { name: 'sacks', leaders: [leader(8, 11.5, '11.5')] },
      { name: 'quarterbackRating', leaders: [leader(1, 160.2, '160.2')] },     // not kept
    ],
  };
  it('keeps only the wanted categories, the top few of each, in ESPN order', () => {
    const rows = parseFootballLeaders(feed);
    expect(rows.filter((r) => r.category === 'passingYards').map((r) => r.playerId)).toEqual([1, 2, 3]);   // three passers
    expect(rows.filter((r) => r.category === 'rushingYards').map((r) => r.playerId)).toEqual([4, 5, 6, 7]); // four rushers
    expect(rows.map((r) => r.category)).not.toContain('quarterbackRating');
    expect(rows.find((r) => r.playerId === 1)).toEqual({ category: 'passingYards', rank: 1, playerId: 1, value: 3268, display: '275/428, 3268 YDS, 26 TD, 5 INT' });
    expect(rows.find((r) => r.category === 'sacks')).toMatchObject({ value: 11.5, rank: 1 });
  });
  it('shrugs off empty or malformed feeds', () => {
    expect(parseFootballLeaders(null)).toEqual([]);
    expect(parseFootballLeaders({})).toEqual([]);
    expect(parseFootballLeaders({ categories: [{ name: 'rushingYards', leaders: [{ athlete: { $ref: 'nope' }, value: 3 }, { athlete: athlete(9), value: 'x' }, leader(10, 5, '5')] }] }).map((r) => r.playerId)).toEqual([10]);
  });
  it('every kept category is capped small enough to stay cheap', () => {
    for (const n of Object.values(FOOTBALL_CATEGORIES)) expect(n).toBeLessThanOrEqual(5);
  });
});

describe('college basketball scorers', () => {
  it('takes the scoring leaders in order and no more than eight', () => {
    const lead = (id: number) => ({ athlete: { $ref: `http://x/athletes/${id}?lang=en` }, value: 20 - id });
    const feed = { categories: [{ name: 'assistsPerGame', leaders: [lead(99)] }, { name: 'pointsPerGame', leaders: Array.from({ length: 12 }, (_, i) => lead(i + 1)) }] };
    expect(parseScorers(feed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parseScorers(null)).toEqual([]);
    expect(parseScorers({ categories: [{ name: 'pointsPerGame', leaders: [{ athlete: { $ref: 'bad' } }] }] })).toEqual([]);
  });
});

describe('seasons and programs', () => {
  it('names football seasons by start year and basketball by end year', () => {
    expect(latestCollegeSeason('cfb', new Date('2026-10-12T12:00:00Z'))).toBe(2026);
    expect(latestCollegeSeason('cfb', new Date('2027-01-20T12:00:00Z'))).toBe(2026);
    expect(latestCollegeSeason('cfb', new Date('2026-07-15T12:00:00Z'))).toBe(2025);
    expect(latestCollegeSeason('mbb', new Date('2026-10-12T12:00:00Z'))).toBe(2026);
    expect(latestCollegeSeason('mbb', new Date('2026-11-20T12:00:00Z'))).toBe(2027);
    expect(latestCollegeSeason('wbb', new Date('2027-03-01T12:00:00Z'))).toBe(2027);
  });
  it('program lists have no duplicates', () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const list of [MBB_PROGRAMS, WBB_PROGRAMS]) expect(new Set(list.map(norm)).size).toBe(list.length);
  });
});
