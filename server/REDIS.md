# Redis: cache and shared rate limits

Redis is optional. It lets several copies of the server share one cache and one set of
rate-limit counts. Without it, each server keeps both in its own memory, which is fine for
a single server and for development. Sessions are not stored in Redis: admins sign in with
a token kept in the browser, as before.

## Turning it on

In `server/.env`:

```
REDIS_ENABLED=true
REDIS_URL=redis://:YOUR_PASSWORD@redis-host:6379/0
REDIS_PREFIX=rtwc:
```

- Use `rediss://` (two s) for a managed Redis that needs TLS.
- Generate the password with `openssl rand -hex 32`. There is no default password.
- A Redis on another machine must require a password; the server refuses to use one
  without. Only a Redis on the same computer (`localhost`) may run without one, for
  development.
- Redis must never be reachable from the internet. Keep it on a private network, or use a
  managed service over TLS.
- `GET /api/ready` and Admin > Site status show whether Redis is in use.

To try it on your own computer with Docker:

```
docker run -d --name rtwc-redis -p 127.0.0.1:6379:6379 redis:7-alpine redis-server --requirepass YOUR_PASSWORD
```

## What is cached, and for how long

Only public data. Admin responses, contact messages, prayer requests, newsletter
addresses, tokens and passwords are never cached.

| Data | Key (after the prefix) | Fresh for | Old copy kept for |
| --- | --- | --- | --- |
| Site settings (`GET /api/settings`) | `settings:public` | 60 seconds | 24 hours |
| Ministries (`GET /api/ministries`) | `ministries:list` | 60 seconds | 24 hours |
| Leadership (`GET /api/leadership`) | `leadership:rows` | 60 seconds | 24 hours |
| Sermon list, first 20 pages, no search | `sermons:list:page=N:limit=N` | 60 seconds | 24 hours |
| Event list | `events:list:category=…:upcoming=…` | 60 seconds | 24 hours |
| Facebook live status | `fb:live-status` | 60 seconds | 10 minutes |
| Facebook latest broadcast | `fb:latest-live` | 15 minutes | 24 hours |
| Facebook photos, one key per page | `fb:photos:<hash of the cursor>` | 15 minutes | 24 hours |
| Church of Pentecost news | `cop-news:latest` | 30 minutes | 24 hours |
| YouTube video status | `yt:live-status:<video id>`, `yt:latest-live:<video id>` | 60 seconds | 10 minutes |

Rate-limit counts use `rl:login:`, `rl:password:`, `rl:contact:`, `rl:prayer:` and
`rl:newsletter:`, followed by a keyed hash of the visitor's IP address (no address is
stored). Each count expires when its 15-minute window ends.

Every key has an expiry. Nothing is stored without one.

### Why some requests are not cached

Visitors could otherwise create endless keys. So only values from a fixed list go into a
key:

- Sermons: only the plain list (`page` 1 to 20 and `limit`) is cached. A search by `q`,
  `speaker` or `date` reads the database directly, as before.
- Events: `category` and `upcoming` are already limited to fixed values by the API.
- YouTube: only a well-formed 11-character video ID is cached.
- Any other query parameter is ignored by the API and never reaches a key.

### "Fresh" and "old copy"

A cached value is used while fresh. After that the next request reads the database or the
outside service again. If that fails (for example Facebook or thecophq.org is down, or the
database is briefly unreachable), the old copy is served instead of an error, for as long
as the last column says. The Facebook live status keeps an old copy for only 10 minutes, so
the site never says "live now" for long after a broadcast ends.

When many visitors ask for the same expired value at once, only one request (on one
server) fetches it. The others serve the old copy, or wait up to 5 seconds for the new one.
So Facebook gets one call per lifetime, however many servers there are.

## How changes made in the admin show at once

Each save or delete in the admin clears the matching keys, in Redis for every server:

| Admin change | Clears |
| --- | --- |
| Settings | `settings:` |
| Sermons | `sermons:` |
| Events | `events:` |
| Ministries | `ministries:` and `leadership:` (leaders show their ministry's name) |
| Leadership | `leadership:` |

The keys are cleared again one second later, in case a visitor's request read the old data
just before the save.

Uploading or deleting an image does not change any cached data (an image cannot be deleted
while it is used), so it clears nothing.

A change made directly in the database, outside the admin (for example a migration), shows
within 60 seconds. To show it at once, clear the content keys as below.

## Clearing this site's keys

Never use `FLUSHALL` or `FLUSHDB`: they would also delete keys of anything else sharing the
Redis. Delete by prefix instead:

```
redis-cli -a YOUR_PASSWORD --scan --pattern 'rtwc:*' | xargs -r redis-cli -a YOUR_PASSWORD unlink
```

Narrow the pattern to clear less, for example `'rtwc:settings:*'` for the settings, or
`'rtwc:rl:login:*'` to reset every sign-in limit. With Docker, run the same inside the
container: `docker exec -it <redis container> sh`.

To look at the keys and their remaining lifetime:

```
redis-cli -a YOUR_PASSWORD --scan --pattern 'rtwc:*'
redis-cli -a YOUR_PASSWORD ttl rtwc:settings:public
```

## When Redis goes down

The site keeps working:

- The cache moves to each server's memory. A value from the site's own database is kept
  there for at most 30 seconds, so servers that cannot share Redis disagree for at most
  that long. Facebook and news keep their normal lifetime.
- The rate limits count in each server's memory. They still apply, per server, and reset
  if that server restarts.
- Commands wait at most 500 ms. After 3 failures in a row, Redis is skipped for 10 seconds,
  then tried again.
- The server reconnects by itself; no restart is needed.
- The log shows one line when the outage starts (`Redis unavailable…`) and one when it
  ends (`Redis reconnected…`). When it ends, the cached site content is cleared, because an
  edit made during the outage could only clear the memory of the server that made it.
- Admin > Site status shows "Needs attention", and `/api/ready` reports
  `"redis": "degraded"`, still with status 200: a Redis problem never takes a server out of
  service.
