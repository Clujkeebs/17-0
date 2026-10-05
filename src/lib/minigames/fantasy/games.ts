import { createRng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import { topBy } from '../prominent';
import type { FPlayer, FPos } from '@/lib/fantasy/rank';

/**
 * Fantasy mini games on the same values as /fantasy/rankings: PPR points per game, recent games weighted most,
 * the season average and (early on) the projection blended in. Known names only.
 */
export interface FantasyGameData { players: FPlayer[] }

/** How many at each position count as names fantasy players know (the startable ones in a 12-team league, plus a few). */
const KNOWN: Record<FPos, number> = { QB: 20, RB: 36, WR: 44, TE: 14 };
const r1 = (n: number) => Math.round(n * 10) / 10;
const fcard = (p: FPlayer) => ({ id: p.id, name: p.name, position: p.pos, team: p.team, teamName: p.team, teamColor: p.teamColor, logoUrl: p.logoUrl, img: p.img });

type Round = { a: FPlayer; b: FPlayer };
export const fantasyStartEm: MiniGame<{ rounds: Round[] }, ('a' | 'b')[], FantasyGameData> = {
  slug: 'fantasy-start-em', sport: 'fantasy',
  name: "Start 'Em",
  tagline: 'Two players at the same spot. Who is putting up more fantasy points per game? Ten calls.',
  howTo: [
    'Each round shows two players at the same position.',
    'Tap the one you would start: the higher PPR points per game, with recent games counting most (the same numbers as our rankings).',
    'Ten rounds. Ties count either way. Numbers update after every game day.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = (Object.keys(KNOWN) as FPos[]).flatMap((pos) => topBy(data.players.filter((p) => p.pos === pos), (p) => p.value, KNOWN[pos]));
    if (pool.length < 40) throw new Error('Fantasy numbers are still loading. Try again later.');
    const used = new Set<string>();
    const rounds: Round[] = [];
    for (let i = 0; rounds.length < 10 && i < 4000; i++) {
      const a = rng.pick(pool);
      if (used.has(a.id)) continue;
      // Close calls make it a game: same position, within about two and a half points.
      const near = pool.filter((b) => b.id !== a.id && !used.has(b.id) && b.pos === a.pos && r1(b.value) !== r1(a.value) && Math.abs(b.value - a.value) <= Math.max(1.5, a.value * 0.15));
      if (!near.length) continue;
      const b = rng.pick(near);
      used.add(a.id); used.add(b.id);
      rounds.push({ a, b });
    }
    if (rounds.length < 10) throw new Error('Fantasy numbers are still loading. Try again later.');
    return { rounds };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: fcard(r.a), b: fcard(r.b), label: 'Fantasy points per game' })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const av = r1(r.a.value), bv = r1(r.b.value);
      const ok = av === bv || (answer[i] === 'a' ? av > bv : bv > av);
      return { a: r.a.name, b: r.b.name, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.team, bTeam: r.b.team, aColor: r.a.teamColor, bColor: r.b.teamColor, aLogo: r.a.logoUrl, bLogo: r.b.logoUrl, label: 'Fantasy points per game', av, bv, pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
};

const RANK_N = 5;
const POS_NAME: Record<FPos, string> = { QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end' };
export const fantasyRankEm: MiniGame<{ pos: FPos; players: FPlayer[] }, string[], FantasyGameData> = {
  slug: 'fantasy-rank-em', sport: 'fantasy',
  name: "Rank 'Em: Fantasy",
  tagline: 'Five players at one position. Put them in fantasy points per game order.',
  howTo: [
    'Order the five from most to fewest PPR points per game, recent games counting most (the same numbers as our rankings).',
    'Use the up and down buttons, or drag on desktop.',
    'Each of the 10 pairs you order correctly is worth 10. Each exact slot adds 4.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const positions = rng.shuffle(Object.keys(KNOWN) as FPos[]);
    for (const pos of positions) {
      const pool = rng.shuffle(topBy(data.players.filter((p) => p.pos === pos), (p) => p.value, KNOWN[pos]));
      // No two with the same rounded number, so every order has one right answer.
      const picked: FPlayer[] = [];
      for (const p of pool) { if (!picked.some((x) => r1(x.value) === r1(p.value))) picked.push(p); if (picked.length === RANK_N) break; }
      if (picked.length === RANK_N) return { pos, players: picked };
    }
    throw new Error('Fantasy numbers are still loading. Try again later.');
  },
  publicView: (p) => ({ label: 'Fantasy points per game', groupName: POS_NAME[p.pos], players: p.players.map(fcard) }),
  score(p, answer) {
    const ids = p.players.map((x) => x.id);
    if (!Array.isArray(answer) || answer.length !== ids.length || new Set(answer).size !== ids.length || !answer.every((a) => ids.includes(a))) throw new Error('Order all five players.');
    const v = new Map(p.players.map((x) => [x.id, r1(x.value)]));
    let pairs = 0, total = 0;
    for (let i = 0; i < answer.length; i++) for (let j = i + 1; j < answer.length; j++) { total++; if (v.get(answer[i])! >= v.get(answer[j])!) pairs++; }
    const truth = [...p.players].sort((a, b) => b.value - a.value);
    let exact = 0;
    answer.forEach((id, i) => { if (v.get(id) === r1(truth[i].value)) exact++; });
    const detail = { label: 'Fantasy points per game', pairs, total, exact, truth: truth.map((x, i) => ({ id: x.id, name: x.name, team: x.team, teamColor: x.teamColor, logoUrl: x.logoUrl, img: x.img, v: r1(x.value), yourSlot: answer.indexOf(x.id) + 1, ok: v.get(answer[i]) === r1(x.value) })) };
    return { score: pairs * 10 + exact * 4, summary: `${pairs}/${total} pairs`, detail, perfect: pairs === total };
  },
};

export const fantasyGames = [fantasyStartEm, fantasyRankEm];
