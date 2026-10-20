# Royal Temple Worship Centre (RTWC) — Church Website Upgrade

## Project Overview
Modern, professional, responsive church website and administration platform for **Royal Temple Worship Centre**, The Church of Pentecost. This repository contains the complete frontend, backend, and database architecture.

---

## 📋 Table of Contents

1. [Live Stream (YouTube + Facebook)](#live-stream-youtube--facebook)
2. [Admin Configuration](#admin-configuration)
3. [YouTube Live Setup](#youtube-live-setup)
4. [Facebook Live Setup](#facebook-live-setup)
5. [OBS Studio Multistream Instructions](#obs-studio-multistream-instructions)
6. [Database Schema Changes](#database-schema-changes)
7. [API Endpoints](#api-endpoints)
8. [Security & Best Practices](#security--best-practices)

---

## Live Stream (YouTube + Facebook)

The live stream page (`live.html`) supports both **YouTube Live** and **Facebook Live** platforms. Administrators can configure the preferred platform and stream URLs via the admin settings panel. The page automatically detects the live status and displays the appropriate embedded player.

### Features
- **Platform selector**: Toggle between YouTube and Facebook
- **LIVE NOW badge**: Shows when either platform is live
- **Offline state**: Graceful fallback with links to both platforms
- **Playback error handling**: Shows errors without crashing
- **Fullscreen support**: Native embed fullscreen
- **Share buttons**: Platform-specific sharing
- **Service schedule**: Display current service times
- **Previous broadcasts**: Links to recorded services

---

## Admin Configuration

Administrators can configure live stream settings via the **Admin Dashboard** → **Settings** page.

### Accessible Settings
| Setting | Type | Description |
|---------|------|-------------|
| `youtube_channel_url` | string | Full YouTube channel URL (e.g., `https://www.youtube.com/@RoyalTempleWorshipCentre`) |
| `youtube_live_video_id` | string | Specific live video ID if checking a fixed broadcast |
| `facebook_live_url` | string | Facebook Page URL for live embed (e.g., `https://www.facebook.com/cop.rtwc`) |
| `preferred_default_platform` | enum | `'facebook'` or `'youtube'` — default platform to display |
| `manual_live_offline_override` | boolean | When `true`, manually control live/offline status |
| `next_service_title` | string | Title of the next scheduled service |
| `next_service_date` | string | Date of next service (YYYY-MM-DD format) |
| `next_service_time` | string | Time of next service (e.g., `8:00 AM GMT`) |
| `previous_broadcast_url` | string | URL to previous recorded broadcast |

### Validation Rules
- **YouTube URLs**: Only `youtube.com` and `youtu.be` domains accepted
- **Facebook URLs**: Only `facebook.com` domain accepted
- All URLs validated server-side before storage
- Never expose API secrets in frontend JavaScript
- CSRF protection on all state-changing requests

---

## YouTube Live Setup

### Prerequisites
1. A YouTube channel for Royal Temple Worship Centre
2. YouTube Data API v3 key with **YouTube Reporting API** and **YouTube Live Stream Reading** enabled
3. Either a specific live video ID or a channel ID

### Configuration
1. **Get YouTube API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable **YouTube Data API v3**
   - Create API key

2. **Configure Channel or Video**:
   - **Option A**: Set `youtube_live_video_id` to a specific live video ID (e.g., `abc123def456`)
   - **Option B**: Set `youtube_channel_url` to your channel URL (e.g., `https://www.youtube.com/@RoyalTempleWorshipCentre`)

3. **Set API Credentials** (in `.env` file):
   ```
   YOUTUBE_API_KEY=your_youtube_data_api_v3_key
   YOUTUBE_CHANNEL_URL=https://www.youtube.com/@RoyalTempleWorshipCentre
   YOUTUBE_LIVE_VIDEO_ID=  # optional, leave empty if using channel URL
   ```

4. **Admin Setup**:
   - Log into the admin dashboard
   - Navigate to Settings
   - Enter the YouTube channel URL and/or Live Video ID
   - Set preferred default platform to `youtube`
   - Save changes

### How It Works
- **With video ID**: The API checks `https://www.googleapis.com/youtube/v3/videos?id={videoId}&part=status&key={apiKey}`
  - If `liveBroadcastStatus` is `live`, the stream is live
  - Falls back to video details if not currently live
- **With channel URL**: The API searches the channel's latest live broadcasts
  - Uses `https://www.googleapis.com/youtube/v3/search?part=snippet&q=&type=liveBroadcast&maxResults=5&key={apiKey}`
  - Checks the latest video's live status
- If no API key is configured, the system gracefully degrades and shows the configured status

### Fallback Behavior
- If API key is missing: Shows "YouTube live detection disabled" message
- If API call fails: Shows error state with "temporarily unavailable" message
- If no live broadcast: Shows offline state with link to channel
- Manual override: Admin can force live/offline status for maintenance

---

## Facebook Live Setup

### Prerequisites
1. A Facebook Page for Royal Temple Worship Centre
2. Facebook Page access token (server-side only, never exposed to browser)
3. Page must have live video broadcasting enabled

### Configuration
1. **Get Facebook Page Access Token**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new App (or use existing)
   - Get a **Long-Lived Page Access Token** with `pages_read_engagement` permission
   - **Never commit this token to the repository** — it's in `.env` which is gitignored

2. **Configure Facebook Page URL**:
   - Set `facebook_live_url` to your Page's live URL (e.g., `https://www.facebook.com/cop.rtwc`)

3. **Set Environment Variables** (in `.env` file):
   ```
   FB_PAGE_ID=your_facebook_page_id
   FB_PAGE_ACCESS_TOKEN=your_long_lived_page_access_token
   ```

4. **Admin Setup**:
   - Log into the admin dashboard
   - Navigate to Settings
   - Enter the Facebook Page URL
   - Set preferred default platform (or leave as `facebook`)
   - Save changes

### How It Works
- The server calls the **Facebook Graph API**: `https://graph.facebook.com/v20.0/{page_id}/live_videos?access_token={token}`
- Checks if any video has `status: LIVE`
- Returns the live video's permalink URL for embedding
- Also fetches latest videos via `/{page_id}/videos`

### Facebook Embed
- Uses Facebook's **Page Plugin** embed: `https://www.facebook.com/plugins/page.php?href={url}&tabs=timeline&width=500&height=700`
- Requires the page to be **PUBLIC** visibility for non-logged-in visitors
- If embedding is unavailable (restricted page), shows a link to watch on Facebook directly

### Fallback Behavior
- If Graph API fails: Shows error state, falls back to direct Facebook link
- If page is restricted/private: Cannot embed; shows "Watch on Facebook" link only
- If no live broadcast: Shows offline state with schedule information
- Manual override: Admin can manually set status for service windows

---

## OBS Studio Multistream Instructions

### Free Broadcasting Workflow
Church staff can broadcast simultaneously to YouTube and Facebook using **OBS Studio** (free) with a **multistreaming service**.

### Recommended Free Multistream Services

| Service | Free Tier | Key Features |
|---------|-----------|--------------|
| **Restream.io** | ⭐ Free plan (up to 3 destinations) | Simple setup, analytics, scheduling |
| **StreamYard** | ⭐ Free plan (up to 3 destinations, 30 min/month) | Browser-based, no software needed |
| **OBS Cloud** | ⭐ Free (beta) | Built into OBS, limited minutes |
| **FMLE + SRT** | Free | Technical, requires setup |

### OBS Studio Setup (Recommended: Restream.io)

1. **Create Account**
   - Sign up at [restream.io](https://restream.io/)
   - Free plan allows 3 simultaneous destinations

2. **Add Destinations**
   - Connect YouTube channel (verify ownership)
   - Connect Facebook Page (verify admin access)
   - Optionally add other platforms (Twitter, LinkedIn, etc.)

3. **OBS Studio Configuration**
   - Download [OBS Studio](https://obsproject.com/) (free, open-source)
   - Add your camera/desktop source
   - Add audio inputs (microphone, system audio)
   - Go to **Settings → Stream**
   - Select **Service**: `Custom...`
   - **Stream Key**: Copy from Restream dashboard
   - Set **Server**: `rtmp://live-restream-us-south.restream.io/live`
   - Click **Apply** → **OK**

4. **Start Streaming**
   - In OBS, click **Start Streaming**
   - Stream goes to Restream, which fans out to YouTube + Facebook simultaneously
   - Recommended bitrate: 3500–5000 kbps for 720p at 30fps

5. **Verify**
   - Check both YouTube Live and Facebook Live are streaming
   - Use the RTWC website live page to verify embeds work

### Alternative: Browser-Only (StreamYard)
If OBS installation is not possible:
1. Go to [streamyard.com](https://streamyard.com/)
2. Start a new broadcast
3. Add YouTube and Facebook as destinations
4. Go live simultaneously on both platforms
5. Simple, no software required, browser-based

### Important Notes
- **Do not store streaming keys in public HTML, JavaScript, or Git**: All streaming keys must remain private and be configured on the broadcasting computer or secure server
- **Test before going live**: Always do a test stream 15-30 minutes before service
- **Recommended settings**: 720p at 30fps is sufficient for church services; 1080p at 60fps requires more bandwidth
- **Backup plan**: If internet fails, have a phone hotspot ready
- **Copyright**: Only stream licensed content (sermons with permission, worship songs with CCLI/licensing)

---

## Database Schema Changes

New site_settings added to `site_settings` table:

| Key | Example Value | Description |
|-----|--------------|-------------|
| `youtube_channel_url` | `https://www.youtube.com/@RoyalTempleWorshipCentre` | YouTube channel URL |
| `youtube_live_video_id` | `abc123def456` | Specific live video ID (optional) |
| `facebook_live_url` | `https://www.facebook.com/cop.rtwc` | Facebook Page URL |
| `preferred_default_platform` | `facebook` or `youtube` | Default platform for live page |
| `manual_live_offline_override` | `false` | Manual control of live/offline |
| `next_service_title` | `Sunday Divine Worship & Word Service` | Next service title |
| `next_service_date` | `2026-10-25` | Next service date |
| `next_service_time` | `8:00 AM GMT` | Next service time |
| `previous_broadcast_url` | `https://www.youtube.com/watch?v=abc123` | Previous broadcast link |

**Seed values** are included in `schema.sql` with empty strings by default, so the site works immediately after deployment without configuration.

---

## API Endpoints

### Public Endpoints (no auth required)

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | API health check |
| `GET /api/facebook/live-status` | Combined Facebook + YouTube live status |
| `GET /api/facebook/latest-live` | Latest Facebook live/video |
| `GET /api/settings` | All site settings (key/value pairs) |

### Admin Endpoints (JWT auth required)

| Endpoint | Description |
|----------|-------------|
| `PUT /api/settings` | Update site settings (partial updates allowed) |
| `POST /api/auth/login` | Admin login |
| `POST /api/auth/logout` | Admin logout |

### Response Format: `GET /api/facebook/live-status`

```json
{
  "success": true,
  "message": "Live status fetched.",
  "data": {
    "isLive": true,
    "fbVideo": {
      "id": "xyz789",
      "title": "Live Stream",
      "status": "LIVE",
      "permalinkUrl": "https://www.facebook.com/cop.rtwc/live",
      "thumbnailUrl": "https://...".
    },
    "ytVideo": {
      "id": "abc123",
      "title": "YouTube Live",
      "permalinkUrl": "https://www.youtube.com/watch?v=abc123",
      "thumbnailUrl": "https://...".
    },
    "fbError": null,
    "ytError": null,
    "checkedAt": "2026-10-19T21:00:00.000Z"
  }
}
```

- If Facebook is live: `fbVideo` populated, `isLive: true`
- If YouTube is live: `ytVideo` populated, `isLive: true`
- If neither is live: Both videos null, errors may contain messages
- If API key missing: `ytError` contains "YouTube API key not configured" message

---

## Security & Best Practices

### ✅ Implemented
- **SQL parameterized queries** in all database operations
- **JWT authentication** for admin endpoints with session management
- **CORS configuration** restricted to approved origins only
- **Input validation** on all admin endpoints (express-validator)
- **HTML sanitization** to prevent XSS (sanitizeInput middleware)
- **Rate limiting** on auth endpoints (100 requests/15min default)
- **Secure cookies** via `app.set('trust proxy', 1)`
- **Error handling** that never leaks stack traces to clients
- **Environment variables** for all secrets (`.env` is gitignored)
- **UNIQUE constraints** on admin emails, ministry slugs, giving references, site setting keys

### ⚠️ Important Reminders
- **Never commit `.env` files or secrets to GitHub**
- **YouTube API key and Facebook access token** must only be in `.env`
- **Paystack secret key** is server-side only, never in frontend JS
- **Facebook Graph API calls** run server-side only
- **CSRF protection** should be enabled for admin form submissions
- **HTTPS** recommended for production deployment
- **Regular backups** of database and uploaded content
- **Test all forms** (contact, prayer requests, giving) before deployment
- **Mobile responsiveness** test at: 320px, 375px, 390px, 414px, 768px, 1024px, 1280px, 1440px+

### 🚫 Avoided
- No video streaming through the website server (YouTube/Faceband embeds only)
- No hardcoded API keys in frontend JavaScript
- No false LIVE indicators based only on URL presence
- No generic AI copy or fabricated church information

---

## Project Structure

```
RTWC/
├── assets/           # Images, icons, media
├── css/              # Stylesheets (style.css + page-specific)
├── js/               # Main JavaScript (main.js + page-specific)
├── pages/            # Public HTML pages
├── admin/            # Admin dashboard (login, dashboard, settings)
├── server/           # Node.js/Express backend
│   ├── config/       # Database config, environment
│   ├── controllers/  # Route controllers
│   ├── middleware/   # Auth, validation, error handling
│   ├── models/       # SQL query functions
│   └── routes/       # API routes
├── uploads/          # Admin-uploaded files (galleries, etc.)
├── .env.example      # Environment variable templates
├── .gitignore        # Git exclusion rules
└── README.md         # This documentation
```

---

## Development Commands

```bash
# Start development server
cd server && npm run dev   # nodemon (auto-reload)

# Start production server
cd server && npm start     # node server.js

# Run database schema
cd server && mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_NAME < schema.sql

# Seed admin account
cd server && node scripts/seedAdmin.js --name "Admin Name" --email "admin@royaltemple.org" --password "secure-password"

# Seed initial site settings
# (included in schema.sql, runs automatically)

# Test API health
curl http://localhost:5000/api/health
```

---

## Deployment Checklist

- [ ] `.env` file created with all required variables
- [ ] Database schema applied (`schema.sql`)
- [ ] Admin account created (`seedAdmin.js`)
- [ ] YouTube API key configured (optional but recommended)
- [ ] Facebook Page access token configured (optional but recommended)
- [ ] CORS origins set to production domain(s)
- [ ] SSL certificate installed (HTTPS)
- [ ] Paystack credentials (if online giving is used)
- [ ] All public pages tested at required breakpoints
- [ ] Admin CRUD operations tested
- [ ] Live stream tested (both platforms)
- [ ] Contact form and prayer request forms tested
- [ ] Mobile menu verified
- [ ] No console errors in browser devtools
- [ ] SEO metadata present on all pages
- [ ] README updated with deployment notes
- [ ] Backup procedure documented

---

## Quick Reference / Cheat Sheet

### Environment Variables (.env)
```
# YouTube (optional)
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
YOUTUBE_CHANNEL_URL=https://www.youtube.com/@RoyalTempleWorshipCentre
YOUTUBE_LIVE_VIDEO_ID=  # optional

# Facebook (optional)
FB_PAGE_ID=your_facebook_page_id
FB_PAGE_ACCESS_TOKEN=your_long_lived_page_access_token

# Server
PORT=5000
CORS_ORIGIN=https://royaltemple.org,https://www.royaltemple.org

# JWT
JWT_SECRET=REPLACE_WITH_openssl_rand_-hex_64_OUTPUT
JWT_EXPIRES_IN=24h

# Database
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=your-strong-password
DB_NAME=royaltemple

# Paystack (if used)
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_CALLBACK_URL=https://royaltemple.org/giving-callback.html
```

### Key API Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Server health check |
| `GET /api/facebook/live-status` | **Combined YouTube + Facebook live status** (main endpoint) |
| `GET /api/settings` | Fetch all site settings (includes youtube/facebook config) |
| `PUT /api/settings` | Update live stream settings (admin auth required) |

### Live Status Response Quick View
```json
{
  "isLive": true/false,
  "fbVideo": { id, title, permalinkUrl, thumbnailUrl } | null,
  "ytVideo": { id, title, permalinkUrl, thumbnailUrl } | null,
  "fbError": "..." | null,
  "ytError": "..." | null,
  "checkedAt": "2026-10-19T21:00:00.000Z"
}
```

### Platform Detection Logic
- `isLive: true` if **Facebook** is live **OR** **YouTube** is live
- User can toggle platform via selector on live page
- Preferred default set in admin settings (`preferred_default_platform`) |

### URL Validation (server-side only)
- YouTube: only `youtube.com` / `youtu.be` domains accepted
- Facebook: only `facebook.com` domain accepted
- Invalid URLs rejected with 400 error |

### OBS Multistream (Free)
1. Sign up at [restream.io](https://restream.io/) (free plan: 3 destinations)
2. Connect YouTube + Facebook in Restream dashboard
3. In OBS: Settings → Stream → Custom → Server: `rtmp://live-restream-us-south.restream.io/live`
4. Start streaming → fans out to both platforms simultaneously
5. Verify on RTWC live page (`live.html`)

### Fallback Behavior (no API keys)
- YouTube: Shows "detection disabled" + channel URL link
- Facebook: Shows offline schedule + "Watch on Facebook" link
- System remains functional — live detection is a bonus, not required |

---

## Quick Setup Priorities (do in order)

1. **Apply schema**: `mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_NAME < schema.sql`
2. **Create admin**: `node scripts/seedAdmin.js --name "Admin" --email "admin@royaltemple.org" --password "password"`
3. **Set .env**: Copy `.env.example`, fill in YouTube API key + Facebook Page token
4. **Test API**: `curl http://localhost:5000/api/health` then `curl http://localhost:5000/api/facebook/live-status`
5. **View live page**: Open `live.html` and verify status displays correctly
6. **Configure admin**: Log in → Settings → Enter YouTube URL + Facebook URL → Save
7. **Go live**: Use OBS + Restream.io or StreamYard to broadcast to both platforms

---

## Files Modified for This Feature

| File | Change |
|---|---|
| `server/schema.sql` | Added 10 site_settings rows with defaults |
| `server/controllers/siteSettingsController.js` | Added 9 new allowed keys to ALLOWED_KEYS |
| `server/controllers/facebookLiveController.js` | Added `fetchYouTubeLiveStatus()` + `getCombinedLiveStatus()` |
| `js/pages/live.js` | API fetch, platform selector, YouTube/Facebook embeds, states |
| `live.html` | Platform selector, embed containers, improved LIVE/offline banner |
| `README.md` | Full documentation + this Quick Reference section |

---

---