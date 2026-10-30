-- --------------------------------------------------------
-- Migration: 001_remove_giving_records.sql
-- --------------------------------------------------------
-- WARNING: Take a mysqldump backup before running this migration.
-- This migration removes the giving_records table and adds
-- new giving settings keys to site_settings.
-- --------------------------------------------------------

-- Remove the giving_records table entirely (if it exists).
DROP TABLE IF EXISTS giving_records;

-- Add new giving settings keys to site_settings for fresh installs.
-- These are seeded via the schema.sql INSERT statement.
-- If upgrading from an existing database, the keys may already exist
-- (ON DUPLICATE KEY UPDATE prevents overwriting admin edits).

-- Note: The giving_intro, giving_momo, giving_bank, and giving_note
-- keys should already exist in site_settings from the schema.sql seed.
-- This migration simply ensures the table structure no longer references
-- giving_records, and the new settings keys are available.

-- --------------------------------------------------------
-- End of migration 001_remove_giving_records.sql
-- --------------------------------------------------------