CREATE TABLE "college_hoops" (
	"league" text NOT NULL,
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
	"value" real NOT NULL,
	CONSTRAINT "college_hoops_league_player_id_team_id_season_pk" PRIMARY KEY("league","player_id","team_id","season")
);
--> statement-breakpoint
CREATE TABLE "college_leaders" (
	"league" text NOT NULL,
	"season" integer NOT NULL,
	"team_id" integer NOT NULL,
	"category" text NOT NULL,
	"player_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"value" real NOT NULL,
	"display" text,
	CONSTRAINT "college_leaders_league_season_team_id_category_player_id_pk" PRIMARY KEY("league","season","team_id","category","player_id")
);
--> statement-breakpoint
CREATE TABLE "college_players" (
	"league" text NOT NULL,
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"headshot" text,
	CONSTRAINT "college_players_league_id_pk" PRIMARY KEY("league","id")
);
--> statement-breakpoint
CREATE TABLE "college_teams" (
	"league" text NOT NULL,
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"abbreviation" text NOT NULL,
	"color" text,
	"logo_url" text,
	CONSTRAINT "college_teams_league_id_pk" PRIMARY KEY("league","id")
);
--> statement-breakpoint
CREATE INDEX "college_hoops_team_season_idx" ON "college_hoops" USING btree ("league","team_id","season");--> statement-breakpoint
CREATE INDEX "college_leaders_season_idx" ON "college_leaders" USING btree ("league","season","category");