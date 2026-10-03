import { NBA_WIN_FLOOR_DEFAULT } from '@/lib/game/eightytwo';
import { getRedis } from './redis';

/** The 82-0 win line, fitted by the worker after each NBA sync. Kept apart from the game server so the worker bundle stays small. */
export const NBA_FLOOR_KEY = 'nba:win-floor';
export const NBA_FLOOR_KEY_2K = 'nba:win-floor:2k';
/** Standard (2K overalls) runs on a different scale from Classic, so it has its own line; 80 until fitted. */
export async function getNbaFloor(edition: 'classic' | 'standard' = 'classic'): Promise<number> {
  const fallback = edition === 'standard' ? 80 : NBA_WIN_FLOOR_DEFAULT;
  try { const v = Number(await getRedis().get(edition === 'standard' ? NBA_FLOOR_KEY_2K : NBA_FLOOR_KEY)); return Number.isFinite(v) && v > 0 ? v : fallback; } catch { return fallback; }
}
