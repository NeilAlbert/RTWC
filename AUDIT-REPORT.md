# Audit report: Royal Temple Worship Centre website

Date: 18 November 2026. This audit only read files: no project file was changed except this report. Nothing was written to any database, and production was not contacted.

## How this audit was done

- Read every server file (entry point, routes, middleware, controllers, models, backup engine, scheduler), both schema files, migrations 001 to 007, the public pages and scripts, the admin pages and scripts, README, BACKUPS.md, REDIS.md, the CI workflows, `.gitignore` and `.dockerignore`.
- Ran `npm audit`, `npm outdated` and `npm ls`, and a syntax check (`node --check`) of every JavaScript file. All files passed the syntax check.
- Checked the git history for committed secrets. Only `server/.env.example` was ever committed, and it only ever held placeholder words. No values are quoted here.
- Compared the environment variables the code reads with `.env.example` and `.env`, by name only.
- Started the server on port 5077 for about 50 seconds. It pointed at a database address that does not exist, so nothing could be written anywhere, and its log went to a temporary folder. Then:
  - called all 51 admin and account routes without a token. **Every one answered 401.** The backup download link answered 404 for a made-up ticket, which is the intended behaviour;
  - checked response headers, the 404 response, whether files outside the site folders can be fetched (all 404), how CORS treats a foreign origin (403), and what visitors get while the database is down.
- **Not done:** no browser was run in this audit, so keyboard use, zoom, and the 375, 768 and 1024px layouts are judged from the code only. Email sending, Facebook, YouTube, the live domain, DNS and the hosting were not tested. Items like these are marked "could not verify".

What exists: 9 public pages (home, about, ministries, sermons, events, live, gallery, contact, plus `robots.txt`), 17 admin pages, 14 route files with about 60 API endpoints, 9 tables plus `backup_runs`, 7 migrations, and 6 scripts. There are **no** Docker, Nginx, sitemap, 404 page, privacy page, test files, DEPLOY or ANALYTICS documents.

---

## 1. Summary

The code is carefully built and much safer than average for a site of this size. Every admin route needs a valid token, all SQL uses placeholders, no script puts data into a page as HTML, uploads are checked by their content, and backups are encrypted with a tested restore path. What stands between the project and a public launch is mostly around the code, not in it: there is no privacy notice, the public pages still show many `[ADD: ...]` placeholders, the public Sermons page ignores what the admin saves, and there is no production setup (HTTPS, reverse proxy, process restart). Next come hardening and running the site: security headers on public pages, a nodemailer upgrade, spam protection on two forms, a custom 404 page, crash recovery and monitoring, and up-to-date docs. There is no visitor statistics feature at all, so there is no analytics code to review.

| Priority | Count |
| --- | --- |
| Blockers | 5 |
| Should fix | 17 |
| Nice to have | 7 |
| Only I can do | 20 checklist items |

---

## 2. BLOCKERS

### B1. No privacy notice anywhere (MISSING)
- **What is wrong:** No page, footer link or text near a form says what is stored, why, for how long, who can see it, or how to have it removed.
- **Evidence:** No file contains the words "privacy", "data protection" or "unsubscribe" (search of `*.html` and `js/newsletter.js`). The site collects contact messages (`contact_messages`), prayer requests that may be sensitive (`prayer_requests`), and newsletter addresses (`newsletter_subscribers`). `server/server.js:140` writes every visitor's IP address and the page they asked for to `server/logs/server.log`, which is never cleared. Google Fonts load on every page, Google Maps on home and contact, and YouTube or Facebook players on live.html.
- **Why it matters:** People share prayer requests and personal details here. Ghana's Data Protection Act expects them to be told what happens to their data, and the church can be held responsible.
- **Fix:** Add `privacy.html`, link it in every footer, and add one sentence and a link beside each form (contact, prayer request, newsletter). It should cover what is stored, the purpose, who can read it (the church admin), how long it is kept (see S9), the request log with IP addresses, the third parties named above, and a contact for removal requests. Have it reviewed (see "Only I can do").
- **Effort:** medium (the wording needs the church's input).

### B2. Public pages still show placeholder and unverified content (INCOMPLETE)
- **What is wrong:** Visitors would see dashed `[ADD: ...]` boxes and grey photo boxes.
- **Evidence:**
  - Hard-coded in HTML, which the admin cannot edit:
    - `index.html:75`: district and area;
    - `about.html:78`: history;
    - `about.html:99`: Statement of Faith, marked `[VERIFY AGAINST OFFICIAL CHURCH OF PENTECOST SOURCE]`;
    - `index.html:86`: hero photo, marked "VERIFY: confirm this photo shows members".
  - Filled from Admin > Settings or Leadership once entered; the placeholder shows until then:
    - address, phone and email in the footer of every page (for example `index.html:235-239`, `contact.html:80-86`);
    - mission and vision (`about.html:91,93`, `index.html:119,121`);
    - Resident Pastor, Presiding Elder, Secretary, elders and deacons (`about.html:176-188`);
    - featured verse (seeded as `[ADD: verse text]`, hidden until it is replaced);
    - the ministry "Meets" line (`js/pages/ministries.js:76`).
  - Photo slots:
    - `index.html:115`: congregation, 1200 x 1500;
    - `index.html:160`: sermon thumbnail, 1600 x 900;
    - `about.html:79`: church building, 1600 x 1067, `assets/images/church-building.jpg`;
    - `about.html:167`: Resident Pastor, 800 x 1000, `assets/images/resident-pastor.jpg`.
  - The service times in `schema.sql:188` and in the HTML are marked "VERIFY ... unconfirmed".
- **Why it matters:** A site that goes public with placeholders looks unfinished, and unverified doctrine or service times can mislead people.
- **Fix:** Enter the Settings and Leadership content in the admin. Supply the facts and photos listed above. Check the Statement of Faith against thecophq.org. See also S15, which would move the hard-coded items into the admin.
- **Effort:** small in code, but it depends on the church supplying content.

### B3. The admin Sermons page saves sermons the public site never shows (BROKEN)
- **What is wrong:** Admin > Sermons writes to the `sermons` table, but the public Sermons page reads a fixed, empty list in the script. The home page sermon band is static text.
- **Evidence:** `js/pages/sermons.js:14` has `const sermons = [];` and the script stops at line 17 when the list is empty. No public script calls `/api/sermons`. The text "No sermons have been posted here yet." is hard-coded at `index.html:163`. README line 136 still tells editors to edit the script.
- **Why it matters:** An editor adds a sermon, sees it saved, and it never appears. They will think the site is broken.
- **Fix:** Make `js/pages/sermons.js` load `GET /api/sermons` (it supports `q`, `speaker`, `page` and `limit`), map `video_url`, `description` and `sermon_date`, and keep the filters. Show the newest sermon in the home sermon band. Either drop the "service" filter or add a column for it.
- **Effort:** small to medium.

### B4. No production setup: no HTTPS, reverse proxy, restart or deploy steps (MISSING)
- **What is wrong:** The server serves plain HTTP on one port. Nothing in the repository sets up HTTPS, redirects HTTP to HTTPS or www to non-www, restarts the server after a crash, or describes deployment.
- **Evidence:** No Dockerfile, compose file, Nginx config, PM2 or systemd file exists (file search). `server/server.js:213` only calls `app.listen`. README covers local running only. `.dockerignore` exists, but nothing uses it. `TRUST_PROXY_HOPS` defaults to 1 (`server/server.js:61`), which assumes a proxy that is not described anywhere.
- **Why it matters:** Without HTTPS, the admin password and token travel in clear text. Without a restart policy, a single crash takes the site down until someone notices.
- **Fix:** Pick the hosting, then add one of these:
  - (a) a `Dockerfile` (non-root user, `HEALTHCHECK` on `/api/ready`), a `docker-compose.yml` (restart `unless-stopped`, volumes for `assets/uploads` and `BACKUP_DIR`), and an Nginx config with HTTPS, an HTTP-to-HTTPS redirect and one canonical host;
  - (b) a PM2 or systemd unit plus the same Nginx config.

  Write the steps, the rollback steps (keep the previous image or release folder) and the certificate renewal in a `DEPLOY.md`.
- **Effort:** medium.

### B5. The README's migration list is wrong, and nothing records which migrations ran (INCOMPLETE)
- **What is wrong:** The README's migration table lists 001 to 004 and 006, but leaves out 005 and 007. The public Ministries query needs the columns that 007 adds.
- **Evidence:**
  - README lines 170 to 176 list the migrations without 005 and 007.
  - `server/models/ministryModel.js:13` selects `meeting_time` and `display_order`, and `server/models/ministryModel.js:38` sorts by `display_order`.
  - At start-up, the server only checks the column added by 004 (`server/server.js:197-207`).
  - No migrations table exists.
  - 004 and 007 fail if run twice (they say so).
  - 001 is replaced by 002, and its comments say it adds settings when it does not.
  - The one-time `scripts/importMinistries.js` also has to run.
- **Why it matters:** Someone setting up the live database from the README gets a Ministries page and home ministries list that fail with a server error.
- **Fix:** List 005 and 007 and the import script in the README. Add a start-up check for 006 and 007 like the one for 004, or a small `schema_migrations` table that a script fills in. Mark 001 as replaced by 002.
- **Effort:** small.

---

## 3. SHOULD FIX

### S1. Public pages send no security headers (INCOMPLETE)
- **Evidence:** `curl -I /` returned no CSP, no `X-Content-Type-Options`, no frame protection, no `Referrer-Policy` and no HSTS, and it did return `X-Powered-By: Express`. Only `/admin` sets headers (`server/server.js:85-92`).
- **Why it matters:** The public pages can be framed by another site, and the Express banner tells attackers what software runs here. The risk is low, because the public pages have no sign-in, but the fix is cheap.
- **Fix:** Call `app.disable('x-powered-by')`. Send `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'self'` and a public CSP that allows Google Fonts, Google Maps, YouTube and Facebook frames. Add HSTS once HTTPS is live (in Nginx or Express).
- **Effort:** small.

### S2. Dependency vulnerabilities and old major versions
- **Evidence:** `npm audit` reports 7 problems (1 critical, 2 high, 4 moderate):
  - `nodemailer` 6.10.1, high, direct dependency. It covers SMTP command injection and address parsing. This site sets those options itself, so the risk is low, but the package is the mail path. The fix is version 10.
  - `tar`, critical, through `bcrypt` 5's `@mapbox/node-pre-gyp`. It is used only when packages are installed, not while the site runs. bcrypt 6 removes it.
  - `archiver` 8, moderate, through `readdir-glob` and `minimatch`. The backup code adds files one by one and never uses globs.
  - `nodemon`, moderate, development only.

  `npm outdated` lists newer major versions of express (5), dotenv, express-rate-limit, ioredis, rate-limit-redis, bcrypt and nodemailer.
- **Fix:** Upgrade nodemailer and bcrypt first and test sign-in and email. Leave express 5 for later.
- **Effort:** small to medium.

### S3. No custom 404 page; visitors see raw JSON (MISSING)
- **Evidence:** `GET /no-such-page.html` answered `{"success":false,"message":"Route not found: GET /no-such-page.html"}` as JSON (`server/middleware/errorHandler.js:12-17`). The message also repeats the requested address back.
- **Fix:** Add `404.html` in the site style and serve it with status 404 for non-`/api` requests that accept HTML. Keep JSON for `/api`. Do the same for 500 errors.
- **Effort:** small.

### S4. Contact and prayer forms have no honeypot (INCOMPLETE)
- **Evidence:** Only the newsletter has a honeypot (`server/controllers/newsletterController.js:30`). `routes/contact.js` and `routes/prayerRequests.js` rely on the limit of 5 per 15 minutes per IP alone. Each spam message is saved and emailed to the church.
- **What an attacker could do:** fill the inbox and the notification mailbox from many addresses. With `TRUST_PROXY_HOPS` set wrong, the limits either lock out everyone or none (`server/server.js:49-61`).
- **Fix:** Add the same hidden `website` field to both forms and their routes. Consider Cloudflare Turnstile only if spam still gets through.
- **Effort:** small.

### S5. Public YouTube and Facebook endpoints can use up the API quotas
- **Evidence:** `GET /api/youtube/live-status?videoId=` takes any ID from the visitor. An ID in the wrong format is sent to Google without caching (`server/controllers/youtubeLiveController.js:24-26, 78`), and each valid-looking ID is cached separately. The gallery `after` cursor works the same way (`server/controllers/facebookGalleryController.js:75-80`). None of these routes has a rate limit. While Facebook is not set up, every gallery and live request still calls Facebook with an empty page ID (seen in the test log).
- **What an attacker could do:** use up the YouTube daily quota or the Facebook rate limit, which turns off live detection and the gallery for everyone. There is no SSRF risk, because the host is fixed and the parameters are encoded.
- **Fix:** Read the video ID from settings on the server and ignore the query parameter. Add a light rate limit to `/api/youtube`, `/api/facebook` and `/api/cop-news`. Skip the call when `PAGE_ID` or the token is empty.
- **Effort:** small.

### S6. The process crashes with no handlers and no shutdown routine (MISSING)
- **Evidence:** No `process.on('unhandledRejection' | 'uncaughtException' | 'SIGTERM')` anywhere (search). The `app.listen` errors (such as a port in use) are not handled. No graceful close of the server, the pool or Redis.
- **Fix:** Log and exit on an uncaught error, so that the restart policy from B4 brings the server back. On SIGTERM, stop accepting requests, wait for running requests and any backup or restore, then close the pool.
- **Effort:** small.

### S7. Logging grows forever, slows every request, and stores IP addresses
- **Evidence:** `server/utils/logger.js:38` calls `fs.appendFileSync` for every line, which pauses the server on each write. Every request is logged with its IP (`server/server.js:140`). There is one file and no rotation (`server/logs/server.log` is 340 KB already from development).
- **Fix:** Write asynchronously or to stdout and let the host collect logs. Rotate daily and keep 30 days. Drop or shorten the IP in request lines, or state it in the privacy notice (B1).
- **Effort:** small.

### S8. Nobody is told when something breaks (MISSING)
- **Evidence:** No uptime check or alert is configured anywhere in the code. The admin Site status page shows only Redis and Backups (`admin/js/pages/status.js:2`, `server/controllers/adminController.js:141-156`): not the database, email, Facebook token or YouTube key. A failed contact email is only logged (`server/controllers/contactController.js:28`). Backup failures do send an email (`server/services/backupService.js:1483`).
- **Fix:**
  - Add Database, Email (configured or not, last failure), Facebook (call `/debug_token` or `/me` and show the expiry date) and YouTube rows to Site status.
  - Point a free uptime monitor at `/api/ready` (see "Only I can do").
- **Effort:** medium.

### S9. No retention rule and no self-service removal (MISSING)
- **Evidence:** No code ever deletes old contact messages, prayer requests or subscribers. The admin can delete single rows only. The newsletter has no unsubscribe link or endpoint, and the site cannot send newsletters at all (there is no send feature). Logs keep IPs with no end date. Backups also keep old copies of every row.
- **Fix:** Decide retention periods (for example 12 months for messages and prayer requests). Add a monthly clean-up next to the backup scheduler, and describe it in B1. Add an unsubscribe page or a "reply to be removed" line, plus a removal route, for when newsletters start.
- **Effort:** medium.

### S10. Notification emails: full prayer text, and no reply-to
- **Evidence:** `server/controllers/prayerRequestsController.js:24-27` emails the whole request, including ones marked private, to `ADMIN_NOTIFICATION_EMAIL`. The contact notification sets no `replyTo` (`server/utils/mailer.js:48-54`), so pressing Reply writes to the site's own sending address instead of the visitor. The email subject is fixed and the visitor's text is only in the body, so there is no header injection.
- **Fix:** Set `replyTo` to the visitor's address on contact messages. For private prayer requests, send "A private prayer request arrived. Open the admin to read it." without the text.
- **Effort:** small.

### S11. Static files are not compressed or cached, and the loader delays every page
- **Evidence:**
  - Every file returns `Cache-Control: public, max-age=0` with no gzip or brotli (`curl -I` on `/css/style.css`).
  - `assets/images/logo.jpg` is 1280 x 1280 and 147 KB but is shown at 48 x 48 and used as the favicon. `hero.jpg` is 270 KB at 2048 px with no `srcset`.
  - `js/loader.js:5` keeps the loader visible for at least 2 seconds on every page.
  - Estimated from file sizes, not measured in a browser: the home page is about 25 requests and roughly 550 KB before fonts and the map.
- **Fix:** Add compression (Nginx `gzip on`, or the `compression` package), a long cache time for `css`, `js` and `assets` with versioned file names (or a short one, such as one hour, without them), a 48 px and 96 px logo, and `srcset` for the hero. The loader was a deliberate design choice, so cut or drop the 2-second minimum only if you agree.
- **Effort:** small.

### S12. Search and sharing basics are missing (MISSING)
- **Evidence:**
  - Every page has a unique title and description, plus `lang="en"`, which is good.
  - Missing everywhere: `og:image` and `og:url` (each page has an `ADD` comment on line 11), canonical links, `sitemap.xml`, a `Sitemap:` line in `robots.txt`, structured data (no `ld+json`), a favicon set, `apple-touch-icon`, a manifest and `theme-color`.
  - `robots.txt` correctly blocks `/admin/`.
- **Fix:** Once the domain is known, add canonical, `og:url` and `og:image` (a 1200 x 630 JPEG) to each page, a `sitemap.xml` of the 8 public pages, and a `Church` JSON-LD block on the home page filled from the confirmed address, phone, service times and Facebook link.
- **Effort:** small (blocked on the domain).

### S13. The docs are out of date, and there is no guide for church staff
- **Evidence:**
  - README line 41 says "being rebuilt in four phases", and line 59 says "Site status and Help open a placeholder until Phase 4".
  - Lines 64 to 66 and 133 to 136 say Ministries and About read from the HTML, but they now read from the admin (`js/pages/ministries.js`, `js/pages/about.js`).
  - Migrations: see B5.
  - `admin/help.html` says "This page is built in Phase 4" and covers only Backups.
  - There is no `DEPLOY.md` (B4). There is no `ANALYTICS.md`, which is fine because there is no analytics feature.
- **Fix:** Update the README tables. Write a one-page staff guide (in Help) covering adding an event, a sermon and a leader, answering messages, the announcement bar, and making a backup.
- **Effort:** small.

### S14. No automated tests, and the CI workflow cannot pass (MISSING / BROKEN)
- **Evidence:**
  - There are no test files, and `server/package.json` has no `test` script.
  - `.github/workflows/node.js.yml` runs `npm ci` and `npm test` in the repository root, where there is no `package.json`. That fails on every push. This was not checked on GitHub; it follows from the file.
  - `.gitignore` lists `.github/` even though the folder is tracked.
- **Fix:** Point the workflow at `server/` (`working-directory: server`), run `npm ci`, a syntax check and the tests below, and remove `.github/` from `.gitignore`. Tests worth writing for this size, using Node's built-in test runner against a throwaway database:
  - login (right, wrong, rate limit);
  - every admin route answers 401 without a token, and with a token issued before log out;
  - contact, prayer and newsletter validation and honeypot;
  - an admin edit clears the public cache;
  - a backup made, checked and restored into a throwaway database.

  Skip browser tests for now.
- **Effort:** medium.

### S15. Content the admin cannot edit (INCOMPLETE)
- **Evidence:** These items are hard-coded in the HTML and are not in the Settings list (`server/controllers/siteSettingsController.js:36-70`):
  - history (`about.html:78`), district and area (`index.html:75`), and the Statement of Faith (`about.html:94-158`);
  - the hero and page photos;
  - the Facebook page link, which is in every page header and footer (`facebook.com/cop.rtwc`);
  - the "All times are GMT" note and footer text.

  There is no way to hide a section. Uploaded files can be managed on the Media page, which is good.
- **Fix:** Add settings for history, district, area and the Facebook URL, and an image setting for the hero, using the existing image upload component. Leave the Statement of Faith in HTML once it is verified, because it should rarely change.
- **Effort:** medium.

### S16. Backups: off-server copies are manual, and restore has not been tested on the live setup
- **Evidence:** The backup and restore path exists and is thorough (`server/services/backupService.js`, `server/BACKUPS.md`), and the monthly schedule exists (`server/jobs/backupScheduler.js`). Off-server copies depend on someone downloading them (`BACKUPS.md:42-47`). According to the project notes, restore was tested on throwaway local databases during development. Whether it has been tested against the live database host could not be verified, and no restore test is recorded in the docs. Two unencrypted `mysqldump` files with personal data sit in `server/backups/` (they are ignored by git and Docker).
- **Fix:** After launch, restore one real backup into a spare database and write down the date in BACKUPS.md, then repeat yearly. Move the two plain dumps to encrypted storage or delete them. Optionally, make the monthly backup also copy the file to off-server storage.
- **Effort:** small.

### S17. Uploaded images are not ignored by git
- **Evidence:** `.gitignore` has no `assets/uploads/`. The folder is empty now, but `git add .` would commit uploaded photos. Uploads and backups survive a redeploy only on a persistent disk (`server/middleware/upload.js:11-20`, documented).
- **Fix:** Add `assets/uploads/` to `.gitignore` (keep a `.gitkeep`) and give it a volume in B4.
- **Effort:** small.

---

## 4. NICE TO HAVE

### N1. Simple admin audit trail (MISSING)
Today only sign-in and password change are logged (`server/controllers/authController.js:38,92`). Request lines show the method and address of each change but not who made it or what it was. With one admin this is optional. If a second editor is ever added, add a small `admin_actions` table (who, what, which id, when). Effort: small.

### N2. Sign-in alert email and an account-wide limit
The sign-in limit counts per IP only (`server/middleware/rateLimiter.js:134`), so many addresses can keep guessing. With a 12+ character password this is acceptable. An email on each new sign-in would help. The 30-minute idle sign-out runs only in the browser (`admin/js/adminAuth.js:24`). The server accepts a token for its full 24 hours, which is fine. Effort: small.

### N3. The contact form changes the email address it saves
`normalizeEmail()` (`server/routes/contact.js:24`) removes dots from Gmail addresses, so the admin sees a different address from the one typed. Gmail ignores dots, so mail still arrives, but it confuses whoever reads it. Lowercase and trim only, as the newsletter route does. Effort: small.

### N4. Unpaged event list and uncached calendar feed
`GET /api/events` returns every event (`server/controllers/eventsController.js:27-43`), and `calendar.ics` queries the database on every request (line 48). Both are fine for years at a few events a month. Add a limit or caching later. Effort: small.

### N5. Indexes for the inbox lists
`contact_messages`, `prayer_requests` and `newsletter_subscribers` are sorted newest first, but have no index on `created_at` or `subscribed_at` (`server/schema.sql:100-134`). Not needed until there are thousands of rows. Character set and collation are utf8mb4 everywhere, which is good. The leaders-to-ministries foreign key uses `ON DELETE SET NULL`, and the controller also refuses to delete a ministry that has leaders, so leaders cannot be left pointing at a deleted ministry. Effort: small.

### N6. Unused code and leftover files
- Endpoints no page calls: `/api/cop-news/latest`, `/api/facebook/latest-live`, `/api/youtube/latest-live`, `/api/ministries/:slug`, `/api/events/:id`, and `/api/sermons` until B3 is done.
- `admin-old/` is ignored by git and not served.
- `server/.env.backup-20261118` (old secrets, ignored by git).
- `migrations/001` (replaced by 002).
- `skills-lock.json` and the `greetings.yml` and `summary.yml` workflows.

Remove them once you have confirmed they are not needed. Effort: small.

### N7. A short "first visit" note and a giving statement
- "Plan a visit" links only to the contact page.
- There is no "what to expect" text: parking, what happens in a service, children's provision.
- Nothing says how to give or that giving happens in person only. Online giving was removed, and only tenet 9 mentions tithes.

Decide whether to add a sentence. This is a content decision. Effort: small.

---

## 5. Only I can do

- [ ] **Domain:** register or confirm it, set auto-renew, and put a calendar reminder 30 days before expiry. (could not verify)
- [ ] **DNS:** A or AAAA records for the host, and one canonical host (www or not) for B4 and S12.
- [ ] **SSL certificate:** set up Let's Encrypt or the host's certificate with automatic renewal. Add a reminder to check renewal every 60 days at first.
- [ ] **Email sender records:** add **SPF**, **DKIM** and **DMARC** DNS records for the sending domain. Without them, contact and backup notification emails are likely to land in spam or be rejected. (could not verify)
- [ ] **Email account:** create the sending mailbox and an app password. Fill `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` and `ADMIN_NOTIFICATION_EMAIL`, which are all empty in the local `.env`. Then send one test contact message. Email was not tested in this audit.
- [ ] **Facebook:** confirm `facebook.com/cop.rtwc` is the church's page. Create a long-lived Page access token with the permissions needed for the page's photos, videos and live videos. Note its expiry date and set a reminder to renew it.
- [ ] **YouTube:** create an API key restricted to the YouTube Data API (and to the server's IP if possible), if YouTube is used.
- [ ] **Hosting plan limits:** check the plan's maximum database connections against the server's fixed pool of 10 per server copy (`server/config/db.js:46`), the disk space for uploads and backups, and whether the disk is persistent.
- [ ] **Aiven:** confirm daily backups are on and note the retention. Restrict "allowed IP addresses" to the server only. Download `ca.pem` and set `DB_SSL_CA`.
- [ ] **Run migrations on the live database** in order, after a backup, then `importMinistries.js` (see B5).
- [ ] **Uptime monitor:** set a free check (for example UptimeRobot) on `https://<domain>/api/ready`, alerting a phone or email.
- [ ] **Content and photos for B2:** address, phone, email, district and area, history, mission and vision, leaders and pastor bio, featured verse, confirmed service times, the 4 photo slots, the hero photo check, and the Statement of Faith checked against thecophq.org.
- [ ] **Privacy and legal review:** have someone qualified in Ghanaian data protection review:
  - whether the church must register with the **Data Protection Commission** as a data controller;
  - the privacy notice wording (B1), especially for prayer requests, which may reveal health or religious information;
  - the newsletter consent wording;
  - retention periods (S9);
  - the use of third parties (Google Fonts, Google Maps, YouTube, Facebook);
  - the church's registered name and address for the footer;
  - whether a short terms or disclaimer page is needed.
- [ ] **Google Business Profile:** claim or update the listing so the name, address, hours and website match the site.
- [ ] **Google Search Console:** verify the domain and submit the sitemap from S12.
- [ ] **Facebook page details:** website link, address and hours that match the site.
- [ ] **Passwords:** write down who holds each one (admin login, server or host, Aiven, email, Facebook, domain registrar, `BACKUP_PASSPHRASE`) and store them in a shared password manager that two trusted people can open.
- [ ] **Admin cover:** plan for when the one admin is unavailable. Someone with server access can run `node scripts/resetAdminPassword.js`, which is the only way back in if the password is lost. Make sure a second person can do that, or add a second admin account.
- [ ] **Leftover files on your computer:** delete `server/.env.backup-20261118` and the two plain dumps in `server/backups/` once you no longer need them.
- [ ] **Download a backup** each month and keep it off the server. The dashboard reminds you after 35 days.

---

## 6. What is already good (leave as is)

1. **Admin access control:** all 51 admin and account routes refused requests without a token in a live test. Tokens stop working after log out or a password change (`server/middleware/authMiddleware.js:30-33`). Sign-in timing does not reveal whether an email exists (`server/controllers/authController.js:18`).
2. **SQL:** every query uses `?` placeholders or `??` identifiers. No query is built from visitor text.
3. **Safe page building:** no `innerHTML`, `insertAdjacentHTML` or `document.write` anywhere. Links from settings are checked (`js/main.js:134-136`). The admin has a strict CSP.
4. **Uploads:** the image type is read from the file's bytes, the name is random, the size limit is 5 MB, and media deletion is limited to the upload name pattern, so no other file can be reached.
5. **Error replies:** visitors never see stack traces or SQL. Database errors are logged by code only (`server/middleware/errorHandler.js:29-43`). Secrets are not logged, and backup download tickets are masked in the log.
6. **Graceful failure:** with the database down, `/api/ready` answers 503 while `/api/health` stays up. Facebook, YouTube and news failures return friendly empty answers and keep a stale copy. Redis being down falls back to memory for the cache and rate limits. Every admin edit and every restore clears the matching cache.
7. **Backups:** they are encrypted, checked before restore, and restored inside a transaction. A safety backup is made first, the monthly run happens once even with several server copies, and a failure email is sent.
8. **Secrets hygiene:** `.env`, backups and logs are ignored by git and Docker, no secret was ever committed, and `npm run check:env` prints names only. The server refuses to start without the database settings or with a `JWT_SECRET` shorter than 32 characters.
9. **Forms:** visitor messages are saved before any email is tried, so a mail failure never loses a message. The CSV export guards against spreadsheet formulas (`admin/js/pages/newsletter.js:109`). The newsletter reply does not reveal who is subscribed.
10. **Accessibility from the code:**
    - there is a skip link, `main` landmark, `:focus-visible` styles, reduced-motion rules (`css/tokens.css:141`), `aria-invalid` with error text on forms, and native `<dialog>` for the lightbox and admin dialogs;
    - computed contrast: body muted text is 6.1:1, gold-text on the darkest surface is 5.2:1, and gold is never used as small text on light backgrounds (gold on navy-900 is 4.7:1);
    - layouts at 375, 768 and 1024px and 200 percent zoom were not checked in a browser in this audit.

---

## 7. Suggested order of work

1. B5: fix the README migration list and add the start-up check (small, and it prevents a broken live Ministries page).
2. B3: wire the public Sermons page and home sermon band to the API.
3. S4 and S5: honeypots on contact and prayer, and the YouTube and Facebook endpoint limits.
4. S1 and S3: public security headers and a custom 404 page.
5. S2: upgrade nodemailer and bcrypt, then retest sign-in and email.
6. B4 and S6 and S17: Dockerfile or PM2, Nginx with HTTPS, crash handlers and graceful shutdown, upload volume and `DEPLOY.md`.
7. B1 and S9: privacy page, notices by the forms, retention clean-up, and a removal route (have the text reviewed).
8. S7 and S8 and S10: logging fix, extra Site status rows, an uptime monitor, and safer notification emails.
9. S11 and S12: compression, caching, smaller logo, and SEO tags and sitemap once the domain is known.
10. B2 and S15, S13, S14: content entry and admin-editable fields, docs and staff guide, then CI and the small test set.

---

## 8. Prompts to fix each blocker

Paste one of these back to me when you are ready. Each one is self-contained.

**B1, privacy notice**
> Add a privacy page to the RTWC site. Create `privacy.html` using the same header, footer and styles as `about.html`. Cover: what the contact form, prayer request form and newsletter store (tables `contact_messages`, `prayer_requests`, `newsletter_subscribers`); that `server/logs/server.log` records each request's IP address; who can see the data (the church admin); how long it is kept, using `[ADD: retention period]` placeholders; the third parties loaded (Google Fonts, Google Maps embeds on home and contact, YouTube and Facebook players on live.html, Facebook photos on gallery.html); and how to ask for removal, using the email setting via `data-setting="email"`. Put `[ADD: ...]` placeholders for anything not known and do not invent facts. Add a "Privacy" link to the footer of every public page. Add one short sentence with a link to the privacy page under the contact form, the prayer request form (`contact.html`) and the newsletter form (`js/newsletter.js`). List what needs legal review at the end.

**B2, placeholder content**
> List every `[ADD:` placeholder, `VERIFY` comment and `photo-slot`/`ph-slot` in the public HTML and JS, grouped by the person who must supply it (Settings in the admin, Leadership in the admin, a photo, or hard-coded HTML). Give each one its file and line. For the Settings and Leadership ones, tell me which admin page and field to fill in. Do not invent any content.

**B3, sermons from the admin**
> Make the public Sermons page read from the API instead of the fixed list. In `js/pages/sermons.js`, remove the hard-coded `sermons` array and load `GET /api/sermons` with `window.rtwc.getJSON`. Use paging (`page`, `limit` 20, and a "Show more" button), the existing search box mapped to `q`, and the speaker filter built from the results. Map `title`, `speaker`, `sermon_date`, `description` and `video_url`, and remove the "service" filter in `sermons.html`, because that column does not exist. Show a friendly message when the API fails or returns nothing. On the home page (`index.html` sermon band and `js/pages/index.js`), show the newest sermon's title, speaker, date and watch link, falling back to the current text. Only accept `video_url` links that start with http:// or https://. Update the README "Where to edit content" table.

**B4, production setup**
> Add a production setup for the RTWC server. Create a `Dockerfile` in the repo root: Node 22 slim, `npm ci --omit=dev` in `server/`, copy the site files, run as the non-root `node` user, `HEALTHCHECK` on `/api/ready`, start `node server/server.js`. Create `docker-compose.yml` with the app (restart `unless-stopped`, `env_file: server/.env`, named volumes for `assets/uploads` and the `BACKUP_DIR`, port bound to 127.0.0.1 only) and add `.env.compose.example` if any compose-only variables are needed. Create `deploy/nginx.conf`: HTTP-to-HTTPS redirect, one canonical host using `[ADD: domain]`, TLS paths for Let's Encrypt, gzip, `client_max_body_size` large enough for `BACKUP_MAX_UPLOAD_MB`, longer `proxy_read_timeout` for `/api/admin/backups`, HSTS, and `proxy_set_header X-Forwarded-For`, matching `TRUST_PROXY_HOPS=1`. Write `DEPLOY.md` with first-time setup, the migration order, update steps, rollback steps (keep the previous image tag), certificate renewal and a renewal reminder. Do not change application code.

**B5, migrations**
> Fix the migration instructions and checks. In `README.md`, list all of migrations 001 to 007 in order (mark 001 as replaced by 002) and add the one-time `node scripts/importMinistries.js --dry-run` then `node scripts/importMinistries.js` step after 007. In `server/server.js`, extend `checkAdminColumns()` (around lines 197 to 207) so that start-up also checks that `ministries.meeting_time` and `ministries.display_order` exist and that the `backup_runs` table exists. If one is missing, log which migration to run, the same way as for 004 (stop for 007, warn for 006). Do not run any migration.
