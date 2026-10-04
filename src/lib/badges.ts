/**
 * Profile badges, earned from what a player has actually done (results, streaks, points history).
 * Pure: the server gathers the facts, this decides which badges they earn. Nothing is stored.
 */
export interface BadgeFacts {
  perfect: Record<string, number>;   // perfect results by game type (17-0 at 17 wins, 82-0 at 82, 162-0 at 162, Build a Player 97+, minis' own perfect)
  played: number;
  sports: string[];                  // sports with at least one game played
  longestStreak: number;
  boardBest: number | null;          // best finish on a daily board (1 = first)
  weekWins: number;                  // first place on a weekly board
  pickemPerfectWeeks: number;
  challengeWins: number;
  pointsEarned: number;
}
export interface Badge { key: string; label: string; desc: string }

export const BADGES: (Badge & { earned: (f: BadgeFacts) => boolean })[] = [
  { key: 'unbeaten', label: 'Unbeaten', desc: 'A 17-0 season', earned: (f) => (f.perfect['17-0'] ?? 0) > 0 },
  { key: 'eighty-two', label: '82-0', desc: 'A perfect NBA season', earned: (f) => (f.perfect['82-0'] ?? 0) > 0 },
  { key: 'one-sixty-two', label: '162-0', desc: 'A perfect MLB season', earned: (f) => (f.perfect['162-0'] ?? 0) > 0 },
  { key: 'hall-of-famer', label: 'Hall of Famer', desc: 'Built a player rated 97 or better', earned: (f) => (f.perfect['build-a-player'] ?? 0) > 0 },
  { key: 'wordsmith', label: 'Wordsmith', desc: 'A perfect Wordle, Connections or Crossword', earned: (f) => ['sports-wordle', 'sports-connections', 'sports-crossword'].some((g) => (f.perfect[g] ?? 0) > 0) },
  { key: 'on-fire', label: 'On Fire', desc: 'A 7-day streak', earned: (f) => f.longestStreak >= 7 },
  { key: 'iron-man', label: 'Iron Man', desc: 'A 30-day streak', earned: (f) => f.longestStreak >= 30 },
  { key: 'century', label: 'Century', desc: 'A 100-day streak', earned: (f) => f.longestStreak >= 100 },
  { key: 'regular', label: 'Regular', desc: '100 games played', earned: (f) => f.played >= 100 },
  { key: 'grinder', label: 'Grinder', desc: '1,000 games played', earned: (f) => f.played >= 1000 },
  { key: 'all-sport', label: 'All-Sport', desc: 'Played football, basketball, baseball and soccer', earned: (f) => ['nfl', 'nba', 'mlb', 'soccer'].every((s) => f.sports.includes(s)) },
  { key: 'podium', label: 'Podium', desc: 'Top three on a daily leaderboard', earned: (f) => f.boardBest !== null && f.boardBest <= 3 },
  { key: 'champion', label: 'Champion', desc: 'First on a daily leaderboard', earned: (f) => f.boardBest === 1 },
  { key: 'weekly-winner', label: 'Week Winner', desc: 'First on a weekly leaderboard', earned: (f) => f.weekWins > 0 },
  { key: 'perfect-week', label: 'Perfect Week', desc: 'Every Pick \'em pick right in a week', earned: (f) => f.pickemPerfectWeeks > 0 },
  { key: 'giant-killer', label: 'Giant Killer', desc: 'Beat the creator of a challenge', earned: (f) => f.challengeWins > 0 },
  { key: 'high-roller', label: 'High Roller', desc: '1,000 points earned', earned: (f) => f.pointsEarned >= 1000 },
];

export const earnedBadges = (f: BadgeFacts): Badge[] => BADGES.filter((b) => b.earned(f)).map(({ key, label, desc }) => ({ key, label, desc }));

/** Daily Double: ranked games pay double points on one weekday (0 = Sunday). `null` when switched off. */
export const DOUBLE_DEFAULT_DAY = 6;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Weekday of an ET calendar date like "2026-10-03". */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
