/**
 * ROYAL TEMPLE WORSHIP CENTRE - Seed Admin Script
 * Creates the single admin account via command-line arguments
 * Usage: node scripts/seedAdmin.js "Admin Name" admin@royaltemple.org "admin_password"
 * 
 * This script refuses to create a second admin if one already exists.
 * 
 * bcrypt is built into Node.js >= 16 via bcryptjs native dependencies,
 * but we use the bcrypt package for consistency.
 */

const { hashSync } = require('bcryptjs');
const pool = require('../server/config/db');
const { findByEmail, create } = require('../server/models/adminModel');

// Minimum JWT_SECRET length check will be done in server.js

/**
 * Creates the single admin account
 * @param {string} name - Admin full name
 * @param {string} email - Admin email (must be unique)
 * @param {string} password - Plain text password
 */
const seedAdmin = async (name, email, password) => {
  // Check if admin already exists
  const existing = await findByEmail(email);

  if (existing) {
    console.error(`❌ Admin already exists with email: ${email}`);
    console.error('   Use a different email or update the existing admin.');
    process.exit(1);
  }

  // Hash password with bcrypt (salt rounds: 12)
  const saltRounds = 12;
  const passwordHash = hashSync(password, saltRounds);

  // Create admin
  const admin = await create(name, email, passwordHash);

  console.log('✅ Admin account created successfully');
  console.log(`   Name: ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   ID: ${admin.id}`);
  console.log(``);
  console.log('   To login, use:');
  console.log(`   POST /api/auth/login with email: ${admin.email} and password: ${password}`);
  console.log(``);
  console.log('   ⚠️  Remember to change the default password after first login!');
};

/**
 * Main - parse command-line arguments and seed
 */
const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error(`
❌ Usage: node scripts/seedAdmin.js "Admin Name" admin@royaltemple.org "password"

Arguments required:
  1. Admin name (e.g., "Resident Pastor")
  2. Admin email (e.g., pastor@royaltemple.org)
  3. Password (e.g., "SecurePass123")

Example:
  node scripts/seedAdmin.js "Resident Pastor" pastor@royaltemple.org "admin123"
`);
    process.exit(1);
  }

  const [name, email, password] = args;

  try {
    await seedAdmin(name, email, password);
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message);
    process.exit(1);
  }
};

// Run main
main();