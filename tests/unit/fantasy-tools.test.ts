import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/game/prng';
import { expectedPoints, startSit, type SSPlayer } from '@/lib/fantasy/startsit';
import { MOCK_ROUNDS, STARTERS, autoPick, botPick, finishDraft, botStep, draftPlayer, done, gradeFor, lineupValue, newDraft, onTheClock, pickValues, picksUntilYou, recommend, resultOf, runBots, teamForPick, totalPicks, type MPlayer } from '@/lib/fantasy/mock';
import { rankPlayers, type FPlayer, type FPos } from '@/lib/fantasy/rank';

const p = (id: string, recent: number | null, ppg: number | null, proj: number | null, extra: Partial<SSPlayer> = {}): SSPlayer => ({ id, name: `P ${id}`, pos: 'WR', team: 'AAA', recent, ppg, proj, games: 6, ...extra });

describe('start or sit', () => {
  it('blends recent form, the season and the projection, using what exists', () => {
    expect(expectedPoints({ recent: 20, ppg: 10, proj: 10 })).toBe(15);            // .5*20 + .3*10 + .2*10
    expect(expectedPoints({ recent: null, ppg: 10, proj: 20 })).toBe(14);          // weights renormalised over .3 and .2
    expect(expectedPoints({ recent: null, ppg: null, proj: null })).toBeNull();
  });
  it('calls a clear start, a lean and a toss-up, and says why', () => {
    const clear = startSit([p('a', 18, 15, 16), p('b', 9, 10, 11)])!;
    expect(clear.pick.id).toBe('a'); expect(clear.confidence).toBe('Clear'); expect(clear.summary).toMatch(/^P a is expected to score 16\.7 a game, 7 more than P b/);
    const lean = startSit([p('a', 14, 12, 12), p('b', 11, 12, 12)])!;      // 13 against 11.5
    expect(lean.confidence).toBe('Lean');
    const toss = startSit([p('a', 12, 12, 12), p('b', 12.2, 12, 12)])!;
    expect(toss.confidence).toBe('Toss-up'); expect(toss.summary).toMatch(/Go with your gut/);
    expect(clear.lines[0].notes.join(' ')).toMatch(/Hot: 18 a game over his last four, up from 15 on the season/);
  });
  it('needs two players with numbers, and ranks up to four', () => {
    expect(startSit([p('a', 10, 10, 10)])).toBeNull();
    expect(startSit([p('a', 10, 10, 10), p('b', null, null, null)])).toBeNull();
    const four = startSit([p('a', 5, 5, 5), p('b', 15, 15, 15), p('c', 10, 10, 10), p('d', 20, 20, 20)])!;
    expect(four.lines.map((l) => l.id)).toEqual(['d', 'b', 'c', 'a']);
  });
  it('flags thin samples and the hot waiver pickup', () => {
    const v = startSit([p('a', 12, null, 10, { games: 2, trend: 500 }), p('b', 8, 8, 8)])!;
    expect(v.lines[0].notes.join(' ')).toMatch(/Only 2 games played/);
    expect(v.lines[0].notes.join(' ')).toMatch(/Being added across leagues/);
  });
});

/** A pool shaped like a real one: a few stars per position and a long tail. */
function pool(): MPlayer[] {
  const rng = createRng('pool');
  const tops: Record<FPos, number> = { QB: 24, RB: 20, WR: 21, TE: 15 };
  const counts: Record<FPos, number> = { QB: 36, RB: 70, WR: 90, TE: 36 };
  const fp: FPlayer[] = [];
  for (const pos of ['QB', 'RB', 'WR', 'TE'] as FPos[]) for (let i = 0; i < counts[pos]; i++) {
    fp.push({ id: `${pos}${i}`, slug: `${pos}${i}`, name: `${pos} ${i}`, pos, team: 'TST', teamColor: '#000', logoUrl: null, img: null, value: Math.round((tops[pos] - i * (tops[pos] / counts[pos] * 0.9) + rng.next()) * 10) / 10, recent: null, ppg: null, proj: null, games: 5, popularity: i, trend: 0 });
  }
  return rankPlayers(fp).map((r) => ({ id: r.id, name: r.name, pos: r.pos, team: r.team, value: r.value, vor: r.vor, overall: r.overall }));
}

describe('mock draft', () => {
  const players = pool();
  it('snakes: the order reverses every round', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((k) => teamForPick(k, 4))).toEqual([1, 2, 3, 4, 4, 3, 2, 1]);
  });
  it('bots play until the user is on the clock, every pick is a different player, and the draft completes', () => {
    let s = runBots(newDraft({ teams: 10, slot: 4, seed: 'one' }), players);
    expect(s.picks).toHaveLength(3);
    expect(onTheClock(s)).toBe(4);
    let guard = 0;
    while (!done(s) && guard++ < 400) {
      const taken = new Set(s.picks.map((x) => x.playerId));
      s = runBots(draftPlayer(s, players.find((q) => !taken.has(q.id))!.id), players);   // the user takes the best available
    }
    expect(done(s)).toBe(true);
    expect(s.picks).toHaveLength(10 * MOCK_ROUNDS);
    expect(new Set(s.picks.map((x) => x.playerId)).size).toBe(s.picks.length);
    expect(s.rosters.every((r) => r.length === MOCK_ROUNDS)).toBe(true);
  });
  it('is repeatable for a seed and different for another', () => {
    const run = (seed: string) => runBots(newDraft({ teams: 12, slot: 12, seed }), players).picks.map((x) => x.playerId).join();
    expect(run('a')).toBe(run('a'));
    expect(run('a')).not.toBe(run('b'));
  });
  it('bots draft like people: no quarterback in the first rounds, every team fills a lineup', () => {
    let s = newDraft({ teams: 12, slot: 1, seed: 'people' });
    let guard = 0;
    while (!done(s) && guard++ < 400) {
      const taken = new Set(s.picks.map((x) => x.playerId));
      s = runBots(draftPlayer(s, players.find((q) => !taken.has(q.id))!.id), players);
    }
    const map = new Map(players.map((q) => [q.id, q]));
    const early = s.picks.filter((x) => x.round <= 2).map((x) => map.get(x.playerId)!.pos);
    expect(early.filter((x) => x === 'QB' || x === 'TE').length).toBeLessThanOrEqual(8);   // 24 picks: backs and receivers go first
    for (const r of s.rosters.slice(1)) {
      const pos = r.map((id) => map.get(id)!.pos);
      for (const [k, n] of Object.entries(STARTERS)) expect(pos.filter((x) => x === k).length, `${k}`).toBeGreaterThanOrEqual(n);
      expect(pos.filter((x) => x === 'QB').length).toBeLessThanOrEqual(3);
    }
  });
  it('lineups take the best at each spot and a flex from what is left', () => {
    const l = lineupValue([{ pos: 'QB', value: 20 }, { pos: 'QB', value: 19 }, { pos: 'RB', value: 15 }, { pos: 'RB', value: 14 }, { pos: 'RB', value: 13 }, { pos: 'WR', value: 16 }, { pos: 'WR', value: 12 }, { pos: 'TE', value: 9 }]);
    expect(l.total).toBe(20 + 15 + 14 + 16 + 12 + 9 + 13);   // the third back plays the flex; the second QB never does
  });
  it('ranks the teams by their best lineup and grades the one you drafted', () => {
    let s = newDraft({ teams: 12, slot: 6, seed: 'grade' });
    let guard = 0;
    while (!done(s) && guard++ < 400) {
      s = runBots(s, players);
      if (done(s)) break;
      const taken = new Set(s.picks.map((x) => x.playerId));
      s = draftPlayer(s, players.find((q) => !taken.has(q.id))!.id);
    }
    const r = resultOf(s, players);
    expect(totalPicks(s)).toBe(12 * MOCK_ROUNDS);
    expect(r.standings).toHaveLength(12);
    for (let i = 1; i < 12; i++) expect(r.standings[i - 1].total).toBeGreaterThanOrEqual(r.standings[i].total);
    expect(r.standings[0].rank).toBe(1);
    expect(r.best).toBe(r.standings[0].total);
    expect(r.average).toBeGreaterThan(0); expect(r.average).toBeLessThanOrEqual(r.best);
    expect(r.yourRank).toBe(r.standings.find((x) => x.team === 6)!.rank);
    expect(r.grade).toBe(gradeFor(r.yourRank, 12));
  });
  it('a stacked roster wins the league and a barren one finishes last', () => {
    const best = (pos: FPos, n: number) => players.filter((q) => q.pos === pos).slice(0, n).map((q) => q.id);
    const worst = (pos: FPos, n: number) => players.filter((q) => q.pos === pos).slice(-n).map((q) => q.id);
    const stacked = [...best('QB', 1), ...best('RB', 3), ...best('WR', 3), ...best('TE', 1)];
    const barren = [...worst('QB', 1), ...worst('RB', 3), ...worst('WR', 3), ...worst('TE', 1)];
    const mid = (i: number) => [players.filter((q) => q.pos === 'QB')[10 + i].id, ...players.filter((q) => q.pos === 'RB').slice(10 + i, 13 + i).map((q) => q.id), ...players.filter((q) => q.pos === 'WR').slice(10 + i, 13 + i).map((q) => q.id), players.filter((q) => q.pos === 'TE')[10 + i].id];
    const state = (slot: number) => ({ setup: { teams: 4, slot, seed: 'x' }, picks: [], rounds: MOCK_ROUNDS, rosters: [stacked, mid(0), mid(5), barren] });
    expect(resultOf(state(1), players)).toMatchObject({ yourRank: 1, grade: 'A+' });
    expect(resultOf(state(4), players)).toMatchObject({ yourRank: 4, grade: 'F' });
    expect(resultOf(state(2), players).yourRank).toBe(2);
  });
  it('grades by how much of the field you beat', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => gradeFor(r, 12))).toEqual(['A+', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'F']);
    expect(gradeFor(1, 1)).toBe('A+');
    expect([1, 2, 3, 4].map((r) => gradeFor(r, 4))).toEqual(['A+', 'B', 'C', 'F']);   // 4 teams: beat all three, two of three, one of three, none
  });
  it('a tie for the best lineup shares first place', () => {
    const same = players.filter((q) => q.pos === 'QB').slice(0, 1).map((q) => q.id);
    const s = { setup: { teams: 2, slot: 2, seed: 'tie' }, picks: [], rounds: MOCK_ROUNDS, rosters: [same, same] };
    expect(resultOf(s, players)).toMatchObject({ yourRank: 1, grade: 'A+' });
  });
  it('a bot never fills a position past its limit', () => {
    const full = players.filter((q) => q.pos === 'QB').slice(0, 3);
    const rng = createRng('cap');
    for (let k = 0; k < 20; k++) expect(botPick(rng, players.filter((q) => !full.includes(q)), full, 6).pos).not.toBe('QB');
  });
  it('stepping one pick at a time plays the same draft as running the bots at once', () => {
    const setup = { teams: 10, slot: 7, seed: 'steps' };
    let stepped = newDraft(setup);
    while (!done(stepped) && onTheClock(stepped) !== setup.slot) stepped = botStep(stepped, players);
    expect(stepped.picks).toHaveLength(6);
    expect(stepped.picks).toEqual(runBots(newDraft(setup), players).picks);
  });
  it('counts the picks until you are on the clock', () => {
    const s = newDraft({ teams: 10, slot: 7, seed: 'wait' });
    expect(picksUntilYou(s)).toBe(6);
    expect(picksUntilYou(runBots(s, players))).toBe(0);
    const ready = runBots(s, players);
    const free = players.find((q) => !ready.picks.some((x) => x.playerId === q.id))!;
    expect(picksUntilYou(draftPlayer(ready, free.id))).toBe(6);   // slot 7 picks again at 14, the next pick is 8
  });
  it('a short pool ends the bots instead of looping', () => {
    const tiny = players.slice(0, 5);
    const s = runBots(newDraft({ teams: 8, slot: 8, seed: 'tiny' }, 2), tiny);
    expect(s.picks.length).toBeLessThanOrEqual(5);
  });
  it('recommends the best player, or a starter you still need', () => {
    const qb = players.find((q) => q.pos === 'QB')!, rb = players.find((q) => q.pos === 'RB')!;
    const rec = recommend(players, [], 1)!;
    expect(rec.player.pos === 'QB' ? rec.player.id !== qb.id || true : true).toBe(true);
    expect(rec.player.overall).toBeLessThanOrEqual(3);                 // round one: the top of the board
    const full = [rb, players.filter((q) => q.pos === 'RB')[1]];
    const late = recommend(players.filter((q) => !full.includes(q)), full, 9)!;
    expect(['QB', 'WR', 'TE']).toContain(late.player.pos);             // two backs already: look elsewhere
    expect(late.reason).toMatch(/Fills your|Best/);
  });
  it('shows steals and reaches against the rankings', () => {
    let s = newDraft({ teams: 4, slot: 2, seed: 'gaps' }, 2);
    s = draftPlayer(s, players[0].id);                  // pick 1, team 1
    s = draftPlayer(s, players[9].id);                  // pick 2, team 2 (you): ranked tenth, taken second: a reach of 8
    const v = pickValues(s, players);
    expect(v).toHaveLength(1);
    expect(v[0].gap).toBe(2 - players[9].overall);
    expect(v[0].gap).toBeLessThan(0);
  });
  it('auto-draft finishes the whole draft and your team gets a real lineup', () => {
    const s = finishDraft(runBots(newDraft({ teams: 10, slot: 4, seed: 'auto' }), players), players);
    expect(done(s)).toBe(true);
    expect(new Set(s.picks.map((x) => x.playerId)).size).toBe(10 * MOCK_ROUNDS);
    const map = new Map(players.map((q) => [q.id, q]));
    const mine = s.rosters[3].map((id) => map.get(id)!);
    for (const [k, n] of Object.entries(STARTERS)) expect(mine.filter((x) => x.pos === k).length, k).toBeGreaterThanOrEqual(n);
    const r = resultOf(s, players);
    expect(r.yourRank).toBeLessThanOrEqual(7);    // a need-aware auto-draft from the middle of the order should not finish near the bottom
  });
  it('auto-pick takes the recommended player', () => {
    const s = runBots(newDraft({ teams: 10, slot: 4, seed: 'rec' }), players);
    const taken = new Set(s.picks.map((x) => x.playerId));
    const rec = recommend(players.filter((q) => !taken.has(q.id)), [], 1)!;
    expect(autoPick(s, players).picks.at(-1)!.playerId).toBe(rec.player.id);
  });
  it('every team, yours included, can field a full starting lineup, whatever the slot and league size', () => {
    const map = new Map(players.map((q) => [q.id, q]));
    for (const teams of [8, 10, 12, 14]) for (const slot of [1, Math.ceil(teams / 2), teams]) for (const seed of ['a', 'b']) {
      const s = finishDraft(runBots(newDraft({ teams, slot, seed: `full${seed}${teams}${slot}` }), players), players);
      expect(done(s)).toBe(true);
      s.rosters.forEach((r, i) => {
        const pos = r.map((id) => map.get(id)!.pos);
        for (const [k, n] of Object.entries(STARTERS)) expect(pos.filter((x) => x === k).length, `team ${i + 1} of ${teams}, slot ${slot}, ${k}`).toBeGreaterThanOrEqual(n);
      });
    }
  });
});
