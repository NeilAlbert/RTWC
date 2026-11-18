/**
 * scripts/checkMinistryLeaders.js: a READ-ONLY report on the link between leaders
 * and ministries. It changes nothing; fix what it lists in Admin > Leadership or
 * Admin > Ministries. Run inside the server folder:
 *   node scripts/checkMinistryLeaders.js
 *
 * It lists:
 *   1. ministry leaders with no ministry, or a ministry that no longer exists
 *   2. other leaders who still carry a ministry (the site ignores it for them)
 *   3. ministries with no ministry leader
 *   4. anchors the old static Ministries page used (ministries.html#pyfm) that no
 *      ministry's slug matches any more, so old links to them land at the top
 *
 * Exit code 0 when nothing is listed, 1 when something needs fixing, 2 on error.
 */
require('dotenv').config();
const pool = require('../config/db');

// The article ids of ministries.html before the ministries moved into the database.
const OLD_ANCHORS = ['pemem', 'womens', 'pyfm', 'pensa', 'children', 'choir', 'evangelism', 'ushering', 'prayer'];

function section(title, rows, describe) {
  process.stdout.write(`\n${title}: ${rows.length}\n`);
  if (rows.length === 0) process.stdout.write('  none\n');
  rows.forEach((row) => process.stdout.write(`  - ${describe(row)}\n`));
}

async function main() {
  const [leaders] = await pool.query(
    `SELECT l.id, l.name, l.role, l.ministry_id, m.id AS found_id, m.name AS ministry_name
     FROM leadership l
     LEFT JOIN ministries m ON m.id = l.ministry_id
     ORDER BY l.display_order ASC, l.name ASC, l.id ASC`
  );
  const [ministries] = await pool.query(
    `SELECT m.id, m.name, m.slug,
            SUM(l.role = 'ministry_leader') AS leader_count
     FROM ministries m
     LEFT JOIN leadership l ON l.ministry_id = m.id
     GROUP BY m.id, m.name, m.slug
     ORDER BY m.display_order ASC, m.name ASC, m.id ASC`
  );

  const broken = leaders.filter((l) => l.role === 'ministry_leader' && !l.found_id);
  const stray = leaders.filter((l) => l.role !== 'ministry_leader' && l.ministry_id !== null);
  const empty = ministries.filter((m) => !Number(m.leader_count));
  const slugs = new Set(ministries.map((m) => m.slug));
  const lostAnchors = OLD_ANCHORS.filter((anchor) => !slugs.has(anchor));

  process.stdout.write(`Read-only check. ${leaders.length} leaders, ${ministries.length} ministries. Nothing was changed.\n`);

  section('Ministry leaders with a missing or broken ministry link', broken, (l) => (
    l.ministry_id === null
      ? `#${l.id} ${l.name}: no ministry chosen`
      : `#${l.id} ${l.name}: ministry #${l.ministry_id} does not exist`
  ));
  section('Leaders who are not ministry leaders but carry a ministry', stray, (l) => (
    `#${l.id} ${l.name} (${l.role}): ministry #${l.ministry_id}${l.ministry_name ? ` ${l.ministry_name}` : ''}`
  ));
  section('Ministries with no ministry leader', empty, (m) => `#${m.id} ${m.name} (${m.slug})`);
  section('Old Ministries page anchors no ministry slug matches', lostAnchors, (a) => `ministries.html#${a}`);

  await pool.end();
  return broken.length || stray.length || empty.length || lostAnchors.length ? 1 : 0;
}

main()
  .then((code) => { process.exitCode = code; })
  .catch((err) => {
    process.stderr.write(`The check could not run: ${err.message}\n`);
    process.exitCode = 2;
    pool.end().catch(() => {});
  });
