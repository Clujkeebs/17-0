ALTER TABLE "user_accounts" ADD COLUMN "favorite_games" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "name_font" text;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "name_color" text;