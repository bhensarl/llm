// npm run new:quiz -- <kid> <subject> <slug> "Quiz Title"
// Creates content/<kid>/<subject>/<slug>/ with a starter quiz.json, app.json and cases.json.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJSON, formatQuiz } from './lib.mjs';

const [kidId, subject, slug, ...rest] = process.argv.slice(2);
const title = rest.join(' ').trim();
const kids = readJSON(path.join(ROOT, 'config/kids.json')).kids;
const subjects = readJSON(path.join(ROOT, 'config/subjects.json')).map((s) => s.id);
const usage = 'Usage: npm run new:quiz -- <kid> <subject> <slug> "Quiz Title"\n' +
  `  kids:     ${kids.map((k) => k.id).join(', ')}\n  subjects: ${subjects.join(', ')}\n  slug:     lowercase-with-dashes, e.g. ancient-rome-ch5`;
if (!kidId || !subject || !slug || !title) { console.error(usage); process.exit(1); }
if (!kids.find((k) => k.id === kidId)) { console.error(`Unknown kid "${kidId}".\n${usage}`); process.exit(1); }
if (!subjects.includes(subject)) { console.error(`Unknown subject "${subject}".\n${usage}`); process.exit(1); }
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { console.error('The slug must be lowercase letters, digits and dashes.'); process.exit(1); }

const dir = path.join(ROOT, 'content', kidId, subject, slug);
if (fs.existsSync(dir)) { console.error(`${path.relative(ROOT, dir)} already exists.`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const quiz = {
  id: slug, title, subtitle: '', source: 'the study guide dated YYYY-MM-DD',
  priority: { label: 'Key', blurb: 'the questions your teacher circled' },
  sections: [{ id: 'main', name: 'All Questions', tag: 'Q' }],
  questions: [{ id: 'q1', section: 'main', num: 1, key: true, q: 'Replace me: the first question from the study guide?', a: 'The answer as written in the guide', k: 'answer | guide' }]
};
fs.writeFileSync(path.join(dir, 'quiz.json'), formatQuiz(quiz));
fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({
  title, subject, type: 'quiz', blurb: 'One sentence about what this quiz covers.',
  added: new Date().toISOString().slice(0, 10), order: 50, tags: []
}, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'cases.json'), '[["q1","answer","ok"],["q1","banana","bad"]]\n');
console.log(`Created ${path.relative(ROOT, dir)}\n\nNext:\n  1. Fill in quiz.json (see docs/ADDING-A-QUIZ.md for the answer-key language)\n  2. npm test\n  3. npm run dev   (opens http://localhost:3000)\n  4. git add -A && git commit && git push   (Vercel deploys automatically)`);
