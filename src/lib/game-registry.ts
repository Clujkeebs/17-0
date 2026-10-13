import { games } from '@/lib/minigames/games';
import { nbaGames } from '@/lib/minigames/nba/games';
import { wnbaGames } from '@/lib/minigames/wnba/games';
import { puzzleGames } from '@/lib/minigames/puzzles/games';
import { top100Games } from '@/lib/minigames/top100/games';
import { soccerGames } from '@/lib/minigames/soccer/games';
import { mlbGames } from '@/lib/minigames/mlb/games';
import { fantasyGames } from '@/lib/minigames/fantasy/games';
import { collegeGames } from '@/lib/minigames/college/games';

/**
 * Every ranked game on the site, grouped by sport, in the order the hub and leaderboards show them.
 * Adding a game here is what puts it on the leaderboards; nothing else needs a list.
 */
export type Sport = 'nfl' | 'nba' | 'wnba' | 'college' | 'mlb' | 'soccer' | 'puzzles';
export interface GameEntry { slug: string; name: string; sport: Sport; hard?: boolean }

export const SPORTS: { key: Sport; label: string }[] = [
  { key: 'nfl', label: 'Football' }, { key: 'nba', label: 'Basketball' }, { key: 'wnba', label: 'WNBA' }, { key: 'college', label: 'College' }, { key: 'mlb', label: 'Baseball' }, { key: 'soccer', label: 'Soccer' }, { key: 'puzzles', label: 'Puzzles' },
];

export const GAMES: GameEntry[] = [
  { slug: '17-0', name: '17-0', sport: 'nfl', hard: true },
  { slug: 'build-a-player', name: 'Build a Player', sport: 'nfl', hard: true },
  ...games.map((g) => ({ slug: g.slug, name: g.name, sport: 'nfl' as const })),
  ...fantasyGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'nfl' as const })),
  { slug: '82-0', name: '82-0', sport: 'nba', hard: true },
  ...nbaGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'nba' as const })),
  { slug: '44-0', name: '44-0', sport: 'wnba', hard: true },
  ...wnbaGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'wnba' as const })),
  ...collegeGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'college' as const })),
  { slug: '162-0', name: '162-0', sport: 'mlb', hard: true },
  ...mlbGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'mlb' as const })),
  ...soccerGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'soccer' as const })),
  ...puzzleGames.map((g) => ({ slug: g.slug, name: g.name, sport: 'puzzles' as const })),
  ...top100Games.map((g) => ({ slug: g.slug, name: g.name, sport: g.slug.split('-')[2] as Sport })),
];

export const gameEntry = (slug: string) => GAMES.find((g) => g.slug === slug);
export const gamesFor = (sport: Sport) => GAMES.filter((g) => g.sport === sport);

/**
 * The day each recent game arrived. The games hub puts anything from the last three weeks in a "New" row ahead of the
 * sport tabs, so a game on a tab nobody opened still gets seen. Add a line when a game ships; old lines can stay.
 */
export const ADDED: Record<string, string> = {
  '44-0': '2026-10-13',
  'cfb-build-a-player': '2026-10-13', 'cbb-build-a-player': '2026-10-13', 'wcbb-build-a-player': '2026-10-13',
  'cfb-higher-lower': '2026-10-12', 'cfb-blind-resume': '2026-10-12', 'cfb-who-led': '2026-10-12', 'cfb-whose-team': '2026-10-12',
  'cbb-higher-lower': '2026-10-12', 'cbb-blind-resume': '2026-10-12', 'cbb-who-led': '2026-10-12', 'cbb-whose-team': '2026-10-12',
  'wcbb-higher-lower': '2026-10-12', 'wcbb-blind-resume': '2026-10-12', 'wcbb-who-led': '2026-10-12', 'wcbb-whose-team': '2026-10-12',
  'sports-strands': '2026-10-12',
  'unbeaten-bowl': '2026-10-12',
  'wnba-higher-lower': '2026-10-09', 'wnba-blind-resume': '2026-10-09', 'wnba-who-led': '2026-10-09', 'wnba-whose-team': '2026-10-09',
  'soccer-assist-king': '2026-10-09', 'soccer-which-league': '2026-10-09', 'soccer-odd-club': '2026-10-09', 'soccer-rank-goals': '2026-10-09',
  'soccer-top-scorer': '2026-10-08', 'soccer-higher-lower': '2026-10-08', 'soccer-whose-club': '2026-10-08', 'soccer-where-from': '2026-10-08',
};

/** Games added in the last `days` days, newest first (ties keep the registry's order). */
export function recentGames(now = new Date(), days = 21): (GameEntry & { added: string })[] {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return GAMES.flatMap((g) => (ADDED[g.slug] && ADDED[g.slug] >= cutoff ? [{ ...g, added: ADDED[g.slug] }] : []))
    .sort((a, b) => (a.added < b.added ? 1 : a.added > b.added ? -1 : 0));
}
