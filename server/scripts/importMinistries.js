/**
 * scripts/importMinistries.js: one-time import of the ministries that used to be
 * typed into ministries.html and the home page, so that Admin > Ministries is the
 * one place they are managed.
 *
 * BACK UP THE DATABASE FIRST (see BACKUPS.md), and run migrations/007_ministries.sql
 * before this script. Run inside the server folder:
 *   node scripts/importMinistries.js --dry-run   shows what would change, writes nothing
 *   node scripts/importMinistries.js             imports
 *
 * Safe to run more than once. Each ministry is matched on its slug, or failing
 * that on its name (ignoring case):
 *   - not in the database: it is added
 *   - already there: only fields that are empty are filled in. A name, slug,
 *     description or order changed in the admin is never overwritten.
 *
 * The text below is copied exactly from ministries.html as it was on 18 Nov 2026.
 * The slugs are the anchors the site already used (ministries.html#choir), so old
 * links keep working. No ministry had a meeting time, a leader or an image on the
 * site (each showed an "[ADD: ...]" placeholder), so those stay empty.
 * display_order keeps the order the page showed them in, in steps of 10 so a new
 * ministry can be put between two others.
 */
require('dotenv').config();
const pool = require('../config/db');

const MINISTRIES = [
  { slug: 'pemem', name: "Men's Ministry (PEMEM)", description: 'The fellowship for the men of the assembly.' },
  { slug: 'womens', name: "Women's Ministry", description: 'The fellowship for the women of the assembly.' },
  { slug: 'pyfm', name: 'Youth Ministry', description: 'For the teenagers and young adults of the assembly.' },
  { slug: 'pensa', name: 'PENSA (Pentecost Students and Associates)', description: 'For students in secondary and tertiary schools.' },
  { slug: 'children', name: "Children's Ministry", description: 'Sunday school and Bible teaching for the children of the assembly.' },
  { slug: 'choir', name: 'Choir and Praise Team', description: 'Leads the singing at our services.' },
  { slug: 'evangelism', name: 'Evangelism Ministry', description: "Leads the assembly's outreach and follows up with new converts." },
  { slug: 'ushering', name: 'Ushers', description: 'Welcome people to our services and help them find a seat.' },
  { slug: 'prayer', name: 'Prayer Force', description: 'Meets to pray for the assembly and for prayer requests sent to the church.' },
].map((ministry, index) => ({ ...ministry, display_order: (index + 1) * 10 }));

const dryRun = process.argv.includes('--dry-run');
const isEmpty = (value) => value === null || value === undefined || String(value).trim() === '';

async function hasNewColumns(connection) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ministries' AND COLUMN_NAME IN ('meeting_time', 'display_order')`
  );
  return rows.length === 2;
}

async function main() {
  const connection = await pool.getConnection();
  const [[{ db }]] = await connection.query('SELECT DATABASE() AS db');
  console.log(`${dryRun ? 'DRY RUN, nothing will be written. ' : ''}Database: ${db}`);

  if (!(await hasNewColumns(connection))) {
    console.error('The ministries table has no meeting_time or display_order column yet. Run migrations/007_ministries.sql first.');
    connection.release();
    return 1;
  }

  const summary = { added: 0, filled: 0, unchanged: 0 };
  await connection.beginTransaction();
  try {
    for (const item of MINISTRIES) {
      // eslint-disable-next-line no-await-in-loop
      const [bySlug] = await connection.query('SELECT * FROM ministries WHERE slug = ? LIMIT 1', [item.slug]);
      // eslint-disable-next-line no-await-in-loop
      const [byName] = bySlug.length ? [[]] : await connection.query('SELECT * FROM ministries WHERE LOWER(name) = LOWER(?) LIMIT 1', [item.name]);
      const existing = bySlug[0] || byName[0];

      if (!existing) {
        console.log(`  add       ${item.slug.padEnd(11)} ${item.name}`);
        if (!dryRun) {
          // eslint-disable-next-line no-await-in-loop
          await connection.query(
            'INSERT INTO ministries (name, slug, description, display_order) VALUES (?, ?, ?, ?)',
            [item.name, item.slug, item.description, item.display_order]
          );
        }
        summary.added += 1;
        continue; // eslint-disable-line no-continue
      }

      if (existing.slug !== item.slug) {
        console.log(`  note      "${existing.name}" is already in the database with the slug "${existing.slug}". It is kept, so links to ministries.html#${item.slug} will not open it.`);
      }

      // Only empty fields are filled. display_order 0 is the column's default, so it counts as empty.
      const fill = {};
      if (isEmpty(existing.description)) fill.description = item.description;
      if (Number(existing.display_order) === 0) fill.display_order = item.display_order;

      if (Object.keys(fill).length === 0) {
        console.log(`  unchanged ${existing.slug.padEnd(11)} ${existing.name}`);
        summary.unchanged += 1;
        continue; // eslint-disable-line no-continue
      }

      console.log(`  fill      ${existing.slug.padEnd(11)} ${existing.name}: ${Object.keys(fill).join(', ')}`);
      if (!dryRun) {
        const columns = Object.keys(fill).map((column) => `${column} = ?`).join(', ');
        // eslint-disable-next-line no-await-in-loop
        await connection.query(`UPDATE ministries SET ${columns} WHERE id = ?`, [...Object.values(fill), existing.id]);
      }
      summary.filled += 1;
    }

    if (dryRun) await connection.rollback();
    else await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  console.log(`${dryRun ? 'Would add' : 'Added'} ${summary.added}, ${dryRun ? 'would fill in' : 'filled in'} ${summary.filled}, unchanged ${summary.unchanged}.`);
  if (!dryRun && summary.added + summary.filled > 0) {
    console.log('The public site shows the change within 60 seconds, or at once after the server restarts.');
  }
  return 0;
}

main()
  .then((code) => { process.exitCode = code; })
  .catch((err) => {
    console.error('The import failed and nothing was saved:', err.code || err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => undefined));
