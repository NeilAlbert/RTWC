# RTWC

## Live streaming

Configure the YouTube channel URL or live video ID and Facebook live URL in
Admin > Settings. YouTube live detection uses the server-side `YOUTUBE_API_KEY`;
Facebook live detection uses `PAGE_ID` and `FB_PAGE_ACCESS_TOKEN` on the API
server. Keep these credentials on the server and never add them to browser code.
The live page embeds a stream when the provider supplies an embeddable live
video and otherwise offers its direct watch link. The live page also shows the current live title and description, if available.

## Event calendar sync

The Events page and its iCalendar subscription feed use the events API and
database as their source of truth. The public feed is available at
`https://<site-domain>/api/events/calendar.ics`. Subscribe to that URL from
Google Calendar, Apple Calendar, or Outlook, or use the Events page's
`webcal://` link to open a supported calendar app. Calendar providers refresh
subscriptions on their own schedules, so updates may not appear immediately.
The API server must be deployed on the same site origin for the Events page to
build the subscription link correctly.
