// npm test: validates all content, builds the site into a temp folder, and checks every link resolves.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readJSON } from './lib.mjs';
import { validate } from './validate.mjs';

let failed = false;
const fail = (m) => { failed = true; console.error('  x ' + m); };

console.log('Checking content...');
const v = validate();
v.warnings.forEach((w) => console.warn('  warning:', w));
v.errors.forEach(fail);
v.apps.forEach((a) => console.log(`  ${a.kid} / ${a.subject} / ${a.slug}${a.stats ? `  (${a.stats.questions} questions, ${a.stats.key} key, ${a.stats.cases} grading checks)` : ''}`));
if (failed) { console.error('\nContent checks failed.'); process.exit(1); }

console.log('\nBuilding into a temporary folder...');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-hall-'));
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), '--out', tmp], { encoding: 'utf8' });
process.stdout.write(r.stdout.split('\n').filter((l) => !l.includes('warning')).join('\n'));
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }

console.log('Checking links in the built site...');
const htmlFiles = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && htmlFiles.push(p); } })(tmp);
let checked = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8').replace(/<script type="application\/json"[\s\S]*?<\/script>/g, '');
  const dir = path.dirname(file);
  if (path.basename(file) === '404.html') continue; // uses absolute links on purpose
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    let ref = m[1];
    if (/^(https?:|mailto:|data:|javascript:|#)/.test(ref)) continue;
    ref = ref.split('#')[0].split('?')[0];
    if (!ref) continue;
    let target = path.resolve(dir, ref);
    if (ref.endsWith('/') || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, 'index.html');
    checked++;
    if (!fs.existsSync(target)) fail(`${path.relative(tmp, file)} links to "${m[1]}" which does not exist`);
  }
}
for (const kid of v.kids) {
  const man = readJSON(path.join(tmp, kid.id, 'manifest.webmanifest'));
  man.icons.forEach((i) => { checked++; if (!fs.existsSync(path.join(tmp, kid.id, i.src))) fail(`${kid.id}/manifest.webmanifest icon ${i.src} is missing`); });
}
for (const [kid, entries] of Object.entries(readJSON(path.join(tmp, 'catalog.json')).kids)) {
  entries.forEach((e) => { checked++; if (!fs.existsSync(path.join(tmp, kid, e.href, 'index.html'))) fail(`${kid} hub links to ${e.href} but it was not built`); });
}
console.log(`  ${checked} links and files checked`);
fs.rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error('\nTests failed.'); process.exit(1); }
console.log('\nAll good.');
