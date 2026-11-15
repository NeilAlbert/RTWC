/**
 * =============================================================================
 * scripts/resetAdminPassword.js: sets a new password for the admin account.
 *
 * Use this when you cannot sign in at /admin/login.html. It updates the admin
 * with the given email, or creates that admin if there is none yet. The email is
 * stored trimmed and in lowercase, the same way the sign-in page compares it.
 * The password is hashed with bcrypt exactly as typed. Neither the password nor
 * its hash is ever printed or logged.
 *
 * Usage (run inside the server folder):
 *
 *   node scripts/resetAdminPassword.js admin@example.org
 *       Asks for the new password twice. Nothing you type is shown.
 *       This is the safest way: the password is not saved in your command history.
 *
 *   node scripts/resetAdminPassword.js admin@example.org "the new password"
 *       Takes the password from the command line instead of asking.
 *
 *   Add --name "Full Name" to set the name when the admin is being created.
 *
 * The password must be at least 12 characters long.
 * =============================================================================
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const pool = require('../config/db');
const logger = require('../utils/logger');

const MIN_PASSWORD_LENGTH = 12;
const BCRYPT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Reads one line from the terminal without showing what is typed. */
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('The password cannot be typed here. Run this in a normal terminal window, or give the password as the second argument.'));
      return;
    }

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';

    function finish(error) {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    }

    function onData(chunk) {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') return finish();
        if (char === '\u0003') return finish(new Error('Cancelled. Nothing was changed.'));
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
      return undefined;
    }

    stdin.on('data', onData);
  });
}

function parseArgs(argv) {
  const positional = [];
  let name;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--name') {
      name = argv[i + 1];
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  return { email: positional[0], password: positional[1], name };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = normalizeEmail(args.email);

  if (!EMAIL_PATTERN.test(email)) {
    console.error('Usage: node scripts/resetAdminPassword.js admin@example.org');
    console.error('       (you will be asked to type the new password)');
    return 1;
  }

  // The password is used exactly as given: not trimmed, not altered.
  let password = args.password;
  if (password === undefined) {
    password = await askHidden(`New password for ${email} (at least ${MIN_PASSWORD_LENGTH} characters): `);
    const again = await askHidden('Type it again: ');
    if (password !== again) {
      console.error('The two passwords are not the same. Nothing was changed.');
      return 1;
    }
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    console.error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters long. Nothing was changed.`);
    return 1;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Match an account whose stored email differs only by case or stray spaces.
  const [rows] = await pool.query('SELECT id FROM admins WHERE LOWER(TRIM(email)) = ? LIMIT 1', [email]);

  if (rows.length > 0) {
    await pool.query('UPDATE admins SET email = ?, password_hash = ? WHERE id = ?', [email, passwordHash, rows[0].id]);
    logger.info('Admin password reset', { adminId: rows[0].id });
    console.log(`The password for ${email} has been changed. You can now sign in at /admin/login.html.`);
  } else {
    const name = (args.name || 'Administrator').trim();
    const [result] = await pool.query(
      'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );
    logger.info('Admin account created by password reset', { adminId: result.insertId });
    console.log(`There was no admin with that email, so one was created for ${email}. You can now sign in at /admin/login.html.`);
  }

  return 0;
}

main()
  .catch((err) => {
    logger.error('Admin password reset failed', { message: err.message, code: err.code });
    console.error(`The password could not be changed: ${err.message || err.code}`);
    return 1;
  })
  .then(async (exitCode) => {
    await pool.end().catch(() => {});
    process.exit(exitCode);
  });
