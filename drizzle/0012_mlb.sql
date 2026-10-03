CREATE TABLE "mlb_player_seasons" (
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"season" integer NOT NULL,
	"kind" text NOT NULL,
	"position" text NOT NULL,
	"line" jsonb NOT NULL,
	"value" real NOT NULL,
	CONSTRAINT "mlb_player_seasons_player_id_team_id_season_pk" PRIMARY KEY("player_id","team_id","season")
);
--> statement-breakpoint
CREATE TABLE "mlb_players" (
	"id" integer PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"position" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mlb_team_seasons" (
	"team_id" integer NOT NULL,
	"season" integer NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"abbreviation" text NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mlb_team_seasons_team_id_season_pk" PRIMARY KEY("team_id","season")
);
--> statement-breakpoint
CREATE INDEX "mlb_player_seasons_team_idx" ON "mlb_player_seasons" USING btree ("team_id","season");