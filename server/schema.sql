-- =============================================================================
-- ROYAL TEMPLE WORSHIP CENTRE (THE CHURCH OF PENTECOST): DATABASE SCHEMA
-- Run against the Aiven MySQL database, e.g.:
--   mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME < schema.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- admins: the single administrator account(s) for the /admin dashboard.
-- Seeded via scripts/seedAdmin.js (bcrypt hash; never store plain passwords).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)     NOT NULL,
  email         VARCHAR(255)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  -- Tokens issued at or before this moment (UTC) are refused. Set on password change, reset and log out.
  token_valid_after DATETIME      NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- sermons
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sermons (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(255) NOT NULL,
  speaker       VARCHAR(120) NOT NULL,
  description   TEXT,
  video_url     VARCHAR(500),
  thumbnail_url VARCHAR(500),
  sermon_date   DATE         NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sermons_speaker (speaker),
  KEY idx_sermons_date (sermon_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  event_date  DATE         NOT NULL,
  event_time  VARCHAR(50),
  location    VARCHAR(255),
  category    ENUM('convention','revival','camp_meeting','anniversary','other')
              NOT NULL DEFAULT 'other',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_date (event_date),
  KEY idx_events_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ministries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ministries (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(160) NOT NULL,
  description   TEXT,
  meeting_time  VARCHAR(150),          -- the "Meets:" line on the Ministries page
  icon_url      VARCHAR(500),
  display_order INT          NOT NULL DEFAULT 0, -- order on the website, lowest first
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ministries_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- leadership: linked to ministries via nullable FK.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leadership (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(150) NOT NULL,
  role          ENUM('pastor','pastors_wife','presiding_elder','secretary',
              'elder','deacon','deaconess','ministry_leader') NOT NULL,
  ministry_id   INT UNSIGNED NULL,
  photo_url     VARCHAR(500),
  bio           TEXT,
  display_order INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leadership_role (role),
  KEY idx_leadership_ministry (ministry_id),
  CONSTRAINT fk_leadership_ministry
    FOREIGN KEY (ministry_id) REFERENCES ministries (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- contact_messages: public contact form submissions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  status     ENUM('new','read','responded') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- prayer_requests: is_private honors the submitter's privacy preference.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_requests (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150) NOT NULL,
  request_text TEXT         NOT NULL,
  is_private   TINYINT(1)   NOT NULL DEFAULT 0,
  status       ENUM('new','prayed_for') NOT NULL DEFAULT 'new',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prayer_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- newsletter_subscribers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  subscribed_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- site_settings: church details and live stream links, edited in Admin > Settings
-- and shown on the public site.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  setting_key   VARCHAR(100)     NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- backup_runs: one row per backup made on the Backups page (migration 006).
-- The files are kept in BACKUP_DIR on the server, never in the database. Times are UTC.
-- The unique key on (kind, period_key) lets each month's automatic backup run once.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Create every setting key. No church facts are seeded: the address, phone
-- numbers, email, mission and vision must be typed in by the church in
-- Admin > Settings. Until then the site shows a marked placeholder.
-- VERIFY: the service times below were on the earlier site and are unconfirmed.
-- The no-op ON DUPLICATE KEY UPDATE means re-running this file never overwrites
-- what an admin has saved.
-- -----------------------------------------------------------------------------
INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('welcome_message', ''),
  ('service_times', 'Sunday worship service: 8:00 am to 11:30 am\nWednesday Bible study: 6:30 pm to 8:30 pm\nFriday prayer meeting: 6:30 pm to 9:00 pm'),
  ('church_address', ''),
  ('phone_number', ''),
  ('helpline_number', ''),
  ('email', ''),
  ('mission_statement', ''),
  ('vision_statement', ''),
  ('youtube_channel_url', ''),
  ('youtube_live_video_id', ''),
  ('facebook_live_url', ''),
  ('preferred_default_platform', 'youtube'),
  ('live_status_override', ''),
  ('next_service_title', ''),
  ('next_service_date', ''),
  ('next_service_time', ''),
  ('previous_broadcast_url', ''),
  ('announcement_enabled', '0'),
  ('announcement_text', ''),
  ('announcement_link', ''),
  -- Automatic monthly backup (Admin > Backups). Not sent to visitors.
  ('backup_auto_enabled', '0'),
  ('backup_keep_auto', '6'),
  ('backup_auto_images', '0'),
  -- Placeholders: the home page hides the featured verse until both are replaced.
  ('featured_verse_text', '[ADD: verse text]'),
  ('featured_verse_ref', '[ADD: reference]')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

SET FOREIGN_KEY_CHECKS = 1;
