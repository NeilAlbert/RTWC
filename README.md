# Royal Temple Worship Centre website

Website of The Church of Pentecost, Royal Temple Worship Centre.

- Public pages: the `.html` files in this folder, with `css/style.css` and `js/`.
- Admin pages: `admin/` (sign in at `admin/login.html`).
- API: `server/` (Node, Express, MySQL). The pages and `/api/` must be on the same
  address, because the admin sign-in sends its requests to `/api/` on the address the
  page came from. The API serves the pages itself, so on its own it is enough. On a
  live host a web server such as nginx can serve the pages and pass `/api/` to the API.

## Running the site and signing in to the admin

1. In `server/`, copy `.env.example` to `.env` and fill in the database settings
   (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) and a `JWT_SECRET` of at
   least 32 characters. For a hosted database such as Aiven, set `DB_SSL_CA` to the path
   of its `ca.pem`. For MySQL on the same computer, set `DB_SSL=false`. The server will
   not start until the database settings and `JWT_SECRET` are there, and it says which
   one is missing.
2. In `server/`, run `npm install`, then `npm start`.
3. Open `http://localhost:5000/api/health`. It must say `"database":"connected"`.
4. Open `http://localhost:5000/admin/login.html` and sign in. Do not open the admin
   pages from another local server (for example Live Server on port 5500) or by
   double-clicking the file: the sign-in cannot reach the API from there.

### Admin pages

| Page | What it edits |
| --- | --- |
| Dashboard | Five counts, each with a link to its page |
| Settings | Church details and live stream links |
| Leadership | Leaders, their roles, photos and order |
| Sermons | The sermon archive |
| Events | Events. These show on the public Events page and home page at once |
| Ministries | Ministries. One that still has leaders cannot be deleted |
| Messages | Messages from the contact form. Opening a new one marks it as read |
| Prayer Requests | Prayer requests. A private one shows its name and text only when opened |
| Newsletter | Subscribers, with search, remove and "Export as CSV" |

The sidebar shows how many messages and prayer requests are new. The CSV export holds
every subscriber. Any address that starts with `=`, `+`, `-` or `@` gets a single quote
in front, so a spreadsheet cannot run it as a formula.

The public Sermons, Ministries and About pages do not read from the admin yet. They
still show what is written in `js/pages/sermons.js`, `ministries.html` and `about.html`.

Photos uploaded in the admin are saved in `assets/uploads/` under a random name (JPEG,
PNG or WebP, 5 MB at most). Some hosts wipe the server's disk on every deploy, which
would lose these photos. See the note at the top of `server/middleware/upload.js`, and
include `assets/uploads/` in backups.

### Creating the admin or changing its password

In `server/`, run this with the admin's email address:

```
node scripts/resetAdminPassword.js admin@example.org
```

It asks for the new password twice and shows nothing as you type. The password must be
at least 12 characters. If there is no admin with that email yet, one is created. The
password can also be given as a second argument, but it is then kept in the terminal's
command history.

### If sign-in fails

| Message on the login page | Meaning |
| --- | --- |
| Invalid email or password | The email or the password is wrong. Reset the password with the command above. |
| Too many attempts. Please try again in a few minutes. | More than 10 attempts in 15 minutes from one address. Wait, or restart the API, which clears the count. |
| Cannot reach the server. Please try again. | The API is not running, or the page was not opened from the API's address. |
| The server has a problem and could not sign you in. | Usually the database. Check `/api/health` and `server/logs/server.log`. |

`TRUST_PROXY` in `.env` is the number of proxies in front of the API: 1 behind nginx, 0
when browsers reach the API directly. If it is too low on a live host, every visitor
appears to come from one address and they share one sign-in limit.

## Where to edit content

| Content | Where |
| --- | --- |
| Address, phone, helpline, email, service times, welcome message, mission, vision | Admin > Settings |
| YouTube and Facebook links, live status, next broadcast, recent service link | Admin > Settings |
| District and area | `index.html` |
| History, Resident Pastor, elders, deacons, statement of faith | `about.html` |
| Ministries, their meeting times and leaders | `ministries.html` |
| Sermons | the `sermons` list at the top of `js/pages/sermons.js` |
| Events | the events API (`POST /api/events`, admin sign-in required) |
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

Run `server/schema.sql` on a new database. On an existing database also run the files in
`server/migrations/` in order. Migration 003 clears sample contact details that older
versions of the schema inserted. See `server/BACKUPS.md` before running any migration.

## Live streaming

YouTube live detection uses the server-side `YOUTUBE_API_KEY`. Facebook live detection
and the gallery use `PAGE_ID` and `FB_PAGE_ACCESS_TOKEN`. Keep these on the server and
never put them in browser code. The Watch Live page embeds a stream when the provider
allows it and otherwise links to it.

## Event calendar

The Events page and its calendar feed read from the events API. The feed is at
`https://<site-domain>/api/events/calendar.ics`. Calendar apps refresh subscriptions on
their own schedule, so new events may take a while to appear.
