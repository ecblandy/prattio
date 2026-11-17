CREATE TABLE "restaurant_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "kind" varchar(20) NOT NULL CHECK ("kind" IN ('suggestion', 'problem')),
  "message" varchar(2000) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
