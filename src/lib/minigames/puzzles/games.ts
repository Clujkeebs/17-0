import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import { WORDS, type PName, type PuzzleData } from './data';
import { BANK, tileKey, tileKeys } from './connections-bank';
import { buildCrossword, solutionRows, type Crossword } from './crossword';

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

/**
 * One category from each level of the hand-written bank (connections-bank.ts), four items each. An item is
 * only used if neither it nor its last word appears anywhere in the other three categories, so there is
 * exactly one way to solve the board. Same seed, same board.
 */
export function buildConnections(seed: string): ConnPuzzle {
  const rng = createRng(seed);
  const byLevel = ([0, 1, 2, 3] as Level[]).map((l) => BANK.filter((c) => c.level === l));
  for (let attempt = 0; attempt < 600; attempt++) {
    const pick = byLevel.map((list) => rng.pick(list));
    const sets = pick.map((c) => new Set(c.items.flatMap(tileKeys)));
    const groups: { label: string; level: Level; names: string[] }[] = [];
    for (const [i, c] of pick.entries()) {
      const clean = c.items.filter((item) => tileKeys(item).every((k) => sets.every((S, j) => j === i || !S.has(k))));
      const unique = [...new Map(clean.map((x) => [tileKey(x), x])).values()];
      if (unique.length < 4) break;
      groups.push({ label: c.label, level: c.level, names: rng.shuffle(unique).slice(0, 4) });
    }
    if (groups.length < 4) continue;
    const order = rng.shuffle(groups.flatMap((g, gi) => g.names.map((name) => ({ gi, name }))));
    const tiles = order.map((t, k) => ({ id: `t${k}`, name: t.name }));
    return { tiles, groups: groups.map((g, gi) => ({ label: g.label, level: g.level, ids: order.flatMap((t, k) => (t.gi === gi ? [`t${k}`] : [])) })) };
  }
  throw new Error('Could not build a Connections board.');
}

export const sportsConnections: MiniGame<ConnPuzzle, ConnAnswer, PuzzleData> = {
  slug: 'sports-connections', sport: 'puzzles',
  name: 'Sports Connections',
  tagline: 'Sixteen sports words, four hidden groups of four. Teams, players, shows, broadcasters, colleges, champions and wordplay.',
  howTo: [
    'Find groups of four items that share something. Select four and tap Submit.',
    'Each puzzle has exactly one solution. Watch out for words that seem to belong to more than one group.',
    'Groups run from yellow (straightforward) to purple (tricky, often wordplay). Four mistakes and the game ends.',
    'Ranked by groups found, then fewest mistakes, then fastest time.',
  ],
  generate: (seed) => buildConnections(seed),
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
    const levelOf = (id: string) => p.groups.find((x) => x.ids.includes(id))?.level ?? 0;
    const rows: number[][] = [];
    for (const g of answer.guesses) {
      if (mistakes >= 4 || solved.length === 4) break;
      rows.push(g.slice(0, 4).map(levelOf));
      const hit = p.groups.find((x) => !solved.includes(x) && x.ids.every((id) => g.includes(id)));
      if (hit) solved.push(hit); else mistakes++;
    }
    const won = solved.length === 4;
    const score = solved.length * 100_000 + (won ? (4 - mistakes) * 10_000 + timeBonus(ctx?.elapsedMs) : 0);
    return {
      score, perfect: won && mistakes === 0,
      summary: won ? `Solved · ${mistakes} mistake${mistakes === 1 ? '' : 's'} · ${clock(ctx?.elapsedMs)}` : `${solved.length}/4 groups`,
      detail: { groups: p.groups.map((g) => ({ label: g.label, level: g.level, names: g.ids.map((id) => p.tiles.find((t) => t.id === id)?.name ?? '') , found: solved.includes(g) })), mistakes, rows, ms: ctx?.elapsedMs ?? null },
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
  tagline: 'Six tries at a five-letter sports word: a star\'s last name, a team name or a sports term.',
  howTo: [
    'Type any five letters. Green is the right letter in the right spot, gold is in the name but elsewhere.',
    'The answer is a current NFL, NBA or MLB star\'s last name, a team name, or a sports term. The hint shows which from the start.',
    'Ranked by fewest guesses, then fastest time.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.names.filter((n) => clean(n.last).length === 5);
    if (pool.length < 20) throw new Error('Not enough players for today\'s word.');
    // About half the days are a star's last name, half a team name or sports term.
    if (rng.next() < 0.5) {
      const w = rng.pick(WORDS);
      return { word: w.word, who: { name: w.word.charAt(0) + w.word.slice(1).toLowerCase(), last: w.word, sport: w.hint, team: '', position: '' } };
    }
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

/* ------------------------------------------------------------------ Sports Crossword */

type XwPuzzle = Crossword;
interface XwAnswer { rows: string[]; checks?: string[][]; wrongChecks?: number }
const XW_CHECK_PENALTY_MS = 10_000;
const xwClean = (rows: unknown, x: Crossword): string[] => {
  const r = Array.isArray(rows) ? rows : [];
  return Array.from({ length: x.rows }, (_, i) => Array.from({ length: x.cols }, (_, j) => {
    const ch = String(r[i] ?? '')[j] ?? '';
    return /^[A-Za-z]$/.test(ch) ? ch.toUpperCase() : ' ';
  }).join(''));
};
/** Letters right, letters wrong (filled but not right), and empty squares, against the solution. */
function xwCount(x: Crossword, rows: string[]) {
  const sol = solutionRows(x);
  let right = 0, wrong = 0, empty = 0;
  sol.forEach((line, i) => line.split('').forEach((ch, j) => {
    if (ch === '.') return;
    const g = rows[i]?.[j] ?? ' ';
    if (g === ch) right++; else if (g === ' ') empty++; else wrong++;
  }));
  return { right, wrong, empty, total: right + wrong + empty };
}

export const sportsCrossword: MiniGame<XwPuzzle, XwAnswer, PuzzleData> = {
  slug: 'sports-crossword', sport: 'puzzles',
  name: 'Sports Crossword',
  tagline: 'A daily mini crossword of sports words: teams, legends, rules and slang.',
  howTo: [
    'Tap a square to type. Tap it again to switch between across and down. Tap a clue to jump to it.',
    'Check tells you how many letters are wrong, not which ones. Each check that finds a mistake adds 10 seconds to your time.',
    'Ranked by solving it, then fastest time.',
  ],
  generate: (seed) => buildCrossword(seed),
  publicView: (x) => ({ rows: x.rows, cols: x.cols, words: x.words.map((w) => ({ num: w.num, dir: w.dir, row: w.row, col: w.col, len: w.word.length, clue: w.clue })) }),
  check(x, guess) {
    const rows = xwClean((guess as { rows?: unknown })?.rows, x);
    const c = xwCount(x, rows);
    return { wrong: c.wrong, empty: c.empty, solved: c.right === c.total };
  },
  maxChecks: 30,
  // Ranked: the checks this player actually made decide the time penalty.
  applyChecks: (a, checks) => ({ ...a, checks: checks.map((c) => (c as { rows?: string[] })?.rows ?? []) }),
  score(x, answer, ctx) {
    const rows = xwClean(answer?.rows, x);
    const c = xwCount(x, rows);
    const solved = c.right === c.total;
    const wrongChecks = Array.isArray(answer?.checks)
      ? answer.checks.filter((r) => xwCount(x, xwClean(r, x)).right !== c.total).length
      : Math.max(0, Math.min(99, Number(answer?.wrongChecks) || 0));
    const ms = (ctx?.elapsedMs ?? 0) + wrongChecks * XW_CHECK_PENALTY_MS;
    return {
      score: solved ? 100_000 + timeBonus(ms) : c.right * 10,
      perfect: solved && wrongChecks === 0,
      summary: solved ? clock(ms) : `${c.right}/${c.total} letters`,
      detail: { solved, ms, wrongChecks, right: c.right, total: c.total, solution: solutionRows(x), words: x.words.map((w) => ({ num: w.num, dir: w.dir, word: w.word, clue: w.clue })) },
    };
  },
};

export const puzzleGames = [sportsConnections, sportsWordle, sportsCrossword];
