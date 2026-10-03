import type { MiniGame } from '../types';
import type { TopData, TopEntry, TopKey } from './data';
import { clock } from '../puzzles/games';

/**
 * Top 100: name as many of a league's top 100 as you can. Same list for everyone each day (the lists move as
 * ratings and stats update). Full names always count; a last name alone counts when only one player on the
 * list has it. Ranked by how many you found, then time.
 */
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'’-]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const lastOf = (s: string) => norm(s).split(' ').slice(-1)[0] ?? '';

/** Which entry a typed name means: a rank, 'ambiguous' when a last name is shared, or null. */
export function matchName(list: TopEntry[], typed: string): number | 'ambiguous' | null {
  const t = norm(typed);
  if (t.length < 3) return null;
  const full = list.find((e) => norm(e.name) === t);
  if (full) return full.rank;
  const byLast = list.filter((e) => lastOf(e.name) === t);
  if (byLast.length === 1) return byLast[0].rank;
  return byLast.length > 1 ? 'ambiguous' : null;
}

interface Puzzle { list: TopEntry[] }
interface Answer { guesses: string[] }
const LABEL: Record<TopKey, { name: string; tagline: string }> = {
  'nfl-now': { name: 'Top 100: NFL Now', tagline: 'The 100 highest-rated NFL players right now, by Madden overall. How many can you name?' },
  'nfl-all': { name: 'Top 100: NFL All-time', tagline: 'The 100 best retired NFL players by best graded season. How many can you name?' },
  'nba-now': { name: 'Top 100: NBA Now', tagline: 'The 100 highest-rated NBA players right now, by NBA 2K overall. How many can you name?' },
  'nba-all': { name: 'Top 100: NBA All-time', tagline: 'The 100 best single seasons since 1984-85, one per player. How many can you name?' },
  'mlb-now': { name: 'Top 100: MLB Now', tagline: 'The 100 best MLB seasons this year, by our stat grade. How many can you name?' },
  'mlb-all': { name: 'Top 100: MLB All-time', tagline: 'The 100 best single MLB seasons since 1970, one per player. How many can you name?' },
};

function topGame(key: TopKey, sport: 'top100'): MiniGame<Puzzle, Answer, TopData> {
  return {
    slug: `top-100-${key}`, sport, ...LABEL[key],
    howTo: [
      'Type a name and press Enter. Each slot shows a rank and a hint (position, team or season).',
      'A full name always counts. A last name alone counts when only one player on the list has it.',
      'No time limit. Stop when you are stuck. Ranked by players found, then time.',
    ],
    generate(_seed, data) {
      const list = data[key];
      if (list.length < 100) throw new Error('This list is still loading. Try another one.');
      return { list };
    },
    publicView: (p) => ({ slots: p.list.map((e) => ({ rank: e.rank, hint: e.hint })) }),
    check(p, guess) {
      const m = matchName(p.list, String((guess as { name?: unknown })?.name ?? ''));
      if (m === 'ambiguous') return { hit: false, message: 'More than one player on the list has that last name. Use the full name.' };
      if (m == null) return { hit: false, message: 'Not on this list.' };
      return { hit: true, rank: m, name: p.list[m - 1].name };
    },
    maxChecks: 400,
    applyChecks: (_a, checks) => ({ guesses: checks.map((c) => String((c as { name?: string })?.name ?? '')) }),
    score(p, answer, ctx) {
      if (!answer || !Array.isArray(answer.guesses)) throw new Error('No guesses.');
      const found = new Set<number>();
      for (const g of answer.guesses.slice(0, 400)) { const m = matchName(p.list, g); if (typeof m === 'number') found.add(m); }
      const n = found.size;
      return {
        score: n * 100_000 + Math.max(0, 99_999 - Math.round((ctx?.elapsedMs ?? 0) / 1000)),
        perfect: n === 100,
        summary: `${n}/100 · ${clock(ctx?.elapsedMs)}`,
        detail: { list: p.list.map((e) => ({ rank: e.rank, name: e.name, hint: e.hint, found: found.has(e.rank) })), n },
      };
    },
  };
}

export const TOP_KEYS: TopKey[] = ['nfl-now', 'nfl-all', 'nba-now', 'nba-all', 'mlb-now', 'mlb-all'];
export const top100Games = TOP_KEYS.map((k) => topGame(k, 'top100'));
