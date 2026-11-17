/**
 * models/mediaUsageModel.js: finds where uploaded images are used.
 * Every query uses ? placeholders.
 */
const pool = require('../config/db');
const { likePattern } = require('../utils/search');
const { UPLOAD_URL_PREFIX } = require('../utils/validators');

/**
 * Every place an uploaded image is used, as { url, usedBy } rows.
 * usedBy is a short plain label, for example "Leader photo: Jane Doe".
 * A setting is returned with its whole value in `url`, because a setting may
 * hold an image address anywhere inside its text.
 */
async function findAllUses() {
  const uploads = `${likePattern(UPLOAD_URL_PREFIX).slice(1)}`; // starts with the uploads folder
  const [[leaders], [sermons], [ministries], [settings]] = await Promise.all([
    pool.query('SELECT name, photo_url AS url FROM leadership WHERE photo_url LIKE ?', [uploads]),
    pool.query('SELECT title AS name, thumbnail_url AS url FROM sermons WHERE thumbnail_url LIKE ?', [uploads]),
    pool.query('SELECT name, icon_url AS url FROM ministries WHERE icon_url LIKE ?', [uploads]),
    pool.query('SELECT setting_key AS name, setting_value AS url FROM site_settings WHERE setting_value LIKE ?', [likePattern(UPLOAD_URL_PREFIX)]),
  ]);
  return [
    ...leaders.map((row) => ({ url: row.url, usedBy: `Leader photo: ${row.name}` })),
    ...sermons.map((row) => ({ url: row.url, usedBy: `Sermon thumbnail: ${row.name}` })),
    ...ministries.map((row) => ({ url: row.url, usedBy: `Ministry icon: ${row.name}` })),
    ...settings.map((row) => ({ url: row.url, usedBy: `Setting: ${row.name}` })),
  ];
}

module.exports = { findAllUses };
