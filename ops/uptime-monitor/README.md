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

Two commands, from this directory. The KV namespace
(`atg-uptime-monitor-STATE`, id `46b7940c…`) already exists in the account and
`HEALTH_URL` already points at the production API, so both are wired up in
`wrangler.jsonc` — nothing to fill in.

```bash
# 1. Where alerts go. Works with a Slack or Discord incoming webhook as-is —
#    the payload carries both `text` and `content`.
npx wrangler secret put ALERT_WEBHOOK_URL

# 2. Ship it.
npx wrangler deploy
```

Without step 1 the monitor still runs and still logs, it just has nowhere to
send the alert — which is most of the point, so do not skip it.

## Verify it before trusting it

An unverified monitor is not a monitor — the point of the `fetch` handler is
that you do not have to wait for a cron tick to find out whether it works.

```bash
curl https://atg-uptime-monitor.<your-subdomain>.workers.dev
```

Returns `200` with `{"healthy":true,...}` when the API is up, `503` when it is
not. To confirm alerting actually reaches you, point `HEALTH_URL` at a URL that
will fail (say `https://atg-applyv2.vercel.app/nope`), redeploy, then hit the
endpoint. Alerts fire on transitions, so this only pages if a previous "up"
state was already recorded — on a brand-new deploy call it once against the
real URL first to seed that state. Set `HEALTH_URL` back afterwards.

Watch live logs with `npx wrangler tail`.

## Cost

Well inside the Workers free tier: 288 cron invocations a day, each one HTTP
request and two KV operations.
