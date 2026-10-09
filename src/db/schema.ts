import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, text, integer, real, boolean, jsonb, timestamp, serial, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  maddenId: text('madden_id').unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
  city: text('city').notNull(),
  conference: text('conference').notNull(),
  division: text('division').notNull(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').notNull(),
});

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  maddenId: text('madden_id').notNull().unique(),
  slug: text('slug').notNull().unique(),
  espnId: text('espn_id'),
  fullName: text('full_name').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  position: text('position').notNull(),
  teamId: integer('team_id').references(() => teams.id),
  heightInches: integer('height_inches'),
  weightLbs: integer('weight_lbs'),
  college: text('college'),
  jerseyNumber: integer('jersey_number'),
  age: integer('age'),
  yearsPro: integer('years_pro'),
  overallRating: integer('overall_rating').notNull(),
  attributes: jsonb('attributes').$type<Record<string, number>>().notNull(),
  archetype: text('archetype'),
  imageUrl: text('image_url'),
  imageBlobUrl: text('image_blob_url'),
  isActive: boolean('is_active').notNull().default(true),
  isAllTimeGreat: boolean('is_all_time_great').notNull().default(false),
  maddenVersion: text('madden_version').notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
  // Fantasy edition (Sleeper, PPR): this season's points per game and games played, plus the season projection per game.
  fantasyPpg: real('fantasy_ppg'),
  fantasyGames: integer('fantasy_games'),
  fantasyProjPpg: real('fantasy_proj_ppg'),
  fantasyUpdatedAt: timestamp('fantasy_updated_at', { withTimezone: true }),
  /** Recent form: PPR points per game over the last four games played, newest weighted most (4-3-2-1). */
  fantasyRecent: real('fantasy_recent'),
  sleeperId: text('sleeper_id'),
  /** Sleeper's popularity rank (lower is more drafted and rostered); used to find waiver-wire players. */
  sleeperRank: integer('sleeper_rank'),
  /** Adds across Sleeper leagues in the last 48 hours. */
  fantasyTrend: integer('fantasy_trend'),
}, (t) => [index('players_team_idx').on(t.teamId), index('players_pos_idx').on(t.position)]);

export const coaches = pgTable('coaches', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  fullName: text('full_name').notNull(),
  teamId: integer('team_id').references(() => teams.id),
  coachImpactScore: integer('coach_impact_score').notNull().default(70),
  imageUrl: text('image_url'),
  careerWins: integer('career_wins').notNull().default(0),
  careerLosses: integer('career_losses').notNull().default(0),
  superBowlWins: integer('super_bowl_wins').notNull().default(0),
  yearsWithTeam: integer('years_with_team').notNull().default(0),
  recent3yrWinPct: integer('recent_3yr_win_pct_x1000').notNull().default(500),
  playoffAppearances3yr: integer('playoff_appearances_3yr').notNull().default(0),
  impactHistory: jsonb('impact_history').$type<{ at: string; score: number }[]>().notNull().default([]),
});

export const maddenRatingsHistory = pgTable('madden_ratings_history', {
  id: serial('id').primaryKey(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
  maddenVersion: text('madden_version').notNull(),
  overallRating: integer('overall_rating').notNull(),
  attributes: jsonb('attributes').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
});

export const syncSnapshots = pgTable('sync_snapshots', {
  id: serial('id').primaryKey(),
  sourceUrl: text('source_url').notNull(),
  rawHtml: text('raw_html'),
  parsedCount: integer('parsed_count').notNull().default(0),
  status: text('status').notNull().default('running'),
  errors: jsonb('errors').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Auth.js tables. "user_accounts" per spec; Auth.js adapter tables alongside.
export const users = pgTable('user_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Optional: players can sign up with a username and password only. Email is for recovery and the newsletter.
  email: text('email').unique(),
  name: text('display_name'),
  username: text('username').unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  image: text('image'),
  hashedPassword: text('hashed_password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  newsletterOptIn: boolean('newsletter_opt_in').notNull().default(false),
  newsletterConfirmedAt: timestamp('newsletter_confirmed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  soundEnabled: boolean('sound_enabled').notNull().default(false),
  /** Profile: up to three favorite game slugs, and the name style the player equipped (unlocked by streaks). */
  favoriteGames: jsonb('favorite_games').$type<string[]>().notNull().default([]),
  nameFont: text('name_font'),
  nameColor: text('name_color'),
  /** Shop: spendable points (the ledger in point_events is the source of truth) and equipped cosmetics. */
  points: integer('points').notNull().default(0),
  pointsEarned: integer('points_earned').notNull().default(0),
  equipBorder: text('equip_border'),
  equipBanner: text('equip_banner'),
  equipTitle: text('equip_title'),
  equipFlair: text('equip_flair'),
  /** Owner moderation: hidden players never appear on leaderboards or earn board awards. */
  lbHidden: boolean('lb_hidden').notNull().default(false),
});

/** Every point earned or spent. (user, reason, ref) is unique, so a grant can never be paid twice. */
export const pointEvents = pgTable('point_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  ref: text('ref').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('point_events_once_idx').on(t.userId, t.reason, t.ref), index('point_events_user_idx').on(t.userId, t.createdAt)]);

/** Shop items a player owns. */
export const userItems = pgTable('user_items', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemKey: text('item_key').notNull(),
  pricePaid: integer('price_paid').notNull().default(0),
  acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.itemKey] })]);

/** Units sold of each limited item; the row is locked during a purchase so stock never oversells. */
export const shopStock = pgTable('shop_stock', {
  itemKey: text('item_key').primaryKey(),
  sold: integer('sold').notNull().default(0),
});

export const accounts = pgTable('auth_accounts', {
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable('auth_sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('auth_verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  gameType: text('game_type').notNull(),
  seed: text('seed').notNull(),
  spinPayload: jsonb('spin_payload').notNull(),
  token: text('token').notNull(),
  isDaily: boolean('is_daily').notNull().default(false),
  dailyDate: text('daily_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  completed: boolean('completed').notNull().default(false),
});

export const gameResults = pgTable('game_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: text('username'),
  gameType: text('game_type').notNull(),
  isDaily: boolean('is_daily').notNull().default(false),
  dailyDate: text('daily_date'),
  resultData: jsonb('result_data').notNull(),
  score: integer('score').notNull(),
  flagged: boolean('flagged').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('results_daily_idx').on(t.dailyDate, t.score),
  index('results_user_idx').on(t.userId),
  // Ranked "Today" games: one result per user, per game, per day.
  uniqueIndex('results_one_daily_per_user').on(t.userId, t.gameType, t.dailyDate).where(sql`${t.isDaily} and ${t.userId} is not null`),
]);

export const gameConfigs = pgTable('game_configs', {
  id: serial('id').primaryKey(),
  gameType: text('game_type').notNull(),
  configKey: text('config_key').notNull(),
  configValue: jsonb('config_value').notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
}, (t) => [index('configs_key_idx').on(t.gameType, t.configKey)]);

export const adPlacements = pgTable('ad_placements', {
  id: serial('id').primaryKey(),
  slotName: text('slot_name').notNull().unique(),
  adsenseUnitId: text('adsense_unit_id'),
  enabled: boolean('enabled').notNull().default(false),
  minViewportWidth: integer('min_viewport_width').notNull().default(0),
});

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  confirmed: boolean('confirmed').notNull().default(false),
  confirmationToken: text('confirmation_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  unsubscribeToken: text('unsubscribe_token').notNull(),
  source: text('source'),
  ipHash: text('ip_hash'),
  referrer: text('referrer'),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('newsletter_email_idx').on(t.email)]);

export const newsletterEvents = pgTable('newsletter_events', {
  id: serial('id').primaryKey(),
  subscriberId: uuid('subscriber_id').references(() => newsletterSubscribers.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  ipHash: text('ip_hash'),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('contact_messages_created_idx').on(t.createdAt)]);

/* ------------------------------------------------------------------ 82-0 (NBA), from ESPN's core API */

/** A franchise in one season. ESPN keeps one id per franchise through relocations (Sonics to Thunder). */
export const nbaTeamSeasons = pgTable('nba_team_seasons', {
  teamId: integer('team_id').notNull(),
  season: integer('season').notNull(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  abbreviation: text('abbreviation').notNull(),
  color: text('color'),
  logoUrl: text('logo_url'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.teamId, t.season] })]);

export const nbaPlayers = pgTable('nba_players', {
  id: integer('id').primaryKey(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
  headshot: text('headshot'),
  /** NBA 2K overall rating (source: nba2klab.com), current players only; null when not in 2K. */
  rating2k: integer('rating_2k'),
  rating2kPosition: text('rating_2k_position'),
  /** ESPN franchise id of the player's team in 2K's current rosters. */
  rating2kTeamId: integer('rating_2k_team_id'),
  rating2kUpdatedAt: timestamp('rating_2k_updated_at', { withTimezone: true }),
});

/** One row per player, team and season, with per-game regular season stats and the 82-0 value. */
export const nbaPlayerSeasons = pgTable('nba_player_seasons', {
  playerId: integer('player_id').notNull(),
  teamId: integer('team_id').notNull(),
  season: integer('season').notNull(),
  gp: integer('gp').notNull(),
  mpg: real('mpg').notNull(),
  ppg: real('ppg').notNull(),
  rpg: real('rpg').notNull(),
  apg: real('apg').notNull(),
  spg: real('spg').notNull(),
  bpg: real('bpg').notNull(),
  tov: real('tov'),
  fgPct: real('fg_pct'),
  tpPct: real('tp_pct'),
  ftPct: real('ft_pct'),
  value: real('value').notNull(),
}, (t) => [primaryKey({ columns: [t.playerId, t.teamId, t.season] }), index('nba_ps_team_season_idx').on(t.teamId, t.season)]);

/* ------------------------------------------------------------------ WNBA, from ESPN's core API (same shape as the NBA tables) */

export const wnbaTeamSeasons = pgTable('wnba_team_seasons', {
  teamId: integer('team_id').notNull(),
  season: integer('season').notNull(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  abbreviation: text('abbreviation').notNull(),
  color: text('color'),
  logoUrl: text('logo_url'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.teamId, t.season] })]);

export const wnbaPlayers = pgTable('wnba_players', {
  id: integer('id').primaryKey(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
  headshot: text('headshot'),
});

export const wnbaPlayerSeasons = pgTable('wnba_player_seasons', {
  playerId: integer('player_id').notNull(),
  teamId: integer('team_id').notNull(),
  season: integer('season').notNull(),
  gp: integer('gp').notNull(),
  mpg: real('mpg').notNull(),
  ppg: real('ppg').notNull(),
  rpg: real('rpg').notNull(),
  apg: real('apg').notNull(),
  spg: real('spg').notNull(),
  bpg: real('bpg').notNull(),
  tov: real('tov'),
  fgPct: real('fg_pct'),
  tpPct: real('tp_pct'),
  ftPct: real('ft_pct'),
  value: real('value').notNull(),
}, (t) => [primaryKey({ columns: [t.playerId, t.teamId, t.season] }), index('wnba_ps_team_season_idx').on(t.teamId, t.season)]);

/** The owner's notes to the agent that maintains the site, sent from /owner (school computers block AI chat). */
export const ownerNotes = pgTable('owner_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  body: text('body').notNull(),
  page: text('page'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('owner_notes_created_idx').on(t.createdAt)]);

/** Footer questionnaire: a 1-5 rating and an optional note. Anonymous unless the sender is signed in. */
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  rating: integer('rating').notNull(),
  message: text('message').notNull().default(''),
  page: text('page'),
  userId: uuid('user_id'),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('feedback_created_idx').on(t.createdAt)]);

/** 162-0 (MLB): franchises by season, from MLB's Stats API. Team ids follow the franchise through moves. */
export const mlbTeamSeasons = pgTable('mlb_team_seasons', {
  teamId: integer('team_id').notNull(),
  season: integer('season').notNull(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  abbreviation: text('abbreviation').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.teamId, t.season] })]);

export const mlbPlayers = pgTable('mlb_players', {
  id: integer('id').primaryKey(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
});

/** One player's season with one franchise: an everyday hitter, a starter or a reliever, with its stat line and graded value. */
export const mlbPlayerSeasons = pgTable('mlb_player_seasons', {
  playerId: integer('player_id').notNull(),
  teamId: integer('team_id').notNull(),
  season: integer('season').notNull(),
  kind: text('kind').notNull(),
  position: text('position').notNull(),
  line: jsonb('line').notNull(),
  value: real('value').notNull(),
}, (t) => [primaryKey({ columns: [t.playerId, t.teamId, t.season] }), index('mlb_player_seasons_team_idx').on(t.teamId, t.season)]);

/** Pick 'em: NFL games from ESPN's scoreboard, synced by the worker. Winner is set once the game is final. */
export const pickemGames = pgTable('pickem_games', {
  id: text('id').primaryKey(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  kickoff: timestamp('kickoff', { withTimezone: true }).notNull(),
  homeAbbr: text('home_abbr').notNull(),
  awayAbbr: text('away_abbr').notNull(),
  homeName: text('home_name').notNull(),
  awayName: text('away_name').notNull(),
  homeLogo: text('home_logo'),
  awayLogo: text('away_logo'),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  winner: text('winner'),
  status: text('status').notNull().default('pre'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('pickem_games_week_idx').on(t.season, t.week)]);

/** One pick per player per game, locked at kickoff (checked on the server). */
export const pickemPicks = pgTable('pickem_picks', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: text('game_id').notNull().references(() => pickemGames.id, { onDelete: 'cascade' }),
  pick: text('pick').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.gameId] }), index('pickem_picks_game_idx').on(t.gameId)]);

/** NFL history for All-time legends: ESPN athletes seen in a team-season's stat leaders since 1980. */
export const nflHistAthletes = pgTable('nfl_hist_athletes', {
  id: integer('id').primaryKey(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
  headshot: text('headshot'),
});

/** One athlete's regular-season leader numbers for one franchise (ESPN team id) in one season. */
export const nflHistSeasons = pgTable('nfl_hist_seasons', {
  athleteId: integer('athlete_id').notNull(),
  espnTeamId: integer('espn_team_id').notNull(),
  season: integer('season').notNull(),
  stats: jsonb('stats').notNull(),
}, (t) => [primaryKey({ columns: [t.athleteId, t.espnTeamId, t.season] }), index('nfl_hist_seasons_season_idx').on(t.season)]);

/** Built from the two tables above: each franchise's best retired players per position group, graded. */
export const nflLegends = pgTable('nfl_legends', {
  id: uuid('id').primaryKey().defaultRandom(),
  espnId: integer('espn_id').notNull(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
  group: text('group').notNull(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  season: integer('season').notNull(),
  grade: real('grade').notNull(),
  line: text('line').notNull(),
  headshot: text('headshot'),
}, (t) => [uniqueIndex('nfl_legends_espn_team_idx').on(t.espnId, t.teamId), index('nfl_legends_team_idx').on(t.teamId)]);

export type Player = typeof players.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Coach = typeof coaches.$inferSelect;

/** A challenge: one Casual game's seed and setup, so friends draft from the exact same spins. */
export const challenges = pgTable('challenges', {
  id: text('id').primaryKey(),
  gameType: text('game_type').notNull(),
  seed: text('seed').notNull(),
  setup: jsonb('setup').notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'set null' }),
  creatorName: text('creator_name'),
  creatorResultId: uuid('creator_result_id').notNull().references(() => gameResults.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('challenges_result_idx').on(t.creatorResultId)]);

/** Everyone who played a challenge. Signed-in players appear once each; guests are kept for their own comparison. */
export const challengeEntries = pgTable('challenge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: text('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  resultId: uuid('result_id').notNull().references(() => gameResults.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: text('username'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('challenge_entries_challenge_idx').on(t.challengeId),
  uniqueIndex('challenge_entries_result_idx').on(t.resultId),
  uniqueIndex('challenge_entries_one_per_user').on(t.challengeId, t.userId).where(sql`${t.userId} is not null`),
]);

/* ---------------------------------------------------------------- soccer (ESPN public API, synced by the worker) */

/** A club in one of the synced leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, MLS). */
export const soccerClubs = pgTable('soccer_clubs', {
  id: integer('id').primaryKey(),
  league: text('league').notNull(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  abbreviation: text('abbreviation').notNull(),
  color: text('color'),
  logoUrl: text('logo_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('soccer_clubs_league_idx').on(t.league)]);

/** A player on a current club roster. Nationality is ESPN's citizenship field. */
export const soccerPlayers = pgTable('soccer_players', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  clubId: integer('club_id').notNull().references(() => soccerClubs.id, { onDelete: 'cascade' }),
  league: text('league').notNull(),
  position: text('position').notNull(),
  age: integer('age'),
  nationality: text('nationality'),
  jersey: text('jersey'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('soccer_players_club_idx').on(t.clubId)]);

/** League goal and assist leaders for a season (ESPN's season leader lists), with matches played. */
export const soccerLeaders = pgTable('soccer_leaders', {
  season: integer('season').notNull(),
  league: text('league').notNull(),
  playerId: integer('player_id').notNull(),
  name: text('name').notNull(),
  clubId: integer('club_id'),
  goals: integer('goals').notNull(),
  assists: integer('assists').notNull(),
  matches: integer('matches').notNull(),
}, (t) => [primaryKey({ columns: [t.season, t.league, t.playerId] })]);
