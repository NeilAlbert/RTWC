/**
 * scripts/resetAdminPassword.js: sets the name, email and password of the
 * existing admin account. Use it when you cannot sign in.
 *
 * Usage (run inside the server folder):
 *
 *   node scripts/resetAdminPassword.js "Full Name" admin@example.org
 *       Asks for the new password twice. Nothing you type is shown. This is the
 *       safest way: the password is not kept in the terminal's command history.
 *
 *   node scripts/resetAdminPassword.js "Full Name" admin@example.org "the new password"
 *       Takes the password from the command line instead of asking.
 *
 * The password must be at least 12 characters. Anyone signed in with the old
 * password is signed out. This script never creates an admin: if there is none
 * yet, run seedAdmin.js.
 */
const { pool, readAccount, hashPassword, run } = require('./adminAccount');
const { nowSeconds, toDbUtc } = require('../utils/tokens');

const USAGE = 'Usage: node scripts/resetAdminPassword.js "Full Name" admin@example.org ["new password"]';

run(async () => {
  const { name, email, password } = await readAccount(USAGE);

  const [admins] = await pool.query('SELECT id, email FROM admins ORDER BY id');
  if (admins.length === 0) {
    throw new Error('There is no admin account yet. Nothing was changed.\nCreate it with: node scripts/seedAdmin.js "Full Name" admin@example.org');
  }

  // Normally there is exactly one admin and it is the one updated. A database from
  // an older version may hold several: then the email must name which one.
  const target = admins.length === 1
    ? admins[0]
    : admins.find((admin) => String(admin.email).trim().toLowerCase() === email);
  if (!target) {
    throw new Error('This database has more than one admin and none has that email address. Nothing was changed.');
  }

  const passwordHash = await hashPassword(password);
  await pool.query(
    'UPDATE admins SET name = ?, email = ?, password_hash = ?, token_valid_after = ? WHERE id = ?',
    [name, email, passwordHash, toDbUtc(nowSeconds()), target.id]
  );
  console.log(`The admin account now signs in as ${email} with the new password, at /admin/login.html.`);
});
