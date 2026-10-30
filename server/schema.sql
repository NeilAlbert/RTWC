-- =============================================================================
-- ROYAL TEMPLE WORSHIP CENTRE (THE CHURCH OF PENTECOST) — DATABASE SCHEMA
-- Run against the Aiven MySQL database, e.g.:
--   mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME < schema.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- admins — the single administrator account(s) for the /admin dashboard.
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
-- leadership — linked to ministries via nullable FK.
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
-- contact_messages — public contact form submissions.
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
-- prayer_requests — is_private honors the submitter's privacy preference.
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
-- site_settings — editable key/value content shown on the public site
-- (welcome message, service times, contact info, mission/vision, hero tagline,
-- and giving details: giving_intro, giving_momo, giving_bank, giving_note).
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
-- Seed sensible starting values for site_settings so the site is never blank.
-- Uses INSERT ... ON DUPLICATE KEY UPDATE with a no-op so re-running the schema
-- never overwrites admin edits.
-- -----------------------------------------------------------------------------
INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('welcome_message', 'Welcome to Royal Temple Worship Centre — a glorious assembly dedicated to holy living, spirit-filled worship, and global evangelism.'),
  ('service_times', 'Sunday Worship Service: 8:00 AM – 11:30 AM\nWednesday Bible Study: 6:30 PM – 8:30 PM\nFriday Prayer Tower: 6:30 PM – 9:00 PM'),
  ('church_address', 'Royal Temple Worship Centre Complex, The Church of Pentecost'),
  ('phone_number', '+233 (0) 30 123 4567'),
  ('helpline_number', '+233 (0) 30 123 4567'),
  ('email', 'info@royaltemple.org'),
  ('mission_statement', 'To glorify God through holy living, spirit-filled worship, and the evangelisation of every nation.'),
  ('vision_statement', 'A glorious, spirit-filled assembly raising believers who transform their communities for Christ.'),
  ('hero_tagline', 'A House of Prayer, Worship and Evangelism'),
  ('youtube_channel_url', ''),
  ('youtube_live_video_id', ''),
  ('facebook_live_url', ''),
  ('preferred_default_platform', 'youtube'),
  ('live_status_override', ''),
  ('next_service_title', ''),
  ('next_service_date', ''),
  ('next_service_time', ''),
  ('previous_broadcast_url', ''),
  -- Giving settings (offline only — manually configured from Admin > Settings)
  ('giving_intro', 'Tithes and offerings support the work of the ministry. God bless you as you give.'),
  ('giving_momo', 'MTN Mobile Money | 0XX XXX XXXX | ADD ACCOUNT NAME\nTelecel Tmoney | 0XX XXX XXXX | ADD ACCOUNT NAME'),
  ('giving_bank', 'Bank | Account name | Account number | Branch\n( branch is optional )'),
  ('giving_note', 'Please confirm the account name matches the church before sending.\nExample: John Doe — Tithes')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

SET FOREIGN_KEY_CHECKS = 1;