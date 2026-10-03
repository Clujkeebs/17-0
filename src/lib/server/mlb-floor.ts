import { MLB_WIN_FLOOR_DEFAULT, type MlbMode } from '@/lib/game/onesixtytwo';
import { getRedis } from './redis';

/** The 162-0 win line, fitted by the worker after each sync (kept apart from mlb-game so the worker never loads grading). */
export const MLB_FLOOR_KEY = 'mlb:win-floor';
export const mlbFloorKey = (mode: MlbMode) => (mode === 'now' ? `${MLB_FLOOR_KEY}:now` : MLB_FLOOR_KEY);

export async function getMlbFloor(mode: MlbMode = 'eras'): Promise<number> {
  try { const v = Number(await getRedis().get(mlbFloorKey(mode))); return Number.isFinite(v) && v > 0 ? v : MLB_WIN_FLOOR_DEFAULT; }
  catch { return MLB_WIN_FLOOR_DEFAULT; }
}
