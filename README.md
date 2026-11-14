# Royal Temple Worship Centre website

Website of The Church of Pentecost, Royal Temple Worship Centre.

- Public pages: the `.html` files in this folder, with `css/style.css` and `js/`.
- Admin pages: `admin/` (sign in at `admin/login.html`).
- API: `server/` (Node, Express, MySQL). The web server must serve these static files
  and pass `/api/` to the API on the same address. The API does not serve the pages itself.

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
