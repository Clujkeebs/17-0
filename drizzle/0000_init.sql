CREATE TABLE "auth_accounts" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "auth_accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "ad_placements" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_name" text NOT NULL,
	"adsense_unit_id" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"min_viewport_width" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ad_placements_slot_name_unique" UNIQUE("slot_name")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"team_id" integer,
	"coach_impact_score" integer DEFAULT 70 NOT NULL,
	"image_url" text,
	"career_wins" integer DEFAULT 0 NOT NULL,
	"career_losses" integer DEFAULT 0 NOT NULL,
	"super_bowl_wins" integer DEFAULT 0 NOT NULL,
	"years_with_team" integer DEFAULT 0 NOT NULL,
	"recent_3yr_win_pct_x1000" integer DEFAULT 500 NOT NULL,
	"playoff_appearances_3yr" integer DEFAULT 0 NOT NULL,
	"impact_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "coaches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "game_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_type" text NOT NULL,
	"config_key" text NOT NULL,
	"config_value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "game_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"username" text,
	"game_type" text NOT NULL,
	"is_daily" boolean DEFAULT false NOT NULL,
	"daily_date" text,
	"result_data" jsonb NOT NULL,
	"score" integer NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"game_type" text NOT NULL,
	"seed" text NOT NULL,
	"spin_payload" jsonb NOT NULL,
	"token" text NOT NULL,
	"is_daily" boolean DEFAULT false NOT NULL,
	"daily_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "madden_ratings_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"madden_version" text NOT NULL,
	"overall_rating" integer NOT NULL,
	"attributes" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" uuid,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"confirmation_token" text,
	"token_expires_at" timestamp with time zone,
	"unsubscribe_token" text NOT NULL,
	"source" text,
	"ip_hash" text,
	"referrer" text,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"madden_id" text NOT NULL,
	"slug" text NOT NULL,
	"espn_id" text,
	"full_name" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"position" text NOT NULL,
	"team_id" integer,
	"height_inches" integer,
	"weight_lbs" integer,
	"college" text,
	"jersey_number" integer,
	"age" integer,
	"years_pro" integer,
	"overall_rating" integer NOT NULL,
	"attributes" jsonb NOT NULL,
	"archetype" text,
	"image_url" text,
	"image_blob_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_all_time_great" boolean DEFAULT false NOT NULL,
	"madden_version" text NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_madden_id_unique" UNIQUE("madden_id"),
	CONSTRAINT "players_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"raw_html" text,
	"parsed_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"madden_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"city" text NOT NULL,
	"conference" text NOT NULL,
	"division" text NOT NULL,
	"logo_url" text,
	"primary_color" text NOT NULL,
	CONSTRAINT "teams_madden_id_unique" UNIQUE("madden_id"),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"username" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"hashed_password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"newsletter_opt_in" boolean DEFAULT false NOT NULL,
	"newsletter_confirmed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"sound_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "user_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "auth_verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "auth_verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_user_accounts_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "madden_ratings_history" ADD CONSTRAINT "madden_ratings_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_events" ADD CONSTRAINT "newsletter_events_subscriber_id_newsletter_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_user_accounts_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "configs_key_idx" ON "game_configs" USING btree ("game_type","config_key");--> statement-breakpoint
CREATE INDEX "results_daily_idx" ON "game_results" USING btree ("daily_date","score");--> statement-breakpoint
CREATE INDEX "results_user_idx" ON "game_results" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "players_team_idx" ON "players" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "players_pos_idx" ON "players" USING btree ("position");