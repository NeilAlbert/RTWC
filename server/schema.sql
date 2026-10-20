-- ============================================================================
-- ROYAL TEMPLE WORSHIP CENTRE (THE CHURCH OF PENTECOST) — DATABASE SCHEMA
-- Run against the Aiven MySQL database, e.g.:
--   mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME < schema.sql
-- ============================================================================

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

-- Revocable JWT sessions; rows expire with the token and are checked by the
-- authentication middleware on every protected request.
CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id CHAR(36) NOT NULL,
  admin_id   INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  KEY idx_admin_sessions_admin (admin_id),
  KEY idx_admin_sessions_expiry (expires_at),
  CONSTRAINT fk_admin_sessions_admin
    FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- sermons
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sermons (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(255) NOT NULL,
  speaker       VARCHAR(120) NOT NULL,
  scripture     VARCHAR(255),
  category      VARCHAR(120),
  tags          VARCHAR(1000),
  description   TEXT,
  video_url     VARCHAR(500),
  audio_url     VARCHAR(500),
  thumbnail_url VARCHAR(500),
  sermon_date   DATE         NOT NULL,
  published     TINYINT(1)   NOT NULL DEFAULT 0,
  featured      TINYINT(1)   NOT NULL DEFAULT 0,
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
  start_time  VARCHAR(20),
  end_time    VARCHAR(20),
  location    VARCHAR(255),
  image_url   VARCHAR(500),
  registration_url VARCHAR(500),
  category    ENUM('convention','revival','camp_meeting','anniversary','other')
              NOT NULL DEFAULT 'other',
  published   TINYINT(1)   NOT NULL DEFAULT 0,
  featured    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_date (event_date),
  KEY idx_events_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- testimonies — user-submitted testimonies with moderation workflow
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonies (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  testimony     TEXT         NOT NULL,
  permission_to_publish TINYINT(1) NOT NULL DEFAULT 0,
  status        ENUM('pending','approved','rejected','published','archived') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_testimony_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- announcements — admin-created announcements with publish/expiry dates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(255) NOT NULL,
  content       TEXT         NOT NULL,
  image_url     VARCHAR(500),
  publish_date  DATETIME     NOT NULL,
  expiry_date   DATETIME,
  priority      ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  published     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcement_published (published),
  KEY idx_announcement_expiry (expiry_date)
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
  status     ENUM('new','read','responded','archived') NOT NULL DEFAULT 'new',
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
  status       ENUM('new','being_prayed_for','completed','archived') NOT NULL DEFAULT 'new',
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

-- Migration (idempotent — safe to run every time, including fresh installs):
-- adds payment_channel to EXISTING giving_records tables that were created
-- before the column existed. Fresh installs already have it from the CREATE
-- TABLE above, so the dynamic check simply no-ops.
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

-- Seed sensible starting values for site_settings so the site is never blank.
-- Uses INSERT ... ON DUPLICATE KEY UPDATE with a no-op so re-running the schema
-- never overwrites admin edits.
INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('welcome_message', 'Welcome to Royal Temple Worship Centre — a glorious assembly dedicated to holy living, spirit-filled worship, and global evangelism.'),
  ('service_times', 'Sunday Worship Service: 8:00 AM – 11:30 AM
Wednesday Bible Study: 6:30 PM – 8:30 PM
Friday Prayer Tower: 6:30 PM – 9:00 PM'),
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
  ('preferred_default_platform', 'facebook'),
  ('manual_live_offline_override', 'false'),
  ('next_service_title', 'Sunday Divine Worship & Word Service'),
  ('next_service_date', ''),
  ('next_service_time', '8:00 AM GMT'),
  ('previous_broadcast_url', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- -----------------------------------------------------------------------------
-- Idempotent upgrades for databases created before content publishing fields.
-- Existing sermons/events are retained as published; new records default to drafts.
-- -----------------------------------------------------------------------------
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'scripture');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE sermons ADD COLUMN scripture VARCHAR(255) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'category');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE sermons ADD COLUMN category VARCHAR(120) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'tags');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE sermons ADD COLUMN tags VARCHAR(1000) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'audio_url');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE sermons ADD COLUMN audio_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'published');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE sermons ADD COLUMN published TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'featured');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE sermons ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;

SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'start_time');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE events ADD COLUMN start_time VARCHAR(20) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'end_time');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE events ADD COLUMN end_time VARCHAR(20) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'image_url');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE events ADD COLUMN image_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'registration_url');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE events ADD COLUMN registration_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'published');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE events ADD COLUMN published TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;
SET @rtwc_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'featured');
SET @rtwc_sql = IF(@rtwc_col = 0, 'ALTER TABLE events ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE rtwc_stmt FROM @rtwc_sql; EXECUTE rtwc_stmt; DEALLOCATE PREPARE rtwc_stmt;

-- Upgrade moderation enums without losing the previous prayed_for value.
ALTER TABLE prayer_requests MODIFY status ENUM('new','prayed_for','being_prayed_for','completed','archived') NOT NULL DEFAULT 'new';
UPDATE prayer_requests SET status = 'being_prayed_for' WHERE status = 'prayed_for';
ALTER TABLE prayer_requests MODIFY status ENUM('new','being_prayed_for','completed','archived') NOT NULL DEFAULT 'new';
ALTER TABLE contact_messages MODIFY status ENUM('new','read','responded','archived') NOT NULL DEFAULT 'new';
ALTER TABLE testimonies MODIFY status ENUM('pending','approved','rejected','published','archived') NOT NULL DEFAULT 'pending';

SET FOREIGN_KEY_CHECKS = 1;
