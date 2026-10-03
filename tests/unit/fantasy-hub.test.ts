import { describe, expect, it } from 'vitest';
import { balancers, evaluateTrade, EXTRA_WEIGHT, rankPlayers, tiers, replacementLevels, snakePicks, tradeVerdict, waiverTargets, type FPlayer } from '@/lib/fantasy/rank';

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

describe('trade calculator engine', () => {
  const mk2 = (id: string, pos: FPlayer['pos'], value: number) => ({ id, pos, value });
  const pool = [
    ...Array.from({ length: 40 }, (_, i) => mk2(`qb${i}`, 'QB' as const, 24 - i * 0.4)),
    ...Array.from({ length: 80 }, (_, i) => mk2(`rb${i}`, 'RB' as const, 22 - i * 0.2)),
    ...Array.from({ length: 80 }, (_, i) => mk2(`wr${i}`, 'WR' as const, 22 - i * 0.2)),
    ...Array.from({ length: 30 }, (_, i) => mk2(`te${i}`, 'TE' as const, 16 - i * 0.4)),
  ];
  it('superflex and bigger leagues raise the replacement bar', () => {
    const base = replacementLevels(pool, { teams: 12, superflex: false });
    expect(replacementLevels(pool, { teams: 12, superflex: true }).QB).toBeLessThan(base.QB);
    expect(replacementLevels(pool, { teams: 14, superflex: false }).RB).toBeLessThan(base.RB);
  });
  it('superflex makes the same QB worth more in a trade', () => {
    const qb = pool.find((p) => p.id === 'qb2')!, wr = pool.find((p) => p.id === 'wr8')!;
    const one = evaluateTrade([qb], [wr], replacementLevels(pool, { teams: 12, superflex: false }));
    const sf = evaluateTrade([qb], [wr], replacementLevels(pool, { teams: 12, superflex: true }));
    expect(sf.give).toBeGreaterThan(one.give);
  });
  it('extra players in the bigger package count at half', () => {
    const repl = replacementLevels(pool, { teams: 12, superflex: false });
    const e = evaluateTrade([pool[40]], [pool[130], pool[131]], repl);
    expect(e.getLines.map((l) => l.weight)).toEqual([1, EXTRA_WEIGHT]);
  });
  it('balancers suggest players that close the gap on the short side', () => {
    const repl = replacementLevels(pool, { teams: 12, superflex: false });
    const give = [pool.find((p) => p.id === 'rb0')!], get = [pool.find((p) => p.id === 'rb10')!];
    const before = evaluateTrade(give, get, repl);
    expect(before.verdict).toBe('You lose it');
    const fix = balancers(pool, give, get, repl)!;
    expect(fix.side).toBe('get');
    const after = evaluateTrade(give, [...get, fix.players[0]], repl);
    expect(Math.abs(after.diff)).toBeLessThan(Math.abs(before.diff));
    expect(balancers(pool, give, give, repl)).toBeNull();
  });
});

describe('cheat sheet tiers', () => {
  it('breaks only at clear drops', () => {
    expect(tiers([20, 19.8, 19.6, 17, 16.9, 16.8, 14, 13.9])).toEqual([1, 1, 1, 2, 2, 2, 3, 3]);
    expect(tiers([10, 9.9, 9.8, 9.7])).toEqual([1, 1, 1, 1]);
    expect(tiers([])).toEqual([]);
  });
});
