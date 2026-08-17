#!/usr/bin/env node
/**
 * Adds keys that the source uses but the catalogue lacks.
 *
 * Every `t('some.key', { defaultValue: 'Some text' })` in the codebase is a
 * declaration of a string that must exist in en/translation.json. Writing those
 * by hand is how the catalogue drifted in the first place — a key added in a
 * component and forgotten in the JSON renders as English via defaultValue and
 * looks fine, right up until someone selects another language.
 *
 * This scans for that call shape and writes any missing key into every
 * language, seeded with the English default. Seeding non-English with English
 * is not a translation and is not pretending to be one: check-locales.mjs
 * counts exactly those values as untranslated, so they show up in the baseline
 * and have to be drained deliberately.
 *
 * Run: node scripts/sync-locale-keys.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(here, '..', 'src');
const LOCALES_DIR = join(SRC_DIR, 'locales');
const LANGUAGES = ['en', 'ar', 'zh', 'fr', 'ru', 'es', 'ta', 'si'];

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return full === LOCALES_DIR ? [] : walk(full);
    return ['.ts', '.tsx'].includes(extname(full)) ? [full] : [];
  });

// t('a.b', { defaultValue: 'text' }) with either quote style. Deliberately does
// not try to parse every t() call: only ones carrying a literal default can be
// seeded, and anything else is a key the author must add by hand.
const CALL = /\bt\(\s*(['"])([\w.]+)\1\s*,\s*\{\s*defaultValue:\s*(['"])((?:\\.|(?!\3)[\s\S])*?)\3/g;

const found = new Map();
for (const file of walk(SRC_DIR)) {
  const text = readFileSync(file, 'utf8');
  for (const [, , key, , value] of text.matchAll(CALL)) {
    if (!found.has(key)) found.set(key, value.replace(/\\(['"])/g, '$1'));
  }
}

const getIn = (obj, path) => path.split('.').reduce((node, part) => (node == null ? undefined : node[part]), obj);
const setIn = (obj, path, value) => {
  const parts = path.split('.');
  const leaf = parts.pop();
  let node = obj;
  for (const part of parts) {
    if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
    node = node[part];
  }
  node[leaf] = value;
};

let totalAdded = 0;
for (const lang of LANGUAGES) {
  const path = join(LOCALES_DIR, lang, 'translation.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const added = [];
  for (const [key, value] of found) {
    if (getIn(data, key) === undefined) {
      setIn(data, key, value);
      added.push(key);
    }
  }
  if (added.length) {
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
    totalAdded += added.length;
    console.log(`${lang}: added ${added.length}`);
  }
}

console.log(
  totalAdded
    ? `\nAdded ${totalAdded} entries. Non-English values are English placeholders — run check-locales.mjs --update-baseline, then translate them.`
    : 'Catalogue already covers every t() call carrying a defaultValue.'
);
