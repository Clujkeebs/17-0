import { describe, expect, it } from 'vitest';
import { challengePayouts, CHALLENGE_POINTS } from '@/lib/server/challenges';
import { faceOff, recordOf, rosterLines, setupChips } from '@/lib/challenge-view';
import { createRng } from '@/lib/game/prng';
import { gradeMlbRoster } from '@/lib/game/onesixtytwo';

const base = { challengeId: 'abc', creatorId: 'c', creatorScore: 100, entrantId: 'e', entrantScore: 100, defendsSoFar: 0 };

describe('challenge payouts', () => {
  it('pays the entrant for beating the record', () => {
    expect(challengePayouts({ ...base, entrantScore: 101 })).toEqual([{ userId: 'e', amount: CHALLENGE_POINTS.win, reason: 'challenge-win', ref: 'abc:e' }]);
  });
  it('pays the creator for a defense, up to the cap', () => {
    expect(challengePayouts({ ...base, entrantScore: 99 })).toEqual([{ userId: 'c', amount: CHALLENGE_POINTS.defend, reason: 'challenge-defend', ref: 'abc:e' }]);
    expect(challengePayouts({ ...base, entrantScore: 99, defendsSoFar: CHALLENGE_POINTS.defendCap })).toEqual([]);
  });
  it('pays nothing for a tie, for guests, or for playing your own challenge', () => {
    expect(challengePayouts(base)).toEqual([]);
    expect(challengePayouts({ ...base, entrantId: null, entrantScore: 200 })).toEqual([]);
    expect(challengePayouts({ ...base, creatorId: null, entrantScore: 200 })).toEqual([]);
    expect(challengePayouts({ ...base, entrantId: 'c', entrantScore: 200 })).toEqual([]);
  });
});

describe('challenge view', () => {
  const a = { wins: 15, losses: 2, slots: [{ slot: 'QB', name: 'A One', grade: 90, letter: 'A' }, { slot: 'RB', name: 'A Two', grade: 70, letter: 'C' }] };
  const b = { wins: 13, losses: 4, slots: [{ slot: 'RB', name: 'B Two', grade: 80, letter: 'B' }, { slot: 'QB', name: 'B One', grade: 90, letter: 'A' }] };
  it('pairs rosters by slot and marks the edge', () => {
    const rows = faceOff(rosterLines(a), rosterLines(b));
    expect(rows.map((r) => [r.slot, r.b?.name, r.edge])).toEqual([['QB', 'B One', 'even'], ['RB', 'B Two', 'b']]);
  });
  it('survives junk', () => {
    expect(rosterLines(null)).toEqual([]);
    expect(rosterLines({ slots: 'x' })).toEqual([]);
    expect(recordOf(undefined)).toBe('0-0');
    expect(recordOf(a)).toBe('15-2');
  });
  it('describes the setup', () => {
    expect(setupChips('17-0', { format: '12', pool: 'all-time', hard: true })).toEqual(['12-man roster', 'All-time', 'Hard mode']);
    expect(setupChips('162-0', { mode: 'now', hard: false })).toEqual(['Right now']);
    expect(setupChips('82-0', { edition: 'standard' })).toEqual(['Standard (2K)']);
  });
});

describe('challenge fairness', () => {
  it('the same seed draws the same sequence', () => {
    const a = createRng('162:seed:3:1:0'), b = createRng('162:seed:3:1:0');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it('identical rosters graded from the roster seed get identical records', () => {
    const picks = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'].map((slot, i) => ({ slot: slot as never, name: `P${i}`, position: slot, kind: (slot === 'SP' ? 'sp' : slot === 'RP' ? 'rp' : 'bat') as never, teamId: 1, season: 2000, value: 70 + i }));
    const seed = 'challenge-seed:1@C,2@1B';
    expect(gradeMlbRoster(seed, picks).wins).toBe(gradeMlbRoster(seed, picks).wins);
  });
});
