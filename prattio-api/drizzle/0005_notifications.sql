CREATE TABLE "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "audience" varchar(20) NOT NULL CHECK ("audience" IN ('all', 'client', 'motoboy', 'restaurant')),
  "category" varchar(20) NOT NULL CHECK ("category" IN ('notice', 'news')),
  "title" varchar(160) NOT NULL,
  "message" varchar(4000) NOT NULL,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz
);
--> statement-breakpoint
CREATE TABLE "announcement_reads" (
  "announcement_id" uuid NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "read_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("announcement_id", "user_id")
);
