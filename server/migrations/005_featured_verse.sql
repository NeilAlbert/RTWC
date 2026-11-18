-- Migration 005: the featured verse on the home page.
--
-- BACK UP THE DATABASE FIRST (see BACKUPS.md). Run this once, by hand, on a database
-- that was created before this migration existed:
--   mysql -u <user> -p <database> < migrations/005_featured_verse.sql
-- A database created from the current schema.sql already has these rows.
--
-- The values below are placeholders, not a verse. The home page hides the verse band
-- until an admin replaces both in Admin > Settings > Featured verse.
-- INSERT IGNORE leaves any value that is already there, so running it twice is harmless.
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('featured_verse_text', '[ADD: verse text]'),
  ('featured_verse_ref', '[ADD: reference]');
