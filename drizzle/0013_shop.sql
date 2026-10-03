CREATE TABLE "point_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_stock" (
	"item_key" text PRIMARY KEY NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_items" (
	"user_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"price_paid" integer DEFAULT 0 NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_items_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "points_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "equip_border" text;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "equip_banner" text;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "equip_title" text;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "equip_flair" text;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "point_events_once_idx" ON "point_events" USING btree ("user_id","reason","ref");--> statement-breakpoint
CREATE INDEX "point_events_user_idx" ON "point_events" USING btree ("user_id","created_at");