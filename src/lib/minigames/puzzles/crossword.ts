import { createRng } from '@/lib/game/prng';
import { CROSSWORD_BANK, type Entry } from './crossword-bank';

/**
 * Builds a criss-cross sports crossword from the clue bank: words placed one at a time, each crossing a word
 * already on the board, never touching another word side by side. Same seed, same puzzle.
 */
export type Dir = 'across' | 'down';
export interface Placed { word: string; clue: string; row: number; col: number; dir: Dir; num: number }
export interface Crossword { rows: number; cols: number; words: Placed[] }

const MAX = 11, WORDS = 8;
type Cell = { ch: string; dirs: Dir[] };
const key = (r: number, c: number) => `${r},${c}`;

function fits(board: Map<string, Cell>, w: string, r: number, c: number, dir: Dir): number {
  const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
  if (board.has(key(r - dr, c - dc)) || board.has(key(r + dr * w.length, c + dc * w.length))) return -1;
  let crossings = 0;
  for (let i = 0; i < w.length; i++) {
    const rr = r + dr * i, cc = c + dc * i, at = board.get(key(rr, cc));
    if (at) {
      if (at.ch !== w[i] || at.dirs.includes(dir)) return -1;
      crossings++;
    } else if (board.has(key(rr + dc, cc + dr)) || board.has(key(rr - dc, cc - dr))) return -1; // side by side
  }
  return crossings;
}
function bounds(board: Map<string, Cell>) {
  let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const k of board.keys()) { const [r, c] = k.split(',').map(Number); r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  return { r0, r1, c0, c1 };
}

function attempt(seed: string, n: number): { placed: Omit<Placed, 'num'>[]; area: number; crossings: number } | null {
  const rng = createRng(`${seed}:${n}`);
  const bank = rng.shuffle(CROSSWORD_BANK.filter((e) => e.word.length <= MAX));
  const first = bank.find((e) => e.word.length >= 6 && e.word.length <= 8)!;
  const board = new Map<string, Cell>();
  const placed: Omit<Placed, 'num'>[] = [];
  const put = (e: Entry, r: number, c: number, dir: Dir) => {
    for (let i = 0; i < e.word.length; i++) {
      const k = key(r + (dir === 'down' ? i : 0), c + (dir === 'across' ? i : 0));
      const at = board.get(k);
      if (at) at.dirs.push(dir); else board.set(k, { ch: e.word[i], dirs: [dir] });
    }
    placed.push({ word: e.word, clue: e.clue, row: r, col: c, dir });
  };
  put(first, 0, 0, 'across');
  let crossings = 0;
  for (const e of bank) {
    if (placed.length >= WORDS) break;
    if (placed.some((p) => p.word === e.word)) continue;
    let best: { r: number; c: number; dir: Dir; score: number; x: number } | null = null;
    for (const [k, cell] of board) {
      const [r, c] = k.split(',').map(Number);
      if (cell.dirs.length > 1) continue;
      const dir: Dir = cell.dirs[0] === 'across' ? 'down' : 'across';
      for (let i = 0; i < e.word.length; i++) {
        if (e.word[i] !== cell.ch) continue;
        const sr = dir === 'down' ? r - i : r, sc = dir === 'across' ? c - i : c;
        const x = fits(board, e.word, sr, sc, dir);
        if (x < 1) continue;
        const b = bounds(board);
        const r0 = Math.min(b.r0, sr), c0 = Math.min(b.c0, sc);
        const r1 = Math.max(b.r1, sr + (dir === 'down' ? e.word.length - 1 : 0)), c1 = Math.max(b.c1, sc + (dir === 'across' ? e.word.length - 1 : 0));
        if (r1 - r0 + 1 > MAX || c1 - c0 + 1 > MAX) continue;
        const score = x * 100 - (r1 - r0 + 1) * (c1 - c0 + 1);
        if (!best || score > best.score) best = { r: sr, c: sc, dir, score, x };
      }
    }
    if (best) { put(e, best.r, best.c, best.dir); crossings += best.x; }
  }
  if (placed.length < WORDS) return null;
  const b = bounds(board);
  return { placed: placed.map((p) => ({ ...p, row: p.row - b.r0, col: p.col - b.c0 })), area: (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1), crossings };
}

/** The tightest of several tries: most crossings, then the smallest board. Numbered in reading order. */
export function buildCrossword(seed: string): Crossword {
  let best: NonNullable<ReturnType<typeof attempt>> | null = null;
  for (let n = 0; n < 40; n++) {
    const a = attempt(seed, n);
    if (a && (!best || a.crossings > best.crossings || (a.crossings === best.crossings && a.area < best.area))) best = a;
  }
  if (!best) throw new Error('Could not build today\'s crossword.');
  const starts = [...new Set(best.placed.map((p) => key(p.row, p.col)))].map((k) => k.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const num = new Map(starts.map(([r, c], i) => [key(r, c), i + 1]));
  const words = best.placed.map((p) => ({ ...p, num: num.get(key(p.row, p.col))! })).sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'across' ? -1 : 1));
  return { rows: Math.max(...words.map((w) => w.row + (w.dir === 'down' ? w.word.length : 1))), cols: Math.max(...words.map((w) => w.col + (w.dir === 'across' ? w.word.length : 1))), words };
}

/** The solution as rows of letters, with '.' for blocked squares. */
export function solutionRows(x: Crossword): string[] {
  const g = Array.from({ length: x.rows }, () => Array(x.cols).fill('.'));
  for (const w of x.words) for (let i = 0; i < w.word.length; i++) g[w.row + (w.dir === 'down' ? i : 0)][w.col + (w.dir === 'across' ? i : 0)] = w.word[i];
  return g.map((r) => r.join(''));
}
