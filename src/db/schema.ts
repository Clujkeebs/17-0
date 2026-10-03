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

export type Player = typeof players.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Coach = typeof coaches.$inferSelect;
