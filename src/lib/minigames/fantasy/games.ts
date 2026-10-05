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

export const fantasyGames = [fantasyStartEm];
