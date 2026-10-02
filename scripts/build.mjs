// Assembles the deployable site into dist/ (or --out <dir>). No dependencies.
//   dist/index.html                       landing page: who's studying?
//   dist/<kid>/index.html                 kid hub: subjects, then quizzes and apps
//   dist/<kid>/<subject>/<slug>/          one folder per quiz or app
//   dist/assets/                          shared engine, hub, themes
// All links are relative, so the site works at any URL, including a local file or a Vercel preview.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, readJSON, deepMerge } from './lib.mjs';
import { validate } from './validate.mjs';

const require = createRequire(import.meta.url);
const ICONS = require('../shared/lib/icons.js');

const outArg = process.argv.indexOf('--out');
export const DIST = outArg > -1 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'dist');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForHtml = (o) => JSON.stringify(o).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
const write = (rel, data) => { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
const copy = (from, rel) => { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(from, p); };
const copyDir = (from, to) => fs.cpSync(from, path.join(DIST, to), { recursive: true });
function tpl(name, vars) {
  const s = fs.readFileSync(path.join(ROOT, 'shared/templates', name + '.html'), 'utf8');
  return s.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vars)) throw new Error(`template ${name}.html: no value for {{${k}}}`); return vars[k]; });
}
const markSvg = (name) => ICONS.mark[name] || ICONS.mark.shield;

export function build() {
  const v = validate();
  v.warnings.forEach((w) => console.warn('  warning:', w));
  if (v.errors.length) {
    console.error('\nBuild stopped. Fix these first:\n');
    v.errors.forEach((e) => console.error('  x ' + e));
    process.exit(1);
  }

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // shared assets
  const S = (p) => path.join(ROOT, 'shared', p);
  copy(S('themes/base.css'), 'assets/base.css');
  fs.readdirSync(S('themes')).filter((f) => f !== 'base.css' && f.endsWith('.css')).forEach((f) => copy(S('themes/' + f), 'assets/themes/' + f));
  ['grader.js', 'heroes.js', 'engine.js', 'engine.css'].forEach((f) => copy(S('engine/' + f), 'assets/' + f));
  copy(S('lib/icons.js'), 'assets/icons.js');
  ['hub.js', 'hub.css', 'root.css'].forEach((f) => copy(S('hub/' + f), 'assets/' + f));
  if (fs.existsSync(S('assets/marks'))) copyDir(S('assets/marks'), 'assets/marks');

  const site = readJSON(path.join(ROOT, 'config/kids.json')).site;
  const subjectsAll = v.subjects;
  const catalog = { site, kids: {} };
  let pages = 0;

  for (const kid of v.kids) {
    const themeColor = kid.theme.color, statusBar = kid.theme.statusBar || 'default';
    const kidApps = v.apps.filter((a) => a.kid === kid.id);
    const school = kid.school;

    // catalog entries for this kid's hub
    const entries = kidApps.map((a) => {
      const e = {
        subject: a.subject, slug: a.slug, title: a.meta.title, blurb: a.meta.blurb, type: a.meta.type,
        sample: !!a.meta.sample, order: a.meta.order, added: a.meta.added, tags: a.meta.tags || [],
        href: `${a.subject}/${a.slug}/`
      };
      if (a.meta.type === 'quiz') {
        const quiz = readJSON(path.join(a.dir, 'quiz.json'));
        e.questions = quiz.questions.length;
        e.keyQuestions = quiz.questions.filter((q) => q.key).length;
        e.priorityLabel = (quiz.priority && quiz.priority.label) || 'Key';
      }
      return e;
    });
    catalog.kids[kid.id] = entries;

    // kid hub
    const hubCfg = {
      kid: { id: kid.id, name: kid.name }, school, hubTitle: kid.hubTitle, tagline: kid.tagline,
      brandIcon: kid.world.brandIcon, ranks: kid.world.ranks,
      subjects: kid.subjects.map((id) => subjectsAll.find((s) => s.id === id)),
      apps: entries, paths: { root: '../' }
    };
    write(`${kid.id}/index.html`, tpl('hub', {
      theme: kid.theme.id, themeColor, statusBar, kidName: esc(kid.name), hubTitle: esc(kid.hubTitle),
      fonts: kid.theme.fonts, root: '../', config: jsonForHtml(hubCfg)
    }));
    pages++;

    // home-screen install support: manifest + icons
    write(`${kid.id}/manifest.webmanifest`, JSON.stringify({
      name: kid.hubTitle, short_name: kid.name, description: `${kid.name}'s study games`,
      start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
      background_color: themeColor, theme_color: themeColor,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    }, null, 2) + '\n');
    const iconDir = path.join(ROOT, 'shared/assets/icons', kid.id);
    if (fs.existsSync(iconDir)) copyDir(iconDir, `${kid.id}/icons`);

    // each app
    for (const a of kidApps) {
      const rel = `${a.kid}/${a.subject}/${a.slug}`, root = '../../../';
      if (a.meta.type === 'static') {
        copyDir(a.dir, rel);
        fs.rmSync(path.join(DIST, rel, 'app.json'), { force: true });
        pages++; continue;
      }
      const quiz = readJSON(path.join(a.dir, 'quiz.json'));
      const subject = subjectsAll.find((s) => s.id === a.subject);
      const skin = deepMerge(kid.world, quiz.world || {});
      const cfg = {
        kid: { id: kid.id, name: kid.name }, school, subject: { id: subject.id, name: subject.name },
        paths: { root, hub: `../../#/${subject.id}` },
        keys: { save: `qh:save:${kid.id}:${a.subject}:${a.slug}`, progress: `qh:progress:${kid.id}:${a.subject}:${a.slug}`, days: `qh:days:${kid.id}` },
        skin, quiz
      };
      const hasWorldCss = fs.existsSync(path.join(a.dir, 'world.css'));
      const headFile = path.join(a.dir, 'head.html');
      if (hasWorldCss) copy(path.join(a.dir, 'world.css'), `${rel}/world.css`);
      write(`${rel}/index.html`, tpl('quiz', {
        theme: kid.theme.id, themeColor, statusBar, kidName: esc(kid.name), kid: kid.id, title: esc(quiz.title),
        fonts: kid.theme.fonts, root, config: jsonForHtml(cfg),
        worldAttr: hasWorldCss ? ` data-world="${a.slug}"` : '',
        worldHead: fs.existsSync(headFile) ? fs.readFileSync(headFile, 'utf8').trim() : '',
        worldCss: hasWorldCss ? '<link rel="stylesheet" href="world.css">' : ''
      }));
      pages++;
    }
  }

  // landing page
  const fontLinks = [...new Set(v.kids.map((k) => k.theme.fonts))].map((h) => `<link rel="stylesheet" href="${h}">`).join('\n');
  const themeLinks = [...new Set(v.kids.map((k) => k.theme.id))].map((t) => `<link rel="stylesheet" href="assets/themes/${t}.css">`).join('\n');
  const portals = v.kids.map((k) => `    <div data-theme="${k.theme.id}">
      <a class="portal" href="${k.id}/">
        <span class="portal-icon">${ICONS.brand[k.world.brandIcon] || ICONS.brand.peak}</span>
        <span class="portal-name">${esc(k.name)}</span>
        <span class="portal-title">${esc(k.hubTitle)}</span>
        <span class="school">${markSvg(k.school.mark)}<span class="st"><b>${esc(k.school.name)}</b><i>${esc(k.school.city)}</i></span></span>
        <span class="btn primary">Let’s go</span>
      </a>
    </div>`).join('\n');
  write('index.html', tpl('root', { siteName: esc(site.name), tagline: esc(site.tagline), fontLinks, themeLinks, portals }));
  write('404.html', tpl('404', { siteName: esc(site.name) }));
  write('robots.txt', 'User-agent: *\nDisallow: /\n');
  write('catalog.json', JSON.stringify(catalog, null, 2) + '\n');
  pages += 2;

  const quizzes = v.apps.filter((a) => a.meta.type === 'quiz').length;
  console.log(`Built ${pages} pages: ${v.kids.length} students, ${v.apps.length} apps (${quizzes} quizzes) -> ${path.relative(process.cwd(), DIST) || '.'}`);
  return { dist: DIST, validation: v };
}

if (import.meta.url === `file://${process.argv[1]}`) build();
