import { MLB_WIN_FLOOR_DEFAULT } from '@/lib/game/onesixtytwo';
import { getRedis } from './redis';

/** The 162-0 win line, fitted by the worker after each sync (kept apart from mlb-game so the worker never loads grading). */
export const MLB_FLOOR_KEY = 'mlb:win-floor';

export async function getMlbFloor(): Promise<number> {
  try { const v = Number(await getRedis().get(MLB_FLOOR_KEY)); return Number.isFinite(v) && v > 0 ? v : MLB_WIN_FLOOR_DEFAULT; }
  catch { return MLB_WIN_FLOOR_DEFAULT; }
}
