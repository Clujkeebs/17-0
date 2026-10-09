import type { MiniGame } from './types';

// Each game registers itself here. Keep in sync with src/lib/minigames/games/*.
import { games } from './games';
import { nbaGames } from './nba/games';
import { wnbaGames } from './wnba/games';
import { puzzleGames } from './puzzles/games';
import { top100Games } from './top100/games';
import { soccerGames } from './soccer/games';
import { mlbGames } from './mlb/games';
import { fantasyGames } from './fantasy/games';

export const MINI_GAMES: Record<string, MiniGame<unknown, unknown, any>> = Object.fromEntries([...games, ...nbaGames, ...wnbaGames, ...puzzleGames, ...top100Games, ...soccerGames, ...mlbGames, ...fantasyGames].map((g) => [g.slug, g]));
export const getMiniGame = (slug: string): MiniGame<unknown, unknown, any> | null => MINI_GAMES[slug] ?? null;

/** Loads whichever data set the game draws on. */
export async function dataFor(game: { sport?: 'nba' | 'wnba' | 'mlb' | 'fantasy' | 'puzzles' | 'top100' | 'soccer' }) {
  if (game.sport === 'fantasy') return { players: await (await import('@/lib/server/fantasy-data')).loadFantasyPlayers() };
  if (game.sport === 'mlb') return (await import('./mlb/data')).loadMlbGameData();
  if (game.sport === 'soccer') return (await import('./soccer/data')).loadSoccerGameData();
  if (game.sport === 'top100') return (await import('./top100/data')).loadTop100();
  if (game.sport === 'wnba') return (await import('./wnba/data')).loadWnbaGameData();
  if (game.sport === 'nba') return (await import('./nba/data')).loadNbaGameData();
  if (game.sport === 'puzzles') return (await import('./puzzles/data')).loadPuzzleData();
  return (await import('./data')).loadGameData();
}
