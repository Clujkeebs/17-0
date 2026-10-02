import { NBA_WIN_FLOOR_DEFAULT } from '@/lib/game/eightytwo';
import { getRedis } from './redis';

/** The 82-0 win line, fitted by the worker after each NBA sync. Kept apart from the game server so the worker bundle stays small. */
export const NBA_FLOOR_KEY = 'nba:win-floor';
export async function getNbaFloor(): Promise<number> {
  try { const v = Number(await getRedis().get(NBA_FLOOR_KEY)); return Number.isFinite(v) && v > 0 ? v : NBA_WIN_FLOOR_DEFAULT; } catch { return NBA_WIN_FLOOR_DEFAULT; }
}
