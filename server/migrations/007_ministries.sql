-- Migration 007: two columns the public Ministries page needs, so that everything
-- it shows can be edited in Admin > Ministries.
--
-- BACK UP THE DATABASE FIRST (see BACKUPS.md). Run this once, by hand, on a database
-- that was created before this migration existed:
--   mysql -u <user> -p <database> < migrations/007_ministries.sql
-- A database created from the current schema.sql already has both columns.
-- Then run the one-time import: node scripts/importMinistries.js --dry-run, then
-- node scripts/importMinistries.js
--
-- 1. meeting_time: the "Meets:" line on the Ministries page, for example a day and
--    time. Empty until the church fills it in.
-- 2. display_order: the order the ministries appear in on the website. Lower numbers
--    come first; ministries with the same number are shown by name.
--
-- Running this a second time fails with "Duplicate column name". That is harmless
-- and changes nothing.
ALTER TABLE ministries
  ADD COLUMN meeting_time  VARCHAR(150) NULL AFTER description,
  ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER icon_url;
