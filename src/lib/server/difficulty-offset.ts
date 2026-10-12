import { getRedis } from './redis';

/**
 * The balance nudge for a mode, added to its win line when a roster is graded (the daily step in difficulty-balance.ts
 * sets it; see game/difficulty.ts). Zero until the step has found one. Kept apart so grading stays light.
 */
export const OFFSET_KEY = (mode: string) => `difficulty:offset:${mode}`;
export const META_KEY = (mode: string) => `difficulty:meta:${mode}`;
/** Set to stop the daily step; offsets already found keep applying. */
export const BALANCE_OFF_KEY = 'difficulty:off';
/** The Eastern date of the last daily step. */
export const BALANCE_DAY_KEY = 'difficulty:balanced-on';

export async function getOffset(mode: string | null): Promise<number> {
  if (!mode) return 0;
  try { const v = Number(await getRedis().get(OFFSET_KEY(mode))); return Number.isFinite(v) ? v : 0; } catch { return 0; }
}
