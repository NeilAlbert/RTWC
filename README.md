# Royal Temple Worship Centre website

Website of The Church of Pentecost, Royal Temple Worship Centre.

- Public pages: the `.html` files in this folder, with `css/style.css` and `js/`.
- Admin pages: `admin/` (log in at `/admin`). The previous admin is kept in `admin-old/`,
  which is not served and not in git, until the new one is confirmed.
- API: `server/` (Node, Express, MySQL). The pages and `/api/` must be on the same
  address, because the admin sign-in sends its requests to `/api/` on the address the
  page came from. The API serves the pages itself, so on its own it is enough. On a
  live host a web server such as nginx can serve the pages and pass `/api/` to the API.

## Running the site and signing in to the admin

1. In `server/`, copy `.env.example` to `.env` and fill it in. Each setting has a comment
   saying what it is for and where to find it.
   - Required: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a `JWT_SECRET` of at
     least 32 characters (`openssl rand -hex 64`). The server will not start without them
     and says which one is missing.
   - Server: `PORT` (default 5000), `CORS_ORIGIN`, `TRUST_PROXY_HOPS` (default 1).
   - Database: `DB_PORT` (default 3306). For a hosted database such as Aiven, set
     `DB_SSL_CA` to the path of its `ca.pem`. For MySQL on the same computer, set
     `DB_SSL=false`.
   - Email notifications: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`,
     `ADMIN_NOTIFICATION_EMAIL`. Fill in all of them or none.
   - Live streaming and gallery: `PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `YOUTUBE_API_KEY`.
   - Redis (optional): `REDIS_ENABLED`, `REDIS_URL`, `REDIS_PREFIX`.
   - Backups: `BACKUP_DIR`, `BACKUP_PASSPHRASE`, `BACKUP_MAX_BYTES`,
     `BACKUP_MAX_UPLOAD_MB`, `BACKUP_KEEP_AUTO`.
2. In `server/`, run `npm install`, then `npm run check:env`. It checks `.env` and the
   database connection, prints names only (never values), and exits with an error when
   something required is wrong. Then run `npm start`.
3. Open `http://localhost:5000/api/ready`. It must say `"database":"ok"`.
   (`/api/health` only says the server is running; it does not check the database.)
4. Open `http://localhost:5000/admin` and log in. Do not open the admin pages from
   another local server (for example Live Server on port 5500) or by double-clicking the
   file: the login cannot reach the API from there.

### Admin pages

The admin is being rebuilt in four phases. After Phase 3 these pages work:

| Page | What it does |
| --- | --- |
| Log in | Email and password. 10 attempts per 15 minutes from one address |
| Dashboard | Five counts, the 5 newest unread messages and the next 3 events |
| Sermons | Add, edit, delete and search sermons |
| Events | Add, edit and delete events. Shows upcoming, past or all |
| Ministries | Add, edit and delete ministries. One that still has leaders cannot be deleted |
| Leadership | Add, edit and delete leaders, their roles, photos and order |
| Media | Every uploaded image, where it is used, and Delete for one that is not used |
| Messages | Messages from the Contact page. Opening a new one marks it read. Status, search, delete |
| Prayer Requests | The same for prayer requests. A private one shows only "Private" until it is opened, and is not searched |
| Newsletter | Subscribers, search, remove, and "Export as CSV" of the whole list |
| Settings | Church details, service times, page text, live stream links and the site announcement |
| Account | The admin name and email, and "Change password" |
| Backups | Make, download, delete and restore encrypted backups, and the automatic monthly backup |

Site status and Help open a placeholder until Phase 4.

The CSV export puts a `'` in front of any cell that starts with `=`, `+`, `-` or `@`, so
a spreadsheet shows it as text instead of running it as a formula.

The public Events page and home page show events from the admin at once. The public
Sermons, Ministries and About pages do not read from the admin yet: they still show
what is written in `js/pages/sermons.js`, `ministries.html` and `about.html`.

A login lasts 24 hours, or until the tab is closed, or until 30 minutes pass without a
click or key press. Logging out, changing the password or resetting it ends every other
login at once.

### Uploaded photos

Photos uploaded in the admin are saved in `assets/uploads/` under a random name (JPEG,
PNG or WebP, 5 MB at most). Some hosts, such as Render, Railway, Heroku and Fly.io, give
the server a fresh disk on every deploy, which would lose these photos. See the note at
the top of `server/middleware/upload.js`, and include `assets/uploads/` in backups.
Removing a photo from a form does not delete the file: delete it on the Media page.

### Creating the admin and resetting its password

The site has one admin account. In `server/`, create it once:

```
node scripts/seedAdmin.js "Full Name" admin@example.org
```

If you cannot log in, or to change the name or email address, reset it:

```
node scripts/resetAdminPassword.js "Full Name" admin@example.org
```

Both ask for the password twice and show nothing as you type. The password must be at
least 12 characters and is stored exactly as typed. It can also be given as a third
argument in quotes, but it is then kept in the terminal command history. `seedAdmin.js`
refuses to run when an admin already exists. `resetAdminPassword.js` never creates one.
A password you still know can be changed in Admin > Account instead.

### If the login fails

| Message on the login page | Meaning |
| --- | --- |
| Invalid email or password | The email or the password is wrong. Reset the password with the command above. |
| Too many attempts. Please try again in a few minutes. | More than 10 attempts in 15 minutes from one address. Wait, or restart the API, which clears the count (with Redis set up the count survives a restart; see `server/REDIS.md`). |
| Cannot reach the server. Please try again. | The API is not running, or the page was not opened from the API address. |
| The server has a problem and could not log you in. | Usually the database. Check `/api/ready` and `server/logs/server.log`. |

If the API stops at start-up and names `token_valid_after`, run migration 004 (see Database).

`TRUST_PROXY_HOPS` in `.env` is the number of proxies in front of the API: 1 behind nginx, 0
when browsers reach the API directly. If it is too low on a live host, every visitor
appears to come from one address and they share one sign-in limit. (The older name
`TRUST_PROXY` still works.)

Redis is optional and off by default. It shares the cache and the rate limits between
several copies of the server. See `server/REDIS.md`.

### Backups

Admin > Backups makes an encrypted backup of the content (never the admin accounts),
downloads it to your device, restores from it, and can make one every month by itself.
Run migration 006 first. Automatic backups need `BACKUP_PASSPHRASE` in `server/.env`.
Keep downloaded copies and their passphrases somewhere other than the server: a lost
passphrase cannot be recovered. See `server/BACKUPS.md`.

## Where to edit content

| Content | Where |
| --- | --- |
| Address, phone, helpline, email, service times, welcome message, mission, vision | Admin > Settings |
| YouTube and Facebook links, live status, next broadcast, recent service link | Admin > Settings |
| District and area | `index.html` |
| History, Resident Pastor, elders, deacons, statement of faith | `about.html` |
| Ministries, their meeting times and leaders | `ministries.html` |
| Sermons | the `sermons` list at the top of `js/pages/sermons.js` |
| Events | Admin > Events |
| The announcement bar above the header | Admin > Settings > Site announcement |
| Gallery photos | the church Facebook page, through the API |

Anything shown on the site as `[ADD: ...]` in a dashed box is a fact that still has to be
supplied. Search the HTML files for `[ADD:` to find them all. Comments marked `VERIFY`
flag content that must be checked before the site goes live.

If the API is not running, the pages still load. Church details fall back to the text in
the HTML, and the events, gallery, live and form sections say that they could not load.

## Photos

Real photos go in `assets/images/`. Grey boxes on the site name the file and size expected:

| File | Used on | Size |
| --- | --- | --- |
| `logo.jpg` | every page | square, at least 256 x 256 px |
| `hero.jpg` | home page | 1600 x 1067 px (3:2) |
| `church-building.jpg` | About, Our History | 1600 x 1067 px (3:2) |
| `resident-pastor.jpg` | About, Leadership | 800 x 1000 px (4:5) |

To use a supplied photo, replace the `<div class="photo-slot ...">` block with an `<img>`
that has `src`, a plain `alt` sentence, `width`, `height` and `loading="lazy"`.

## Database

On a new database run `server/schema.sql` (or `server/schema.mysql80.sql` for MySQL 8.0
on this computer, which also creates the database). Nothing else is needed.

On a database that already exists, back it up (see `server/BACKUPS.md`), then run the
files in `server/migrations/` that it has not had yet, in this order:

| File | What it does |
| --- | --- |
| `001_remove_giving_records.sql` | Removes giving records |
| `002_remove_giving.sql` | Removes the rest of giving |
| `003_remove_sample_settings.sql` | Clears sample contact details that older schemas inserted |
| `004_admin_additions.sql` | Adds `admins.token_valid_after` and the three announcement settings. The API will not start without it |
| `006_backups.sql` | Adds the `backup_runs` table and the three automatic backup settings for Admin > Backups |

Run one with, for example, `mysql -u root -p royal_temple < migrations/004_admin_additions.sql`
from the `server/` folder.

## Live streaming

YouTube live detection uses the server-side `YOUTUBE_API_KEY`. Facebook live detection
and the gallery use `PAGE_ID` and `FB_PAGE_ACCESS_TOKEN`. Keep these on the server and
never put them in browser code. The Watch Live page embeds a stream when the provider
allows it and otherwise links to it.

## Event calendar

The Events page and its calendar feed read from the events API. The feed is at
`https://<site-domain>/api/events/calendar.ics`. Calendar apps refresh subscriptions on
their own schedule, so new events may take a while to appear.
