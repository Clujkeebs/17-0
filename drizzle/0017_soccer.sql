CREATE TABLE "soccer_clubs" (
	"id" integer PRIMARY KEY NOT NULL,
	"league" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"abbreviation" text NOT NULL,
	"color" text,
	"logo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soccer_leaders" (
	"season" integer NOT NULL,
	"league" text NOT NULL,
	"player_id" integer NOT NULL,
	"name" text NOT NULL,
	"club_id" integer,
	"goals" integer NOT NULL,
	"assists" integer NOT NULL,
	"matches" integer NOT NULL,
	CONSTRAINT "soccer_leaders_season_league_player_id_pk" PRIMARY KEY("season","league","player_id")
);
--> statement-breakpoint
CREATE TABLE "soccer_players" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"club_id" integer NOT NULL,
	"league" text NOT NULL,
	"position" text NOT NULL,
	"age" integer,
	"nationality" text,
	"jersey" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "soccer_players" ADD CONSTRAINT "soccer_players_club_id_soccer_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."soccer_clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "soccer_clubs_league_idx" ON "soccer_clubs" USING btree ("league");--> statement-breakpoint
CREATE INDEX "soccer_players_club_idx" ON "soccer_players" USING btree ("club_id");