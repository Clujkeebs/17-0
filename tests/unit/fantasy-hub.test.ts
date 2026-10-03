import { describe, expect, it } from 'vitest';
import { rankPlayers, snakePicks, tradeVerdict, waiverTargets, type FPlayer } from '@/lib/fantasy/rank';

const mk = (id: string, pos: FPlayer['pos'], value: number, extra: Partial<FPlayer> = {}): FPlayer => ({ id, slug: id, name: id, pos, team: 'T', teamColor: '#000', logoUrl: null, img: null, value, recent: null, ppg: null, proj: null, games: 4, popularity: 10, trend: 0, ...extra });
const pool: FPlayer[] = [
  ...Array.from({ length: 20 }, (_, i) => mk(`qb${i}`, 'QB', 24 - i * 0.5)),
  ...Array.from({ length: 40 }, (_, i) => mk(`rb${i}`, 'RB', 22 - i * 0.45)),
  ...Array.from({ length: 40 }, (_, i) => mk(`wr${i}`, 'WR', 21 - i * 0.4)),
  ...Array.from({ length: 20 }, (_, i) => mk(`te${i}`, 'TE', 16 - i * 0.6)),
];

describe('fantasy hub math', () => {
  it('ranks by value over replacement, so a deep position does not flood the top', () => {
    const r = rankPlayers(pool, 12);
    expect(r[0].overall).toBe(1);
    const topQbs = r.slice(0, 12).filter((p) => p.pos === 'QB').length;
    expect(topQbs).toBeLessThan(6);
    expect(r.find((p) => p.id === 'rb0')!.posRank).toBe(1);
  });
  it('gives snake pick numbers', () => {
    expect(snakePicks(1, 12, 4)).toEqual([1, 24, 25, 48]);
    expect(snakePicks(12, 12, 3)).toEqual([12, 13, 36]);
    expect(snakePicks(5, 10, 2)).toEqual([5, 16]);
  });
  it('calls a lopsided trade and a fair one', () => {
    const r = rankPlayers(pool, 12);
    const star = r.find((p) => p.id === 'rb0')!, filler = r.filter((p) => p.pos === 'WR').slice(35, 37);
    expect(tradeVerdict(filler, [star]).verdict).toBe('You win it');
    expect(tradeVerdict([star], filler).verdict).toBe('You lose it');
    expect(tradeVerdict([star], [star]).verdict).toBe('Fair');
  });
  it('waiver targets skip widely rostered players', () => {
    const r = rankPlayers([...pool, mk('sleeper', 'WR', 12, { popularity: 400, trend: 900 })], 12);
    const w = waiverTargets(r);
    expect(w[0].id).toBe('sleeper');
    expect(w.every((p) => p.popularity == null || p.popularity > 150)).toBe(true);
  });
});
