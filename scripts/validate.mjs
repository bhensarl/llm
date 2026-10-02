// Checks everything a deploy depends on. Used by `npm test` and by the build (a bad quiz fails the
// build, so Vercel keeps serving the last good version instead of publishing a broken one).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJSON, findApps, Grader } from './lib.mjs';

const HEROES = ['ziggurat', 'mountain', 'garden'];
const BADGE_IDS = ['first', 's6', 's12', 'flawless', 'k25', 'gate', 'redeem', 'scholar'];
const JUNK = ['I dont know', 'banana', 'asdf', 'the', 'yes'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateQuiz(quiz, cases, label, err, warn) {
  const E = (m) => err(`${label}: ${m}`), W = (m) => warn(`${label}: ${m}`);
  if (!quiz.id || !quiz.title) E('quiz needs "id" and "title"');
  if (!Array.isArray(quiz.questions) || !quiz.questions.length) { E('quiz needs a non-empty "questions" array'); return null; }
  const secIds = new Set((quiz.sections || []).map((s) => s.id));
  if (!secIds.size) E('quiz needs "sections" (each with id, name, tag)');
  (quiz.sections || []).forEach((s) => { if (!s.id || !s.name || !s.tag) E(`section ${JSON.stringify(s)} needs id, name and tag`); });
  (quiz.scopes || []).forEach((sc) => {
    if (!sc.id || sc.id === 'all' || !sc.name) E(`scope ${JSON.stringify(sc)} needs a name and an id other than "all"`);
    (sc.sections || []).forEach((id) => { if (!secIds.has(id)) E(`scope "${sc.id}" uses unknown section "${id}"`); });
  });
  const seen = new Set(), seenText = new Map();
  quiz.questions.forEach((q, i) => {
    const at = `question #${i + 1} (${q.id || '?'})`;
    if (!q.id || typeof q.id !== 'string') return E(`${at} needs an "id"`);
    if (seen.has(q.id)) E(`${at}: duplicate id`); seen.add(q.id);
    if (!secIds.has(q.section)) E(`${at}: unknown section "${q.section}"`);
    if (typeof q.num !== 'number') E(`${at}: "num" must be a number`);
    if (!q.q || !q.a) E(`${at}: needs "q" (question) and "a" (answer)`);
    if (!q.k || !String(q.k).trim()) return E(`${at}: needs an answer key "k"`);
    const slots = Grader.parseKey(q.k);
    if (!slots.length || slots.some((s) => !s.alts.length)) E(`${at}: answer key "${q.k}" has an empty part`);
    if (q.need !== undefined && (!Number.isInteger(q.need) || q.need < 1 || q.need > slots.length)) E(`${at}: "need" must be between 1 and ${slots.length}`);
    const norm = String(q.q).toLowerCase().replace(/\W+/g, ' ').trim();
    if (seenText.has(norm)) W(`${at} repeats the question text of ${seenText.get(norm)}`); else seenText.set(norm, q.id);
  });
  if (quiz.world) {
    const w = quiz.world;
    if (w.hero && !HEROES.includes(w.hero)) E(`world.hero must be one of ${HEROES.join(', ')}`);
    if (w.ranks) {
      if (!Array.isArray(w.ranks) || w.ranks.length < 2) E('world.ranks needs at least 2 ranks');
      else if (w.ranks[0].xp !== 0 || w.ranks.some((r, i) => i && r.xp <= w.ranks[i - 1].xp)) E('world.ranks must start at xp 0 and increase');
    }
    Object.keys(w.badges || {}).forEach((id) => { if (!BADGE_IDS.includes(id)) E(`world.badges has unknown badge "${id}" (use ${BADGE_IDS.join(', ')})`); });
    if (w.glyph && !w.glyphFont) E('world.glyph needs world.glyphFont');
  }
  if (quiz.questions.some((q) => q.key) && !quiz.priority) W('some questions are marked key but the quiz has no "priority" label');

  // The grader must accept each question's own answer and reject obvious junk.
  const compiled = Grader.compile(quiz), by = Object.fromEntries(compiled.map((q) => [q.id, q]));
  compiled.forEach((q) => {
    const g = Grader.grade(q, q.a);
    if (g.st !== 'ok') E(`${q.id}: its own answer "${q.a}" grades as "${g.st}". Fix the answer key "k".`);
    JUNK.forEach((j) => { if (Grader.grade(q, j).st === 'ok') E(`${q.id}: the answer key accepts junk "${j}". Make it stricter.`); });
  });
  (cases || []).forEach((c, i) => {
    const [id, text, expected] = c;
    if (!by[id]) return E(`cases.json #${i + 1}: unknown question "${id}"`);
    if (!['ok', 'part', 'bad'].includes(expected)) return E(`cases.json #${i + 1}: expected must be ok, part or bad`);
    const got = Grader.grade(by[id], text).st;
    if (got !== expected) E(`${id}: typing "${text}" should grade "${expected}" but grades "${got}"`);
  });
  return { questions: quiz.questions.length, key: quiz.questions.filter((q) => q.key).length, cases: (cases || []).length };
}

export function validate() {
  const errors = [], warnings = [], apps = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const kidsCfg = readJSON(path.join(ROOT, 'config/kids.json'));
  const subjects = readJSON(path.join(ROOT, 'config/subjects.json'));
  const subjectIds = new Set(subjects.map((s) => s.id));
  const kidIds = new Set();

  subjects.forEach((s) => { if (!s.id || !s.name || !s.icon) err(`config/subjects.json: ${JSON.stringify(s)} needs id, name and icon`); });
  kidsCfg.kids.forEach((k) => {
    const at = `config/kids.json (${k.id})`;
    if (!KEBAB.test(k.id || '')) err(`${at}: id must be lowercase letters, digits and dashes`);
    kidIds.add(k.id);
    ['name', 'hubTitle', 'tagline'].forEach((f) => { if (!k[f]) err(`${at}: missing "${f}"`); });
    if (!k.school || !k.school.name || !k.school.city) err(`${at}: school needs name and city`);
    if (!k.theme || !fs.existsSync(path.join(ROOT, 'shared/themes', `${k.theme.id}.css`))) err(`${at}: theme file shared/themes/${k.theme && k.theme.id}.css does not exist`);
    (k.subjects || []).forEach((s) => { if (!subjectIds.has(s)) err(`${at}: unknown subject "${s}"`); });
    if (!k.world || !Array.isArray(k.world.ranks) || k.world.ranks.length < 2) err(`${at}: world.ranks is required`);
    if (k.world && !HEROES.includes(k.world.hero)) err(`${at}: world.hero must be one of ${HEROES.join(', ')}`);
    ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].forEach((f) => {
      if (!fs.existsSync(path.join(ROOT, 'shared/assets/icons', k.id, f))) warn(`${at}: missing home-screen icon shared/assets/icons/${k.id}/${f} (run: node scripts/make-icons.mjs)`);
    });
    if (k.school && k.school.logo && !fs.existsSync(path.join(ROOT, 'shared', k.school.logo))) err(`${at}: school.logo "shared/${k.school.logo}" not found`);
  });

  const seenSlug = new Set();
  for (const a of findApps()) {
    const label = `content/${a.kid}/${a.subject}/${a.slug}`;
    const m = a.meta;
    if (!kidIds.has(a.kid)) { err(`${label}: "${a.kid}" is not a kid in config/kids.json`); continue; }
    const kid = kidsCfg.kids.find((k) => k.id === a.kid);
    if (!(kid.subjects || []).includes(a.subject)) err(`${label}: subject "${a.subject}" is not enabled for ${kid.name} in config/kids.json`);
    if (!KEBAB.test(a.slug)) err(`${label}: folder name must be lowercase letters, digits and dashes`);
    if (seenSlug.has(`${a.kid}/${a.subject}/${a.slug}`)) err(`${label}: duplicate app`); seenSlug.add(`${a.kid}/${a.subject}/${a.slug}`);
    if (!m.title || !m.blurb) err(`${label}/app.json: needs "title" and "blurb"`);
    if (m.subject && m.subject !== a.subject) err(`${label}/app.json: "subject" says ${m.subject} but the folder is ${a.subject}`);
    if (!['quiz', 'static'].includes(m.type)) { err(`${label}/app.json: "type" must be quiz or static`); continue; }
    const info = { ...a, label, stats: null };
    if (m.type === 'static') {
      if (!fs.existsSync(path.join(a.dir, 'index.html'))) err(`${label}: static apps need an index.html`);
    } else {
      const qp = path.join(a.dir, 'quiz.json');
      if (!fs.existsSync(qp)) { err(`${label}: quiz apps need a quiz.json`); apps.push(info); continue; }
      let quiz, cases = [];
      try { quiz = readJSON(qp); } catch (e) { err(`${label}/quiz.json is not valid JSON: ${e.message}`); apps.push(info); continue; }
      const cp = path.join(a.dir, 'cases.json');
      if (fs.existsSync(cp)) { try { cases = readJSON(cp); } catch (e) { err(`${label}/cases.json is not valid JSON: ${e.message}`); } }
      else warn(`${label}: no cases.json (add a few right and wrong answers to lock in grading)`);
      info.stats = validateQuiz(quiz, cases, label, err, warn);
    }
    apps.push(info);
  }
  return { errors, warnings, apps, kids: kidsCfg.kids, subjects };
}
