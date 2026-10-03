import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import type { GPlayer } from '../types';
import type { PName, PuzzleData } from './data';

/**
 * Word and logic puzzles. Both are scored on the server from the guesses you made (ranked play records every
 * guess as you go) and the time between loading the puzzle and finishing it, measured by the server.
 * Score is always "higher is better": groups or the solve first, then fewer mistakes, then a faster time.
 */
const timeBonus = (ms?: number) => Math.max(0, 9999 - Math.round((ms ?? 0) / 1000));
export const clock = (ms?: number) => { const s = Math.max(0, Math.round((ms ?? 0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/* ------------------------------------------------------------------ Sports Connections */

type Level = 0 | 1 | 2 | 3;
interface CGroup { label: string; level: Level; ids: string[] }
export interface ConnPuzzle { groups: CGroup[]; tiles: { id: string; name: string }[] }
export interface ConnAnswer { guesses: string[][] }

/** A category: which players fit, and what to call it. Predicates are rechecked so no player fits two groups. */
interface Cat { label: string; level: Level; fits: (p: GPlayer) => boolean }

function categories(rng: Rng, players: GPlayer[]): Cat[] {
  const known = players.filter((p) => p.ovr >= 74);
  const by = <K>(key: (p: GPlayer) => K | null) => {
    const m = new Map<K, GPlayer[]>();
    for (const p of known) { const k = key(p); if (k == null) continue; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()].filter(([, v]) => v.length >= 4);
  };
  const cats: Cat[] = [];
  for (const [team] of rng.shuffle(by((p) => p.teamName))) cats.push({ label: team, level: 0, fits: (p) => p.teamName === team });
  for (const [college] of rng.shuffle(by((p) => p.college))) cats.push({ label: `Played college ball at ${college}`, level: 1, fits: (p) => p.college === college });
  for (const [n] of rng.shuffle(by((p) => p.jersey))) cats.push({ label: `Wear number ${n}`, level: 2, fits: (p) => p.jersey === n });
  cats.push({ label: '6-foot-6 or taller', level: 3, fits: (p) => (p.heightInches ?? 0) >= 78 });
  cats.push({ label: '320 pounds or more', level: 3, fits: (p) => (p.weightLbs ?? 0) >= 320 });
  cats.push({ label: 'Rookies', level: 3, fits: (p) => p.yearsPro === 0 });
  cats.push({ label: 'Age 33 or older', level: 3, fits: (p) => (p.age ?? 0) >= 33 });
  return cats;
}

export const sportsConnections: MiniGame<ConnPuzzle, ConnAnswer, PuzzleData> = {
  slug: 'sports-connections', sport: 'puzzles',
  name: 'Sports Connections',
  tagline: 'Sixteen NFL players, four hidden groups of four. Find them with fewer than four mistakes.',
  howTo: [
    'Pick four players you think share something, then submit. Groups run from easy (a team) to hard (a body type or age).',
    'Four wrong guesses ends the puzzle. "One away" means three of your four belong together.',
    'Ranked by groups found, then fewest mistakes, then fastest time.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const known = data.nfl.players.filter((p) => p.ovr >= 74);
    for (let attempt = 0; attempt < 400; attempt++) {
      const cats = categories(rng, data.nfl.players);
      const pick: Cat[] = [];
      for (const level of [0, 1, 2, 3] as Level[]) { const c = rng.shuffle(cats.filter((x) => x.level === level))[0]; if (c) pick.push(c); }
      if (pick.length < 4) continue;
      // Four players per group who fit exactly one of the four chosen categories.
      const used = new Set<string>();
      const groups: CGroup[] = [];
      for (const c of pick) {
        const pool = rng.shuffle(known.filter((p) => !used.has(p.id) && c.fits(p) && pick.filter((o) => o.fits(p)).length === 1));
        if (pool.length < 4) break;
        const four = pool.slice(0, 4);
        four.forEach((p) => used.add(p.id));
        groups.push({ label: c.label, level: c.level, ids: four.map((p) => p.id) });
      }
      if (groups.length < 4) continue;
      const byId = new Map(known.map((p) => [p.id, p]));
      const tiles = rng.shuffle(groups.flatMap((g) => g.ids)).map((id) => ({ id, name: byId.get(id)!.name }));
      return { groups, tiles };
    }
    throw new Error('Could not build a Connections board from the current rosters.');
  },
  publicView: (p) => ({ tiles: p.tiles }),
  /** One guess: which group it solves (with its label, now public), or how close it came. */
  check(p, guess) {
    const ids = (guess as { ids?: unknown })?.ids;
    if (!Array.isArray(ids) || ids.length !== 4 || new Set(ids).size !== 4) throw new Error('Pick exactly four players.');
    const hit = p.groups.find((g) => g.ids.every((id) => ids.includes(id)));
    if (hit) return { correct: true, label: hit.label, level: hit.level, ids: hit.ids };
    const best = Math.max(...p.groups.map((g) => g.ids.filter((id) => ids.includes(id)).length));
    return { correct: false, oneAway: best === 3 };
  },
  maxChecks: 8,
  applyChecks: (_answer, checks) => ({ guesses: checks.map((c) => ((c as { ids?: string[] })?.ids ?? [])) }),
  score(p, answer, ctx) {
    if (!answer || !Array.isArray(answer.guesses)) throw new Error('No guesses.');
    const solved: CGroup[] = [];
    let mistakes = 0;
    for (const g of answer.guesses) {
      if (mistakes >= 4 || solved.length === 4) break;
      const hit = p.groups.find((x) => !solved.includes(x) && x.ids.every((id) => g.includes(id)));
      if (hit) solved.push(hit); else mistakes++;
    }
    const won = solved.length === 4;
    const score = solved.length * 100_000 + (won ? (4 - mistakes) * 10_000 + timeBonus(ctx?.elapsedMs) : 0);
    return {
      score, perfect: won && mistakes === 0,
      summary: won ? `Solved · ${mistakes} mistake${mistakes === 1 ? '' : 's'} · ${clock(ctx?.elapsedMs)}` : `${solved.length}/4 groups`,
      detail: { groups: p.groups.map((g) => ({ label: g.label, level: g.level, names: g.ids.map((id) => p.tiles.find((t) => t.id === id)?.name ?? '') , found: solved.includes(g) })), mistakes, ms: ctx?.elapsedMs ?? null },
    };
  },
};

/* ------------------------------------------------------------------ Sports Wordle */

export interface WordlePuzzle { word: string; who: PName }
export interface WordleAnswer { guesses: string[] }
export type Mark = 'hit' | 'near' | 'miss';
const TRIES = 6;

/** Standard Wordle marking: exact letters first, then present letters up to how many remain unmatched. */
export function mark(guess: string, word: string): Mark[] {
  const g = guess.toUpperCase(), w = word.toUpperCase();
  const out: Mark[] = Array(g.length).fill('miss');
  const left: Record<string, number> = {};
  for (let i = 0; i < w.length; i++) { if (g[i] === w[i]) out[i] = 'hit'; else left[w[i]] = (left[w[i]] ?? 0) + 1; }
  for (let i = 0; i < g.length; i++) if (out[i] !== 'hit' && left[g[i]]) { out[i] = 'near'; left[g[i]]--; }
  return out;
}
const clean = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');

export const sportsWordle: MiniGame<WordlePuzzle, WordleAnswer, PuzzleData> = {
  slug: 'sports-wordle', sport: 'puzzles',
  name: 'Sports Wordle',
  tagline: 'Guess the five-letter last name of a current NFL, NBA or MLB star in six tries.',
  howTo: [
    'Type any five letters. Green is the right letter in the right spot, gold is in the name but elsewhere.',
    'The answer is a current star from the NFL, NBA or MLB. The league shows from the start.',
    'Ranked by fewest guesses, then fastest time.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.names.filter((n) => clean(n.last).length === 5);
    if (pool.length < 20) throw new Error('Not enough players for today\'s word.');
    const who = rng.pick(pool);
    return { word: clean(who.last), who };
  },
  publicView: (p) => ({ length: p.word.length, sport: p.who.sport, tries: TRIES }),
  check(p, guess) {
    const g = clean(String((guess as { word?: unknown })?.word ?? ''));
    if (g.length !== p.word.length) throw new Error(`Guess ${p.word.length} letters.`);
    return { word: g, marks: mark(g, p.word), solved: g === p.word };
  },
  maxChecks: TRIES,
  applyChecks: (_a, checks) => ({ guesses: checks.map((c) => clean(String((c as { word?: string })?.word ?? ''))) }),
  score(p, answer, ctx) {
    if (!answer || !Array.isArray(answer.guesses)) throw new Error('No guesses.');
    const guesses = answer.guesses.map((g) => clean(String(g))).filter((g) => g.length === p.word.length).slice(0, TRIES);
    const at = guesses.indexOf(p.word);
    const solved = at >= 0;
    const used = solved ? at + 1 : guesses.length;
    return {
      score: solved ? (TRIES + 1 - used) * 10_000 + timeBonus(ctx?.elapsedMs) : 0,
      perfect: solved && used <= 2,
      summary: solved ? `${used}/${TRIES} · ${clock(ctx?.elapsedMs)}` : `X/${TRIES}`,
      detail: { word: p.word, who: p.who, rows: guesses.slice(0, used).map((g) => ({ word: g, marks: mark(g, p.word) })), solved, ms: ctx?.elapsedMs ?? null },
    };
  },
};

export const puzzleGames = [sportsConnections, sportsWordle];
