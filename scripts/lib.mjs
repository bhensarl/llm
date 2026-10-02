// Shared helpers for Quest Hall scripts (Node built-ins only, no dependencies).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const Grader = require(path.join(ROOT, 'shared/engine/grader.js'));

export const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// quiz.json is written with one question per line so edits and diffs stay readable.
export function formatQuiz(quiz) {
  const { questions, ...rest } = quiz;
  const head = JSON.stringify(rest, null, 1).replace(/\n}$/, '');
  return head + ',\n "questions": [\n' + questions.map((q) => '  ' + JSON.stringify(q)).join(',\n') + '\n ]\n}\n';
}

// Find every app: content/<kid>/<subject>/<slug>/app.json
export function findApps(contentDir = path.join(ROOT, 'content')) {
  const apps = [];
  if (!fs.existsSync(contentDir)) return apps;
  for (const kid of fs.readdirSync(contentDir)) {
    const kd = path.join(contentDir, kid);
    if (!fs.statSync(kd).isDirectory()) continue;
    for (const subject of fs.readdirSync(kd)) {
      const sd = path.join(kd, subject);
      if (!fs.statSync(sd).isDirectory()) continue;
      for (const slug of fs.readdirSync(sd)) {
        const dir = path.join(sd, slug);
        if (fs.existsSync(path.join(dir, 'app.json'))) apps.push({ kid, subject, slug, dir, meta: readJSON(path.join(dir, 'app.json')) });
      }
    }
  }
  return apps;
}

export function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b === undefined ? a : b;
  const out = { ...(a && typeof a === 'object' && !Array.isArray(a) ? a : {}) };
  for (const k of Object.keys(b)) out[k] = deepMerge(out[k], b[k]);
  return out;
}
