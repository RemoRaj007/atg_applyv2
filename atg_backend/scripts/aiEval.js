#!/usr/bin/env node
// Scores the AI prompts against evals/ai-cases.json using the real provider.
//
//   NVIDIA_API_KEY=… npm run ai:eval              # current prompts
//   NVIDIA_API_KEY=… npm run ai:eval -- --baseline # naive one-line prompts, for comparison
//
// Every check is deterministic — string, number and JSON tests — so a score
// means the same thing on every run. Needs network access to the provider; it
// touches no database and sends only the fictional profiles in the case file.
//
// Run it before and after any change to modules/ai/ai.prompts.js or to
// AI_MODEL, and keep both outputs in the PR.
const fs = require("fs");
const path = require("path");
const nim = require("../modules/ai/nim.client");
const prompts = require("../modules/ai/ai.prompts");

const baseline = process.argv.includes("--baseline");
const suite = JSON.parse(fs.readFileSync(path.join(__dirname, "../evals/ai-cases.json"), "utf8"));

const naive = {
  draft: ({ target, fields }) => [{ role: "user", content: `Write a cover letter for "${target.title}" at ${target.organisation}. ${target.description}\nAbout me: ${fields.map((f) => f.value).join(". ")}` }],
  fit: ({ target, fields, fit }) => [{ role: "user", content: `My fit score for ${target.title} is ${fit.fitScore}/100. Profile: ${fields.map((f) => f.value).join(". ")}. Reply as JSON {summary, strengths, gaps, actions}.` }],
  polish: ({ question, answer }) => [{ role: "user", content: `Improve this answer to "${question}": ${answer}` }],
};

const numbersIn = (s) => new Set((s.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(",", ".")));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

const check = (c, text, sourceText) => {
  const e = c.expect;
  const fails = [];
  for (const alt of e.mentions || []) if (!new RegExp(alt, "i").test(text)) fails.push(`missing /${alt}/`);
  for (const bad of e.forbid || []) if (text.toLowerCase().includes(bad.toLowerCase())) fails.push(`contains forbidden "${bad}"`);
  if (e.minWords && words(text) < e.minWords) fails.push(`${words(text)} words < ${e.minWords}`);
  if (e.maxWords && words(text) > e.maxWords) fails.push(`${words(text)} words > ${e.maxWords}`);
  const placeholders = (text.match(/\[ADD:[^\]]*\]/g) || []).length;
  if (e.minPlaceholders && placeholders < e.minPlaceholders) fails.push(`${placeholders} [ADD:] placeholders < ${e.minPlaceholders}`);
  // A year or percentage the source never mentioned is a fabricated fact.
  if (e.noNewYears) for (const y of text.match(/\b(19|20)\d\d\b/g) || []) if (!sourceText.includes(y)) fails.push(`invented year ${y}`);
  if (e.noNewPercents) for (const p of text.match(/\d+(?:\.\d+)?\s?%/g) || []) if (!sourceText.includes(p.replace(/\s/g, ""))) fails.push(`invented percentage ${p}`);
  if (e.script === "tamil" && !/[஀-௿]{20,}/.test(text.replace(/\s/g, ""))) fails.push("not written in Tamil script");
  if (e.keepNumbers) for (const n of numbersIn(sourceText)) if (!numbersIn(text).has(n)) fails.push(`dropped fact ${n}`);
  if (e.noNewNumbers) for (const n of numbersIn(text)) if (!numbersIn(sourceText).has(n)) fails.push(`added number ${n}`);
  if (e.json) {
    let obj = null;
    try { obj = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { /* reported below */ }
    if (!obj || typeof obj.summary !== "string") fails.push("not the requested JSON shape");
    else if (e.exactActions && (!Array.isArray(obj.actions) || obj.actions.length !== e.exactActions)) fails.push(`actions: ${obj.actions?.length} != ${e.exactActions}`);
  }
  // The score is ATG's, not the model's: any other "NN/100" or "NN%" is a restatement.
  if (e.onlyScore !== undefined) for (const m of text.match(/\b(\d{1,3})\s?(?:\/\s?100|%)/g) || []) if (parseInt(m, 10) !== e.onlyScore) fails.push(`restated score as ${m}`);
  return { fails, placeholders };
};

const main = async () => {
  if (!nim.isConfigured()) {
    console.error("Set NVIDIA_API_KEY to run the eval. It calls the real provider.");
    process.exit(2);
  }
  console.log(`model ${nim.config().model} · prompts ${baseline ? "BASELINE (naive)" : prompts.PROMPT_VERSION} · ${suite.cases.length} cases\n`);

  let passed = 0;
  let tokens = 0;
  for (const c of suite.cases) {
    const fields = suite.profiles[c.profile] || [];
    const target = suite.targets[c.target];
    const source = [JSON.stringify(fields), JSON.stringify(target || {}), c.answer || ""].join(" ");
    let messages;
    if (c.feature === "draft") messages = (baseline ? naive.draft : prompts.applicationDraft)({ target, fields, tone: c.tone, language: c.language });
    else if (c.feature === "fit") messages = (baseline ? naive.fit : prompts.fitExplanation)({ target, fields, fit: { fitScore: c.fitScore, breakdown: {} }, language: "en" });
    else messages = (baseline ? naive.polish : prompts.answerPolish)({ question: c.question, answer: c.answer, language: "en" });

    try {
      const r = await nim.chat({ messages, maxTokens: c.feature === "draft" ? 1100 : 700, temperature: c.feature === "draft" ? 0.7 : 0.3 });
      tokens += (r.usage.promptTokens || 0) + (r.usage.completionTokens || 0);
      const { fails } = check(c, r.text, source);
      if (!fails.length) passed++;
      console.log(`${fails.length ? "FAIL" : "pass"}  ${c.id.padEnd(28)} ${(r.latencyMs / 1000).toFixed(1)}s  ${fails.join("; ")}`);
    } catch (err) {
      console.log(`ERR   ${c.id.padEnd(28)} ${err.message}`);
    }
  }
  console.log(`\n${passed}/${suite.cases.length} passed · ${tokens} tokens total`);
  process.exit(passed === suite.cases.length ? 0 : 1);
};

if (require.main === module) main();

module.exports = { check, suite };
