import { describe, expect, it } from 'vitest';
import { BOARDS } from '@/lib/minigames/puzzles/strands-boards';
import { PACKS } from '@/lib/minigames/puzzles/strands-bank';
import { placements } from '@/lib/minigames/puzzles/strands-gen';
import { buildStrands, CELLS, COLS, ROWS, spell, touching, validChain, wordAt, hintCells, reverse, type StrandsPuzzle } from '@/lib/minigames/puzzles/strands';
import { sportsStrands, type StrandsAnswer } from '@/lib/minigames/puzzles/games';

const key = (cells: number[]) => [...cells].sort((a, b) => a - b).join(',');

/** Everything a Strands board promises, checked against the board itself. */
function expectSound(p: StrandsPuzzle) {
  expect(p.letters).toHaveLength(CELLS);
  expect(p.letters.every((l) => /^[A-Z]$/.test(l))).toBe(true);
  // Every square belongs to exactly one word, and the words fill the board.
  const all = p.words.flatMap((w) => w.cells).sort((a, b) => a - b);
  expect(all).toEqual(Array.from({ length: CELLS }, (_, i) => i));
  expect(p.words.filter((w) => w.spangram)).toHaveLength(1);
  expect(p.words[0].spangram).toBe(true);
  for (const w of p.words) {
    expect(w.word.length, w.word).toBeGreaterThanOrEqual(4);
    expect(w.cells).toHaveLength(w.word.length);
    // The squares form a chain of touching letters that spells the word, one way or the other.
    expect(w.cells.every((c, i) => i === 0 || touching(w.cells[i - 1], c)), `${w.word} chain`).toBe(true);
    const s = spell(p.letters, w.cells);
    expect([w.word, reverse(w.word)], `${w.word} spelled ${s}`).toContain(s);
    // One way to spell it: no other path on the board makes the same word.
    const where = placements(p.letters, w.word);
    expect([...where], `${w.word} placements`).toEqual([key(w.cells)]);
  }
  // The spangram starts on one edge of the board and ends on the opposite edge.
  const span = p.words[0].cells;
  const [first, last] = [span[0], span[span.length - 1]];
  const opposite = (side: (c: number) => number, max: number) => [side(first), side(last)].sort((x, y) => x - y).join() === `0,${max}`;
  expect(opposite((c) => c % COLS, COLS - 1) || opposite((c) => Math.floor(c / COLS), ROWS - 1), 'spangram spans the board').toBe(true);
}

describe('strands boards', () => {
  it('has plenty of boards across many themes', () => {
    expect(BOARDS.length).toBeGreaterThan(150);
    expect(new Set(BOARDS.map((b) => b.theme)).size).toBeGreaterThanOrEqual(30);
    const themes = new Set(PACKS.map((p) => p.theme));
    for (const b of BOARDS) expect(themes.has(b.theme), b.theme).toBe(true);
  });
  it('every stored board is sound and unambiguous', () => {
    for (const b of BOARDS) {
      expectSound({ theme: b.theme, letters: b.letters.split(''), words: b.words.map(([word, cells], i) => ({ word, cells, spangram: i === 0 })) });
    }
  });
  it('words come from their theme pack', () => {
    for (const b of BOARDS) {
      const pack = PACKS.find((p) => p.theme === b.theme)!;
      const [span, ...rest] = b.words.map(([w]) => w);
      expect(pack.spangrams, `${b.theme} spangram`).toContain(span);
      for (const w of rest) expect(pack.words, `${b.theme} ${w}`).toContain(w);
    }
  });
});

describe('buildStrands', () => {
  it('is deterministic and every seed gives a sound, mirrored board', () => {
    expect(buildStrands('2026-10-12')).toEqual(buildStrands('2026-10-12'));
    const themes = new Set<string>();
    for (let i = 0; i < 120; i++) { const p = buildStrands(`seed-${i}`); expectSound(p); themes.add(p.theme); }
    expect(themes.size).toBeGreaterThan(15);
  });
  it('mirroring keeps words findable', () => {
    for (let i = 0; i < 40; i++) {
      const p = buildStrands(`m-${i}`);
      for (const [k, w] of p.words.entries()) {
        expect(wordAt(p, w.cells)).toBe(k);
        expect(wordAt(p, [...w.cells].reverse())).toBe(k);
      }
    }
  });
});

describe('chains', () => {
  it('only touching, unrepeated, on-board squares are chains', () => {
    expect(validChain([0, 1, 2])).toBe(true);
    expect(validChain([0, 7])).toBe(true);        // diagonal
    expect(validChain([0, 2])).toBe(false);       // gap
    expect(validChain([0, 1, 0])).toBe(false);    // repeat
    expect(validChain([0, 48])).toBe(false);      // off the board
    expect(validChain([5, 6])).toBe(false);       // wraps around the edge
    expect(validChain([0.5, 1])).toBe(false);
    expect(validChain('abc')).toBe(false);
    expect(validChain([3])).toBe(false);
  });
});

describe('Sports Strands scoring', () => {
  const p = buildStrands('score-test');
  const solve = (extra: StrandsAnswer['guesses'] = []): StrandsAnswer => ({ guesses: [...extra, ...p.words.map((w) => ({ cells: w.cells }))] });

  it('check tells a theme word from a miss, and a hint lights one word', () => {
    const w = p.words[2];
    expect(sportsStrands.check!(p, { cells: w.cells }, {} as never)).toMatchObject({ found: true, index: 2, spangram: false });
    expect(sportsStrands.check!(p, { cells: [...w.cells].reverse() }, {} as never)).toMatchObject({ found: true, index: 2 });
    expect(sportsStrands.check!(p, { cells: w.cells.slice(0, 3) }, {} as never)).toMatchObject({ found: false, short: true });
    expect(sportsStrands.check!(p, { cells: [0, 1, 2, 3, 4, 5] }, {} as never)).toMatchObject({ found: false });
    expect(sportsStrands.check!(p, { hint: 3 }, {} as never)).toEqual({ hint: true, cells: hintCells(p, 3) });
    expect(() => sportsStrands.check!(p, { hint: 99 }, {} as never)).toThrow();
    expect(() => sportsStrands.check!(p, { cells: [0, 2] }, {} as never)).toThrow();
    // The public view never carries the words.
    expect(JSON.stringify(sportsStrands.publicView(p))).not.toContain(p.words[0].word);
  });
  it('clearing the board with no hints is perfect, and a faster time scores higher', () => {
    const fast = sportsStrands.score(p, solve(), { elapsedMs: 40_000 });
    const slow = sportsStrands.score(p, solve(), { elapsedMs: 160_000 });
    expect(fast.perfect).toBe(true);
    expect(fast.score).toBeGreaterThan(slow.score);
    expect(fast.summary).toMatch(/^Cleared · 0 hints · 0:40$/);
  });
  it('hints cost points and the perfect flag; missing words cost more than any hint', () => {
    const clean = sportsStrands.score(p, solve(), { elapsedMs: 60_000 });
    const hinted = sportsStrands.score(p, solve([{ hint: 1 }, { hint: 2 }]), { elapsedMs: 60_000 });
    expect(hinted.perfect).toBe(false);
    expect(hinted.score).toBe(clean.score - 20_000);
    const partial = sportsStrands.score(p, { guesses: p.words.slice(0, p.words.length - 1).map((w) => ({ cells: w.cells })) }, { elapsedMs: 5_000 });
    expect(partial.score).toBeLessThan(hinted.score);
    expect(partial.summary).toBe(`${p.words.length - 1}/${p.words.length} words`);
  });
  it('replays only what counts: repeats, junk and short chains add nothing', () => {
    const one = p.words[3];
    const r = sportsStrands.score(p, { guesses: [{ cells: one.cells }, { cells: one.cells }, { cells: [0, 2] }, { cells: [] }, { cells: [9, 10, 11] }, null as never, { cells: 'x' as never }] }, { elapsedMs: 1000 });
    expect(r.summary).toBe(`1/${p.words.length} words`);
    expect(() => sportsStrands.score(p, { guesses: 'nope' } as never)).toThrow();
  });
  it('ranked checks rebuild the answer from what the server saw', () => {
    const answer = sportsStrands.applyChecks!({ guesses: [] }, [{ cells: p.words[0].cells }, { hint: 2 }, { hint: '3' }, { cells: undefined }]);
    expect(answer.guesses).toEqual([{ cells: p.words[0].cells }, { hint: 2 }, { hint: 3 }, { cells: [] }]);
  });
});
