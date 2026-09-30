import { createRng } from '@/lib/game/prng';
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/game/attributes';
import { card } from '../data';
import type { GPlayer, MiniGame } from '../types';

const ROUNDS = 10;
const STATS: { key: 'ovr' | AttributeKey; label: string }[] = [
  { key: 'ovr', label: 'Overall' }, { key: 'speed', label: 'Speed' }, { key: 'strength', label: 'Strength' },
  { key: 'awareness', label: 'Awareness' }, { key: 'acceleration', label: 'Acceleration' }, { key: 'jumping', label: 'Jumping' },
];
const val = (p: GPlayer, k: 'ovr' | AttributeKey) => (k === 'ovr' ? p.ovr : p.attrs[k] ?? 0);

interface Round { a: GPlayer; b: GPlayer; stat: 'ovr' | AttributeKey; label: string }
type Puzzle = { rounds: Round[] };
type Answer = ('a' | 'b')[];

export const higherLower: MiniGame<Puzzle, Answer> = {
  slug: 'higher-lower',
  name: 'Higher or Lower',
  tagline: 'Two players, one rating. Ten calls. Who has the higher number?',
  howTo: ['Each round shows two players and one Madden rating.', 'Tap the player you think rates higher. Ties count either way.', 'Ten rounds. The reveal shows every number.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.players.filter((p) => p.ovr >= 72);
    const rounds: Round[] = [];
    while (rounds.length < ROUNDS) {
      const a = rng.pick(pool);
      const s = rng.pick(STATS);
      // Close matchups make it a game: same position group, within a few points.
      const near = pool.filter((b) => b.id !== a.id && b.group === a.group && Math.abs(val(b, s.key) - val(a, s.key)) <= 4 && val(b, s.key) !== val(a, s.key));
      if (!near.length) continue;
      rounds.push({ a, b: rng.pick(near), stat: s.key, label: s.key === 'ovr' ? 'Overall' : ATTRIBUTE_LABELS[s.key as AttributeKey] ?? s.label });
    }
    return { rounds };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: card(r.a), b: card(r.b), label: r.label })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== ROUNDS) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const av = val(r.a, r.stat), bv = val(r.b, r.stat);
      const ok = av === bv || (answer[i] === 'a' ? av > bv : bv > av);
      return { a: r.a.name, b: r.b.name, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.team, bTeam: r.b.team, aColor: r.a.teamColor, bColor: r.b.teamColor, aLogo: r.a.logoUrl, bLogo: r.b.logoUrl, label: r.label, av, bv, pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${ROUNDS}`, detail, perfect: right === ROUNDS };
  },
};
