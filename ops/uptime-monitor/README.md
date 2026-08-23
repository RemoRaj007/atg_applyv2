# Uptime monitor

Watches the ATG Apply API and alerts when it stops answering. Closes the gap
that made the outage on 2026-08-23 take as long as it did to notice: nothing
was watching, so it was found by opening the logs rather than by being told.

Deliberately runs on Cloudflare while the API runs on Vercel. A monitor that
shares infrastructure with what it monitors goes down with it.

## What it checks

`GET /` on the API. That route runs `SELECT 1` through Prisma, so it fails
exactly when a rotated credential or a pooler problem has broken the app while
the deployment still looks healthy — which is the failure this exists to catch.
A 200 alone is not treated as healthy; the body has to carry the expected
marker, so an error page returning 200 is still reported as down.

Alerts fire on **transitions** (down, then recovered), not on every run, so a
multi-hour outage produces two messages rather than a hundred.

## Deploy

Four commands, from this directory.

```bash
# 1. State store, so alerts fire on change rather than every 5 minutes.
npx wrangler kv namespace create STATE
#    → paste the printed id into wrangler.jsonc

# 2. Point it at the real API origin.
#    Edit HEALTH_URL in wrangler.jsonc.

# 3. Where alerts go. Works with a Slack or Discord incoming webhook as-is —
#    the payload carries both `text` and `content`.
npx wrangler secret put ALERT_WEBHOOK_URL

# 4. Ship it.
npx wrangler deploy
```

## Verify it before trusting it

An unverified monitor is not a monitor — the point of the `fetch` handler is
that you do not have to wait for a cron tick to find out whether it works.

```bash
curl https://atg-uptime-monitor.<your-subdomain>.workers.dev
```

Returns `200` with `{"healthy":true,...}` when the API is up, `503` when it is
not. To confirm alerting actually reaches you, point `HEALTH_URL` at a URL that
will fail (say `https://REPLACE-WITH-API-HOST/nope`), redeploy, wait for one
tick, check the alert arrives, then set it back.

Watch live logs with `npx wrangler tail`.

## Cost

Well inside the Workers free tier: 288 cron invocations a day, each one HTTP
request and two KV operations.
