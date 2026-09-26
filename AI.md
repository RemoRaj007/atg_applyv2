# AI features

Three candidate-facing features, backed by NVIDIA NIM's OpenAI-compatible API
running **DeepSeek V4 Pro**:

| Feature | Endpoint | What it does |
| --- | --- | --- |
| Application draft | `POST /api/ai/application-draft` | Drafts a cover letter (job) or statement (scholarship) from the posting and the candidate's shareable profile answers. |
| Fit explanation | `POST /api/ai/fit-explanation` | Explains the existing rule-based fit score in plain language, with three concrete actions. The model explains the score; it never produces it. |
| Answer polish | `POST /api/ai/answer-polish` | Rewrites one profile answer for clarity without adding facts. |

`GET /api/ai/status` reports whether AI is enabled and the day's remaining
quota; `GET /api/ai/preview` lists — by label, never by value — what a request
would share. All five are candidate-only.

The UI is the **AI assistant** panel in the job and scholarship details modal.
It renders nothing at all when AI is not configured.

## Turning it on

One variable, on Vercel (backend project → Settings → Environment Variables),
then redeploy:

| Variable | Required | Default | |
| --- | --- | --- | --- |
| `NVIDIA_API_KEY` | yes | — | From build.nvidia.com. Without it every AI endpoint answers `503` and the panel stays hidden. |
| `AI_MODEL` | no | `deepseek-ai/deepseek-v4-pro` | Pinned on purpose. Run the eval before changing it. |
| `AI_BASE_URL` | no | `https://integrate.api.nvidia.com/v1` | Any OpenAI-compatible host works. |
| `AI_DAILY_LIMIT` | no | `20` | Calls per candidate per rolling 24 hours. |
| `AI_TIMEOUT_MS` | no | `45000` | Kept under the 60 s function limit set in `vercel.json`. |

Migration `20260926120000_add_ai_requests` creates the audit table. It applies
automatically during the Vercel build, like every other migration.

> **Key hygiene.** The key lives only in Vercel's environment. It is never in
> the repo, never in the frontend bundle, and never logged — a revoked key is
> logged as "rotate NVIDIA_API_KEY" without the key itself. If a key has been
> pasted anywhere else (chat, a ticket, a screenshot), treat it as exposed:
> generate a new one at build.nvidia.com and revoke the old one.

## What leaves the platform

The privacy boundary is `atg_backend/modules/ai/ai.context.js`. Nothing reaches
a prompt except through it, and the rule comes from the question catalogue
rather than from code. Every question carries an `External AI` policy:

| Policy | Count | Behaviour |
| --- | --- | --- |
| `YES` | 153 | Sent. |
| `LIMITED` | 13 | Held back unless the candidate ticks "include limited details" for that one request — legal name, city, notice period and the like. |
| `NO` | 65 | Never sent: health, identity documents, references, clearance. |

Two more rules sit on top, as defence against a catalogue edit: `RESTRICTED`
and `SENSITIVE` answers are never sent whatever their policy says, and an
unrecognised policy value counts as `NO`. Email and phone come from the `User`
record, which the AI features never read.

Answer polish is the one feature where the text comes from the request rather
than the database. The question's policy is checked anyway, so typing a `NO`
answer into the box does not get it sent.

Every generating request must carry `consent: true`. The server refuses it
otherwise, so consent belongs to the request, not just to the UI.

### The audit trail

Each provider call writes one `AiRequest` row: user, feature, model, prompt
version, **which field codes were sent**, whether limited details were
included, status, tokens and latency. It stores **no prompt, no answer values
and no generated text**. That is deliberate: the table answers "what did you
send about me, and to whom?" exactly, without becoming a second copy of the
data it describes. Rows cascade-delete with the user.

The same table is the daily quota. Failed calls count too, because they can
still cost money.

## Threat model

Mapped against the OWASP Top 10 for LLM applications.

| Risk | Where it applies | Control |
| --- | --- | --- |
| **LLM01 Prompt injection** | Job descriptions are written by employers and scraped from other sites; profile answers are free text. | Untrusted text goes only in the user message, inside tags; the system prompt says tagged content is data. Angle brackets are neutralised so data cannot close its own tag. Two eval cases attack this directly. **Residual:** injection resistance is probabilistic — see the next row. |
| **LLM05 Improper output handling** / **LLM06 Excessive agency** | What model output can do. | Output triggers nothing. It is shown to the candidate as editable text in a `<textarea>`, rendered by React (never as HTML), and is not stored or sent anywhere. The worst a successful injection achieves is a bad draft the candidate sees. |
| **LLM02 Sensitive information disclosure** | Profile data sent to a third party. | Catalogue-driven filter, explicit per-request consent, a preview of exactly what is shared, and an audit row per call. |
| **LLM09 Misinformation** | Invented employers, dates or grades in a letter the candidate sends. | The prompt forbids unprovided facts and asks for `[ADD: …]` placeholders instead. The UI counts placeholders and warns "check every fact". The eval flags any year or percentage absent from the source. **Residual:** the checks catch numbers, not every invented claim — the candidate's review is the real control. |
| **LLM10 Unbounded consumption** | A paid API behind a public app. | Per-account daily quota in Postgres, a per-client burst limiter, capped `max_tokens`, capped context size, a request timeout, and one retry only. |
| **LLM03 Supply chain** | Model behaviour drifting under a stable name. | The model is pinned. `AiRequest.promptVersion` and `model` record what produced each output. |
| Key compromise | `NVIDIA_API_KEY`. | Server-side only; a 401/403 from the provider is logged as a rotation alert without echoing the provider's response body to the client. |

## The eval

`atg_backend/evals/ai-cases.json` holds 12 cases: strong and sparse profiles,
a scholarship, Tamil and French output, fit explanations, answer polish, and
**two prompt-injection attacks** — one in a posting, one in a profile answer.
`scripts/aiEval.js` scores them with deterministic checks (invented years or
percentages, obeyed injections, word counts, JSON shape, restated scores,
dropped or added numbers). No model grades another model.

```bash
cd atg_backend
NVIDIA_API_KEY=… npm run ai:eval               # current prompts
NVIDIA_API_KEY=… npm run ai:eval -- --baseline # naive one-line prompts, for comparison
```

It also runs in GitHub Actions (`.github/workflows/ai-eval.yml`) on any PR that
touches the prompts, and on demand, once `NVIDIA_API_KEY` is added as a
repository secret. The scorer itself is unit-tested offline
(`tests/unit/aiPrompts.test.js`), so a broken check cannot pass silently.

**Rule:** any edit to `ai.prompts.js` bumps `PROMPT_VERSION` and ships with a
before-and-after eval run in the PR. Add a case for every bad output reported
from production before changing the prompt that produced it.

## Deliberately not built

- **Staff-initiated AI.** Operators prepare applications for candidates, but
  generating text from a candidate's profile on an operator's click shares
  someone else's data. That needs its own consent design first.
- **Automatic submission.** No AI output is ever submitted, sent or saved
  without the candidate acting on it.
- **Streaming.** A draft takes 10–40 s. Streaming would improve perceived
  latency, but it complicates the audit row and the timeout budget; the UI shows
  progress instead.
