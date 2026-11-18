# Backups

The admin has a Backups page (Admin > Backups). It makes a backup of the website's
content as one encrypted file, lets you download it to your own device, restores
from it later, and can make one by itself every month.

## What a backup holds

Included:

- the rows of every content table: `site_settings`, `sermons`, `events`, `ministries`,
  `leadership`, `contact_messages`, `prayer_requests` and `newsletter_subscribers`
- the uploaded images in `assets/uploads/`, if you tick "Include uploaded images"
- `manifest.json`: the backup format version, the database version, the time it was
  made (UTC), the website version, row counts, image count, and a SHA-256 checksum of
  every other part of the file

Never included:

- the `admins` table: no admin names, email addresses or password hashes
- `backup_runs`, the list of backups itself
- `.env`, passwords, tokens, API keys or logs

A new content table must be added to `CONTENT_TABLES` in `services/backupService.js`.
Until it is, each backup logs a warning that names it.

## Why the files are encrypted, and the passphrase

A backup holds private prayer requests, contact messages and email addresses, so the
whole file is encrypted: AES-256-GCM, with a key made from your passphrase by scrypt
and a new random salt for every file. A changed or damaged file is detected and refused,
and a wrong passphrase is reported plainly.

- A manual backup asks for a passphrase of at least 12 characters, typed twice.
- Automatic backups use `BACKUP_PASSPHRASE` from `server/.env`.
- A safety backup made before a restore uses the passphrase of the file being restored.

The passphrase is never stored, logged or sent back by the server. **If it is lost, the
backup cannot be opened by anyone, including the people who built the site.** Keep every
passphrase in a password manager, separately from the files.

## Keep copies away from the server

Backups saved on the server are lost if the server is lost, replaced or broken into.
Download backups regularly (the dashboard reminds you after 35 days without a download)
and keep them on a computer or an external drive that is not the server. Deleting a
backup on the page removes the server copy only.

## Restoring

1. On the Backups page, choose a `.rtwcbackup` file from your device, or choose Restore
   on a saved backup. A file is uploaded to a temporary folder for 15 minutes. Nothing
   changes yet.
2. Enter its passphrase and choose "Check the file". The whole file is checked: the
   passphrase, every encrypted part, every checksum, and every row against the tables
   and columns of this database. A backup made with a different database version (one
   before or after a migration) is refused, and nothing is restored. Only a summary is
   shown, never the rows themselves.
3. Enter your admin password and type `RESTORE`, then choose "Restore now". A wrong admin
   password counts toward the 10 sign-in attempts per 15 minutes.

The server then:

1. makes a safety backup of the current data (type "Before restore"). If that fails, it
   stops and nothing is changed. The newest 3 safety backups are kept;
2. replaces every content table with the backup's rows in one database transaction. Any
   error undoes all of it, so the data is either fully restored or exactly as before. The
   `admins` table is never touched, and the automatic backup settings stay as they are;
3. if you chose "Also restore images", adds the backup's images to `assets/uploads/`.
   Only files named the way the upload page names them are accepted, nothing is written
   outside that folder, and an image that is already there is never overwritten. Images
   are not removed by a restore;
4. clears every cache, so the public site shows the restored content at once.

A restore never runs on a schedule and never runs without all of these steps.

## The automatic monthly backup

Switch it on in the "Automatic monthly backup" panel. It can only be switched on while
`BACKUP_PASSPHRASE` is set.

- The server checks once an hour. A backup is due from 02:00 UTC on the 1st of the month,
  or at any later time that month if the server was off on the 1st.
- One automatic backup per month. A failed one is tried again an hour later, at most 3
  times that month. Each failure is shown on the page and on Site status, and an email is
  sent to `ADMIN_NOTIFICATION_EMAIL` when email is set up. The email holds no personal data.
- After a successful one, the oldest automatic backups beyond the number you chose to keep
  (2 to 24, default 6) are deleted. Manual and "Before restore" backups are never deleted
  by this.
- With several copies of the server running, each one checks, but only one makes the
  month's backup (the month's row in `backup_runs` is claimed in the database).

## Settings in server/.env

| Setting | What it does |
| --- | --- |
| `BACKUP_DIR` | Folder for backup files, relative to `server/` or absolute. Default `server/backups`. It must be outside `css`, `js`, `assets` and `admin`, or backups are switched off. |
| `BACKUP_PASSPHRASE` | Passphrase for automatic backups, at least 12 characters. Generate it with `openssl rand -base64 32` and keep it in a password manager. Leave empty to keep automatic backups off. |
| `BACKUP_MAX_BYTES` | Largest backup file, in bytes. Default 1073741824 (1 GB). A backup that grows past it is stopped. |
| `BACKUP_MAX_UPLOAD_MB` | Largest file that can be uploaded to restore from. Default 500. |
| `BACKUP_KEEP_AUTO` | How many automatic backups to keep when the setting on the page has not been saved. Default 6, from 2 to 24. |

## Hosting notes

- Some hosts (Render, Railway, Heroku, Fly.io) give the server a fresh disk on every
  deploy. There, put `BACKUP_DIR` on a persistent volume, or the saved backups disappear.
  Download copies either way.
- With several copies of the server, `BACKUP_DIR` must be one folder they all share, or a
  backup made on one copy cannot be downloaded through another. A restore also needs its
  steps to reach the same copy, because the uploaded file and its 15-minute session are
  kept by the copy that received it.
- The backup files are in `.gitignore` and `.dockerignore`. There is no Docker compose
  file yet; when one is added, give `BACKUP_DIR` a volume.

## The database host's own backups

Aiven keeps automated daily backups of the database on most plans. They are a separate
safety net that can bring back the whole database, but they do not include the uploaded
images, and restoring them is done in the Aiven console, not on this site.

- Confirm they are switched on: open the MySQL service in the Aiven console, then the
  **Backups** tab, and note the retention period.

Before running a migration, also take a database export with `mysqldump`:

```bash
mysqldump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --user=$DB_USER \
  --password=$DB_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  $DB_NAME > backups/royaltemple_$(date +%Y%m%d_%H%M%S).sql
```

To bring one back:

```bash
mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME < backups/royaltemple_YYYYMMDD_HHMMSS.sql
```

Restoring over an existing database overwrites its data. When in doubt, restore into a
fresh database first and check the row counts before switching.
