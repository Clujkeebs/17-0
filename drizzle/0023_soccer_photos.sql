CREATE TABLE "soccer_photos" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"url" text,
	"source" text NOT NULL,
	"credit" text,
	"page" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
