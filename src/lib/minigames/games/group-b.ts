import { createRng, type Rng } from '@/lib/game/prng';
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/game/attributes';
import { DEFAULT_FORMULAS, formulaFor } from '@/lib/game/formulas';
import { card } from '../data';
import type { GPlayer, MiniGame } from '../types';

/** Formula keys for a player's group, heaviest weight first. */
const OL_KEYS: AttributeKey[] = ['passBlock', 'runBlock', 'strength', 'awareness', 'agility', 'acceleration'];
export function keyAttrs(p: GPlayer, n: number): AttributeKey[] {
  // The OL shares the TE formula for team grading; for a ratings sheet, blocking is what matters.
  if (p.group === 'OL') return OL_KEYS.slice(0, n);
  const w = DEFAULT_FORMULAS[formulaFor(p.group)] ?? {};
  return (Object.entries(w) as [AttributeKey, number][]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}
const attr = (p: GPlayer, k: AttributeKey) => p.attrs[k] ?? 50;
const label = (k: AttributeKey) => ATTRIBUTE_LABELS[k];
const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Pick `n` distinct players from `pool` near `anchor`'s overall, widening the window if needed. */
function nearby(rng: Rng, pool: GPlayer[], anchor: GPlayer, n: number, same: (p: GPlayer) => boolean): GPlayer[] | null {
  for (const win of [3, 5, 8, 12, 99]) {
    const c = pool.filter((p) => p.id !== anchor.id && same(p) && Math.abs(p.ovr - anchor.ovr) <= win);
    if (c.length >= n) return rng.shuffle(c).slice(0, n);
  }
  return null;
}

/* ------------------------------------------------------------------ Blind Resume */

const BR_ROUNDS = 5;
interface BRRound { target: GPlayer; options: GPlayer[]; keys: AttributeKey[] }
type BRPuzzle = { seed: string; rounds: BRRound[] };
type BRAnswer = { picks: string[]; confident: number | null };

export const blindResume: MiniGame<BRPuzzle, BRAnswer> = {
  slug: 'blind-resume',
  name: 'Blind Résumé',
  tagline: 'No name. No team. Just the ratings sheet. Who is it?',
  howTo: [
    'Each round shows an anonymous Madden profile: position, archetype, age, size and his six most important ratings.',
    'Pick the player from four options at the same position with a similar overall.',
    'Five rounds, one point each. No clock.',
    'Once per game, lock in a Confident pick: right is worth two, wrong costs you one.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.players.filter((p) => p.ovr >= 65 && p.group !== 'K');
    const src = pool.length >= 4 ? pool : data.players.filter((p) => p.group !== 'K');
    const rounds: BRRound[] = [];
    const used = new Set<string>();
    for (let tries = 0; rounds.length < BR_ROUNDS && tries < 500; tries++) {
      const t = rng.pick(src);
      if (!t || used.has(t.id)) continue;
      const others = nearby(rng, src, t, 3, (p) => p.position === t.position && !used.has(p.id))
        ?? (tries > 250 ? nearby(rng, src, t, 3, (p) => p.group === t.group && !used.has(p.id)) : null);
      if (!others) continue;
      used.add(t.id);
      rounds.push({ target: t, options: rng.shuffle([t, ...others]), keys: keyAttrs(t, 6) });
    }
    if (rounds.length < BR_ROUNDS) throw new Error('Not enough players to build today\'s puzzle.');
    return { seed, rounds };
  },
  publicView: (p) => ({
    seed: p.seed,
    rounds: p.rounds.map((r) => ({
      profile: {
        position: r.target.position, archetype: r.target.archetype, age: r.target.age, yearsPro: r.target.yearsPro,
        heightInches: r.target.heightInches, weightLbs: r.target.weightLbs, ovr: r.target.ovr,
        ratings: r.keys.map((k) => ({ label: label(k), value: attr(r.target, k) })),
      },
      options: r.options.map(card),
    })),
  }),
  /** guess: { round, pick } -> whether it was right and who it was. Per-round reveal. */
  check(p, guess) {
    const g = guess as { round?: unknown; pick?: unknown };
    if (!g || !isInt(g.round, 0, BR_ROUNDS - 1) || typeof g.pick !== 'string') throw new Error('Pick a player.');
    const r = p.rounds[g.round];
    if (!r.options.some((o) => o.id === g.pick)) throw new Error('That player is not an option.');
    return { ok: g.pick === r.target.id, answerId: r.target.id, name: r.target.name, team: r.target.team };
  },
  applyChecks(answer, checks) {
    const picks = [...(answer?.picks ?? [])];
    for (let r = 0; r < BR_ROUNDS; r++) { const c = (checks as { round: number; pick: string }[]).find((x) => x.round === r); if (c) picks[r] = c.pick; }
    return { ...answer, picks };
  },
  score(p, answer) {
    if (!answer || !Array.isArray(answer.picks) || answer.picks.length !== BR_ROUNDS || answer.picks.some((x) => typeof x !== 'string')) throw new Error('Answer every round.');
    const conf = answer.confident == null ? null : answer.confident;
    if (conf !== null && !isInt(conf, 0, BR_ROUNDS - 1)) throw new Error('Confidence must be on one round.');
    const detail = p.rounds.map((r, i) => {
      const pick = r.options.find((o) => o.id === answer.picks[i]);
      const ok = answer.picks[i] === r.target.id;
      return { answer: r.target.name, team: r.target.team, position: r.target.position, pick: pick?.name ?? 'No pick', ok, confident: conf === i };
    });
    const right = detail.filter((d) => d.ok).length;
    let score = right;
    if (conf !== null) score += detail[conf].ok ? 1 : -1; // Confident: right is worth 2, wrong costs 1.
    score = Math.max(0, score);
    const bonus = conf !== null ? (detail[conf].ok ? ' +C' : ' -C') : '';
    return { score, summary: `${right}/${BR_ROUNDS}${bonus}`, detail: { rounds: detail, score, max: BR_ROUNDS + 1 }, perfect: right === BR_ROUNDS };
  },
};

/* ------------------------------------------------------------------ Rating Match */

const RM_N = 5, RM_TRIES = 3;
interface RMPuzzle { seed: string; players: GPlayer[]; keys: AttributeKey[]; lines: number[] /* lines[i] = index of player owning line i */ }
type RMAnswer = { pairs: number[]; attempts: number };

function validPairs(v: unknown): v is number[] {
  return Array.isArray(v) && v.length === RM_N && v.every((x) => isInt(x, 0, RM_N - 1)) && new Set(v).size === RM_N;
}
const rmCorrect = (p: RMPuzzle, pairs: number[]) => pairs.filter((line, pi) => p.lines[line] === pi).length;

export const ratingMatch: MiniGame<RMPuzzle, RMAnswer> = {
  slug: 'rating-match',
  name: 'Rating Match',
  tagline: 'Five players, five rating lines. Put the numbers on the right names.',
  howTo: [
    'Five players from one position group and five rating lines: overall plus four key attributes.',
    'Tap a player, then a rating line, to pair them. Tap a pair again to undo it.',
    'Three attempts. After each of the first two you learn how many pairs are right, not which.',
    'Ten points per correct pair, minus five for each extra attempt you use.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const groups = ['QB', 'RB', 'WR', 'TE', 'DL', 'EDGE', 'LB', 'CB', 'S'] as const;
    for (let tries = 0; tries < 200; tries++) {
      const g = rng.pick(groups);
      const pool = data.players.filter((p) => p.group === g && p.ovr >= 68);
      const src = pool.length >= RM_N ? pool : data.players.filter((p) => p.group === g);
      if (src.length < RM_N) continue;
      const players = rng.shuffle(src).slice(0, RM_N);
      if (new Set(players.map((p) => p.ovr)).size < RM_N - 1 && tries < 150) continue; // avoid indistinguishable lines
      return { seed, players, keys: keyAttrs(players[0], 4), lines: rng.shuffle(players.map((_, i) => i)) };
    }
    throw new Error('Not enough players to build today\'s puzzle.');
  },
  publicView: (p) => ({
    seed: p.seed,
    players: p.players.map(card),
    labels: ['Overall', ...p.keys.map(label)],
    lines: p.lines.map((pi) => [p.players[pi].ovr, ...p.keys.map((k) => attr(p.players[pi], k))]),
  }),
  /** guess: { pairs } (pairs[player] = line). Returns only the count of correct pairs. */
  check(p, guess) {
    const g = guess as { pairs?: unknown };
    if (!g || !validPairs(g.pairs)) throw new Error('Pair all five players first.');
    return { correct: rmCorrect(p, g.pairs) };
  },
  maxChecks: RM_TRIES - 1,
  applyChecks(answer, checks) {
    return { ...answer, attempts: Math.min(RM_TRIES, checks.length + 1) };
  },
  score(p, answer) {
    if (!answer || !validPairs(answer.pairs)) throw new Error('Pair all five players first.');
    if (!isInt(answer.attempts, 1, RM_TRIES)) throw new Error('Attempts must be 1 to 3.');
    const right = rmCorrect(p, answer.pairs);
    const score = Math.max(0, right * 10 - 5 * (answer.attempts - 1));
    const detail = p.players.map((pl, pi) => {
      const line = p.lines.indexOf(pi);
      return { name: pl.name, team: pl.team, position: pl.position, line, pick: answer.pairs[pi], ok: answer.pairs[pi] === line };
    });
    return { score, summary: `${right}/${RM_N} in ${answer.attempts}`, detail: { players: detail, score, attempts: answer.attempts }, perfect: right === RM_N && answer.attempts === 1 };
  },
};

/* ------------------------------------------------------------------ Guess the Overall */

const GO_N = 6;
interface GORound { target: GPlayer; anchors: GPlayer[] }
type GOPuzzle = { rounds: GORound[] };
type GOAnswer = number[];

export const goPoints = (guess: number, actual: number) => Math.max(0, 10 - Math.abs(guess - actual)) * 10;

export const guessTheOvr: MiniGame<GOPuzzle, GOAnswer> = {
  slug: 'guess-the-ovr',
  name: 'Guess the Overall',
  tagline: 'Six players. Name the Madden 27 overall. Within ten or it is a zero.',
  howTo: [
    'Each round shows a player and two teammates at his position with their overalls, for calibration.',
    'Set your guess with the slider or the plus and minus buttons, 40 to 99.',
    'Ten points per round minus one per point you miss by, times ten. 600 is perfect.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.players.filter((p) => p.ovr >= 55);
    const src = pool.length >= 3 ? pool : data.players;
    const rounds: GORound[] = [];
    const used = new Set<string>();
    for (let tries = 0; rounds.length < GO_N && tries < 500; tries++) {
      const t = rng.pick(src);
      if (!t || used.has(t.id)) continue;
      const peers = src.filter((p) => p.id !== t.id && !used.has(p.id) && (tries < 300 ? p.position === t.position : p.group === t.group));
      if (peers.length < 2) continue;
      // One anchor above and one below when possible, but not too close to the answer.
      const above = peers.filter((p) => p.ovr > t.ovr + 1), below = peers.filter((p) => p.ovr < t.ovr - 1);
      const anchors = above.length && below.length ? [rng.pick(above), rng.pick(below)] : rng.shuffle(peers).slice(0, 2);
      anchors.sort((a, b) => b.ovr - a.ovr);
      used.add(t.id); anchors.forEach((a) => used.add(a.id));
      rounds.push({ target: t, anchors });
    }
    if (rounds.length < GO_N) throw new Error('Not enough players to build today\'s puzzle.');
    return { rounds };
  },
  publicView: (p) => ({
    rounds: p.rounds.map((r) => ({
      player: { ...card(r.target), age: r.target.age, yearsPro: r.target.yearsPro, archetype: r.target.archetype },
      anchors: r.anchors.map((a) => ({ ...card(a), ovr: a.ovr })),
    })),
  }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== GO_N || !answer.every((x) => isInt(x, 40, 99))) throw new Error('Guess every overall between 40 and 99.');
    const detail = p.rounds.map((r, i) => ({ name: r.target.name, team: r.target.team, position: r.target.position, actual: r.target.ovr, guess: answer[i], points: goPoints(answer[i], r.target.ovr) }));
    const score = detail.reduce((s, d) => s + d.points, 0);
    return { score, summary: `${score} pts`, detail, perfect: score === GO_N * 100 };
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const groupB: MiniGame<any, any>[] = [blindResume, ratingMatch, guessTheOvr];

