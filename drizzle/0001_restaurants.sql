CREATE TABLE "restaurants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "name" varchar(120) NOT NULL,
  "cnpj" varchar(14) NOT NULL,
  "phone" varchar(11) NOT NULL,
  "postal_code" varchar(8) NOT NULL,
  "street" varchar(120) NOT NULL,
  "number" varchar(20) NOT NULL,
  "complement" varchar(120),
  "neighborhood" varchar(120) NOT NULL,
  "city" varchar(120) NOT NULL,
  "state" varchar(2) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_user_id_unique" ON "restaurants" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_cnpj_unique" ON "restaurants" ("cnpj");
