import { createRng } from '@/lib/game/prng';
import { card } from '../data';
import type { GPlayer, MiniGame } from '../types';

/** Every round is "pick one of these cards"; the answer is one index per round, scored at the end. */
interface PickRound { prompt: string; options: GPlayer[]; correct: number; reveal: string[] }
type PickPuzzle = { rounds: PickRound[] };
type PickAnswer = number[];

function scorePicks(p: PickPuzzle, answer: PickAnswer) {
  const n = p.rounds.length;
  if (!Array.isArray(answer) || answer.length !== n || !answer.every((x, i) => Number.isInteger(x) && x >= 0 && x < p.rounds[i].options.length)) throw new Error('Answer every round.');
  const detail = p.rounds.map((r, i) => ({
    prompt: r.prompt, pick: answer[i], correct: r.correct, right: answer[i] === r.correct,
    options: r.options.map((o, k) => ({ ...card(o), note: r.reveal[k] })),
  }));
  const right = detail.filter((d) => d.right).length;
  return { score: right * 100, summary: `${right}/${n}`, detail, perfect: right === n };
}
const pickView = (p: PickPuzzle) => ({ rounds: p.rounds.map((r) => ({ prompt: r.prompt, options: r.options.map(card) })) });

/* ------------------------------------------------------------------ Speed Trap */

const ST_N = 8;
export const speedTrap: MiniGame<PickPuzzle, PickAnswer> = {
  slug: 'speed-trap',
  name: 'Speed Trap',
  tagline: 'Two players, one forty. Pick who is faster by Madden 27 speed.',
  howTo: [
    'Each round shows two players, often at different positions.',
    'Tap the one with the higher Madden 27 Speed rating.',
    'Eight rounds, 100 per hit. Answers show at the end.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.players.filter((p) => p.ovr >= 65 && p.attrs.speed != null);
    const rounds: PickRound[] = [];
    const used = new Set<string>();
    for (let t = 0; rounds.length < ST_N && t < 2000; t++) {
      const a = rng.pick(pool), b = rng.pick(pool);
      if (!a || !b || a.id === b.id || used.has(a.id) || used.has(b.id)) continue;
      const gap = Math.abs(a.attrs.speed! - b.attrs.speed!);
      // Close enough to be a question, far enough that there is a right answer.
      if (gap < 2 || gap > 8) continue;
      used.add(a.id); used.add(b.id);
      rounds.push({ prompt: 'Who is faster?', options: [a, b], correct: a.attrs.speed! > b.attrs.speed! ? 0 : 1, reveal: [`${a.attrs.speed} SPD`, `${b.attrs.speed} SPD`] });
    }
    if (rounds.length < ST_N) throw new Error('Not enough players to build today\'s puzzle.');
    return { rounds };
  },
  publicView: pickView,
  score: scorePicks,
};

/* ------------------------------------------------------------------ Odd One Out */

const OO_N = 6;
export const oddOneOut: MiniGame<PickPuzzle, PickAnswer> = {
  slug: 'odd-one-out',
  name: 'Odd One Out',
  tagline: 'Four players. Three share a college. Find the one who does not.',
  howTo: [
    'Each round shows four current players and their teams.',
    'Three of them played at the same college. Tap the one who did not.',
    'Six rounds, 100 per hit. Schools show at the end.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const by = new Map<string, GPlayer[]>();
    for (const p of data.players) if (p.college && p.ovr >= 60) by.set(p.college, [...(by.get(p.college) ?? []), p]);
    const schools = [...by.keys()].filter((c) => by.get(c)!.length >= 3).sort();
    const others = data.players.filter((p) => p.college && p.ovr >= 60);
    const rounds: PickRound[] = [];
    const usedSchools = new Set<string>();
    for (let t = 0; rounds.length < OO_N && t < 500; t++) {
      const school = rng.pick(schools);
      if (!school || usedSchools.has(school)) continue;
      const three = rng.shuffle(by.get(school)!).slice(0, 3);
      const odd = rng.pick(others.filter((p) => p.college !== school));
      if (!odd) continue;
      usedSchools.add(school);
      const options = rng.shuffle([...three, odd]);
      rounds.push({ prompt: 'Who did not play at the same school as the other three?', options, correct: options.indexOf(odd), reveal: options.map((o) => o.college!) });
    }
    if (rounds.length < OO_N) throw new Error('Not enough players to build today\'s puzzle.');
    return { rounds };
  },
  publicView: pickView,
  score: scorePicks,
};

 /* ------------------------------------------------------------------ Numbers Game */

const NG_N = 8;
export const numbersGame: MiniGame<PickPuzzle, PickAnswer> = {
  slug: 'numbers-game',
  name: 'Numbers Game',
  tagline: 'One team, one jersey number, three players. Pick who wears it.',
  howTo: [
    'Each round names a team and a jersey number.',
    'Three of that team\'s players are on the board. Tap the one who wears it.',
    'Eight rounds, eight different teams, 100 per hit. Numbers show at the end.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const byTeam = new Map<number, GPlayer[]>();
    for (const p of data.players) if (p.jersey != null && p.ovr >= 70) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
    const teamIds = rng.shuffle([...byTeam.keys()].sort((a, b) => a - b));
    const rounds: PickRound[] = [];
    for (const id of teamIds) {
      if (rounds.length >= NG_N) break;
      // Three different numbers, so exactly one player wears the one asked for.
      const seen = new Set<number>();
      const three = rng.shuffle(byTeam.get(id)!).filter((p) => !seen.has(p.jersey!) && seen.add(p.jersey!)).slice(0, 3);
      if (three.length < 3) continue;
      const answer = rng.pick(three)!;
      rounds.push({ prompt: `Who wears No. ${answer.jersey} for the ${answer.teamName}?`, options: three, correct: three.indexOf(answer), reveal: three.map((o) => `No. ${o.jersey}`) });
    }
    if (rounds.length < NG_N) throw new Error('Not enough players to build today\'s puzzle.');
    return { rounds };
  },
  publicView: pickView,
  score: scorePicks,
};

export const groupD: MiniGame<any, any>[] = [speedTrap, oddOneOut, numbersGame];
