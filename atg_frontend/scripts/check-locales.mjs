#!/usr/bin/env node
/**
 * Guards the translation catalogue.
 *
 * Two failure modes, both of which had already happened silently:
 *
 *  1. A key exists in en/ but not in another language. i18next falls back to
 *     English, so nothing breaks loudly — the string just stays English forever
 *     and nobody notices.
 *  2. A key exists everywhere but its value is still the English text, copied in
 *     as a placeholder during the original pass. Indistinguishable from a real
 *     translation at runtime. This is what left ~93 keys English in ta/si/ru/es
 *     while the files looked complete.
 *
 * Both are now hard failures. (2) ran as a ratchet against locale-baseline.json
 * while the 382 known-untranslated keys were worked through in stages; they are
 * all translated, the baseline file is gone, and the check gates on zero.
 *
 * The ratchet machinery is deliberately left in place. The 231 catalogue
 * question labels are the next body of text to translate, and when they land in
 * the catalogue they will arrive as English placeholders — at which point
 * --update-baseline gives a shrinking list to work through rather than a wall
 * of red that gets the check disabled instead.
 *
 * Run: node scripts/check-locales.mjs [--update-baseline]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(here, '..', 'src', 'locales');
const BASELINE_PATH = join(here, 'locale-baseline.json');

const SOURCE = 'en';
const LANGUAGES = ['en', 'ar', 'zh', 'fr', 'ru', 'es', 'ta', 'si'];

// Values that are legitimately identical across languages: proper nouns, short
// forms that genuinely do not translate, and example addresses that stay in
// Latin script whatever the interface language. Flagging these would train
// everyone to ignore the output.
const IDENTICAL_BY_DESIGN = new Set([
  'ATG Apply',
  'ATG',
  'Apply',
  'LinkedIn',
  'GitHub',
  'CV',
  'Email',
  'API',
  'URL',
  'you@example.com',
]);

// Keys whose translation genuinely coincides with the English, per language.
// "Contact", "Date" and "Action" really are the French words; "Legal" really is
// the Spanish one. Listing them by key rather than by value keeps the exception
// narrow — "Date" is a correct French translation and would be a missing Tamil
// one, and a single global value list could not tell those apart.
const COINCIDENTAL_BY_LANGUAGE = {
  fr: new Set([
    'nav.contact',
    'nav.notifications',
    'footer.colomboLocation',
    'payments.date',
    'common.action',
    'termsPage.sec2Badge',
    'contactPage.messageLabel',
  ]),
  es: new Set(['footer.legal', 'footer.colomboLocation']),
};

const load = (lang) => JSON.parse(readFileSync(join(LOCALES_DIR, lang, 'translation.json'), 'utf8'));

/** Flattens nested namespaces into "namespace.key" paths. */
const flatten = (obj, prefix = '') =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(acc, flatten(value, path));
    else acc[path] = value;
    return acc;
  }, {});

const source = flatten(load(SOURCE));
const sourceKeys = Object.keys(source);

// Read directly and treat "not there" as an empty baseline, rather than
// checking existence first: between the check and the read the file can change,
// which is the race CodeQL flags. Only ENOENT is swallowed — a malformed
// baseline must still fail loudly rather than silently disabling the ratchet.
const readBaseline = () => {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
};

const baseline = readBaseline();

const missing = {};
const extra = {};
const untranslated = {};

for (const lang of LANGUAGES) {
  if (lang === SOURCE) continue;
  const target = flatten(load(lang));
  const targetKeys = new Set(Object.keys(target));

  missing[lang] = sourceKeys.filter((k) => !targetKeys.has(k));
  extra[lang] = [...targetKeys].filter((k) => !(k in source));
  const coincidental = COINCIDENTAL_BY_LANGUAGE[lang] ?? new Set();
  untranslated[lang] = sourceKeys.filter(
    (k) =>
      targetKeys.has(k) &&
      target[k] === source[k] &&
      !IDENTICAL_BY_DESIGN.has(source[k]) &&
      !coincidental.has(k)
  );
}

if (process.argv.includes('--update-baseline')) {
  const next = Object.fromEntries(
    LANGUAGES.filter((l) => l !== SOURCE).map((l) => [l, untranslated[l].slice().sort()])
  );
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  const total = Object.values(next).reduce((n, list) => n + list.length, 0);
  console.log(`Baseline written: ${total} known-untranslated keys across ${LANGUAGES.length - 1} languages.`);
  process.exit(0);
}

let failed = false;
const report = (label, byLang) => {
  for (const [lang, keys] of Object.entries(byLang)) {
    if (!keys.length) continue;
    failed = true;
    console.error(`\n${label} — ${lang} (${keys.length}):`);
    for (const key of keys.slice(0, 25)) console.error(`  ${key}`);
    if (keys.length > 25) console.error(`  … and ${keys.length - 25} more`);
  }
};

report('Missing keys', missing);
report('Keys not present in en/', extra);

// New untranslated keys: present now, absent from the baseline.
const newlyUntranslated = {};
const nowTranslated = {};
for (const lang of LANGUAGES) {
  if (lang === SOURCE) continue;
  const known = new Set(baseline[lang] ?? []);
  newlyUntranslated[lang] = untranslated[lang].filter((k) => !known.has(k));
  // A baseline entry that no longer matches English has been translated, or the
  // key was removed. Either way the baseline must shrink, or it silently grants
  // permission for a key that has since regressed.
  const stillUntranslated = new Set(untranslated[lang]);
  nowTranslated[lang] = [...known].filter((k) => !stillUntranslated.has(k));
}

report('Untranslated (value identical to English)', newlyUntranslated);
report('Translated but still in the baseline — run --update-baseline', nowTranslated);

if (failed) {
  console.error('\nLocale check failed.');
  process.exit(1);
}

const remaining = Object.values(baseline).reduce((n, list) => n + list.length, 0);
console.log(
  `Locale check passed: ${sourceKeys.length} keys × ${LANGUAGES.length} languages.` +
    (remaining ? ` ${remaining} known-untranslated keys remain in the baseline.` : '')
);
