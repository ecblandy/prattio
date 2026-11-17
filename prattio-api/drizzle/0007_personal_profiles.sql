CREATE TABLE "personal_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "cpf" varchar(11) NOT NULL,
  "phone" varchar(11) NOT NULL,
  "terms_accepted_at" timestamptz NOT NULL DEFAULT now()
);
