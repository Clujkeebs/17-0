/**
 * Sports Strands, the parts both the browser and the server need (no board data in here, so the client bundle stays small).
 *
 * A 6 by 8 board of letters. Every letter belongs to exactly one hidden word, found by tracing
 * touching letters (sideways, up, down or diagonal, never reusing a letter). One word, the spangram, names the
 * theme and runs from one side of the board to the opposite side.
 */
export const COLS = 6;
export const ROWS = 8;
export const CELLS = COLS * ROWS;

export interface StrandsWord { word: string; cells: number[]; spangram: boolean }
export interface StrandsPuzzle { theme: string; letters: string[]; words: StrandsWord[] }

export const NEIGHBOURS: number[][] = Array.from({ length: CELLS }, (_, i) => {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc);
  }
  return out;
});
export const touching = (a: number, b: number) => NEIGHBOURS[a].includes(b);
export const reverse = (s: string) => [...s].reverse().join('');

/** The word a chain of squares spells. */
export const spell = (letters: string[], cells: number[]) => cells.map((i) => letters[i]).join('');

/** A chain is valid when every square is on the board, none repeats and each touches the one before. */
export function validChain(cells: unknown): cells is number[] {
  if (!Array.isArray(cells) || cells.length < 2 || cells.length > CELLS) return false;
  if (!cells.every((c) => Number.isInteger(c) && c >= 0 && c < CELLS)) return false;
  if (new Set(cells).size !== cells.length) return false;
  return cells.every((c, i) => i === 0 || touching(cells[i - 1], c));
}

/** Which word (index into puzzle.words) a chain spells, either direction, or -1. */
export function wordAt(p: StrandsPuzzle, cells: number[]): number {
  if (!validChain(cells)) return -1;
  const s = spell(p.letters, cells);
  return p.words.findIndex((w) => w.word === s || w.word === reverse(s));
}

/** The squares of a word, in board order rather than word order, for a hint. */
export const hintCells = (p: StrandsPuzzle, index: number): number[] => [...(p.words[index]?.cells ?? [])].sort((a, b) => a - b);
