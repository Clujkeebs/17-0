import { describe, expect, it } from 'vitest';
import {
  POSITIONS, ROSTER_MAX, SHAPE, autoPick, draftPick, expiring, finishWeek, myGame, myTeam, newLeague, onTheClock, payroll, ratingsOf,
  release, resign, simPlayoffs, sign, startOffseason, startSeason, toDraft, train, upgradeFacility, type League, type Pos, type SeedPlayer, type SeedTeam,
} from '@/lib/game/bowl-franchise';
import { createRng } from '@/lib/game/prng';

function seedData() {
  const rng = createRng('fixture');
  const teams: SeedTeam[] = [];
  const players: SeedPlayer[] = [];
  for (const conf of ['AFC', 'NFC']) for (const d of ['East', 'North', 'South', 'West']) for (let i = 0; i < 4; i++) {
    const abbr = `${conf[0]}${d[0]}${i}`;
    teams.push({ abbr, name: `Team ${abbr}`, city: 'City', color: '#123456', logo: null, conf, div: `${conf} ${d}` });
    for (const p of POSITIONS) for (let k = 0; k < SHAPE[p as Pos] + 1; k++) {
      const o = 60 + rng.int(0, 35);
      players.push({ id: `${abbr}-${p}-${k}`, n: `${p} ${abbr} ${k}`, p: p as Pos, o, age: 22 + rng.int(0, 12), num: k, img: null, a: {}, t: abbr });
    }
  }
  return { teams, players };
}

function playSeason(L: League): League {
  let guard = 0;
  while (L.phase === 'season' || L.phase === 'playoffs') {
    if (L.press) L = { ...L, press: null };
    if (L.phase === 'playoffs' && !myGame(L)) { L = simPlayoffs(L); break; }
    const g = myGame(L);
    // Alternate a "played" result with simulated ones.
    L = finishWeek(L, g && L.week % 2 ? { pf: 21, pa: 14 } : null);
    if (++guard > 40) throw new Error('season did not end');
  }
  return L;
}

describe('Unbeaten Bowl GM mode', () => {
  const { teams, players } = seedData();

  it('builds a league with an NFL-style 17-game schedule and a bye', () => {
    const L = newLeague('t1', teams, players, 'AE0', 'Coach Test');
    expect(L.teams).toHaveLength(32);
    expect(L.sched.length).toBe(18);
    const count = new Map<string, number>();
    const pairs = new Map<string, number>();
    for (const w of L.sched) {
      const seen = new Set<string>();
      for (const m of w) {
        for (const t of [m.h, m.a]) { expect(seen.has(t)).toBe(false); seen.add(t); count.set(t, (count.get(t) ?? 0) + 1); }
        const k = [m.h, m.a].sort().join('-'); pairs.set(k, (pairs.get(k) ?? 0) + 1);
      }
    }
    for (const t of L.teams) expect(count.get(t.abbr)).toBe(17);
    // Division rivals meet twice.
    expect(pairs.get(['AE0', 'AE1'].sort().join('-'))).toBe(2);
    expect(payroll(myTeam(L))).toBeGreaterThan(0);
    expect(ratingsOf(L, myTeam(L)).qb.name).toBeTruthy();
  });

  it('can always field a team, even when injuries leave a position short', () => {
    const L = newLeague('inj', teams, players, 'AE0', 'Coach');
    const t = myTeam(L);
    // Everyone hurt except one receiver; the only QB, TE and kicker out too.
    for (const p of t.roster) if (['WR', 'QB', 'TE', 'K', 'RB', 'CB'].includes(p.p)) p.inj = 3;
    t.roster.find((p) => p.p === 'WR')!.inj = 0;
    const r = ratingsOf(L, t);
    expect(r.targets).toHaveLength(3);
    expect(r.qb.name).toBeTruthy();
    expect(r.k.name).toBeTruthy();
  });

  it('plays seasons, playoffs, re-signing, the draft and free agency, year after year', () => {
    let L = newLeague('t2', teams, players, 'NW3', 'Coach');
    L = { ...L, cc: 200 };
    L = upgradeFacility(L, 'train');
    const qb = myTeam(L).roster.find((p) => p.p === 'QB')!;
    L = train(L, qb.id);
    expect(() => train(L, qb.id)).toThrow(/already trained/);
    for (let season = 0; season < 3; season++) {
      L = playSeason(L);
      expect(L.phase).toBe('recap');
      expect(L.hist[0].champ).toBeTruthy();
      const games = L.teams.reduce((s, t) => s + t.w + t.l + t.t, 0);
      expect(games).toBe(17 * 32);
      L = startOffseason(L);
      expect(L.phase).toBe('resign');
      const ex = expiring(L);
      if (ex[0]) { try { L = resign(L, ex[0].id); } catch { /* cap */ } }
      L = toDraft(L);
      expect(L.phase).toBe('draft');
      while (L.phase === 'draft') {
        expect(onTheClock(L)).toBe(L.you);
        const first = L.draft!.pool[0];
        L = season % 2 ? autoPick(L) : draftPick(L, first.id);
      }
      expect(L.phase).toBe('fa');
      expect(L.draft!.log.length).toBe(32 * 3);
      const before = myTeam(L).roster.length;
      const cheap = L.fa.filter((p) => p.sal < 2)[0];
      if (cheap && before < ROSTER_MAX) { L = sign(L, cheap.id); expect(myTeam(L).roster.length).toBe(before + 1); }
      while (myTeam(L).roster.length > ROSTER_MAX) L = release(L, [...myTeam(L).roster].sort((a, b) => a.o - b.o).find((p) => myTeam(L).roster.filter((x) => x.p === p.p).length > 2)!.id);
      L = startSeason(L);
      expect(L.phase).toBe('season');
      for (const t of L.teams) {
        expect(t.w + t.l + t.t).toBe(0);
        expect(() => ratingsOf(L, t)).not.toThrow();
        expect(t.roster.length).toBeLessThanOrEqual(ROSTER_MAX + 4);
      }
    }
    expect(L.hist).toHaveLength(3);
    // A save stays small enough for the browser and the account.
    expect(JSON.stringify(L).length).toBeLessThan(450_000);
  });
});
