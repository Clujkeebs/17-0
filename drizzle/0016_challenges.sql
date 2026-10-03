CREATE TABLE "challenge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" text NOT NULL,
	"result_id" uuid NOT NULL,
	"user_id" uuid,
	"username" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"game_type" text NOT NULL,
	"seed" text NOT NULL,
	"setup" jsonb NOT NULL,
	"creator_id" uuid,
	"creator_name" text,
	"creator_result_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_result_id_game_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."game_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_user_accounts_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_result_id_game_results_id_fk" FOREIGN KEY ("creator_result_id") REFERENCES "public"."game_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_entries_challenge_idx" ON "challenge_entries" USING btree ("challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_entries_result_idx" ON "challenge_entries" USING btree ("result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_entries_one_per_user" ON "challenge_entries" USING btree ("challenge_id","user_id") WHERE "challenge_entries"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_result_idx" ON "challenges" USING btree ("creator_result_id");