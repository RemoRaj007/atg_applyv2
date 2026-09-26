const ApiError = require("../../utils/ApiError");
const { systemLogger } = require("../../config/atg_logger");

// Client for NVIDIA NIM's OpenAI-compatible chat completions endpoint.
//
// Everything provider-specific lives here, so moving to another
// OpenAI-compatible host (a self-hosted NIM, OpenRouter, a Claude gateway) is a
// change of AI_BASE_URL and AI_MODEL rather than of code.

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

// Pinned. Providers revise models behind a stable name less often than behind
// "latest", but they do revise them — re-run `npm run ai:eval` before moving.
const DEFAULT_MODEL = "deepseek-ai/deepseek-v4-pro";

// Vercel's function ceiling is set to 60s in vercel.json; this leaves room to
// answer with a clean 504 instead of being killed mid-request.
const DEFAULT_TIMEOUT_MS = 45_000;

const RETRYABLE = new Set([429, 502, 503, 504]);

const config = () => ({
  apiKey: process.env.NVIDIA_API_KEY?.trim() || null,
  baseUrl: (process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
  timeoutMs: Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
});

const isConfigured = () => Boolean(config().apiKey);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One chat completion. Returns { text, usage, model, latencyMs }.
 *
 * Failures come back as ApiErrors with deliberately plain messages: the
 * provider's own error body can echo request details, so it goes to the log and
 * never to the caller. The key itself is never logged in any branch.
 */
const chat = async ({ messages, maxTokens = 1200, temperature = 0.6 }) => {
  const { apiKey, baseUrl, model, timeoutMs } = config();
  if (!apiKey) {
    // 503, not 500: the feature exists and is switched off, which is an
    // operational state the frontend can show, not a crash.
    throw new ApiError(503, "AI features are not configured on this server");
  }

  const body = JSON.stringify({
    model,
    messages,
    temperature,
    top_p: 0.95,
    max_tokens: maxTokens,
    stream: false,
    // DeepSeek V4's reasoning trace is long, slow and billed; the features here
    // are drafting, not problem-solving, so it is switched off.
    chat_template_kwargs: { thinking: false },
  });

  const started = Date.now();
  let lastStatus = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(Math.max(1000, timeoutMs - (Date.now() - started))),
      });
    } catch (err) {
      const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
      systemLogger.error("AI provider request failed", { reason: timedOut ? "timeout" : err?.message });
      throw new ApiError(timedOut ? 504 : 502, timedOut ? "The AI service took too long to respond. Please try again." : "The AI service could not be reached. Please try again.");
    }

    lastStatus = res.status;
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        systemLogger.error("AI provider returned no content", { finishReason: data?.choices?.[0]?.finish_reason });
        throw new ApiError(502, "The AI service returned an empty response. Please try again.");
      }
      return {
        text: text.trim(),
        finishReason: data.choices[0].finish_reason || null,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? null,
          completionTokens: data.usage?.completion_tokens ?? null,
        },
        model: data.model || model,
        latencyMs: Date.now() - started,
      };
    }

    const detail = (await res.text().catch(() => "")).slice(0, 300);
    systemLogger.error("AI provider returned an error", { status: res.status, detail });

    // One retry, only for the statuses that mean "try again shortly", and only
    // while there is time budget left to do it.
    if (attempt === 0 && RETRYABLE.has(res.status) && Date.now() - started < timeoutMs / 2) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 3000) : 800);
      continue;
    }
    break;
  }

  if (lastStatus === 401 || lastStatus === 403) {
    // Our key is bad or revoked. The user can do nothing about it, so it is
    // reported as a service problem, and loudly in the log for us.
    systemLogger.error("AI provider rejected the API key — rotate NVIDIA_API_KEY", { status: lastStatus });
    throw new ApiError(503, "AI features are temporarily unavailable");
  }
  if (lastStatus === 429) {
    throw new ApiError(503, "The AI service is busy right now. Please try again in a minute.");
  }
  throw new ApiError(502, "The AI service returned an error. Please try again.");
};

module.exports = { chat, isConfigured, config, DEFAULT_MODEL };
