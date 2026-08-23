/**
 * Uptime monitor for the ATG Apply API.
 *
 * Closes the gap that made today's outage take as long as it did to notice:
 * nothing watched the API, so it was found by someone opening the logs rather
 * than by being told.
 *
 * It runs on Cloudflare deliberately, while the API runs on Vercel. A monitor
 * sharing infrastructure with the thing it monitors goes down with it — this
 * one keeps reporting when Vercel does not.
 *
 * It checks GET / on the API, which is a real dependency check rather than a
 * liveness ping: that route runs SELECT 1 through Prisma, so it answers
 * "Database connection error" exactly when a credential rotation or a pooler
 * problem has broken the app while the deployment itself still looks healthy.
 */

interface Env {
  /** Base URL of the API, no trailing slash. Set in wrangler.jsonc. */
  HEALTH_URL: string;
  /** Slack/Discord/any webhook. Set with: wrangler secret put ALERT_WEBHOOK_URL */
  ALERT_WEBHOOK_URL?: string;
  /** Remembers the last observed state so alerts fire on change, not every run. */
  STATE: KVNamespace;
}

const STATE_KEY = "last-status";
const HEALTHY_MARKER = "is running";
const TIMEOUT_MS = 10_000;

type Health = { ok: boolean; detail: string };

/**
 * A 200 alone is not health here. When the database is unreachable the route
 * answers 500 "Database connection error", but a misconfigured proxy or an
 * error page can also return 200 with the wrong body — so the body has to
 * carry the marker before this counts as up.
 */
const probe = async (url: string): Promise<Health> => {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "atg-uptime-monitor" },
      cf: { cacheTtl: 0 },
    });
    const body = (await res.text()).slice(0, 300);

    if (!res.ok) return { ok: false, detail: `HTTP ${res.status} — ${body}` };
    if (!body.includes(HEALTHY_MARKER)) {
      return { ok: false, detail: `HTTP 200 but unexpected body — ${body}` };
    }
    return { ok: true, detail: `HTTP ${res.status}` };
  } catch (err) {
    // Timeout, DNS failure, TLS failure, connection refused.
    return { ok: false, detail: `unreachable — ${(err as Error).message}` };
  }
};

/**
 * Sent on transitions only. `text` is what Slack renders, `content` is what
 * Discord renders — including both means the same secret works with either
 * without the deployer having to care which shape their endpoint wants.
 */
const notify = async (env: Env, message: string) => {
  if (!env.ALERT_WEBHOOK_URL) return;
  await fetch(env.ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: message, content: message }),
  }).catch(() => {
    // A failed alert must not fail the run, or one bad webhook silences the
    // monitor entirely. The console line survives in `wrangler tail`.
    console.error("alert webhook failed");
  });
};

const check = async (env: Env): Promise<Health & { changed: boolean }> => {
  const health = await probe(env.HEALTH_URL);
  const previous = await env.STATE.get(STATE_KEY);
  const current = health.ok ? "up" : "down";

  // First ever run has no previous state. Treat it as no change so a fresh
  // deploy does not immediately page about a service that was already fine.
  const changed = previous !== null && previous !== current;

  if (changed) {
    await notify(
      env,
      health.ok
        ? `✅ ATG Apply API recovered — ${env.HEALTH_URL} (${health.detail})`
        : `🔴 ATG Apply API is DOWN — ${env.HEALTH_URL}\n${health.detail}\n\nRunbook: https://github.com/RemoRaj007/atg_applyv2/blob/main/RUNBOOK.md`
    );
  }

  await env.STATE.put(STATE_KEY, current);
  return { ...health, changed };
};

export default {
  // Cron-driven. This is the path that actually matters.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      check(env).then((r) => {
        console.log(`health=${r.ok ? "up" : "down"} changed=${r.changed} ${r.detail}`);
      })
    );
  },

  // Manual probe, so the monitor itself can be verified without waiting for
  // the next cron tick — an unverified monitor is not a monitor.
  async fetch(_req: Request, env: Env): Promise<Response> {
    const result = await check(env);
    return Response.json(
      { target: env.HEALTH_URL, healthy: result.ok, detail: result.detail, changed: result.changed },
      { status: result.ok ? 200 : 503 }
    );
  },
};
