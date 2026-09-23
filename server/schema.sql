-- =============================================================================
-- ROYAL TEMPLE WORSHIP CENTRE (THE CHURCH OF PENTECOST) — DATABASE SCHEMA
-- Run against the Aiven MySQL database, e.g.:
--   mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME < schema.sql
--
-- All tables use InnoDB + utf8mb4. All application queries must use
-- parameterized placeholders (?) — never string concatenation.
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
-- giving_records — payment_reference is UNIQUE for idempotency: the webhook
-- must never double-record a donation for the same reference.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS giving_records (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(150) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  category          ENUM('tithe','offering','building_fund','thanksgiving',
                         'seed_offering') NOT NULL,
  payment_status    ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  -- payment_channel — Paystack metadata stored on webhook completion
  -- (e.g. 'card', 'mobile_money', 'bank', 'ussd'). Nullable; informational only.
  payment_channel   VARCHAR(50)   NULL,
  payment_reference VARCHAR(100) NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_giving_reference (payment_reference),
  KEY idx_giving_category (category),
  KEY idx_giving_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Migration (idempotent — safe to run every time, including fresh installs):
-- adds payment_channel to EXISTING giving_records tables that were created
-- before the column existed. Fresh installs already have it from the CREATE
-- TABLE above, so the dynamic check simply no-ops.
-- -----------------------------------------------------------------------------
SET @rtwc_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'giving_records'
    AND COLUMN_NAME = 'payment_channel'
);
SET @rtwc_sql = IF(
  @rtwc_col = 0,
  'ALTER TABLE giving_records ADD COLUMN payment_channel VARCHAR(50) NULL AFTER payment_status',
  'SELECT 1'
);
PREPARE rtwc_stmt FROM @rtwc_sql;
EXECUTE rtwc_stmt;
DEALLOCATE PREPARE rtwc_stmt;

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
-- (welcome message, service times, contact info, mission/vision, hero tagline).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key   VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  ('hero_tagline', 'A House of Prayer, Worship and Evangelism')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

SET FOREIGN_KEY_CHECKS = 1;
