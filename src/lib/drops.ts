import { dailyDateET } from '@/lib/game/daily';
import type { Rng } from '@/lib/game/prng';

/**
 * Free drops: a few items nobody can buy turn up in the shop at random, free to claim for ten minutes.
 * This file is the schedule math only (pure, so it is easy to test); the database side is src/lib/server/drops.ts.
 */
export const DROP_WINDOW_MS = 10 * 60_000;
/** The first drop lands a day or two out; after that, two to four days between drops. */
export const FIRST_DROP_DAYS: [number, number] = [1, 2];
export const NEXT_DROP_DAYS: [number, number] = [2, 4];
/** Drops land between 7:00 and 22:30 Eastern, mostly after school, some at lunch. */
const WAKING: [number, number] = [7 * 60, 22 * 60 + 30];
const AFTER_SCHOOL: [number, number] = [15 * 60, 21 * 60];
const LUNCH: [number, number] = [11 * 60, 14 * 60 + 30];

/** Minutes after midnight Eastern for a drop: 55 percent after school, 25 percent around lunch, the rest any waking hour. */
export function dropMinute(rng: Rng): number {
  const r = rng.next();
  const [a, b] = r < 0.55 ? AFTER_SCHOOL : r < 0.8 ? LUNCH : WAKING;
  return rng.int(a, b);
}

const hm = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
/** The instant at a wall-clock time (minutes after midnight) on an Eastern calendar date such as "2026-10-12". */
export function etInstant(date: string, minutes: number): Date {
  const asUtc = Date.parse(`${date}T00:00:00Z`) + minutes * 60_000;
  // Eastern is four or five hours behind UTC depending on daylight saving: take the offset that reads back as the same wall clock.
  for (const hours of [5, 4]) {
    const t = new Date(asUtc + hours * 3_600_000);
    const parts = hm.formatToParts(t);
    const h = Number(parts.find((p) => p.type === 'hour')!.value), m = Number(parts.find((p) => p.type === 'minute')!.value);
    if (h * 60 + m === minutes) return t;
  }
  return new Date(asUtc + 5 * 3_600_000);
}

const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/**
 * The next drop: a random item from the pool (never the same one twice in a row) at a random time a few days after
 * `after`. Pass `first` for the very first drop, which comes sooner.
 */
export function planDrop(after: Date, rng: Rng, pool: readonly string[], lastItem?: string | null, first = false): { startsAt: Date; itemKey: string } {
  if (!pool.length) throw new Error('No drop items.');
  const [lo, hi] = first ? FIRST_DROP_DAYS : NEXT_DROP_DAYS;
  const day = addDays(dailyDateET(after), rng.int(lo, hi));
  const startsAt = etInstant(day, dropMinute(rng));
  const choices = pool.length > 1 ? pool.filter((k) => k !== lastItem) : pool;
  return { startsAt, itemKey: rng.pick(choices) };
}

export type DropPhase = 'soon' | 'live' | 'over';
export interface DropWindow { startsAt: Date | string; endsAt: Date | string }
export function dropPhase(d: DropWindow, now: Date = new Date()): DropPhase {
  const t = now.getTime();
  return t < new Date(d.startsAt).getTime() ? 'soon' : t < new Date(d.endsAt).getTime() ? 'live' : 'over';
}
/** Whole seconds left in the claim window (0 when over). */
export const secondsLeft = (d: Pick<DropWindow, 'endsAt'>, now: Date = new Date()) => Math.max(0, Math.ceil((new Date(d.endsAt).getTime() - now.getTime()) / 1000));
/** m:ss for a countdown. */
export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
