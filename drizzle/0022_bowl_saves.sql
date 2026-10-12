CREATE TABLE "bowl_saves" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"team" text NOT NULL,
	"titles" integer DEFAULT 0 NOT NULL,
	"seasons" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bowl_saves" ADD CONSTRAINT "bowl_saves_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bowl_saves_rank_idx" ON "bowl_saves" USING btree ("titles","wins");