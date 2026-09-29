import { hashSeed } from '@/lib/game/prng';

/** Stable unsigned hash of a string, used to vary copy deterministically per page. */
export const strHash = (s: string) => hashSeed(s)[0];

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export const possessive = (name: string) => (name.endsWith('s') ? `${name}'` : `${name}'s`);

export function heightStr(inches?: number | null) {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/** "the best in the league", "third among quarterbacks", ... */
export function rankPhrase(rank: number, total: number, groupPlural: string): string {
  if (rank === 1) return 'the best in the league';
  if (rank === 2) return 'second-best in the league';
  if (rank <= 5) return `${ordinal(rank)} among ${groupPlural}`;
  if (rank <= 10) return `inside the top 10 among ${groupPlural}`;
  if (total > 0 && rank <= Math.ceil(total * 0.25)) return `in the top quarter of ${total} ${groupPlural}`;
  return `${ordinal(rank)} of ${total} ${groupPlural}`;
}

export const lastWord = (s: string) => s.trim().split(/\s+/).slice(-1)[0] ?? s;
