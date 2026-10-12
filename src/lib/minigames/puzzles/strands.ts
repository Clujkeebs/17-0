import { createRng } from '@/lib/game/prng';
import { BOARDS } from './strands-boards';
import { CELLS, COLS, ROWS, type StrandsPuzzle } from './strands-core';

export * from './strands-core';

/**
 * Boards are built ahead of time by scripts/strands-build.ts (strands-gen.ts is the generator) and stored in
 * strands-boards.ts: laying words into a grid so that each can be spelled along exactly one path is a search that
 * mostly fails, so it is done once, offline, and checked by tests. At play time a seed picks a board and one of
 * four mirrorings of it. Same seed, same board.
 */

/** Where a square lands when the board is mirrored: 0 as stored, 1 left to right, 2 top to bottom, 3 both. */
const mirrored = (cell: number, how: number) => {
  const r = Math.floor(cell / COLS), c = cell % COLS;
  return (how & 2 ? ROWS - 1 - r : r) * COLS + (how & 1 ? COLS - 1 - c : c);
};

export function buildStrands(seed: string): StrandsPuzzle {
  const rng = createRng(seed);
  const board = rng.pick(BOARDS);
  const how = rng.int(0, 3);
  const letters = new Array<string>(CELLS).fill('');
  board.letters.split('').forEach((ch, i) => { letters[mirrored(i, how)] = ch; });
  return { theme: board.theme, letters, words: board.words.map(([word, cells], i) => ({ word, cells: cells.map((c) => mirrored(c, how)), spangram: i === 0 })) };
}
