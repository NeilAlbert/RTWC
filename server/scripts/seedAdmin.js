/**
 * scripts/seedAdmin.js: creates the one admin account.
 *
 * Usage (run inside the server folder):
 *
 *   node scripts/seedAdmin.js "Full Name" admin@example.org
 *       Asks for the password twice. Nothing you type is shown. This is the
 *       safest way: the password is not kept in the terminal's command history.
 *
 *   node scripts/seedAdmin.js "Full Name" admin@example.org "the password"
 *       Takes the password from the command line instead of asking.
 *
 * The password must be at least 12 characters. The site has one admin: if an
 * admin already exists this script changes nothing. Use resetAdminPassword.js
 * to change that admin's name, email or password.
 */
const { pool, readAccount, hashPassword, run } = require('./adminAccount');

const USAGE = 'Usage: node scripts/seedAdmin.js "Full Name" admin@example.org ["password"]';

run(async () => {
  const { name, email, password } = await readAccount(USAGE);

  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM admins');
  if (rows[0].total > 0) {
    throw new Error('An admin account already exists, and the site has only one. Nothing was changed.\nTo change its details run: node scripts/resetAdminPassword.js "Full Name" admin@example.org');
  }

  const passwordHash = await hashPassword(password);
  await pool.query('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
  console.log(`The admin account for ${email} was created. Sign in at /admin/login.html.`);
});
