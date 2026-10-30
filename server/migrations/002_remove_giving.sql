-- --------------------------------------------------------
-- Migration: 002_remove_giving.sql
-- --------------------------------------------------------
-- WARNING: Take a mysqldump backup before running this migration.
-- This migration drops the giving_records table and deletes
-- giving-related rows from site_settings. Dropped tables and
-- deleted settings cannot be recovered.
-- ----------------------------------------

-- Drop the giving_records table if it exists.
DROP TABLE IF EXISTS giving_records;

-- Delete giving-related rows from site_settings (keys starting with "giving_")
DELETE FROM site_settings WHERE setting_key LIKE 'giving_%' OR setting_key LIKE 'giving_%';

-- ----------------------------------------
-- End of migration 002_remove_giving.sql
-- ----------------------------------------