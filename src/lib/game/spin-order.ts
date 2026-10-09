import { createRng } from './prng';

/**
 * Re-spins that are the same for everybody. Each spin (a round's first draw, or the n-th re-spin in that round)
 * shuffles every candidate in an order fixed by the seed, the round and n, then takes the first one this player
 * can use. Two players on Today who re-spin the same round the same number of times land on the same team,
 * unless that team is already on one of their boards.
 */
/** Callers pass candidates in a fixed order (sorted ids), since the shuffle starts from it. */
export function firstAllowed<T>(key: string, all: readonly T[], ok: (x: T) => boolean): T | undefined {
  return createRng(key).shuffle([...all]).find(ok);
}

/** The key for one spin: `kind` is the draw ('spin'), a team re-spin ('team') or an era re-spin ('era'). */
export const spinKey = (game: string, seed: string, round: number, kind: 'spin' | 'team' | 'era', n = 0) => `${game}:${seed}:r${round}:${kind}${n}`;
