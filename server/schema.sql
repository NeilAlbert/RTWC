-- language: mysql
-- RTWC (Royal Temple Worship Centre)
-- Fresh MySQL/MariaDB schema for phpMyAdmin
-- Import this file directly in phpMyAdmin.
--
-- IMPORTANT:
-- 1. This is MySQL/MariaDB SQL, NOT Microsoft SQL Server/T-SQL.
-- 2. Create/select your database in phpMyAdmin before importing.
-- 3. No real passwords, API keys, or streaming secrets belong in this file.

SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- ADMINISTRATION
-- =========================================================

CREATE TABLE IF NOT EXISTS admins(
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin','admin','editor') NOT NULL DEFAULT 'admin',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admins_email (email),
    KEY idx_admins_role (role),
    KEY idx_admins_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_id INT UNSIGNED NOT NULL,
    session_token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_sessions_token (session_token_hash),
    KEY idx_admin_sessions_admin (admin_id),
    KEY idx_admin_sessions_expires (expires_at),
    CONSTRAINT fk_admin_sessions_admin
        FOREIGN KEY (admin_id) REFERENCES admins(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- SERMONS
-- =========================================================

CREATE TABLE IF NOT EXISTS sermons (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(150) NULL,
    sermon_date DATE NULL,
    scripture VARCHAR(255) NULL,
    category VARCHAR(100) NULL,
    description TEXT NULL,
    thumbnail_url VARCHAR(1000) NULL,
    video_url VARCHAR(1000) NULL,
    audio_url VARCHAR(1000) NULL,
    tags VARCHAR(500) NULL,
    published TINYINT(1) NOT NULL DEFAULT 0,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sermons_date (sermon_date),
    KEY idx_sermons_category (category),
    KEY idx_sermons_published (published),
    KEY idx_sermons_featured (featured),
    KEY idx_sermons_speaker (speaker),
    CONSTRAINT fk_sermons_created_by
        FOREIGN KEY (created_by) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- EVENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    location VARCHAR(255) NULL,
    image_url VARCHAR(1000) NULL,
    category VARCHAR(100) NULL,
    registration_url VARCHAR(1000) NULL,
    published TINYINT(1) NOT NULL DEFAULT 0,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_events_date (event_date),
    KEY idx_events_category (category),
    KEY idx_events_published (published),
    KEY idx_events_featured (featured),
    CONSTRAINT fk_events_created_by
        FOREIGN KEY (created_by) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- MINISTRIES
-- =========================================================

CREATE TABLE IF NOT EXISTS ministries (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(1000) NULL,
    meeting_day VARCHAR(100) NULL,
    meeting_time VARCHAR(100) NULL,
    meeting_location VARCHAR(255) NULL,
    leader_name VARCHAR(150) NULL,
    contact_phone VARCHAR(50) NULL,
    contact_email VARCHAR(255) NULL,
    published TINYINT(1) NOT NULL DEFAULT 1,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ministries_slug (slug),
    KEY idx_ministries_published (published),
    KEY idx_ministries_featured (featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- LEADERSHIP
-- =========================================================

CREATE TABLE IF NOT EXISTS leadership (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    position VARCHAR(150) NOT NULL,
    bio TEXT NULL,
    photo_url VARCHAR(1000) NULL,
    display_order INT NOT NULL DEFAULT 0,
    published TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_leadership_order (display_order),
    KEY idx_leadership_published (published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- GALLERY
-- =========================================================

CREATE TABLE IF NOT EXISTS gallery_albums (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL,
    description TEXT NULL,
    cover_image_url VARCHAR(1000) NULL,
    published TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gallery_albums_slug (slug),
    KEY idx_gallery_albums_published (published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_images (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    album_id INT UNSIGNED NULL,
    title VARCHAR(255) NULL,
    image_url VARCHAR(1000) NOT NULL,
    alt_text VARCHAR(255) NULL,
    caption VARCHAR(500) NULL,
    display_order INT NOT NULL DEFAULT 0,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    published TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_gallery_images_album (album_id),
    KEY idx_gallery_images_order (display_order),
    KEY idx_gallery_images_featured (featured),
    CONSTRAINT fk_gallery_images_album
        FOREIGN KEY (album_id) REFERENCES gallery_albums(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- ANNOUNCEMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS announcements (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(1000) NULL,
    priority ENUM('normal','important','urgent') NOT NULL DEFAULT 'normal',
    published TINYINT(1) NOT NULL DEFAULT 0,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    expires_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_announcements_published (published),
    KEY idx_announcements_featured (featured),
    KEY idx_announcements_expiry (expires_at),
    CONSTRAINT fk_announcements_created_by
        FOREIGN KEY (created_by) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TESTIMONIALS
-- =========================================================

CREATE TABLE IF NOT EXISTS testimonials (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NULL,
    message TEXT NOT NULL,
    permission_to_publish TINYINT(1) NOT NULL DEFAULT 0,
    photo_url VARCHAR(1000) NULL,
    status ENUM('pending','approved','rejected','published','archived') NOT NULL DEFAULT 'pending',
    admin_notes TEXT NULL,
    reviewed_by INT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    published_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_testimonials_status (status),
    KEY idx_testimonials_created (created_at),
    CONSTRAINT fk_testimonials_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- PRAYER REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS prayer_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    request TEXT NOT NULL,
    status ENUM('new','being_prayed_for','completed','archived') NOT NULL DEFAULT 'new',
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    admin_notes TEXT NULL,
    assigned_to INT UNSIGNED NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_prayer_status (status),
    KEY idx_prayer_created (created_at),
    CONSTRAINT fk_prayer_assigned_to
        FOREIGN KEY (assigned_to) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- CONTACT MESSAGES
-- =========================================================

CREATE TABLE IF NOT EXISTS contact_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    subject VARCHAR(255) NULL,
    message TEXT NOT NULL,
    status ENUM('unread','read','archived') NOT NULL DEFAULT 'unread',
    replied_at DATETIME NULL,
    replied_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contact_status (status),
    KEY idx_contact_created (created_at),
    KEY idx_contact_email (email),
    CONSTRAINT fk_contact_replied_by
        FOREIGN KEY (replied_by) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- GIVING RECORDS
-- =========================================================

CREATE TABLE IF NOT EXISTS giving_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    donor_name VARCHAR(150) NULL,
    donor_email VARCHAR(255) NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'GHS',
    payment_channel ENUM('online','mobile_money','bank','cash','other') NOT NULL DEFAULT 'online',
    reference VARCHAR(255) NULL,
    payment_status ENUM('pending','successful','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
    purpose VARCHAR(255) NULL,
    transaction_date DATETIME NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_giving_reference (reference),
    KEY idx_giving_status (payment_status),
    KEY idx_giving_date (transaction_date),
    KEY idx_giving_channel (payment_channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- NEWSLETTER
-- =========================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(150) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_newsletter_email (email),
    KEY idx_newsletter_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- LIVE STREAMING / SITE SETTINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS site_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key VARCHAR(150) NOT NULL,
    setting_value TEXT NULL,
    setting_type ENUM('text','number','boolean','json','url') NOT NULL DEFAULT 'text',
    description VARCHAR(500) NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_site_settings_key (setting_key),
    KEY idx_site_settings_type (setting_type),
    CONSTRAINT fk_site_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES admins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- STREAMING-SPECIFIC SETTINGS
-- =========================================================

INSERT INTO site_settings
    (setting_key, setting_value, setting_type, description)
VALUES
    ('youtube_channel_url', '', 'url', 'Official RTWC YouTube channel URL'),
    ('youtube_live_video_id', '', 'text', 'Current YouTube Live video ID'),
    ('facebook_live_url', '', 'url', 'Current RTWC Facebook Live URL'),
    ('preferred_default_platform', 'youtube', 'text', 'Default live-stream platform: youtube or facebook'),
    ('manual_live_offline_override', 'false', 'boolean', 'Manual override for live/offline state'),
    ('live_status', 'offline', 'text', 'Current stream status: live or offline'),
    ('current_service_title', '', 'text', 'Title of the current live service'),
    ('current_service_description', '', 'text', 'Description of the current live service'),
    ('next_service_title', '', 'text', 'Next scheduled service title'),
    ('next_service_date', '', 'text', 'Next scheduled service date'),
    ('next_service_time', '', 'text', 'Next scheduled service time'),
    ('previous_broadcast_url', '', 'url', 'URL of the previous broadcast'),
    ('live_chat_enabled', 'true', 'boolean', 'Whether live chat UI should be enabled'),
    ('stream_share_enabled', 'true', 'boolean', 'Whether sharing controls should be displayed')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

-- =========================================================
-- BASIC SITE SETTINGS
-- =========================================================

INSERT INTO site_settings
    (setting_key, setting_value, setting_type, description)
VALUES
    ('site_name', 'Royal Temple Worship Centre', 'text', 'Website/church name'),
    ('site_tagline', '', 'text', 'Church tagline'),
    ('contact_email', '', 'text', 'Public contact email'),
    ('contact_phone', '', 'text', 'Public contact phone'),
    ('address', '', 'text', 'Church address'),
    ('facebook_url', '', 'url', 'Official Facebook page URL'),
    ('youtube_url', '', 'url', 'Official YouTube channel URL'),
    ('instagram_url', '', 'url', 'Official Instagram URL'),
    ('whatsapp_url', '', 'url', 'Official WhatsApp URL')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

-- =========================================================
-- OPTIONAL SEED ADMIN
-- =========================================================
-- Do NOT insert a real password here.
-- Create the first administrator through the application's
-- secure setup process, or insert a bcrypt/Argon2 hash generated
-- by the backend.
--
-- Example structure:
--
-- INSERT INTO admins (name, email, password_hash, role)
-- VALUES ('RTWC Administrator', 'admin@example.com', '<HASH>', 'super_admin');

-- =========================================================
-- OPTIONAL SEED CONTENT
-- =========================================================
-- Real church content should be entered through the admin dashboard.
-- No fabricated pastors, leaders, service times, phone numbers,
-- addresses, banking details, or other church information are inserted.

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- VERIFICATION QUERIES
-- Run these separately in phpMyAdmin if desired.
-- =========================================================
-- SHOW TABLES;
-- SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key;
