/**
 * scripts/adminAccount.js: shared by seedAdmin.js and resetAdminPassword.js.
 * Reads the name, email and password for the admin account and runs the script.
 *
 * The email is trimmed and lowercased, the way sign-in compares it. The password
 * is used exactly as given. Neither the password nor its hash is printed or logged.
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const pool = require('../config/db');

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72; // bcrypt reads no further than this
const BCRYPT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads one line from the terminal without showing what is typed. */
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('The password cannot be typed here. Run this in a normal terminal window, or give the password as the third argument.'));
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

/**
 * Returns { name, email, password } from the command line, asking for the
 * password when it was left out. Throws a plain message when something is wrong.
 */
async function readAccount(usage) {
  const [nameArg, emailArg, passwordArg] = process.argv.slice(2);
  const name = String(nameArg || '').trim();
  const email = String(emailArg || '').trim().toLowerCase();

  if (!name || name.length > 120 || !EMAIL_PATTERN.test(email) || email.length > 255) {
    throw new Error(`A name and a valid email address are needed.\n${usage}`);
  }

  let password = passwordArg;
  if (password === undefined) {
    password = await askHidden(`Password for ${email} (at least ${MIN_PASSWORD_LENGTH} characters): `);
    const again = await askHidden('Type it again: ');
    if (password !== again) throw new Error('The two passwords are not the same. Nothing was changed.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters long. Nothing was changed.`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error(`The password must be ${MAX_PASSWORD_BYTES} characters or fewer. Nothing was changed.`);
  }

  return { name, email, password };
}

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Runs a script's main function, reports a failure in plain words and closes the database. */
function run(main) {
  main()
    .then(() => 0)
    .catch((err) => {
      // A database error's own text can hold SQL, so only its code is shown.
      const reason = err.sqlState || err.sqlMessage ? `database error ${err.code}` : err.message || err.code;
      console.error(reason);
      return 1;
    })
    .then(async (exitCode) => {
      await pool.end().catch(() => undefined);
      process.exit(exitCode);
    });
}

module.exports = { pool, readAccount, hashPassword, run };
