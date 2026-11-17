CREATE TABLE "email_change_tokens" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "new_email" varchar(254) NOT NULL,
  "code_hash" varchar(64) NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_change_tokens_user_unique" ON "email_change_tokens" ("user_id");
