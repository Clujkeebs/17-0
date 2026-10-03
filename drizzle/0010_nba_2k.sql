ALTER TABLE "nba_players" ADD COLUMN "rating_2k" integer;--> statement-breakpoint
ALTER TABLE "nba_players" ADD COLUMN "rating_2k_position" text;--> statement-breakpoint
ALTER TABLE "nba_players" ADD COLUMN "rating_2k_team_id" integer;--> statement-breakpoint
ALTER TABLE "nba_players" ADD COLUMN "rating_2k_updated_at" timestamp with time zone;