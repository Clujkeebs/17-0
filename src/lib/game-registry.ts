import { games } from '@/lib/minigames/games';
import { nbaGames } from '@/lib/minigames/nba/games';

/**
 * Every ranked game on the site, grouped by sport, in the order the hub and leaderboards show them.
 * Adding a game here is what puts it on the leaderboards; nothing else needs a list.
 */
export type Sport = 'nfl' | 'nba' | 'mlb' | 'puzzles';
export interface GameEntry { slug: string; name: string; sport: Sport; hard?: boolean }

export const SPORTS: { key: Sport; label: string }[] = [
  { key: 'nfl', label: 'Football' }, { key: 'nba', label: 'Basketball' }, { key: 'mlb', label: 'Baseball' }, { key: 'puzzles', label: 'Puzzles' },
];

export const GAMES: GameEntry[] = [
  { slug: '17-0', name: '17-0', sport: 'nfl', hard: true },
  { slug: 'build-a-player', name: 'Build a Player', sport: 'nfl', hard: true },
  ...games.map((g) => ({ slug: g.slug, name: g.name, sport: 'nfl' as const })),
  { slug: '82-0', name: '82-0', sport: 'nba', hard: true },
  ...nbaGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'nba' as const })),
  { slug: '162-0', name: '162-0', sport: 'mlb', hard: true },
];

export const gameEntry = (slug: string) => GAMES.find((g) => g.slug === slug);
export const gamesFor = (sport: Sport) => GAMES.filter((g) => g.sport === sport);
