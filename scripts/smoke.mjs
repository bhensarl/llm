// npm run smoke: opens the built site in a real browser at phone size, plays a question in every quiz,
// and fails on console errors or sideways scrolling. Needs Playwright (skips politely if missing).
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ROOT, findApps, readJSON } from './lib.mjs';
import { serve } from './serve.mjs';
import { launch } from './playwright.mjs';

const dist = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) spawnSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], { stdio: 'inherit' });
const browser = await launch();
if (!browser) { console.log('Smoke test skipped: Playwright with Chromium is not installed here.'); process.exit(0); }
const { server, port } = await serve(dist, 0);
const base = `http://localhost:${port}`;
const kids = readJSON(path.join(ROOT, 'config/kids.json')).kids;
const problems = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });

async function visit(label, url, after) {
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) problems.push(`${label}: console error: ${m.text()}`); });
  p.on('pageerror', (e) => problems.push(`${label}: page error: ${e.message}`));
  await p.goto(base + url); await p.waitForTimeout(500);
  if (after) await after(p);
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (o.sw > o.iw) problems.push(`${label}: page scrolls sideways (${o.sw}px wide on a ${o.iw}px screen)`);
  await p.close();
  console.log('  ok  ' + label);
}

await visit('landing page', '/', async (p) => { if ((await p.$$('.portal')).length !== kids.length) problems.push('landing page: a student portal is missing'); });
for (const kid of kids) {
  await visit(`${kid.name}'s hub`, `/${kid.id}/`, async (p) => {
    if (!(await p.$('.subject-tile'))) problems.push(`${kid.id} hub: no subject tiles`);
    const bad = await p.evaluate(() => document.body.innerText.includes('undefined'));
    if (bad) problems.push(`${kid.id} hub shows the word "undefined"`);
  });
}
for (const a of findApps()) {
  if (a.meta.type !== 'quiz') { await visit(`${a.kid}/${a.subject}/${a.slug}`, `/${a.kid}/${a.subject}/${a.slug}/`); continue; }
  await visit(`${a.kid}/${a.subject}/${a.slug}`, `/${a.kid}/${a.subject}/${a.slug}/`, async (p) => {
    await p.click('[data-act=start][data-mode=mix]'); await p.waitForSelector('#ans');
    const answer = await p.evaluate(() => { const r = QE.S.round; return QE.QBY[r.ids[r.idx]].a; });
    await p.fill('#ans', answer); await p.click('[data-act=check]');
    await p.waitForSelector('.fb.ok', { timeout: 3000 }).catch(() => problems.push(`${a.slug}: typing the right answer was not marked correct`));
  });
}
await browser.close(); server.close();
if (problems.length) { console.error('\nSmoke test found problems:'); problems.forEach((x) => console.error('  x ' + x)); process.exit(1); }
console.log('\nSmoke test passed.');
