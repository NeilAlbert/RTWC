/**
 * utils/search.js: turns a search phrase into a pattern for SQL LIKE.
 * The pattern is always passed as a ? value, never joined into the SQL.
 */

/** "50%" becomes "%50\%%": the % and _ a person typed match themselves. */
function likePattern(phrase) {
  return `%${String(phrase).replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

module.exports = { likePattern };
