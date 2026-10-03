import type { MiniGame } from './types';

// Each game registers itself here. Keep in sync with src/lib/minigames/games/*.
import { games } from './games';
import { nbaGames } from './nba/games';
import { puzzleGames } from './puzzles/games';
import { top100Games } from './top100/games';

export const MINI_GAMES: Record<string, MiniGame<unknown, unknown, any>> = Object.fromEntries([...games, ...nbaGames, ...puzzleGames, ...top100Games].map((g) => [g.slug, g]));
export const getMiniGame = (slug: string): MiniGame<unknown, unknown, any> | null => MINI_GAMES[slug] ?? null;

/** Loads whichever data set the game draws on. */
export async function dataFor(game: { sport?: 'nba' | 'puzzles' | 'top100' }) {
  if (game.sport === 'top100') return (await import('./top100/data')).loadTop100();
  if (game.sport === 'nba') return (await import('./nba/data')).loadNbaGameData();
  if (game.sport === 'puzzles') return (await import('./puzzles/data')).loadPuzzleData();
  return (await import('./data')).loadGameData();
}
