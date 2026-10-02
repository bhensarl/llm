/*
 * Quest Hall quiz engine.
 * Boots from the JSON config the build step inlines into each quiz page (#qh-config):
 *   kid, school, subject, paths, keys (localStorage keys), skin (ranks, hero, badges, wording), quiz (the question bank)
 * Needs: grader.js, heroes.js, icons.js loaded first.
 */
(function () {
'use strict';

const CFG = JSON.parse(document.getElementById('qh-config').textContent);
const G = window.QuestGrader, HERO = window.QuestHeroes, IC = window.QH_ICONS;
const KID = CFG.kid, SCHOOL = CFG.school, QZ = CFG.quiz, SK = CFG.skin, PATHS = CFG.paths, KEYS = CFG.keys;

const Q = G.compile(QZ);
const QBY = Object.fromEntries(Q.map(q => [q.id, q]));
const HAS_KEY = Q.some(q => q.key);
const PRI = QZ.priority || { label: 'Key', blurb: 'the priority questions' };
const SCOPES = QZ.scopes || [];
const SCOPE_SECS = Object.fromEntries(SCOPES.map(s => [s.id, new Set(s.sections)]));
const RANKS = SK.ranks;
const LEX = Object.assign({ pile: 'Study Pile', start: 'Start round', key: PRI.label }, SK.lexicon || {});
const HEADS = Object.assign({
  perfect: 'Flawless!', great: 'Great round.', good: 'Solid work. Keep climbing.', ok: 'Getting there. Study the cards below.',
  low: 'Tough round. The cards below will help.', replayMissed: 'Replay done. Keep at it.', replayClean: 'Redeemed. Every one right.'
}, SK.headlines || {});
const QUIPS = Object.assign({
  ok: ['Nailed it.', 'Spot on.', 'That one is yours now.'],
  part: ['You got part of it. Look at what is missing.', 'So close. The rest is below.'],
  bad: ['Not quite. It goes into your ' + LEX.pile + '.', 'Missed it. It can come back for another try.'],
  skip: ['No problem. Read the answer, it will stick next time.', 'Good to check. This one goes into your ' + LEX.pile + '.']
}, SK.quips || {});

const UNLOCK = 0.75;           // share of key questions to know before the others take over
const KNOWN = 2;               // mastery box that counts as "known"
const BASE_KEY = 150, BASE_OTHER = 100;
const multOf = s => 1 + 0.5 * Math.min(4, Math.floor(s / 3));

/* ---------- badges ---------- */
const KEYS_TOTAL = Q.filter(q => q.key).length;
const K_BADGE_N = Math.min(25, Math.max(3, Math.ceil(KEYS_TOTAL * 0.3)));
const REDEEM_N = Math.min(10, Math.max(3, Math.floor(Q.length / 8)));
const BADGE_DEFAULT = {
  first: { n: 'First Win', d: 'Answer your first question correctly' },
  s6: { n: 'On a Roll', d: '6 correct answers in a row' },
  s12: { n: 'Unstoppable', d: '12 correct answers in a row' },
  flawless: { n: 'Flawless Round', d: 'Get every question right in a round of 10 or more' },
  k25: { n: 'Key Keeper', d: 'Know ' + K_BADGE_N + ' of the ★ ' + PRI.label.toLowerCase() + ' questions' },
  gate: { n: 'Gatekeeper', d: 'Know 75% of the ★ ' + PRI.label.toLowerCase() + ' questions' },
  redeem: { n: 'Second Chance', d: 'Clear ' + REDEEM_N + ' questions from your ' + LEX.pile },
  scholar: { n: 'Scholar', d: 'Know every question in the bank' }
};
const BADGE_DEFS = [
  { id: 'first', i: 'check', t: () => save.stats.correct >= 1 },
  { id: 's6', i: 'flame', t: () => save.stats.bestStreak >= 6 },
  { id: 's12', i: 'flame', t: () => save.stats.bestStreak >= 12 },
  { id: 'flawless', i: 'crown', t: () => save.stats.flawless >= 1 },
  { id: 'k25', i: 'star', key: true, t: () => keyStats('all').known >= K_BADGE_N },
  { id: 'gate', i: 'star', key: true, t: () => keyStats('all').pct >= UNLOCK },
  { id: 'redeem', i: 'check', t: () => save.stats.redeemed >= REDEEM_N },
  { id: 'scholar', i: 'crown', t: () => Q.every(q => (boxOf(q) ?? -1) >= KNOWN) }
];
const BADGES = BADGE_DEFS.filter(b => HAS_KEY || !b.key).map(b => {
  const o = (SK.badges && SK.badges[b.id]) || {}, d = BADGE_DEFAULT[b.id];
  return Object.assign({}, b, { n: o.n || d.n, d: o.d || d.d });
});

/* ---------- save ---------- */
const blank = () => ({
  v: 1, xp: 0, box: {}, pile: {}, recent: [], badges: {},
  stats: { rounds: 0, answered: 0, correct: 0, bestStreak: 0, bestScore: 0, flawless: 0, redeemed: 0, appeals: 0 },
  set: { len: 10, scope: 'all', sound: true }
});
let save = load();
let DAYS = loadDays();
function load() {
  const b = blank();
  try {
    const d = JSON.parse(localStorage.getItem(KEYS.save) || 'null');
    if (d && typeof d === 'object') {
      Object.assign(b, d, { stats: Object.assign(b.stats, d.stats), set: Object.assign(b.set, d.set) });
      for (const k of Object.keys(b.box)) if (!QBY[k]) delete b.box[k];
      for (const k of Object.keys(b.pile)) if (!QBY[k]) delete b.pile[k];
    }
  } catch (e) {}
  if (b.set.scope !== 'all' && !SCOPE_SECS[b.set.scope]) b.set.scope = 'all';
  return b;
}
function loadDays() { try { return Object.assign({ last: '', n: 0 }, JSON.parse(localStorage.getItem(KEYS.days) || 'null')); } catch (e) { return { last: '', n: 0 }; } }
function summary() {
  const ks = keyStats('all');
  return {
    xp: save.xp, known: Q.filter(q => (boxOf(q) ?? -1) >= KNOWN).length, total: Q.length,
    keyKnown: ks.known, keyTotal: ks.total, rank: RANKS[rankIdx(save.xp)].n, rounds: save.stats.rounds, last: Date.now()
  };
}
function persist() {
  try {
    localStorage.setItem(KEYS.save, JSON.stringify(save));
    localStorage.setItem(KEYS.progress, JSON.stringify(summary()));
  } catch (e) {}
}

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rankIdx = xp => { let r = 0; RANKS.forEach((x, i) => { if (xp >= x.xp) r = i; }); return r; };
const pool = scope => scope === 'all' ? Q : Q.filter(q => SCOPE_SECS[scope] && SCOPE_SECS[scope].has(q.section));
const boxOf = q => save.box[q.id];
function keyStats(scope) {
  const k = pool(scope).filter(q => q.key), known = k.filter(q => (boxOf(q) ?? -1) >= KNOWN).length;
  return { known, total: k.length, pct: k.length ? known / k.length : 1 };
}
function otherStats(scope) {
  const k = pool(scope).filter(q => !q.key), known = k.filter(q => (boxOf(q) ?? -1) >= KNOWN).length;
  return { known, total: k.length, pct: k.length ? known / k.length : 1 };
}
const phaseOf = scope => keyStats(scope).pct >= UNLOCK ? 2 : 1;
const dayStr = d => { try { return d.toLocaleDateString('en-CA'); } catch (e) { return d.toISOString().slice(0, 10); } };
function touchDay() {
  const t = dayStr(new Date()); if (DAYS.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  DAYS = { last: t, n: DAYS.last === dayStr(y) ? DAYS.n + 1 : 1 };
  try { localStorage.setItem(KEYS.days, JSON.stringify(DAYS)); } catch (e) {}
}

/* ---------- picking questions: key questions come up far more often until they are known ---------- */
function weight(q) {
  const b = boxOf(q);
  let w = b === undefined ? 5 : [6, 3, 1.2, 0.35][b];
  if (save.pile[q.id]) w *= 1.6;
  if (save.recent.includes(q.id)) w *= 0.25;
  return w;
}
function sample(list, n) {
  const out = [], arr = list.slice();
  while (out.length < n && arr.length) {
    const ws = arr.map(weight), sum = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum, i = 0;
    for (; i < arr.length; i++) { r -= ws[i]; if (r <= 0) break; }
    out.push(arr.splice(Math.min(i, arr.length - 1), 1)[0]);
  }
  return out;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function roundPlan(mode, scope, len) {
  const list = pool(scope), keys = list.filter(q => q.key), oth = list.filter(q => !q.key);
  if (mode === 'key') { const n = Math.min(len, keys.length); return { n, nKey: n, nOther: 0 }; }
  const share = phaseOf(scope) === 1 ? 0.8 : 0.3;
  let nKey = Math.min(Math.round(len * share), keys.length);
  const nOther = Math.min(len - nKey, oth.length);
  nKey = Math.min(len - nOther, keys.length);
  return { n: nKey + nOther, nKey, nOther };
}
function buildRound(mode, scope, len) {
  const list = pool(scope);
  if (mode === 'pile') return shuffle(sample(list.filter(q => save.pile[q.id]), len)).map(q => q.id);
  if (mode === 'key') return shuffle(sample(list.filter(q => q.key), len)).map(q => q.id);
  const p = roundPlan('mix', scope, len);
  return shuffle(sample(list.filter(q => q.key), p.nKey).concat(sample(list.filter(q => !q.key), p.nOther))).map(q => q.id);
}

/* ---------- sound, haptics, confetti, toast ---------- */
let ac = null;
function audio() {
  if (!save.set.sound) return null;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; }
}
function blip(f, at, dur, type, vol) {
  const a = audio(); if (!a) return;
  try {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) {}
}
const sfx = {
  ok: k => { blip(523, 0, .12, 'triangle', .14); blip(784, .09, .18, 'triangle', .14); if (k) blip(1046, .2, .24, 'triangle', .12); },
  part: () => { blip(440, 0, .14, 'triangle', .12); blip(523, .1, .18, 'triangle', .1); },
  bad: () => { blip(196, 0, .18, 'sawtooth', .07); blip(147, .12, .28, 'sawtooth', .07); },
  rank: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, i * .1, .28, 'triangle', .14)); },
  star: i => blip(660 + i * 220, 0, .25, 'triangle', .13)
};
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
let toastT = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
}
function confetti() {
  if (reduced()) return;
  const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cs = getComputedStyle(document.documentElement);
  const cols = (SK.confetti || ['--accent', '--accent-hi', '--action', '--ok', '--ink']).map(n => cs.getPropertyValue(n).trim()).filter(Boolean);
  if (!cols.length) cols.push('#ffd166', '#06d6a0', '#118ab2');
  const P = Array.from({ length: 150 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .045; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); });
    if (t - t0 < 3400) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
  })(t0);
}

/* ---------- state + render ---------- */
const app = $('#app');
const S = { screen: 'home', round: null, lib: { q: '', f: 'all', open: {} }, sheet: null, resetAsk: false, lastMode: 'mix' };

function go(screen) { S.screen = screen; S.sheet = null; render(); window.scrollTo(0, 0); }
function render() {
  ({ home: renderHome, play: renderQuiz, summary: renderSummary, lib: renderLib })[S.screen]();
  renderTop(); renderSheet();
}
function renderKidbar() {
  const mark = SCHOOL.logo ? `<img src="${esc(PATHS.root + SCHOOL.logo)}" alt="">` : (IC.mark[SCHOOL.mark] || IC.mark.shield);
  $('#kidbar').innerHTML = `
    <a class="back" href="${esc(PATHS.hub)}">${IC.ui.back}<span>${esc(CFG.subject.name)}</span></a>
    <span class="school" title="${esc(SCHOOL.name)}, ${esc(SCHOOL.city)}">${mark}<span class="st"><b>${esc(SCHOOL.name)}</b><i>${esc(SCHOOL.city)}</i></span></span>`;
}
function renderTop() {
  const sc = S.screen;
  $('#top').innerHTML = `
    <button class="brand" data-act="home" aria-label="${esc(QZ.title)} home"><span class="brand-icon">${IC.brand[SK.brandIcon] || IC.brand.peak}</span><span class="brand-name">${esc(QZ.title)}</span>${SK.glyph ? `<span class="glyph" aria-hidden="true">${SK.glyph}</span>` : ''}</button>
    ${DAYS.n > 0 ? `<span class="chip-top tnum" title="Days in a row you have studied"><span style="color:var(--warn);display:inline-flex">${IC.ui.flame}</span>${DAYS.n}<span class="streak-txt">-day streak</span></span>` : ''}
    <span class="chip-top chip-xp tnum" title="Total XP"><span style="color:var(--accent);display:inline-flex">${IC.ui.star}</span>${fmt(save.xp)} XP</span>
    <button class="icon-btn" data-act="sound" aria-pressed="${save.set.sound}" aria-label="Sound ${save.set.sound ? 'on' : 'off'}">${save.set.sound ? IC.ui.on : IC.ui.off}</button>
    ${sc === 'home' || sc === 'summary' ? `<button class="icon-btn" data-act="lib" aria-label="Open the study library">${IC.ui.book}<span class="lbl-t">Library</span></button>` : ''}`;
}
function renderSheet() {
  const el = $('#sheet-host'); if (el) el.remove();
  if (!S.sheet) return;
  const host = document.createElement('div'); host.id = 'sheet-host';
  if (S.sheet === 'quit') host.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t"><h2 id="sh-t">Leave this round?</h2><p class="muted small">Points you have already earned stay saved.</p><button class="btn primary" data-act="sheet-no">Keep playing</button><button class="btn ghost" data-act="quit-yes">Leave round</button></div></div>`;
  document.body.appendChild(host);
  const b = host.querySelector('.btn'); b && b.focus();
}

/* ---------- home ---------- */
function renderHome() {
  const ri = rankIdx(save.xp), R = RANKS[ri], N = RANKS[ri + 1];
  const prog = N ? (save.xp - R.xp) / (N.xp - R.xp) : 1;
  const scope = save.set.scope, len = save.set.len;
  const ks = keyStats(scope), os = otherStats(scope), ph = phaseOf(scope);
  const pileN = pool(scope).filter(q => save.pile[q.id]).length;
  const plan = roundPlan('mix', scope, len);
  const kAll = keyStats('all'), oAll = otherStats('all');
  const st = save.stats, acc = st.answered ? Math.round(100 * st.correct / st.answered) : 0;
  const sc = (id, label) => `<button class="chip" data-act="scope" data-v="${id}" aria-pressed="${scope === id}">${esc(label)}</button>`;
  const ln = n => `<button class="chip" data-act="len" data-v="${n}" aria-pressed="${len === n}">${n} questions</button>`;
  const cells = list => list.map(q => { const b = boxOf(q); return `<i class="cell ${b === undefined ? '' : 'b' + b}" title="${esc(q.lab)}"></i>`; }).join('');
  const medals = BADGES.map(b => { const on = !!save.badges[b.id]; return `<div class="medal ${on ? '' : 'locked'}"><span class="medal-icon">${IC.ui[b.i]}</span><div><b>${esc(b.n)}</b><span>${esc(b.d)}</span></div></div>`; }).join('');
  const lit = N ? ri + prog : RANKS.length;
  const heroSvg = (HERO[SK.hero] || HERO.mountain)(lit, RANKS.length, `${SK.heroLabel || 'Your progress'}: ${Math.floor(lit)} of ${RANKS.length} steps`);
  const legend = `<div class="legend"><span><i class="sw"></i>Not seen</span><span><i class="sw b0"></i>Missed</span><span><i class="sw b1"></i>Learning</span><span><i class="sw b2"></i>Known</span><span><i class="sw b3"></i>Mastered</span></div>`;
  const kl = esc(PRI.label);
  const meters = HAS_KEY ? `
      <div class="meter"><div class="meter-head"><span>★ ${kl} questions known</span><span class="tnum"><b>${ks.known}</b> / ${ks.total}</span></div>
        <div class="bar ok"><i style="width:${(ks.pct * 100).toFixed(1)}%"></i><span class="tick" style="left:${UNLOCK * 100}%"></span></div></div>
      <div class="meter"><div class="meter-head"><span>Other questions known</span><span class="tnum"><b>${os.known}</b> / ${os.total}</span></div>
        <div class="bar ok"><i style="width:${(os.pct * 100).toFixed(1)}%"></i></div></div>` : `
      <div class="meter"><div class="meter-head"><span>Questions known</span><span class="tnum"><b>${ks.known + os.known}</b> / ${ks.total + os.total}</span></div>
        <div class="bar ok"><i style="width:${(((ks.known + os.known) / Math.max(1, ks.total + os.total)) * 100).toFixed(1)}%"></i></div></div>`;
  const phase = HAS_KEY ? `<div class="phase-note">${ph === 1
    ? `<b>Phase 1: ${kl} Quest.</b> ${esc(PRI.blurb.charAt(0).toUpperCase() + PRI.blurb.slice(1))} come up most often, about ${plan.nKey} of every ${plan.n}, until you know ${Math.round(UNLOCK * 100)}% of them. Then the rest take over.`
    : `<b>Phase 2: Full Campaign.</b> You know the ★ ${kl.toLowerCase()} questions. Now the others lead, with ★ reviews mixed in.`}</div>` : '';
  const maps = HAS_KEY
    ? `<h3><span style="color:var(--ink)">★ ${kl} questions</span><span class="tnum">${kAll.known} / ${kAll.total} known</span></h3><div class="cells">${cells(Q.filter(q => q.key))}</div>
       <h3><span style="color:var(--ink)">Other questions</span><span class="tnum">${oAll.known} / ${oAll.total} known</span></h3><div class="cells">${cells(Q.filter(q => !q.key))}</div>`
    : `<div class="cells" style="margin-top:12px">${cells(Q)}</div>`;
  app.innerHTML = `
  <section class="quiz-home" aria-label="Home">
    <div class="hero">
      <div>
        <p class="eyebrow">${st.rounds ? 'Welcome back' : 'Welcome'}, ${esc(KID.name)}</p>
        <h1 class="rank-name">${esc(R.n)}</h1>
        <p class="muted">${esc(R.d)}</p>
        <div class="meter"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog * 100)}" aria-label="Progress to next rank"><i style="width:${(prog * 100).toFixed(1)}%"></i></div></div>
        <p class="xp-line tnum">${N ? `<b>${fmt(save.xp)} XP</b> · ${fmt(N.xp - save.xp)} to <b>${esc(N.n)}</b>` : `<b>${fmt(save.xp)} XP</b> · Top rank reached`}</p>
      </div>
      <div class="zig">${heroSvg}</div>
    </div>

    <div class="panel play">
      <h2>${esc(LEX.start)}</h2>
      <p class="muted small">Type each answer. You score on every one, and the ones you miss come back at the end.</p>
      ${SCOPES.length > 1 ? `<span class="lbl muted field-label">Topic</span><div class="chips" role="group" aria-label="Topic">${sc('all', 'Everything')}${SCOPES.map(s => sc(s.id, s.name)).join('')}</div>` : ''}
      <span class="lbl muted field-label">Round length</span>
      <div class="chips" role="group" aria-label="Round length">${ln(10)}${ln(20)}${ln(30)}</div>
      ${phase}${meters}
      <div class="play-actions">
        <button class="btn primary big" data-act="start" data-mode="mix">${esc(LEX.start)} ${IC.ui.arrow}</button>
        <div class="row2">
          ${HAS_KEY ? `<button class="btn ghost" data-act="start" data-mode="key">★ ${kl} only</button>` : ''}
          <button class="btn ghost" data-act="start" data-mode="pile" ${pileN ? '' : 'disabled'}>${esc(LEX.pile)}${pileN ? ` (${pileN})` : ''}</button>
        </div>
        ${pileN ? '' : `<p class="muted small" style="text-align:center">Your ${esc(LEX.pile)} fills up with the questions you miss.</p>`}
      </div>
    </div>

    <div class="panel trophy">
      <h2>Trophy shelf</h2>
      <p class="muted small">${Object.keys(save.badges).length} of ${BADGES.length} earned</p>
      <div class="medals">${medals}</div>
    </div>

    <div class="panel mapp mm">
      <h2>Mastery map</h2>
      <p class="muted small">One square per question. Answer correctly twice in separate rounds to know it.</p>
      ${maps}${legend}
    </div>

    <div class="panel statp">
      <h2>Your record</h2>
      <div class="stats tnum">
        <div class="stat"><b>${st.rounds}</b><span>Rounds played</span></div>
        <div class="stat"><b>${acc}%</b><span>Answers correct</span></div>
        <div class="stat"><b>${st.bestStreak}</b><span>Best streak in a row</span></div>
        <div class="stat"><b>${fmt(st.bestScore)}</b><span>Best round score</span></div>
      </div>
      <div class="reset-row">${S.resetAsk
        ? `<span class="small">Erase all XP, badges and progress for this quiz?</span><button class="btn ghost" data-act="reset-yes">Yes, erase</button><button class="btn quiet" data-act="reset-no">Cancel</button>`
        : `<button class="btn quiet" data-act="reset">Reset progress</button>`}</div>
    </div>
  </section>`;
}

/* ---------- a round ---------- */
function startRound(mode, ids, retry) {
  audio();
  const scope = save.set.scope;
  ids = ids || buildRound(mode, scope, save.set.len);
  if (!ids.length) { toast('No questions match that choice yet.'); return; }
  S.lastMode = mode;
  S.round = { mode, retry: !!retry, ids, idx: 0, res: [], score: 0, streak: 0, best: 0, xp0: save.xp, hint: false, answered: false, bonus: 0, stars: 0, badges: [], t: 0 };
  S.screen = 'play'; S.sheet = null; render(); window.scrollTo(0, 0); focusAns();
}
const cur = () => QBY[S.round.ids[S.round.idx]];
function focusAns() { const a = $('#ans'); if (a) { try { a.focus({ preventScroll: true }); } catch (e) { a.focus(); } } }
function pips() {
  const r = S.round;
  return r.ids.map((id, i) => { const x = r.res[i]; const c = x ? (x.kind === 'ok' ? 'ok' : x.kind === 'part' ? 'part' : 'bad') : (i === r.idx ? 'now' : ''); return `<li class="${c}"></li>`; }).join('');
}
function streakHTML() {
  const r = S.round, m = multOf(r.streak);
  return `<div class="streak ${r.streak >= 3 ? 'hot' : ''}" id="streak" aria-label="Streak ${r.streak}, multiplier ${m}">${IC.ui.flame}<b class="tnum">${r.streak}</b><span class="mult">×${m}</span></div>`;
}
function renderQuiz() {
  const r = S.round, q = cur(); r.hint = false; r.answered = false;
  app.innerHTML = `
  <section class="quiz" aria-label="Question ${r.idx + 1} of ${r.ids.length}">
    <div class="hud">
      <button class="icon-btn" data-act="quit" aria-label="Leave round">${IC.ui.close}</button>
      <ol class="pips" id="pips" aria-hidden="true">${pips()}</ol>
      <div class="score"><span class="lbl">Score</span><b id="score">${fmt(r.score)}</b></div>
      ${streakHTML()}
    </div>
    <article class="tablet ${q.key ? 'key' : ''}" id="tablet">
      <div class="tags">
        ${q.key ? `<span class="tag tag-key">${IC.ui.star} ${esc(PRI.label)} question</span>` : ''}
        <span class="tag">${esc(q.secName)}</span>
        <span class="tag">${esc(q.lab)}</span>
        ${r.retry ? '<span class="tag">Replay · half XP</span>' : ''}
      </div>
      <h2 class="qtext" id="qtext">${esc(q.q)}</h2>
      <div class="zone" id="zone">
        <label class="sr-only" for="ans">Your answer</label>
        <textarea id="ans" rows="3" placeholder="Type your answer here" autocomplete="off" autocapitalize="sentences" autocorrect="off" spellcheck="false" enterkeyhint="send"></textarea>
        <p class="hintline" id="hintline" hidden></p>
        <div class="actions" id="actions">
          <button class="btn primary" data-act="check">Check answer</button>
          <button class="btn ghost" data-act="hint" id="hintBtn">${IC.ui.bulb} Hint</button>
          <button class="btn quiet" data-act="skip">I don’t know</button>
        </div>
      </div>
      <div id="fb" role="status"></div>
    </article>
    <p class="round-note tnum">Question ${r.idx + 1} of ${r.ids.length} · ${q.key ? BASE_KEY : BASE_OTHER} points${q.key ? ' (★ ' + esc(PRI.label.toLowerCase()) + ')' : ''}</p>
  </section>`;
}
const pickQ = k => QUIPS[k][Math.floor(Math.random() * QUIPS[k].length)];

function act_check() {
  const r = S.round; if (!r || r.answered) return;
  const q = cur(), ta = $('#ans'), text = ta.value.trim();
  const g = G.grade(q, text);
  if (g.st === 'empty') { ta.classList.remove('nudge'); void ta.offsetWidth; ta.classList.add('nudge'); ta.focus(); return; }
  finalize(q, g.st === 'ok' ? 'ok' : g.st === 'part' ? 'part' : 'bad', text, g);
}
function finalize(q, kind, given, g) {
  const r = S.round; r.answered = true; r.t = Date.now();
  const prev = boxOf(q), snap = { box: prev, pile: save.pile[q.id], streak: r.streak, best: r.best, score: r.score, xp: save.xp };
  const base = q.key ? BASE_KEY : BASE_OTHER, hint = r.hint;
  let pts = 0, mult = 1; const rankBefore = rankIdx(save.xp);
  touchDay();
  if (kind === 'ok') {
    r.streak++; r.best = Math.max(r.best, r.streak); mult = multOf(r.streak);
    pts = Math.round(base * mult * (hint ? .5 : 1));
    if (!hint) { save.box[q.id] = Math.min(3, (prev ?? 0) + 1); if (save.pile[q.id]) { delete save.pile[q.id]; save.stats.redeemed++; } }
    else save.box[q.id] = prev ?? 0;
  } else if (kind === 'part') {
    pts = Math.round(base * .5 * (hint ? .5 : 1));
    save.box[q.id] = Math.min(prev ?? 0, 1); save.pile[q.id] = 1;
  } else {
    r.streak = 0; save.box[q.id] = Math.max(0, (prev ?? 0) - 2); save.pile[q.id] = 1;
  }
  if (r.retry) pts = Math.round(pts * .5);
  r.score += pts; save.xp += pts;
  save.stats.answered++; if (kind === 'ok') save.stats.correct++;
  save.stats.bestStreak = Math.max(save.stats.bestStreak, r.best);
  save.recent.push(q.id); if (save.recent.length > 30) save.recent.shift();
  r.res.push({ id: q.id, kind, given, pts, hint, mult, snap, appeal: false, g });
  awardBadges().forEach(b => { r.badges.push(b.id); toast('Trophy earned: ' + b.n); });
  persist();
  showFeedback(q, r.res[r.res.length - 1]);
  if (rankIdx(save.xp) > rankBefore) setTimeout(() => { toast('Promoted to ' + RANKS[rankIdx(save.xp)].n + '!'); sfx.rank(); confetti(); }, 500);
}
function awardBadges() {
  const got = []; BADGES.forEach(b => { if (!save.badges[b.id] && b.t()) { save.badges[b.id] = Date.now(); got.push(b); } }); return got;
}
function showFeedback(q, res) {
  const r = S.round, kind = res.kind, cls = kind === 'skip' ? 'bad' : kind;
  const tablet = $('#tablet'); tablet.classList.remove('ok', 'part', 'bad'); tablet.classList.add(cls);
  $('#ans').readOnly = true;
  $('#actions').hidden = true; $('#hintline').hidden = true;
  const head = kind === 'ok' ? 'Correct!' : kind === 'part' ? 'Almost!' : kind === 'skip' ? 'Here it is' : 'Not quite';
  const ico = kind === 'ok' ? IC.ui.check : kind === 'part' ? IC.ui.half : IC.ui.cross;
  let chips = '';
  if (res.g && q.slots.length > 1 && (kind === 'part' || kind === 'bad')) {
    chips = q.slots.map((s, i) => res.g.hits[i] ? `<span class="part-chip y">✓ ${esc(s.label)}</span>` : (q.need === q.slots.length ? `<span class="part-chip n">✗ ${esc(s.label)}</span>` : '')).join('');
  }
  const noteBits = [];
  if (kind === 'ok' || kind === 'part') {
    noteBits.push((q.key ? '★ ' + PRI.label + ' ' : '') + (kind === 'part' || res.appeal ? 'half credit' : 'full credit'));
    if (kind === 'ok' && res.mult > 1) noteBits.push('streak ×' + res.mult);
    if (res.hint) noteBits.push('hint −50%');
    if (r.retry) noteBits.push('replay −50%');
  }
  const canAppeal = kind === 'bad' && res.given;
  $('#fb').innerHTML = `
    <div class="fb ${cls}" id="fbbox">
      <div class="verdict">${ico}<span>${head}</span><span class="pts tnum">${res.pts ? '+' + fmt(res.pts) + ' pts' : '+0 pts'}</span></div>
      <p class="quip">${esc(pickQ(kind === 'skip' ? 'skip' : kind))}${noteBits.length ? ` <span class="tnum">(${esc(noteBits.join(' · '))})</span>` : ''}</p>
      ${chips ? `<div class="parts">${chips}</div>` : ''}
      <div class="ans-box"><span class="lbl">The answer</span><p>${esc(q.a)}</p></div>
      ${res.given ? `<p class="given"><span class="lbl">You wrote</span>${esc(res.given)}</p>` : ''}
      <div class="actions">
        <button class="btn primary" data-act="next" id="nextBtn">${r.idx + 1 >= r.ids.length ? 'See results' : 'Continue'} ${IC.ui.arrow}</button>
        ${canAppeal ? `<button class="btn quiet" data-act="appeal">I was right (half points)</button>` : ''}
      </div>
    </div>`;
  updateHud();
  if (kind === 'ok') { sfx.ok(q.key); buzz(18); } else if (kind === 'part') { sfx.part(); } else { sfx.bad(); buzz([40, 40, 40]); }
  $('#nextBtn').focus({ preventScroll: true });
  $('#fbbox').scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
}
function updateHud() {
  const r = S.round;
  $('#pips').innerHTML = pips();
  $('#score').textContent = fmt(r.score);
  const old = $('#streak'), tmp = document.createElement('div'); tmp.innerHTML = streakHTML(); old.replaceWith(tmp.firstElementChild);
  renderTop();
}
function act_hint() {
  const r = S.round; if (!r || r.answered || r.hint) return;
  r.hint = true; const h = $('#hintline'); h.hidden = false; h.textContent = G.hintFor(cur());
  const b = $('#hintBtn'); b.disabled = true; b.innerHTML = IC.ui.bulb + ' Hint used (−50%)'; focusAns();
}
function act_skip() { const r = S.round; if (!r || r.answered) return; finalize(cur(), 'skip', '', null); }
function act_appeal() {
  const r = S.round; if (!r || !r.answered) return;
  const res = r.res[r.res.length - 1]; if (res.kind !== 'bad' || res.appeal || !res.given) return;
  const q = cur(), s = res.snap;
  if (s.box === undefined) delete save.box[q.id]; else save.box[q.id] = s.box;
  if (s.pile) save.pile[q.id] = 1; else delete save.pile[q.id];
  r.streak = s.streak + 1; r.best = Math.max(s.best, r.streak); r.score = s.score; save.xp = s.xp;
  const base = q.key ? BASE_KEY : BASE_OTHER, pts = Math.round(base * .5 * (res.hint ? .5 : 1) * (r.retry ? .5 : 1));
  r.score += pts; save.xp += pts; save.stats.correct++; save.stats.appeals++;
  save.stats.bestStreak = Math.max(save.stats.bestStreak, r.best);
  res.kind = 'ok'; res.appeal = true; res.pts = pts; res.mult = 1;
  persist(); showFeedback(q, res);
  toast('Credit given. Only appeal when you really knew it.');
}
function act_next() {
  const r = S.round; if (!r || !r.answered) return;
  if (Date.now() - r.t < 350) return;
  r.idx++;
  if (r.idx >= r.ids.length) finishRound(); else { renderQuiz(); window.scrollTo(0, 0); focusAns(); }
}
function finishRound() {
  const r = S.round, n = r.res.length, ok = r.res.filter(x => x.kind === 'ok').length;
  const acc = n ? ok / n : 0;
  r.stars = r.retry ? 0 : (acc >= .9 ? 3 : acc >= .7 ? 2 : acc >= .5 ? 1 : 0);
  r.bonus = r.stars * 100; save.xp += r.bonus;
  save.stats.rounds++; save.stats.bestScore = Math.max(save.stats.bestScore, r.score);
  if (!r.retry && n >= 10 && ok === n) save.stats.flawless++;
  awardBadges().forEach(b => r.badges.push(b.id));
  persist();
  S.screen = 'summary'; S.sheet = null; render(); window.scrollTo(0, 0);
  const rankUp = rankIdx(save.xp) > rankIdx(r.xp0);
  if (r.stars >= 2 || rankUp || r.badges.length) setTimeout(confetti, 250);
  if (rankUp) setTimeout(sfx.rank, 300);
  for (let i = 0; i < r.stars; i++) setTimeout(() => sfx.star(i), 500 + i * 260);
}

/* ---------- summary ---------- */
function renderSummary() {
  const r = S.round, n = r.res.length, ok = r.res.filter(x => x.kind === 'ok').length;
  const acc = n ? Math.round(100 * ok / n) : 0;
  const missed = r.res.filter(x => x.kind !== 'ok');
  const keyOk = r.res.filter(x => QBY[x.id].key && x.kind === 'ok').length, keyN = r.res.filter(x => QBY[x.id].key).length;
  const head = r.retry ? (missed.length ? HEADS.replayMissed : HEADS.replayClean)
    : acc === 100 ? HEADS.perfect : acc >= 90 ? HEADS.great : acc >= 70 ? HEADS.good : acc >= 50 ? HEADS.ok : HEADS.low;
  const ri0 = rankIdx(r.xp0), ri1 = rankIdx(save.xp), R = RANKS[ri1], N = RANKS[ri1 + 1];
  const prog = N ? (save.xp - R.xp) / (N.xp - R.xp) : 1;
  const star = on => `<svg viewBox="0 0 24 24" class="${on ? 'star-on' : 'star-off'}" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`;
  const unlocked = r.badges.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
  const appeals = r.res.filter(x => x.appeal).length;
  const missHTML = missed.map(x => { const q = QBY[x.id]; return `
    <li class="miss-item"><div class="tags">${q.key ? `<span class="tag tag-key">${IC.ui.star} ${esc(PRI.label)} question</span>` : ''}<span class="tag">${esc(q.lab)}</span></div>
      <p class="mi-q">${esc(q.q)}</p>
      <p class="mi-a"><span class="lbl">Answer</span>${esc(q.a)}</p>
      ${x.given ? `<p class="mi-g"><span class="lbl">You wrote</span><s>${esc(x.given)}</s></p>` : '<p class="mi-g"><span class="lbl">You skipped this one</span></p>'}
    </li>`; }).join('');
  app.innerHTML = `
  <section class="summary" aria-label="Round results">
    <div class="sum-head">
      <p class="eyebrow">${r.retry ? 'Replay complete' : 'Round complete'}</p>
      <h1>${esc(head)}</h1>
      ${r.retry ? '' : `<div class="stars" role="img" aria-label="${r.stars} of 3 stars">${star(r.stars >= 1)}${star(r.stars >= 2)}${star(r.stars >= 3)}</div>`}
    </div>
    <div class="tiles tnum">
      <div class="tile"><b>${fmt(r.score)}</b><span>Points scored</span></div>
      <div class="tile"><b>${ok}/${n}</b><span>Correct (${acc}%)</span></div>
      <div class="tile"><b>${r.best}</b><span>Best streak</span></div>
      ${HAS_KEY ? `<div class="tile"><b>${keyN ? keyOk + '/' + keyN : '–'}</b><span>★ ${esc(PRI.label)} correct</span></div>` : `<div class="tile"><b>${fmt(r.score + r.bonus)}</b><span>XP earned</span></div>`}
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="meter-head tnum" style="margin-bottom:8px"><span><b>${esc(R.n)}</b></span><span>${N ? `${fmt(N.xp - save.xp)} XP to ${esc(N.n)}` : 'Top rank'}</span></div>
      <div class="bar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
      <p class="xp-line tnum">+${fmt(r.score + r.bonus)} XP this round${r.bonus ? ` (includes +${r.bonus} star bonus)` : ''}${appeals ? ` · ${appeals} appeal${appeals > 1 ? 's' : ''} used` : ''}</p>
    </div>
    ${ri1 > ri0 ? `<div class="banner"><b>Promoted to ${esc(RANKS[ri1].n)}!</b><p class="muted small">${esc(RANKS[ri1].d)}</p></div>` : ''}
    ${unlocked.length ? `<div class="new-badges">${unlocked.map(b => `<div class="banner row"><span class="medal-icon">${IC.ui[b.i]}</span><div><b>Trophy: ${esc(b.n)}</b><p class="muted small">${esc(b.d)}</p></div></div>`).join('')}</div>` : ''}
    <div class="panel review">
      <h2>${missed.length ? `Study these (${missed.length})` : 'Nothing to review'}</h2>
      ${missed.length
        ? `<p class="muted small">Read each answer, then replay them. These are saved in your ${esc(LEX.pile)} until you get them right.</p><ul class="miss">${missHTML}</ul>`
        : `<div class="clean">Clean sheet. Every answer was right.</div>`}
    </div>
    <div class="sum-actions">
      ${missed.length ? `<button class="btn primary big" data-act="replay">Replay the ${missed.length} I missed ${IC.ui.arrow}</button>` : ''}
      <div class="row2">
        <button class="btn ${missed.length ? 'ghost' : 'primary'}" data-act="again">Next round</button>
        <button class="btn ghost" data-act="home">Home</button>
      </div>
    </div>
  </section>`;
}

/* ---------- library ---------- */
function libItems() {
  const L = S.lib, qs = L.q.trim().toLowerCase();
  return Q.filter(q => {
    if (L.f === 'key' && !q.key) return false;
    if (L.f === 'pile' && !save.pile[q.id]) return false;
    if (L.f === 'known' && !((boxOf(q) ?? -1) >= KNOWN)) return false;
    if (qs && !(q.q + ' ' + q.a + ' ' + q.lab).toLowerCase().includes(qs)) return false;
    return true;
  });
}
function libListHTML() {
  const items = libItems(); if (!items.length) return '<li class="empty">No questions match.</li>';
  return items.map(q => {
    const b = boxOf(q), open = !!S.lib.open[q.id];
    return `<li class="lib-item"><button class="lib-q" data-act="toggle" data-id="${q.id}" aria-expanded="${open}"><i class="dot ${b === undefined ? '' : 'b' + b}"></i><span class="lib-text"><small>${q.key ? `<span class="k">★ ${esc(PRI.label)}</span>` : ''}<span>${esc(q.lab)}</span></small><span>${esc(q.q)}</span></span>${IC.ui.chev}</button><div class="lib-a" ${open ? '' : 'hidden'}>${esc(q.a)}</div></li>`;
  }).join('');
}
function renderLib() {
  const L = S.lib, f = (id, label) => `<button class="chip" data-act="libf" data-v="${id}" aria-pressed="${L.f === id}">${label}</button>`;
  const pileN = Q.filter(q => save.pile[q.id]).length;
  app.innerHTML = `
  <section class="lib" aria-label="Study library">
    <h1>Study Library</h1>
    <p class="muted">All ${Q.length} questions with their answers. Tap one to see the answer.</p>
    <div class="lib-tools">
      <label class="sr-only" for="libq">Search questions</label>
      <input id="libq" type="search" placeholder="Search questions and answers" autocomplete="off" value="${esc(L.q)}">
      <div class="chips" role="group" aria-label="Filter">${f('all', 'All')}${HAS_KEY ? f('key', '★ ' + esc(PRI.label)) : ''}${f('pile', esc(LEX.pile) + ' (' + pileN + ')')}${f('known', 'Known')}</div>
    </div>
    <ul class="lib-list" id="liblist">${libListHTML()}</ul>
    <div class="sum-actions"><button class="btn primary" data-act="home">Back to the game</button></div>
  </section>`;
}

/* ---------- events ---------- */
const ACT = {
  home: () => { if (S.screen === 'play') { S.sheet = 'quit'; renderSheet(); } else go('home'); },
  lib: () => go('lib'),
  sound: () => { save.set.sound = !save.set.sound; persist(); if (save.set.sound) { audio(); sfx.ok(false); } renderTop(); },
  scope: d => { save.set.scope = d.v; persist(); renderHome(); },
  len: d => { save.set.len = +d.v; persist(); renderHome(); },
  start: d => startRound(d.mode, null, false),
  check: act_check, hint: act_hint, skip: act_skip, appeal: act_appeal, next: act_next,
  quit: () => { S.sheet = 'quit'; renderSheet(); },
  'sheet-no': () => { S.sheet = null; renderSheet(); focusAns(); },
  'quit-yes': () => go('home'),
  replay: () => { const ids = shuffle(S.round.res.filter(x => x.kind !== 'ok').map(x => x.id)); startRound('retry', ids, true); },
  again: () => startRound(S.lastMode === 'retry' ? 'mix' : S.lastMode, null, false),
  toggle: d => { S.lib.open[d.id] = !S.lib.open[d.id]; $('#liblist').innerHTML = libListHTML(); },
  libf: d => { S.lib.f = d.v; renderLib(); },
  reset: () => { S.resetAsk = true; renderHome(); },
  'reset-no': () => { S.resetAsk = false; renderHome(); },
  'reset-yes': () => { save = blank(); persist(); S.resetAsk = false; render(); }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const f = ACT[b.dataset.act]; if (f) { audio(); f(b.dataset); }
});
document.addEventListener('keydown', e => {
  if (e.target && e.target.id === 'ans' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); act_check(); }
  if (e.key === 'Escape' && S.sheet) { S.sheet = null; renderSheet(); }
});
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'libq') { S.lib.q = e.target.value; $('#liblist').innerHTML = libListHTML(); }
});

/* ---------- boot ---------- */
if (SK.glyph && SK.glyphFont) {
  try {
    document.fonts.load('20px "' + SK.glyphFont + '"', SK.glyph).then(f => { if (f && f.length) document.documentElement.classList.add('glyph-ok'); }).catch(() => {});
  } catch (e) {}
}
$('#foot').innerHTML = esc((QZ.source ? 'Built from ' + QZ.source + '. ' : '') + 'Progress is saved on this device.') + '<br>Home-made study tools. Not an official school website.';
window.QE = { Q, QBY, grade: G.grade, buildRound, roundPlan, get save() { return save; }, S, startRound, keyStats, phaseOf, RANKS, BADGES };
renderKidbar();
render();
})();
