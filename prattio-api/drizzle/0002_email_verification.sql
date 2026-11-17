ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamptz;
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_tokens_user_unique" ON "email_verification_tokens" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_tokens_hash_unique" ON "email_verification_tokens" ("token_hash");
