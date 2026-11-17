-- Migration 004: additions for the new admin dashboard.
--
-- BACK UP THE DATABASE FIRST (see BACKUPS.md). Run this once, by hand, on a database
-- that was created before this migration existed:
--   mysql -u <user> -p <database> < migrations/004_admin_additions.sql
-- A database created from the current schema.sql already has all of this.
--
-- The server will not start until admins.token_valid_after exists, and says so.
--
-- 1. admins.token_valid_after: sign-in tokens issued at or before this moment (UTC)
--    are refused. It is set when the password is changed or reset and when the admin
--    logs out, so an old or copied token stops working.
--    Running this statement a second time fails with "Duplicate column name". That
--    is harmless and changes nothing.
ALTER TABLE admins
  ADD COLUMN token_valid_after DATETIME NULL AFTER password_hash;

-- 2. Settings for the site announcement bar. Off and empty until an admin fills
--    them in. INSERT IGNORE leaves any value that is already there.
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('announcement_enabled', '0'),
  ('announcement_text', ''),
  ('announcement_link', '');
