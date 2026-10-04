import { describe, expect, it } from 'vitest';
import { buildCrossword, solutionRows } from '@/lib/minigames/puzzles/crossword';
import { CROSSWORD_BANK } from '@/lib/minigames/puzzles/crossword-bank';
import { sportsCrossword } from '@/lib/minigames/puzzles/games';

describe('Sports Crossword', () => {
  it('clue bank: unique words, letters only, a clue for each', () => {
    const words = CROSSWORD_BANK.map((e) => e.word);
    expect(new Set(words).size).toBe(words.length);
    for (const e of CROSSWORD_BANK) { expect(e.word).toMatch(/^[A-Z]{3,10}$/); expect(e.clue.length).toBeGreaterThanOrEqual(3); }
  });

  it('every board over 60 days is a valid crossword', () => {
    for (let d = 0; d < 60; d++) {
      const x = buildCrossword(`day-${d}`);
      expect(x).toEqual(buildCrossword(`day-${d}`));
      expect(x.words).toHaveLength(8);
      expect(x.rows).toBeLessThanOrEqual(11); expect(x.cols).toBeLessThanOrEqual(11);
      const sol = solutionRows(x);
      const owner = new Map<string, number>();
      for (const w of x.words) for (let i = 0; i < w.word.length; i++) {
        const r = w.row + (w.dir === 'down' ? i : 0), c = w.col + (w.dir === 'across' ? i : 0);
        expect(sol[r][c]).toBe(w.word[i]);
        owner.set(`${r},${c}`, (owner.get(`${r},${c}`) ?? 0) + 1);
      }
      // Every run of letters in a row or column is exactly one of the words (no accidental words from touching).
      const runs = (lines: string[], dir: 'across' | 'down') => lines.flatMap((line, i) => [...line.matchAll(/[A-Z]{2,}/g)].map((m) => ({ text: m[0], at: dir === 'across' ? `${i},${m.index}` : `${m.index},${i}` })));
      const cols = Array.from({ length: x.cols }, (_, c) => sol.map((l) => l[c]).join(''));
      const all = [...runs(sol, 'across').map((r) => ({ ...r, dir: 'across' })), ...runs(cols, 'down').map((r) => ({ ...r, dir: 'down' }))];
      expect(all.map((r) => `${r.dir}:${r.at}:${r.text}`).sort()).toEqual(x.words.map((w) => `${w.dir}:${w.row},${w.col}:${w.word}`).sort());
      // Connected: every word shares at least one square with another.
      for (const w of x.words) expect(Array.from({ length: w.word.length }, (_, i) => owner.get(`${w.row + (w.dir === 'down' ? i : 0)},${w.col + (w.dir === 'across' ? i : 0)}`)).some((n) => n === 2)).toBe(true);
    }
  });

  it('answers stay off the client; scoring and the check penalty', () => {
    const x = sportsCrossword.generate('s', { names: [] } as never);
    const view = JSON.stringify(sportsCrossword.publicView(x));
    for (const w of x.words) expect(view).not.toContain(`"${w.word}"`);
    const sol = solutionRows(x).map((l) => l.replace(/\./g, ' '));
    const clean = sportsCrossword.score(x, { rows: sol, wrongChecks: 0 }, { elapsedMs: 60_000 });
    const slow = sportsCrossword.score(x, { rows: sol, wrongChecks: 2 }, { elapsedMs: 60_000 });
    expect(clean.perfect).toBe(true); expect(clean.summary).toBe('1:00');
    expect(slow.summary).toBe('1:20'); expect(slow.score).toBeLessThan(clean.score);
    const blank = sportsCrossword.score(x, { rows: [] }, { elapsedMs: 1000 });
    expect(blank.score).toBe(0);
    expect(sportsCrossword.check!(x, { rows: sol }, { names: [] } as never)).toMatchObject({ solved: true, wrong: 0 });
    // Ranked: penalty comes from the checks the server recorded, not from the client's count.
    const ranked = sportsCrossword.applyChecks!({ rows: sol, wrongChecks: 0 }, [{ rows: [] }, { rows: sol }]);
    expect(sportsCrossword.score(x, ranked, { elapsedMs: 60_000 }).summary).toBe('1:10');
  });
});
