-- Migration 003: remove sample values from site_settings.
-- Earlier versions of schema.sql seeded an invented phone number, email address,
-- postal address, welcome message, mission, vision and tagline. The public site now
-- shows whatever is in these settings, so the sample values must not remain.
-- Each row is cleared only if it still holds the exact sample text, so anything an
-- admin has already typed in is left alone. Take a backup first (see BACKUPS.md).

UPDATE site_settings SET setting_value = ''
WHERE (setting_key = 'phone_number'      AND setting_value = '+233 (0) 30 123 4567')
   OR (setting_key = 'helpline_number'   AND setting_value = '+233 (0) 30 123 4567')
   OR (setting_key = 'email'             AND setting_value = 'info@royaltemple.org')
   OR (setting_key = 'church_address'    AND setting_value = 'Royal Temple Worship Centre Complex, The Church of Pentecost')
   OR (setting_key = 'welcome_message'   AND setting_value LIKE 'Welcome to Royal Temple Worship Centre%glorious assembly%')
   OR (setting_key = 'mission_statement' AND setting_value LIKE 'To glorify God through holy living, spirit-filled worship%')
   OR (setting_key = 'vision_statement'  AND setting_value LIKE 'A glorious, spirit-filled assembly raising believers%');

-- The home page no longer shows a tagline.
DELETE FROM site_settings WHERE setting_key = 'hero_tagline';
