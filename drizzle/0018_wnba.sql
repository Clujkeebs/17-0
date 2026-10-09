CREATE TABLE "wnba_player_seasons" (
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"season" integer NOT NULL,
	"gp" integer NOT NULL,
	"mpg" real NOT NULL,
	"ppg" real NOT NULL,
	"rpg" real NOT NULL,
	"apg" real NOT NULL,
	"spg" real NOT NULL,
	"bpg" real NOT NULL,
	"tov" real,
	"fg_pct" real,
	"tp_pct" real,
	"ft_pct" real,
	"value" real NOT NULL,
	CONSTRAINT "wnba_player_seasons_player_id_team_id_season_pk" PRIMARY KEY("player_id","team_id","season")
);
--> statement-breakpoint
CREATE TABLE "wnba_players" (
	"id" integer PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"position" text NOT NULL,
	"headshot" text
);
--> statement-breakpoint
CREATE TABLE "wnba_team_seasons" (
	"team_id" integer NOT NULL,
	"season" integer NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"abbreviation" text NOT NULL,
	"color" text,
	"logo_url" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wnba_team_seasons_team_id_season_pk" PRIMARY KEY("team_id","season")
);
--> statement-breakpoint
CREATE INDEX "wnba_ps_team_season_idx" ON "wnba_player_seasons" USING btree ("team_id","season");