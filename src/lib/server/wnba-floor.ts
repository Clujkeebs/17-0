import { WNBA_FLOOR_DEFAULT, type WnbaMode } from '@/lib/game/fortyfour';
import { getRedis } from './redis';

/** The 44-0 win line, fitted by the worker after each WNBA sync (kept apart from wnba-game so the worker never loads grading). */
export const WNBA_FLOOR_KEY = 'wnba:win-floor';
export const wnbaFloorKey = (mode: WnbaMode) => (mode === 'now' ? `${WNBA_FLOOR_KEY}:now` : WNBA_FLOOR_KEY);

export async function getWnbaFloor(mode: WnbaMode = 'eras'): Promise<number> {
  try { const v = Number(await getRedis().get(wnbaFloorKey(mode))); return Number.isFinite(v) && v > 0 ? v : WNBA_FLOOR_DEFAULT; }
  catch { return WNBA_FLOOR_DEFAULT; }
}
