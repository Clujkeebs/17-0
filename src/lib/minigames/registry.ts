import type { MiniGame } from './types';

// Each game registers itself here. Keep in sync with src/lib/minigames/games/*.
import { games } from './games';

export const MINI_GAMES: Record<string, MiniGame> = Object.fromEntries(games.map((g) => [g.slug, g as MiniGame]));
export const getMiniGame = (slug: string): MiniGame | null => MINI_GAMES[slug] ?? null;
