CREATE TABLE "pickem_games" (
	"id" text PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"week" integer NOT NULL,
	"kickoff" timestamp with time zone NOT NULL,
	"home_abbr" text NOT NULL,
	"away_abbr" text NOT NULL,
	"home_name" text NOT NULL,
	"away_name" text NOT NULL,
	"home_logo" text,
	"away_logo" text,
	"home_score" integer,
	"away_score" integer,
	"winner" text,
	"status" text DEFAULT 'pre' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickem_picks" (
	"user_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"pick" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickem_picks_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "pickem_picks" ADD CONSTRAINT "pickem_picks_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickem_picks" ADD CONSTRAINT "pickem_picks_game_id_pickem_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."pickem_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pickem_games_week_idx" ON "pickem_games" USING btree ("season","week");--> statement-breakpoint
CREATE INDEX "pickem_picks_game_idx" ON "pickem_picks" USING btree ("game_id");