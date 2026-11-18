-- Migration 006: the Backups page in the admin.
--
-- BACK UP THE DATABASE FIRST (see BACKUPS.md). Run this once, by hand, on a database
-- that was created before this migration existed:
--   mysql -u <user> -p <database> < migrations/006_backups.sql
-- A database created from the current schema.sql already has all of this.
-- Running it a second time changes nothing.
--
-- 1. backup_runs: one row per backup attempt. The backup files themselves are kept
--    in BACKUP_DIR on the server, never in the database. All times are UTC.
--    - kind: manual, automatic (monthly), or pre_restore (made just before a restore)
--    - period_key: the month of an automatic backup, for example "2026-12". The
--      unique key on (kind, period_key) lets each month run only once. It is NULL for
--      the other kinds, and MySQL allows any number of NULLs in a unique key.
--    - filename: made by the server, never taken from a request
--    - table_counts: rows per table, as JSON
--    - sha256: of the finished, encrypted file
--    - attempts: how many times this month's automatic backup has been tried (at most 3)
--    - deleted_at: set when the backup is deleted; the row is kept as a record
CREATE TABLE IF NOT EXISTS backup_runs (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  kind            ENUM('manual','automatic','pre_restore') NOT NULL,
  period_key      VARCHAR(7)      NULL,
  status          ENUM('running','success','failed') NOT NULL DEFAULT 'running',
  filename        VARCHAR(120)    NOT NULL,
  size_bytes      BIGINT UNSIGNED NULL,
  includes_images TINYINT(1)      NOT NULL DEFAULT 0,
  table_counts    JSON            NULL,
  image_count     INT UNSIGNED    NOT NULL DEFAULT 0,
  sha256          CHAR(64)        NULL,
  error_message   VARCHAR(255)    NULL,
  attempts        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  started_at      DATETIME        NOT NULL,
  finished_at     DATETIME        NULL,
  downloaded_at   DATETIME        NULL,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_backup_runs_filename (filename),
  UNIQUE KEY uq_backup_runs_period (kind, period_key),
  KEY idx_backup_runs_status (status),
  KEY idx_backup_runs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Settings for the automatic monthly backup: on or off, how many to keep, and
--    whether to include the images. Off until an admin switches it on. INSERT IGNORE
--    leaves any value that is already there. These keys are not sent to visitors by
--    GET /api/settings.
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('backup_auto_enabled', '0'),
  ('backup_keep_auto', '6'),
  ('backup_auto_images', '0');
