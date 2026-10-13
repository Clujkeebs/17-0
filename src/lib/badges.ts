/**
 * Achievements, earned from what a player has actually done (results, streaks, points, the shop, Pick 'em, challenges).
 * Pure: the server gathers the facts (src/lib/server/badges.ts), this decides which achievements they earn. Which ones
 * a player has earned is worked out fresh each time; src/lib/server/badges.ts stores when, so a new one can be announced
 * once. Hidden achievements show as locked mysteries until they are earned.
 */
export interface BadgeFacts {
  perfect: Record<string, number>;     // perfect results by game type (17-0 at 17 wins, 82-0 at 82, 162-0 at 162, Build a Player 97+, a mini's own perfect)
  played: number;
  sports: string[];                    // sports with at least one game played
  longestStreak: number;
  boardBest: number | null;            // best finish on a daily board (1 = first)
  weekWins: number;                    // first place on a weekly board
  pickemPerfectWeeks: number;
  challengeWins: number;
  pointsEarned: number;
  // ---- seasons
  seasonPerfect: Record<string, number>;   // perfect seasons in 17-0, 82-0 and 162-0
  perfectHard: number;                 // perfect seasons in Hard mode
  perfectAllTime: number;              // perfect 17-0 seasons with All-time players
  perfect53: number;                   // perfect 17-0 seasons with the 53-man roster
  perfectFantasy: number;              // perfect fantasy lineups
  closeCalls: number;                  // seasons one game short of perfect
  strongSeasons: number;               // seasons won at 80 percent or better
  drySeasons: number;                  // seasons with next to no wins
  evenSeasons: number;                 // seasons finished dead even
  // ---- play
  games: number;                       // different games played
  ranked: number;                      // Today results
  perfectMinis: number;                // perfect results in the mini games
  perfectGames: number;                // different games with a perfect result
  puzzlesPerfect: string[];            // puzzle games (Sportle, Connections, Strands, Crossword) with a perfect result
  nightGames: number;                  // played between 1 and 4 a.m. Eastern
  earlyGames: number;                  // played between 4 and 7 a.m. Eastern
  midnightGames: number;               // played in the first five minutes of the Eastern day
  mostInADay: number;                  // most games in one Eastern day
  mostTypesInADay: number;             // most different games in one Eastern day
  weekendPairs: number;                // a Saturday and the Sunday after it, both played
  hatTricks: number;                   // days with three or more perfect results
  perfectStorms: number;               // days with a perfect season and a perfect puzzle
  backToBack: number;                  // perfect seasons on two days running
  // ---- Pick 'em, challenges, shop, drops, account
  pickemPicks: number; pickemRight: number;
  challengesMade: number; challengePlays: number; challengeTakers: number;
  itemsOwned: number; slotsWorn: number; pointsSpent: number; dropsClaimed: number; dropSniped: boolean;
  accountDays: number; joinedEarly: boolean; hasAvatar: boolean;
  secrets: string[];                   // codes this player has entered
}
export const NO_FACTS: BadgeFacts = {
  perfect: {}, played: 0, sports: [], longestStreak: 0, boardBest: null, weekWins: 0, pickemPerfectWeeks: 0, challengeWins: 0, pointsEarned: 0,
  seasonPerfect: {}, perfectHard: 0, perfectAllTime: 0, perfect53: 0, perfectFantasy: 0, closeCalls: 0, strongSeasons: 0, drySeasons: 0, evenSeasons: 0,
  games: 0, ranked: 0, perfectMinis: 0, perfectGames: 0, puzzlesPerfect: [], nightGames: 0, earlyGames: 0, midnightGames: 0, mostInADay: 0, mostTypesInADay: 0,
  weekendPairs: 0, hatTricks: 0, perfectStorms: 0, backToBack: 0,
  pickemPicks: 0, pickemRight: 0, challengesMade: 0, challengePlays: 0, challengeTakers: 0,
  itemsOwned: 0, slotsWorn: 0, pointsSpent: 0, dropsClaimed: 0, dropSniped: false, accountDays: 0, joinedEarly: false, hasAvatar: false, secrets: [],
};

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
/** Points paid once when an achievement is earned, by how hard it is. */
export const TIER_POINTS: Record<BadgeTier, number> = { bronze: 10, silver: 25, gold: 50, platinum: 100 };
export const BADGE_GROUPS = ['Seasons', 'Daily', 'Games', 'Puzzles', "Pick 'em", 'Social', 'Shop', 'Account', 'Secret'] as const;
export type BadgeGroup = (typeof BADGE_GROUPS)[number];

export interface Badge { key: string; label: string; desc: string; group: BadgeGroup; tier: BadgeTier; hidden?: boolean; /** Shown while a hidden one is locked. */ hint?: string; /** False for codes: they pay nothing. */ pays?: boolean }
type Rule = Badge & { earned: (f: BadgeFacts) => boolean };


const SEASON_GAMES = ['17-0', '82-0', '162-0'];
export const PUZZLES = ['sports-wordle', 'sports-connections', 'sports-strands', 'sports-crossword'];
/** Accounts made before this count as early adopters. */
export const EARLY_ADOPTER_BEFORE = '2026-11-01T05:00:00Z';
/** Accounts older than this have their first sync done silently: what they had already earned is not announced or paid. */
export const BADGES_LAUNCH = '2026-10-13T00:00:00Z';
export const KONAMI = 'konami';

const b = (key: string, label: string, desc: string, group: BadgeGroup, tier: BadgeTier, earned: (f: BadgeFacts) => boolean, extra: Partial<Badge> = {}): Rule => ({ key, label, desc, group, tier, earned, ...extra });

export const BADGES: Rule[] = [
  // ---- Seasons
  b('unbeaten', 'Unbeaten', 'A 17-0 season', 'Seasons', 'gold', (f) => (f.perfect['17-0'] ?? 0) > 0),
  b('eighty-two', '82-0', 'A perfect NBA season', 'Seasons', 'gold', (f) => (f.perfect['82-0'] ?? 0) > 0),
  b('one-sixty-two', '162-0', 'A perfect MLB season', 'Seasons', 'gold', (f) => (f.perfect['162-0'] ?? 0) > 0),
  b('forty-four', '44-0', 'A perfect WNBA season', 'Seasons', 'gold', (f) => (f.perfect['44-0'] ?? 0) > 0),
  b('clean-sweep', 'Clean Sweep', 'A perfect season in 17-0, 82-0 and 162-0', 'Seasons', 'platinum', (f) => SEASON_GAMES.every((g) => (f.seasonPerfect[g] ?? 0) > 0)),
  b('close-call', 'Close Call', 'One game short of a perfect season', 'Seasons', 'bronze', (f) => f.closeCalls > 0),
  b('hard-knocks', 'Hard Knocks', 'A perfect season in Hard mode', 'Seasons', 'gold', (f) => f.perfectHard > 0),
  b('all-time-great', 'All-Time Great', 'A perfect 17-0 season with All-time players', 'Seasons', 'gold', (f) => f.perfectAllTime > 0),
  b('full-roster', 'Full Roster', 'A perfect season with the 53-man roster', 'Seasons', 'gold', (f) => f.perfect53 > 0),
  b('fantasy-champ', 'Fantasy Champ', 'A perfect season with a fantasy lineup', 'Seasons', 'silver', (f) => f.perfectFantasy > 0),
  b('winning-ways', 'Winning Ways', 'Ten seasons won at 80 percent or better', 'Seasons', 'silver', (f) => f.strongSeasons >= 10),
  b('hall-of-famer', 'Hall of Famer', 'Built a player rated 97 or better', 'Seasons', 'silver', (f) => (f.perfect['build-a-player'] ?? 0) > 0),
  // ---- Daily
  b('first-down', 'First Down', 'Played your first game', 'Daily', 'bronze', (f) => f.played >= 1),
  b('three-peat', 'Three-peat', 'A 3-day streak', 'Daily', 'bronze', (f) => f.longestStreak >= 3),
  b('on-fire', 'On Fire', 'A 7-day streak', 'Daily', 'silver', (f) => f.longestStreak >= 7),
  b('fortnight', 'Fortnight', 'A 14-day streak', 'Daily', 'silver', (f) => f.longestStreak >= 14),
  b('iron-man', 'Iron Man', 'A 30-day streak', 'Daily', 'gold', (f) => f.longestStreak >= 30),
  b('half-century', 'Half Century', 'A 50-day streak', 'Daily', 'gold', (f) => f.longestStreak >= 50),
  b('century', 'Century', 'A 100-day streak', 'Daily', 'platinum', (f) => f.longestStreak >= 100),
  b('early-bird', 'Early Bird', 'Played between 4 and 7 a.m. Eastern', 'Daily', 'bronze', (f) => f.earlyGames > 0),
  b('night-owl', 'Night Owl', 'Played between 1 and 4 a.m. Eastern', 'Daily', 'bronze', (f) => f.nightGames > 0),
  b('weekend-warrior', 'Weekend Warrior', 'Played on a Saturday and the Sunday after it', 'Daily', 'bronze', (f) => f.weekendPairs > 0),
  b('full-slate', 'Full Slate', 'Five different games in one day', 'Daily', 'silver', (f) => f.mostTypesInADay >= 5),
  b('daily-dozen', 'Daily Dozen', 'Twelve games in one day', 'Daily', 'silver', (f) => f.mostInADay >= 12),
  b('top-ten', 'Top Ten', 'Top ten on a daily leaderboard', 'Daily', 'bronze', (f) => f.boardBest !== null && f.boardBest <= 10),
  b('podium', 'Podium', 'Top three on a daily leaderboard', 'Daily', 'silver', (f) => f.boardBest !== null && f.boardBest <= 3),
  b('champion', 'Champion', 'First on a daily leaderboard', 'Daily', 'gold', (f) => f.boardBest === 1),
  b('weekly-winner', 'Week Winner', 'First on a weekly leaderboard', 'Daily', 'gold', (f) => f.weekWins > 0),
  // ---- Games
  b('getting-started', 'Getting Started', '10 games played', 'Games', 'bronze', (f) => f.played >= 10),
  b('regular', 'Regular', '100 games played', 'Games', 'silver', (f) => f.played >= 100),
  b('five-hundred', 'Five Hundred', '500 games played', 'Games', 'gold', (f) => f.played >= 500),
  b('grinder', 'Grinder', '1,000 games played', 'Games', 'platinum', (f) => f.played >= 1000),
  b('polymath', 'Polymath', 'Played 20 different games', 'Games', 'silver', (f) => f.games >= 20),
  b('all-sport', 'All-Sport', 'Played football, basketball, baseball and soccer', 'Games', 'silver', (f) => ['nfl', 'nba', 'mlb', 'soccer'].every((s) => f.sports.includes(s))),
  b('sports-nut', 'Sports Nut', 'Played six different sports', 'Games', 'silver', (f) => f.sports.length >= 6),
  b('sharpshooter', 'Sharpshooter', 'Five perfect results in the mini games', 'Games', 'silver', (f) => f.perfectMinis >= 5),
  b('perfectionist', 'Perfectionist', 'A perfect result in 10 different games', 'Games', 'gold', (f) => f.perfectGames >= 10),
  // ---- Puzzles
  b('wordsmith', 'Wordsmith', 'A perfect Sportle, Connections, Strands or Crossword', 'Puzzles', 'silver', (f) => f.puzzlesPerfect.length > 0),
  b('puzzle-master', 'Puzzle Master', 'A perfect Sportle, Connections, Strands and Crossword', 'Puzzles', 'gold', (f) => PUZZLES.every((p) => f.puzzlesPerfect.includes(p))),
  // ---- Pick 'em
  b('picker', 'Picker', "Made your first Pick 'em pick", "Pick 'em", 'bronze', (f) => f.pickemPicks >= 1),
  b('sharp-eye', 'Sharp Eye', "10 right picks in Pick 'em", "Pick 'em", 'silver', (f) => f.pickemRight >= 10),
  b('oracle', 'Oracle', "50 right picks in Pick 'em", "Pick 'em", 'gold', (f) => f.pickemRight >= 50),
  b('perfect-week', 'Perfect Week', "Every Pick 'em pick right in a week", "Pick 'em", 'gold', (f) => f.pickemPerfectWeeks > 0),
  // ---- Social
  b('challenger', 'Challenger', 'Sent your first challenge', 'Social', 'bronze', (f) => f.challengesMade >= 1),
  b('rival', 'Rival', 'Played five challenges', 'Social', 'silver', (f) => f.challengePlays >= 5),
  b('giant-killer', 'Giant Killer', 'Beat the creator of a challenge', 'Social', 'silver', (f) => f.challengeWins > 0),
  b('crowd-pleaser', 'Crowd Pleaser', 'Ten players took your challenges', 'Social', 'silver', (f) => f.challengeTakers >= 10),
  // ---- Shop
  b('window-shopper', 'Window Shopper', 'Bought your first item', 'Shop', 'bronze', (f) => f.pointsSpent > 0),
  b('collector', 'Collector', 'Own 10 items', 'Shop', 'silver', (f) => f.itemsOwned >= 10),
  b('hoarder', 'Hoarder', 'Own 25 items', 'Shop', 'gold', (f) => f.itemsOwned >= 25),
  b('style-icon', 'Style Icon', 'Wearing something in all seven slots', 'Shop', 'silver', (f) => f.slotsWorn >= 7),
  b('big-spender', 'Big Spender', 'Spent 5,000 points', 'Shop', 'silver', (f) => f.pointsSpent >= 5000),
  b('high-roller', 'High Roller', '1,000 points earned', 'Shop', 'silver', (f) => f.pointsEarned >= 1000),
  b('five-k', 'Five Grand', '5,000 points earned', 'Shop', 'gold', (f) => f.pointsEarned >= 5000),
  b('drop-hunter', 'Drop Hunter', 'Claimed a free drop', 'Shop', 'silver', (f) => f.dropsClaimed >= 1),
  b('drop-collector', 'Drop Collector', 'Claimed three free drops', 'Shop', 'gold', (f) => f.dropsClaimed >= 3),
  b('full-set', 'Full Set', 'Claimed every drop item', 'Shop', 'platinum', (f) => f.dropsClaimed >= 6),
  // ---- Account
  b('face-time', 'Face Time', 'Set a profile picture', 'Account', 'bronze', (f) => f.hasAvatar),
  b('early-adopter', 'Early Adopter', 'Joined in the first month', 'Account', 'silver', (f) => f.joinedEarly),
  b('veteran', 'Veteran', 'An account 100 days old', 'Account', 'silver', (f) => f.accountDays >= 100),
  b('year-one', 'Year One', 'An account a year old', 'Account', 'gold', (f) => f.accountDays >= 365),
  // ---- Secret: shown as mysteries until earned
  b('insomniac', 'Insomniac', 'Played between 1 and 4 a.m. Eastern five times', 'Secret', 'silver', (f) => f.nightGames >= 5, { hidden: true, hint: 'Some people never sleep.' }),
  b('tank-commander', 'Tank Commander', 'A season with next to no wins', 'Secret', 'bronze', (f) => f.drySeasons > 0, { hidden: true, hint: 'Somebody has to finish last.' }),
  b('dead-even', 'Dead Even', 'A season that finished right in the middle', 'Secret', 'bronze', (f) => f.evenSeasons > 0, { hidden: true, hint: 'Neither good nor bad.' }),
  b('midnight-oil', 'Midnight Oil', 'Played in the first five minutes of the day', 'Secret', 'bronze', (f) => f.midnightGames > 0, { hidden: true, hint: 'The day starts at midnight.' }),
  b('hat-trick', 'Hat Trick', 'Three perfect results in one day', 'Secret', 'gold', (f) => f.hatTricks > 0, { hidden: true, hint: 'Do it three times in a day.' }),
  b('perfect-storm', 'Perfect Storm', 'A perfect season and a perfect puzzle on the same day', 'Secret', 'gold', (f) => f.perfectStorms > 0, { hidden: true, hint: 'Two kinds of perfect.' }),
  b('back-to-back', 'Back to Back', 'Perfect seasons on two days running', 'Secret', 'gold', (f) => f.backToBack > 0, { hidden: true, hint: 'Do it again tomorrow.' }),
  b('drop-sniper', 'Drop Sniper', 'Claimed a drop within 30 seconds of it landing', 'Secret', 'silver', (f) => f.dropSniped, { hidden: true, hint: 'Be there when it lands.' }),
  b(KONAMI, 'The Code', 'Entered the code', 'Secret', 'bronze', (f) => f.secrets.includes(KONAMI), { hidden: true, hint: 'Old school.', pays: false }),
  b('completionist', 'Completionist', 'Earned 40 achievements', 'Secret', 'platinum', () => false, { hidden: true, hint: 'Keep collecting.' }),
];

/** The achievements a player has earned, with how many ordinary ones that took (the Completionist counts those). */
export function earnedBadges(f: BadgeFacts): Badge[] {
  const strip = ({ earned: _earned, ...rest }: Rule): Badge => rest;
  const base = BADGES.filter((r) => r.key !== 'completionist' && r.earned(f));
  const out = base.map(strip);
  if (base.length >= 40) out.push(strip(BADGES.find((r) => r.key === 'completionist')!));
  return out;
}
export const badgeByKey = (key: string): Badge | undefined => { const r = BADGES.find((x) => x.key === key); return r ? { key: r.key, label: r.label, desc: r.desc, group: r.group, tier: r.tier, hidden: r.hidden, hint: r.hint, pays: r.pays } : undefined; };
/** Points an achievement pays when it is earned. */
export const badgePoints = (bd: Pick<Badge, 'tier' | 'pays'>) => (bd.pays === false ? 0 : TIER_POINTS[bd.tier]);

/** Daily Double: ranked games pay double points on one weekday (0 = Sunday). `null` when switched off. */
export const DOUBLE_DEFAULT_DAY = 6;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Weekday of an ET calendar date like "2026-10-03". */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
