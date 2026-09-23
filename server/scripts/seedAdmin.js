/**
 * =============================================================================
 * scripts/seedAdmin.js — creates the single admin account.
 *
 * Reads name/email/password from command-line args or .env values, hashes the
 * password with bcrypt, and inserts into the admins table. Idempotent: if the
 * email already exists it does nothing.
 *
 * Usage:
 *   node scripts/seedAdmin.js --name "Jane Doe" --email admin@royaltemple.org --password "S3cure!Pass"
 *   # or via .env: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 * =============================================================================
 */
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../config/db');
const logger = require('../utils/logger');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = value;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = args.name || process.env.ADMIN_NAME;
  const email = args.email || process.env.ADMIN_EMAIL;
  const password = args.password || process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('Usage: node scripts/seedAdmin.js --name "Jane Doe" --email admin@royaltemple.org --password "S3cure!Pass"');
    console.error('       (or provide ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in .env)');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Invalid email address.');
    process.exit(1);
  }

  try {
    // Idempotency: skip if an account with this email already exists.
    const [existing] = await pool.query('SELECT id FROM admins WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      logger.info('Admin seed skipped — account already exists', { email });
      console.log(`Admin account for ${email} already exists. Nothing to do.`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    logger.info('Admin account created', { adminId: result.insertId, email });
    console.log(`Admin account created successfully (id=${result.insertId}).`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    logger.error('Failed to seed admin', { message: err.message });
    console.error('Failed to seed admin:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
