import * as argon2 from 'argon2';
import postgres from 'postgres';

const {
  DATABASE_URL,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_STORE_USER_EMAIL,
  TEST_STORE_USER_PASSWORD,
} = process.env;

if (!DATABASE_URL || !TEST_USER_EMAIL || !TEST_USER_PASSWORD || !TEST_STORE_USER_EMAIL || !TEST_STORE_USER_PASSWORD) {
  throw new Error('Configure DATABASE_URL e as credenciais das duas contas de teste.');
}

const sql = postgres(DATABASE_URL);
try {
  for (const account of [
    { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD, name: 'Usuário de teste', role: 'client' },
    { email: TEST_STORE_USER_EMAIL, password: TEST_STORE_USER_PASSWORD, name: 'Loja de teste', role: 'restaurant' },
  ]) {
    const email = account.email.trim().toLowerCase();
    if (!email || email.length > 254 || account.password.length < 8 || account.password.length > 128) {
      throw new Error('Informe email e senha válidos para cada usuário de teste.');
    }

    const hash = await argon2.hash(account.password, { type: argon2.argon2id });
    await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${account.name}, ${email}, ${hash}, ${account.role})
      ON CONFLICT DO NOTHING
    `;
    const [user] = await sql`
      SELECT password_hash, role FROM users WHERE lower(email) = ${email}
    `;

    if (!user || user.role !== account.role || !(await argon2.verify(user.password_hash, account.password))) {
      throw new Error(
        'Um usuário de teste já existe com outra senha ou perfil. Use as credenciais originais ou outro email.',
      );
    }

    await sql`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE lower(email) = ${email}`;
  }
  console.log('Usuários de teste disponíveis.');
} finally {
  await sql.end();
}
