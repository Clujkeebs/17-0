import { createRng, type Rng } from '@/lib/game/prng';
import { type StrandsPack } from './strands-bank';
import { CELLS, COLS, NEIGHBOURS, ROWS, reverse, type StrandsPuzzle, type StrandsWord } from './strands-core';

/**
 * The board generator (offline; scripts/strands-build.ts runs it and writes strands-boards.ts). Pick a spangram
 * and a set of a pack's words whose lengths add up to the 48 squares, lay the spangram across the board as a random
 * path, tile everything left with paths of the remaining lengths (backtracking, with a partition check on the empty
 * regions), then search the finished grid for every word: each must be spellable along exactly one path.
 */
const pathKey = (cells: number[]) => [...cells].sort((a, b) => a - b).join(',');
function randomWalk(rng: Rng, length: number, axis: 'h' | 'v'): number[] | null {
  const fromStart = rng.next() < 0.5;
  const starts: number[] = [];
  if (axis === 'h') for (let r = 0; r < ROWS; r++) starts.push(r * COLS + (fromStart ? 0 : COLS - 1));
  else for (let c = 0; c < COLS; c++) starts.push((fromStart ? 0 : ROWS - 1) * COLS + c);
  const goalLine = axis === 'h' ? (fromStart ? COLS - 1 : 0) : (fromStart ? ROWS - 1 : 0);
  const away = (cell: number) => Math.abs((axis === 'h' ? cell % COLS : Math.floor(cell / COLS)) - goalLine);
  const used = new Array<boolean>(CELLS).fill(false);
  const path: number[] = [];
  let nodes = 0;
  const go = (cell: number): boolean => {
    if (++nodes > 20_000) return false;
    used[cell] = true; path.push(cell);
    if (path.length === length) { if (away(cell) === 0) return true; used[cell] = false; path.pop(); return false; }
    for (const nx of rng.shuffle(NEIGHBOURS[cell])) {
      if (used[nx] || away(nx) > length - path.length - 1) continue;
      if (go(nx)) return true;
    }
    used[cell] = false; path.pop();
    return false;
  };
  return go(rng.pick(starts)) ? [...path] : null;
}

/** Every subset sum of a multiset of lengths, as a boolean table. */
function sumsOf(lengths: number[]): boolean[] {
  const ok = new Array<boolean>(CELLS + 1).fill(false);
  ok[0] = true;
  for (const l of lengths) for (let s = CELLS; s >= l; s--) if (ok[s - l]) ok[s] = true;
  return ok;
}

/** Can these region sizes be filled exactly by splitting the remaining word lengths between them? */
function partitions(regions: number[], lengths: number[]): boolean {
  if (!regions.length) return !lengths.length;
  const [first, ...rest] = [...regions].sort((a, b) => b - a);
  const sorted = [...lengths].sort((a, b) => b - a);
  const tried = new Set<string>();
  const pick = (from: number, need: number, taken: number[]): boolean => {
    if (need === 0) {
      const key = taken.join(',');
      if (tried.has(key)) return false;
      tried.add(key);
      const left = [...sorted];
      for (const t of taken) left.splice(left.indexOf(t), 1);
      return partitions(rest, left);
    }
    for (let i = from; i < sorted.length; i++) {
      if (sorted[i] > need || (i > from && sorted[i] === sorted[i - 1])) continue;
      if (pick(i + 1, need - sorted[i], [...taken, sorted[i]])) return true;
    }
    return false;
  };
  return pick(0, first, []);
}

function regionSizes(filled: boolean[]): number[] {
  const seen = new Array<boolean>(CELLS).fill(false), sizes: number[] = [];
  for (let s = 0; s < CELLS; s++) {
    if (filled[s] || seen[s]) continue;
    let n = 0; const stack = [s]; seen[s] = true;
    while (stack.length) {
      const c = stack.pop()!; n++;
      for (const nx of NEIGHBOURS[c]) if (!filled[nx] && !seen[nx]) { seen[nx] = true; stack.push(nx); }
    }
    sizes.push(n);
  }
  return sizes;
}

/** Fill every empty square with paths of the given lengths. Returns the paths, or null when the budget runs out. */
function tile(rng: Rng, filled: boolean[], lengths: number[], budget: { n: number }): number[][] | null {
  const first = filled.indexOf(false);
  if (first < 0) return lengths.length ? null : [];
  if (!lengths.length || --budget.n < 0) return null;
  for (const len of rng.shuffle([...new Set(lengths)])) {
    const rest = lengths.slice(); rest.splice(rest.indexOf(len), 1);
    const sums = sumsOf(rest);
    const path: number[] = [first];
    filled[first] = true;
    const grow = (): number[][] | null => {
      if (path.length === len) {
        const sizes = regionSizes(filled);
        if (sizes.every((s) => sums[s]) && partitions(sizes, rest)) {
          const placed = path.slice();
          const more = tile(rng, filled, rest, budget);
          if (more) return [placed, ...more];
        }
        return null;
      }
      for (const nx of rng.shuffle(NEIGHBOURS[path[path.length - 1]])) {
        if (filled[nx]) continue;
        filled[nx] = true; path.push(nx);
        const done = grow();
        path.pop(); filled[nx] = false;
        if (done) return done;
        if (budget.n < 0) return null;
      }
      return null;
    };
    const done = grow();
    filled[first] = false;
    if (done) return done;
    if (budget.n < 0) return null;
  }
  return null;
}

/** Every set of squares along which `target` can be spelled, in either direction. */
export function placements(letters: string[], target: string): Set<string> {
  const found = new Set<string>();
  const used = new Array<boolean>(CELLS).fill(false);
  const path: number[] = [];
  const go = (cell: number, want: string) => {
    if (letters[cell] !== want[path.length]) return;
    used[cell] = true; path.push(cell);
    if (path.length === want.length) found.add(pathKey(path));
    else for (const nx of NEIGHBOURS[cell]) if (!used[nx]) go(nx, want);
    used[cell] = false; path.pop();
  };
  for (const w of new Set([target, reverse(target)])) for (let c = 0; c < CELLS; c++) go(c, w);
  return found;
}

/** A subset of the bank whose lengths add up to `total`, taken in the given (shuffled) order, 4 to 9 words. */
function chooseWords(bank: string[], total: number): string[] | null {
  const pick: string[] = [];
  const go = (i: number, left: number): boolean => {
    if (left === 0) return pick.length >= 4 && pick.length <= 9;
    if (i >= bank.length || pick.length >= 9) return false;
    if (bank[i].length <= left) { pick.push(bank[i]); if (go(i + 1, left - bank[i].length)) return true; pick.pop(); }
    return go(i + 1, left);
  };
  return go(0, total) ? [...pick] : null;
}

export function attemptBoard(pack: StrandsPack, rng: Rng): StrandsPuzzle | null {
  const span = rng.pick(pack.spangrams);
  const picked = chooseWords(rng.shuffle(pack.words.filter((w) => w !== span && !span.includes(w))), CELLS - span.length);
  if (!picked) return null;
  const axis: 'h' | 'v' = span.length >= ROWS && rng.next() < 0.5 ? 'v' : 'h';
  const spanPath = randomWalk(rng, span.length, axis);
  if (!spanPath) return null;
  const filled = new Array<boolean>(CELLS).fill(false);
  for (const c of spanPath) filled[c] = true;
  const paths = tile(rng, filled, picked.map((w) => w.length), { n: 1_500 });
  if (!paths) return null;
  // The same tiling can be read many ways: which word goes on which path (among paths of one length) and which
  // direction each one reads. Try a few readings before giving the tiling up, since the tiling is the costly part.
  for (let v = 0; v < 16; v++) {
    const left = rng.shuffle(picked);
    const words: StrandsWord[] = [{ word: span, cells: spanPath, spangram: true }];
    for (const cells of paths) {
      const w = left.splice(left.findIndex((x) => x.length === cells.length), 1)[0];
      words.push({ word: w, cells, spangram: false });
    }
    const letters = new Array<string>(CELLS).fill('');
    for (const w of words) {
      const order = rng.next() < 0.5 ? w.cells : [...w.cells].reverse();
      order.forEach((c, i) => { letters[c] = w.word[i]; });
    }
    // One way to spell each word, or this reading is ambiguous.
    let clean = true;
    for (const w of words) {
      const where = placements(letters, w.word);
      if (where.size !== 1 || !where.has(pathKey(w.cells))) { clean = false; break; }
    }
    if (clean) return { theme: pack.theme, letters, words };
  }
  return null;
}
