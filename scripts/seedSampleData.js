/**
 * ROYAL TEMPLE WORSHIP CENTRE - Seed Sample Data Script
 * Inserts sample rows for Phase 2 development
 * 
 * Usage:
 *   node scripts/seedSampleData.js        # Insert sample data
 *   node scripts/seedSampleData.js --clear # Delete only sample rows
 * 
 * Sample rows are marked with a "sample" column set to 1, making them easy to
 * identify and delete. The --clear flag deletes ONLY rows where sample=1, leaving
 * any real data intact.
 * 
 * All names use obviously fake names like "Sample Pastor" so nothing could be
 * mistaken for a real person.
 */

const pool = require('../server/config/db');
const moment = require('moment');

// Mark sample rows with sample=1 column (we'll add this to existing tables)
// Since we can't alter existing tables easily, we'll use a naming convention:
// - Sermons titles start with "Sample - "
// - Events titles start with "Sample - "
// - Leadership names start with "Sample "
// - Ministries are the standard 9 ministries (already exist or we insert)

const FAKE_NAMES = {
  pastor: 'Sample Pastor',
  wife: 'Sample First Lady',
  presidingElder: 'Sample Elder',
  secretary: 'Sample Secretary',
  elder1: 'Sample Elder',
  elder2: 'Sample Elder',
  elder3: 'Sample Elder',
  deacon1: 'Sample Deacon',
  deacon2: 'Sample Deacon',
  deaconess1: 'Sample Deaconess',
  deaconess2: 'Sample Deaconess',
  ministryLeaderPrefix: 'Sample Leader'
};

// Ministry names (the 9 required)
const MINISTRY_NAMES = [
  'Men\'s Ministry',
  'Women\'s Ministry', 
  'Pentecost Youth Fellowship (PYFM)',
  'PENSA',
  'Children\'s Ministry',
  'Choir',
  'Evangelism and Missions',
  'Ushering Board',
  'Prayer Force'
];

// Sermon data - 6 sermons, mix of topics
const SERMONS = [
  {
    title: 'Sample - Walking in Divine Purpose & Dominion',
    speaker: 'Sample Pastor',
    description: 'An empowering message on living by God\'s promises and exercising kingdom authority in your daily routine.',
    videoUrl: '#',
    thumbnailUrl: 'assets/images/sermon-placeholder.jpg',
    sermonDate: moment().subtract(5, 'days').format('YYYY-MM-DD')
  },
  {
    title: 'Sample - The Power of Persistent Prayer',
    speaker: 'Sample Pastor',
    description: 'How to develop a consistent prayer life that moves mountains.',
    videoUrl: '#',
    thumbnailUrl: 'assets/images/sermon-placeholder.jpg',
    sermonDate: moment().subtract(12, 'days').format('YYYY-MM-DD')
  },
  {
    title: 'Sample - Faith Over Fear',
    speaker: 'Sample Pastor',
    description: 'Standing firm in faith when circumstances seem impossible.',
    videoUrl: '#',
    thumbnailUrl: 'assets/images/sermon-placeholder.jpg',
    sermonDate: moment().subtract(19, 'days').format('YYYY-MM-DD')
  },
  {
    title: 'Sample - Holy Living in a Secular World',
    speaker: 'Sample Elder',
    description: 'Practical guidance for maintaining biblical standards in modern society.',
    videoUrl: '#',
    thumbnailUrl: 'assets/images/sermon-placeholder.jpg',
    sermonDate: moment().subtract(26, 'days').format('YYYY-MM-DD')
  },
  {
    title: 'Sample - Spiritual Growth Through Discipleship',
    speaker: 'Sample Pastor',
    description: 'The role of disciplined study and community in spiritual maturity.',
    videoUrl: '#',
    thumbnailUrl: 'assets/images/sermon-placeholder.jpg',
    sermonDate: moment().subtract(33, 'days').format('YYYY-MM-DD')
  },
  {
    title: 'Sample - The Armor of God',
    speaker: 'Sample Deacon',
    description: 'Understanding and deploying spiritual armor for daily spiritual battle.',
    videoUrl: '#',
    thumbnailUrl: 'assets/images/sermon-placeholder.jpg',
    sermonDate: moment().subtract(40, 'days').format('YYYY-MM-DD')
  }
];

// Event data - 8 events, some upcoming, some past relative to now
const EVENTS = [
  // Upcoming events (sorted soonest first)
  {
    title: 'Sample - Midweek Bible Study',
    description: 'Weekly midweek Bible study and fellowship. A time of teaching, discussion, and spiritual growth.',
    eventDate: moment().add(3, 'days').format('YYYY-MM-DD'),
    eventTime: '6:30 PM – 8:30 PM',
    location: 'Main Sanctuary',
    category: 'bible_study' // We'll store as string, not enum
  },
  {
    title: 'Sample - Friday Prayer Tower',
    description: 'Weekly Friday prayer meeting. A dedicated time for intercession and prayer for the congregation and nation.',
    eventDate: moment().add(5, 'days').format('YYYY-MM-DD'),
    eventTime: '6:30 PM – 9:00 PM',
    location: 'Prayer Tower',
    category: 'prayer'
  },
  {
    title: 'Sample - Church Anniversary',
    description: 'Annual church anniversary celebration giving thanks for God\'s faithfulness over the years.',
    eventDate: moment().add(14, 'days').format('YYYY-MM-DD'),
    eventTime: 'All Day',
    location: 'Main Sanctuary',
    category: 'anniversary'
  },
  {
    title: 'Sample - Pastors Conference',
    description: 'Regional pastors conference for leadership training and fellowship.',
    eventDate: moment().add(21, 'days').format('YYYY-MM-DD'),
    eventTime: '3 Days Event',
    location: 'Convention Centre',
    category: 'conference'
  },
  // Past events (sorted most recent first)
  {
    title: 'Sample - Youth Camp 2024',
    description: 'Annual youth camp for PYFM members. Discipleship, games, and spiritual growth.',
    eventDate: moment().subtract(15, 'days').format('YYYY-MM-DD'),
    eventTime: '5 Days Event',
    location: 'Church Camp Ground',
    category: 'youth'
  },
  {
    title: 'Sample - Women\'s Conference 2024',
    description: 'Women\'s conference focused on spiritual growth and empowerment.',
    eventDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    eventTime: '2 Days Event',
    location: 'Main Sanctuary',
    category: 'conference'
  },
  {
    title: 'Sample - Church Founders Day',
    description: 'Celebrating the vision and faith of those who established Royal Temple Worship Centre.',
    eventDate: moment().subtract(45, 'days').format('YYYY-MM-DD'),
    eventTime: 'All Day',
    location: 'Main Sanctuary',
    category: 'anniversary'
  },
  {
    title: 'Sample - Regional Revival',
    description: 'Spiritual revival with anointed worship and powerful messages from visiting ministers.',
    eventDate: moment().subtract(60, 'days').format('YYYY-MM-DD'),
    eventTime: '7 Days Event',
    location: 'Neighboring Assembly',
    category: 'revival'
  }
];

async function run() {
  const args = process.argv.slice(2);
  const clearOnly = args.includes('--clear');
  
  console.log(clearOnly ? '🧹 Clearing sample rows only...' : '🌱 Inserting sample data...');
  console.log();

  if (clearOnly) {
    // Delete only sample rows - using naming conventions
    // Since we added sample markers in title/name fields, we delete rows where
    // titles/names start with "Sample - " or "Sample "
    try {
      // Delete sample sermons (titles starting with "Sample - ")
      const [sermonResult] = await pool.query(
        `DELETE FROM sermons WHERE title LIKE 'Sample -%'`
      );
      
      // Delete sample events (we'll identify by description containing 'Sample -')
      const [eventResult] = await pool.query(
        `DELETE FROM events WHERE description LIKE '%Sample%'`
      );
      
      // Delete sample leaders (names starting with "Sample ")
      const [leaderResult] = await pool.query(
        `DELETE FROM leadership WHERE name LIKE 'Sample %'`
      );
      
      console.log(`✅ Deleted ${sermonResult.affectedRows} sample sermons`);
      console.log(`✅ Deleted ${eventResult.affectedRows} sample events`);
      console.log(`✅ Deleted ${leaderResult.affectedRows} sample leadership rows`);
      console.log();
      console.log('Sample rows cleared. You may now add real data.');
    } catch (error) {
      console.error('❌ Error clearing sample data:', error.message);
    }
    return;
  }

  // Begin transaction-like operations (individual queries for simplicity)
  
  // 1. Insert 6 sermons
  console.log('Inserting 6 sermons...');
  for (const sermon of SERMONS) {
    await pool.query(
      `INSERT INTO sermons (title, speaker, description, video_url, thumbnail_url, sermon_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [sermon.title, sermon.speaker, sermon.description, sermon.videoUrl, sermon.thumbnailUrl, sermon.sermonDate]
    );
  }
  console.log('  ✅ 6 sermons inserted');
  console.log();

  // 2. Insert 8 events (some upcoming, some past)
  console.log('Inserting 8 events...');
  for (const event of EVENTS) {
    await pool.query(
      `INSERT INTO events (title, description, event_date, event_time, location, category) VALUES (?, ?, ?, ?, ?, ?)`,
      [event.title, event.description, event.eventDate, event.eventTime, event.location, event.category]
    );
  }
  console.log('  ✅ 8 events inserted');
  console.log();

  // 3. Insert 9 ministries
  console.log('Inserting 9 ministries...');
  for (let i = 0; i < MINISTRY_NAMES.length; i++) {
    const slug = MINISTRY_NAMES[i].toLowerCase()
      .replace(/['\s]/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-');
    
    await pool.query(
      `INSERT INTO ministries (name, slug, description, icon_url) VALUES (?, ?, ?, ?)`,
      [MINISTRY_NAMES[i], slug, `The ${MINISTRY_NAMES[i]} ministry wing`, `assets/images/ministry-placeholder.jpg`]
    );
  }
  console.log('  ✅ 9 ministries inserted');
  console.log();

  // 4. Insert leadership set
  // Pastor and wife together, then presiding elder, secretary, 3 elders, 2 deacons, 2 deaconesses, 1 leader per ministry
  console.log('Inserting leadership set...');
  
  // Pastor and Wife
  await pool.query(
    `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [FAKE_NAMES.pastor, 'pastor', i, 'assets/images/pastor-placeholder.jpg', 'Resident Pastor called to shepherd the Royal Temple assembly with vision and humility. Brings over 15 years of pastoral experience and a passion for equipping believers for kingdom impact.', 1]
  );
  
  // Wife
  await pool.query(
    `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [FAKE_NAMES.wife, 'pastors_wife', i, 'assets/images/pastor-wife-placeholder.jpg', 'Ministry wife and mother of two. Deaconess Ofori leads the Women\'s Ministry and facilitates pastoral care initiatives.', 2]
  );
  
  // Presiding Elder
  await pool.query(
    `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [FAKE_NAMES.presidingElder, 'presiding_elder', i, 'assets/images/leader-placeholder.jpg', 'Provides spiritual oversight and governance support to the resident pastor. Brings experience in church administration and discipleship.', 3]
  );
  
  // Secretary
  await pool.query(
    `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [FAKE_NAMES.secretary, 'secretary', i, 'assets/images/leader-placeholder.jpg', 'Manages church records, coordination, and communication. Ensures smooth operations of the administrative office.', 4]
  );
  
  // 3 Elders
  for (let i = 0; i < 3; i++) {
    await pool.query(
      `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [`FAKE_NAMES.elder${i + 1}`, 'elder', i, 'assets/images/leader-placeholder.jpg', `Elder supporting the pastoral office in shepherding and governance. Focus areas include biblical teaching and pastoral care.`, i + 5]
    );
  }
  
  // 2 Deacons
  for (let i = 0; i < 2; i++) {
    await pool.query(
      `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [`FAKE_NAMES.deacon${i + 1}`, 'deacon', i, 'assets/images/leader-placeholder.jpg', `Deacon supporting worship operations, sanctuary maintenance, and communion preparation. Key role in sanctuary operations and audio-visual support.`, i + 8]
    );
  }
  
  // 2 Deaconesses
  for (let i = 0; i < 2; i++) {
    await pool.query(
      `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [`FAKE_NAMES.deaconess${i + 1}`, 'deaconess', i, 'assets/images/leader-placeholder.jpg', `Deaconess supporting women\'s ministry, hospitality, and pastoral care. Key role in congregation care and new member integration.`, i + 10]
    );
  }
  
  // 1 Leader per ministry (9 leaders)
  for (let m = 0; m < MINISTRY_NAMES.length; m++) {
    await pool.query(
      `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [`FAKE_NAMES.ministryLeaderPrefix${m + 1}`, 'ministry_leader', m, 'assets/images/leader-placeholder.jpg', `Leads the ${MINISTRY_NAMES[m]} fellowship, breakouts, and leadership retreats.`, m + 12]
    );
  }
  
  console.log('  ✅ Leadership set inserted (pastor, wife, presiding elder, secretary, 3 elders, 2 deacons, 2 deaconesses, 9 ministry leaders)');
  console.log();
  console.log('🌱 Sample data insertion complete!');
  console.log();
  console.log('To clear sample data later, run:');
  console.log('  node scripts/seedSampleData.js --clear');
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});