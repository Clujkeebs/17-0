import { createRng } from '@/lib/game/prng';
import { card } from '../data';
import type { GPlayer, GameData, MiniGame } from '../types';

export const MAX_GUESSES = 8;
export const HINT_AFTER = 5;
interface Puzzle { seed: string; target: GPlayer; players: GPlayer[] }
type Answer = string[];

type Dir = 'up' | 'down' | 'exact' | 'none';
const cmp = (guess: number | null, target: number | null, close: number) => {
  if (guess == null || target == null) return { dir: 'none' as Dir, close: false, value: guess };
  const dir: Dir = guess === target ? 'exact' : target > guess ? 'up' : 'down';
  return { dir, close: dir !== 'exact' && Math.abs(guess - target) <= close, value: guess };
};

/** Clue row for one guess against the target. Arrows say where the target sits relative to the guess. */
export function clues(g: GPlayer, t: GPlayer) {
  return {
    player: { ...card(g), division: g.division, conference: g.conference },
    correct: g.id === t.id,
    team: g.teamId === t.teamId ? 'exact' : 'no',
    division: g.division === t.division && g.conference === t.conference ? 'exact' : g.conference === t.conference ? 'partial' : 'no',
    position: g.position === t.position ? 'exact' : g.group === t.group ? 'partial' : 'no',
    age: cmp(g.age, t.age, 2),
    jersey: cmp(g.jersey, t.jersey, 5),
    ovr: cmp(g.ovr, t.ovr, 3),
    height: cmp(g.heightInches, t.heightInches, 1),
  };
}

export function collegeSilhouette(college: string | null): string {
  if (!college) return 'No college listed';
  return college.split(' ').map((w) => w[0] + w.slice(1).replace(/[A-Za-z]/g, '_')).join(' ');
}

const find = (players: GPlayer[], id: unknown) => (typeof id === 'string' ? players.find((p) => p.id === id) : undefined);


export const mysteryPlayer: MiniGame<Puzzle, Answer> = {
  slug: 'mystery-player',
  name: 'Mystery Player',
  tagline: 'One starter. Eight guesses. Every miss tells you something.',
  howTo: [
    'Guess any active player. The hidden one rates 75 or better.',
    'Each guess shows team, division, position, age, jersey, overall and height. Arrows point toward the answer. "Close" means you are near.',
    `After ${HINT_AFTER} guesses you get the outline of his college. Fewer guesses, higher score.`,
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    let pool = data.players.filter((p) => p.ovr >= 75 && p.group !== 'K');
    if (!pool.length) pool = data.players;
    if (!pool.length) throw new Error('No players available.');
    return { seed, target: rng.pick([...pool].sort((a, b) => a.id.localeCompare(b.id))), players: data.players };
  },
  publicView: (p) => ({ seed: p.seed, maxGuesses: MAX_GUESSES, hintAfter: HINT_AFTER }),
  check(p, guess, data) {
    const g = guess as { id?: unknown; n?: unknown };
    const pl = find(data.players, g?.id);
    if (!pl) throw new Error('Pick a player from the list.');
    const n = Number(g.n) || 0;
    const row = clues(pl, p.target);
    const reveal = row.correct || n >= MAX_GUESSES;
    return {
      row,
      hint: n >= HINT_AFTER && !reveal ? collegeSilhouette(p.target.college) : null,
      answer: reveal ? card(p.target) : null,
    };
  },
  maxChecks: 8,
  // Ranked: your guesses are exactly the ones you checked, in order.
  applyChecks(_answer, checks) {
    return (checks as { id: string }[]).map((c) => c.id).slice(0, 8);
  },
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length < 1 || answer.length > MAX_GUESSES || answer.some((a) => typeof a !== 'string')) throw new Error('Submit your guesses.');
    const idx = answer.indexOf(p.target.id);
    const used = idx >= 0 ? idx + 1 : answer.length;
    const score = idx >= 0 ? 9 - used : 0;
    const rows = answer.slice(0, used).map((id) => find(p.players, id)).filter(Boolean).map((g) => clues(g!, p.target));
    return {
      score, perfect: idx === 0,
      summary: idx >= 0 ? `${used} guess${used === 1 ? '' : 'es'}` : 'Missed',
      detail: { target: { ...card(p.target), college: p.target.college, ovr: p.target.ovr }, solved: idx >= 0, used, rows },
    };
  },
};
