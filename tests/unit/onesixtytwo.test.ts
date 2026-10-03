import { describe, expect, it } from 'vitest';
import { batValue, gradeMlbRoster, kindOf, mlbFit, pitchValue, MLB_SLOTS, type MlbPick } from '@/lib/game/onesixtytwo';
import { batLine, innings, leagueNorms, pitchLine } from '@/lib/server/mlb-sync';

const lg = { ops: 0.75, era: 4.2 };

describe('162-0 engine', () => {
  it('values hitters against the league: a great season is high, an average one middling', () => {
    const star = batValue({ pa: 680, ops: 1.05, hr: 50, sb: 10, avg: 0.32, obp: 0.44, slg: 0.61, rbi: 130 }, lg, 'RF');
    const avg = batValue({ pa: 550, ops: 0.75, hr: 18, sb: 5, avg: 0.26, obp: 0.33, slg: 0.42, rbi: 70 }, lg, 'RF');
    expect(star).toBeGreaterThan(95);
    expect(avg).toBeGreaterThan(68); expect(avg).toBeLessThan(78);
    // The same bat is worth more at shortstop than at DH.
    expect(batValue({ pa: 600, ops: 0.8, hr: 20, sb: 5, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 }, lg, 'SS'))
      .toBeGreaterThan(batValue({ pa: 600, ops: 0.8, hr: 20, sb: 5, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 }, lg, 'DH'));
  });

  it('values pitchers on ERA against the league, innings and strikeouts', () => {
    const ace = pitchValue({ gs: 33, g: 33, ip: 230, era: 2.1, so: 260, sv: 0, w: 20, whip: 0.95 }, lg, 'sp');
    const back = pitchValue({ gs: 30, g: 30, ip: 160, era: 4.9, so: 110, sv: 0, w: 8, whip: 1.45 }, lg, 'sp');
    const closer = pitchValue({ gs: 0, g: 65, ip: 70, era: 1.8, so: 90, sv: 42, w: 4, whip: 0.9 }, lg, 'rp');
    expect(ace).toBeGreaterThan(95); expect(back).toBeLessThan(70); expect(closer).toBeGreaterThan(85);
  });

  it('sorts seasons into hitters, starters and relievers, and skips cameos', () => {
    expect(kindOf(null, { gs: 30, g: 30, ip: 190, era: 3, so: 180, sv: 0, w: 14, whip: 1.1 })).toBe('sp');
    expect(kindOf(null, { gs: 0, g: 60, ip: 62, era: 2.5, so: 70, sv: 30, w: 3, whip: 1 })).toBe('rp');
    expect(kindOf({ pa: 600, ops: 0.8, hr: 20, sb: 3, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 }, null)).toBe('bat');
    expect(kindOf({ pa: 90, ops: 0.6, hr: 1, sb: 0, avg: 0.2, obp: 0.25, slg: 0.3, rbi: 8 }, null)).toBeNull();
  });

  it('charges for playing out of position and never lets hitters pitch', () => {
    expect(mlbFit('SS', 'bat', 'SS')).toBe(1);
    expect(mlbFit('SS', 'bat', '2B')).toBeGreaterThan(mlbFit('1B', 'bat', 'SS'));
    expect(mlbFit('CF', 'bat', 'RF')).toBeGreaterThan(0.95);
    expect(mlbFit('C', 'bat', 'SS')).toBe(0.75);
    expect(mlbFit('RF', 'bat', 'SP')).toBe(0);
    expect(mlbFit('SP', 'sp', 'LF')).toBe(0);
    expect(mlbFit('SP', 'sp', 'RP')).toBe(0.9);
  });

  it('grades a full roster deterministically; better rosters win more', () => {
    const mk = (v: number): MlbPick[] => MLB_SLOTS.map((slot, i) => ({ slot, name: `P${i}`, position: slot === 'SP' ? 'SP' : slot === 'RP' ? 'RP' : slot, kind: slot === 'SP' ? 'sp' : slot === 'RP' ? 'rp' : 'bat', teamId: i, season: 2000, value: v }));
    expect(gradeMlbRoster('s', mk(80))).toEqual(gradeMlbRoster('s', mk(80)));
    expect(gradeMlbRoster('s', mk(90)).wins).toBeGreaterThan(gradeMlbRoster('s', mk(75)).wins);
    expect(gradeMlbRoster('s', mk(99), 60).wins).toBe(162);
  });

  it('reads Stats API lines and league norms', () => {
    expect(innings('123.1')).toBeCloseTo(123.333, 2);
    expect(batLine({ plateAppearances: 694, ops: '.865', homeRuns: 19, stolenBases: 30, avg: '.324', obp: '.384', slg: '.481', rbi: 84 })!.ops).toBe(0.865);
    expect(pitchLine({ gamesStarted: 31, gamesPlayed: 31, inningsPitched: '207.2', era: '3.55', strikeOuts: 209, saves: 0, wins: 20, whip: '1.19' })!.ip).toBeCloseTo(207.667, 2);
    const n = leagueNorms([{ bat: { pa: 600, ops: 0.8, hr: 0, sb: 0, avg: 0, obp: 0, slg: 0, rbi: 0 }, pitch: null }, { bat: { pa: 200, ops: 0.6, hr: 0, sb: 0, avg: 0, obp: 0, slg: 0, rbi: 0 }, pitch: { gs: 0, g: 10, ip: 90, era: 3, so: 0, sv: 0, w: 0, whip: 1 } }]);
    expect(n.ops).toBeCloseTo(0.75, 3); expect(n.era).toBeCloseTo(3, 3);
  });
});
