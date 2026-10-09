import { games } from '@/lib/minigames/games';
import { nbaGames } from '@/lib/minigames/nba/games';
import { wnbaGames } from '@/lib/minigames/wnba/games';
import { puzzleGames } from '@/lib/minigames/puzzles/games';
import { top100Games } from '@/lib/minigames/top100/games';
import { soccerGames } from '@/lib/minigames/soccer/games';
import { mlbGames } from '@/lib/minigames/mlb/games';
import { fantasyGames } from '@/lib/minigames/fantasy/games';

/**
 * Every ranked game on the site, grouped by sport, in the order the hub and leaderboards show them.
 * Adding a game here is what puts it on the leaderboards; nothing else needs a list.
 */
export type Sport = 'nfl' | 'nba' | 'mlb' | 'soccer' | 'puzzles';
export interface GameEntry { slug: string; name: string; sport: Sport; hard?: boolean }

export const SPORTS: { key: Sport; label: string }[] = [
  { key: 'nfl', label: 'Football' }, { key: 'nba', label: 'Basketball' }, { key: 'mlb', label: 'Baseball' }, { key: 'soccer', label: 'Soccer' }, { key: 'puzzles', label: 'Puzzles' },
];

export const GAMES: GameEntry[] = [
  { slug: '17-0', name: '17-0', sport: 'nfl', hard: true },
  { slug: 'build-a-player', name: 'Build a Player', sport: 'nfl', hard: true },
  ...games.map((g) => ({ slug: g.slug, name: g.name, sport: 'nfl' as const })),
  ...fantasyGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'nfl' as const })),
  { slug: '82-0', name: '82-0', sport: 'nba', hard: true },
  ...nbaGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'nba' as const })),
  ...wnbaGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'nba' as const })),
  { slug: '162-0', name: '162-0', sport: 'mlb', hard: true },
  ...mlbGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'mlb' as const })),
  ...soccerGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'soccer' as const })),
  ...puzzleGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'puzzles' as const })),
  ...top100Games.map((g) => ({ slug: g.slug, name: g.name, sport: g.slug.split('-')[2] as Sport })),
];

export const gameEntry = (slug: string) => GAMES.find((g) => g.slug === slug);
export const gamesFor = (sport: Sport) => GAMES.filter((g) => g.sport === sport);
