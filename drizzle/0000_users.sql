CREATE TYPE user_role AS ENUM ('client', 'motoboy', 'restaurant');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email varchar(254) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
