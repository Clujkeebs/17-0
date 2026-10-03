CREATE TABLE "nfl_hist_athletes" (
	"id" integer PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"position" text NOT NULL,
	"headshot" text
);
--> statement-breakpoint
CREATE TABLE "nfl_hist_seasons" (
	"athlete_id" integer NOT NULL,
	"espn_team_id" integer NOT NULL,
	"season" integer NOT NULL,
	"stats" jsonb NOT NULL,
	CONSTRAINT "nfl_hist_seasons_athlete_id_espn_team_id_season_pk" PRIMARY KEY("athlete_id","espn_team_id","season")
);
--> statement-breakpoint
CREATE TABLE "nfl_legends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"espn_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"position" text NOT NULL,
	"group" text NOT NULL,
	"team_id" integer NOT NULL,
	"season" integer NOT NULL,
	"grade" real NOT NULL,
	"line" text NOT NULL,
	"headshot" text
);
--> statement-breakpoint
ALTER TABLE "nfl_legends" ADD CONSTRAINT "nfl_legends_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nfl_hist_seasons_season_idx" ON "nfl_hist_seasons" USING btree ("season");--> statement-breakpoint
CREATE UNIQUE INDEX "nfl_legends_espn_team_idx" ON "nfl_legends" USING btree ("espn_id","team_id");--> statement-breakpoint
CREATE INDEX "nfl_legends_team_idx" ON "nfl_legends" USING btree ("team_id");