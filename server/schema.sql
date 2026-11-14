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
  description TEXT,
  icon_url    VARCHAR(500),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  ('previous_broadcast_url', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

SET FOREIGN_KEY_CHECKS = 1;
