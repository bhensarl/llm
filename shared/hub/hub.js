/*
 * Quest Hall kid hub: subjects, then quizzes and apps.
 * Reads the JSON the build inlines into #qh-config:
 *   kid, school, hubTitle, tagline, ranks, brandIcon, subjects[], apps[], paths
 * Progress comes from localStorage summaries the quiz engine writes (qh:progress:<kid>:<subject>:<slug>).
 * Routes are hash based so every page works from a plain static host:  #/  (subjects)   #/history  (a subject)
 */
(function () {
'use strict';

const CFG = JSON.parse(document.getElementById('qh-config').textContent);
const IC = window.QH_ICONS;
const KID = CFG.kid, SCHOOL = CFG.school;
const view = document.getElementById('view');
const heroEl = document.getElementById('hub-hero');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');

function progressOf(app) {
  try { return JSON.parse(localStorage.getItem('qh:progress:' + KID.id + ':' + app.subject + ':' + app.slug) || 'null'); } catch (e) { return null; }
}
function daysOf() {
  try { const d = JSON.parse(localStorage.getItem('qh:days:' + KID.id) || 'null'); return d && d.n ? d : { n: 0, last: '' }; } catch (e) { return { n: 0, last: '' }; }
}
function ago(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago';
}
const subjectById = id => CFG.subjects.find(s => s.id === id);
const appsIn = id => CFG.apps.filter(a => a.subject === id);

function totals() {
  let xp = 0, known = 0, total = 0, played = 0, last = null;
  CFG.apps.forEach(a => {
    const p = progressOf(a); total += a.questions || 0;
    if (!p) return;
    xp += p.xp || 0; known += p.known || 0; played++;
    if (!last || p.last > last.p.last) last = { a, p };
  });
  return { xp, known, total, played, last };
}
function rankFor(xp) {
  let r = 0; CFG.ranks.forEach((x, i) => { if (xp >= x.xp) r = i; });
  return r;
}

function renderHero() {
  const t = totals(), ri = rankFor(t.xp), R = CFG.ranks[ri], N = CFG.ranks[ri + 1];
  const prog = N ? (t.xp - R.xp) / (N.xp - R.xp) : 1, days = daysOf();
  const stale = days.last && (Date.now() - new Date(days.last + 'T12:00:00').getTime()) > 2 * 86400000;
  const cont = t.last ? `
    <a class="continue" href="${esc(t.last.a.href)}">
      <span class="continue-play">${IC.ui.play}</span>
      <span class="continue-text"><small>Continue</small><b>${esc(t.last.a.title)}</b><i>${esc((subjectById(t.last.a.subject) || {}).name || '')} · ${t.last.p.known}/${t.last.p.total} known · played ${ago(t.last.p.last)}</i></span>
      ${IC.ui.arrow}
    </a>` : `<p class="hub-nudge">${esc(CFG.tagline)}</p>`;
  heroEl.innerHTML = `
    <div class="lvl">
      <p class="eyebrow">Level ${ri + 1}</p>
      <h2 class="lvl-name">${esc(R.n)}</h2>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog * 100)}" aria-label="Progress to the next level"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
      <p class="xp-line tnum">${N ? `<b>${fmt(t.xp)} XP</b> · ${fmt(N.xp - t.xp)} to ${esc(N.n)}` : `<b>${fmt(t.xp)} XP</b> · Top level`}</p>
    </div>
    <div class="hub-stats tnum">
      <div class="stat"><b>${fmt(t.known)}</b><span>Questions known</span></div>
      <div class="stat"><b>${stale ? 0 : days.n}</b><span>Day streak</span></div>
      <div class="stat"><b>${t.played}</b><span>Quizzes played</span></div>
    </div>
    ${cont}`;
}

function subjectsView() {
  const tiles = CFG.subjects.map(s => {
    const apps = appsIn(s.id), n = apps.length;
    let known = 0, total = 0;
    apps.forEach(a => { total += a.questions || 0; const p = progressOf(a); if (p) known += p.known || 0; });
    const pct = total ? Math.round(100 * known / total) : 0;
    return `
      <a class="panel subject-tile ${n ? '' : 'empty'}" href="#/${esc(s.id)}" style="--h:${s.hue || 210}" aria-label="${esc(s.name)}: ${n ? n + (n === 1 ? ' quiz' : ' quizzes') : 'coming soon'}">
        <span class="ico">${IC.subject[s.icon] || IC.subject.general}</span>
        <span class="st-body">
          <b>${esc(s.name)}</b>
          <span class="st-blurb">${esc(s.blurb || '')}</span>
          <span class="st-meta">${n ? `${n} ${n === 1 ? 'quiz' : 'quizzes'}${total ? ` · ${pct}% known` : ''}` : 'Coming soon'}</span>
        </span>
        ${n && total ? `<span class="bar st-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ''}
      </a>`;
  }).join('');
  view.innerHTML = `
    <section aria-label="Subjects">
      <h1 class="view-h">Pick a subject</h1>
      <div class="subject-grid">${tiles}</div>
    </section>`;
}

function appCard(a) {
  const p = progressOf(a), pct = p && p.total ? Math.round(100 * p.known / p.total) : 0;
  return `
    <a class="panel app-card" href="${esc(a.href)}">
      <span class="app-main">
        <b class="app-title">${esc(a.title)}${a.sample ? ' <em class="pill">Sample</em>' : ''}</b>
        <span class="app-blurb">${esc(a.blurb || '')}</span>
        <span class="app-meta tnum">
          ${a.questions ? `<span class="pill soft">${a.questions} questions</span>` : ''}
          ${a.keyQuestions ? `<span class="pill soft">★ ${a.keyQuestions} ${esc((a.priorityLabel || 'key').toLowerCase())}</span>` : ''}
          ${(a.tags || []).filter(t => t !== 'Sample').map(t => `<span class="pill soft">${esc(t)}</span>`).join('')}
        </span>
        ${p ? `<span class="app-prog tnum"><span class="bar ok" aria-hidden="true"><i style="width:${pct}%"></i></span><span>${p.known} of ${p.total} known · ${esc(p.rank || '')} · played ${ago(p.last)}</span></span>` : '<span class="app-prog muted">Not played yet</span>'}
      </span>
      <span class="btn primary app-go">${IC.ui.play}<span>${p ? 'Play again' : 'Play'}</span></span>
    </a>`;
}

function subjectView(id) {
  const s = subjectById(id);
  if (!s) { location.hash = '#/'; return; }
  const apps = appsIn(id).slice().sort((a, b) => (a.order || 50) - (b.order || 50) || String(b.added).localeCompare(String(a.added)));
  view.innerHTML = `
    <section aria-label="${esc(s.name)}">
      <a class="crumb" href="#/">${IC.ui.back}<span>All subjects</span></a>
      <div class="view-head" style="--h:${s.hue || 210}"><span class="ico">${IC.subject[s.icon] || IC.subject.general}</span><div><h1 class="view-h">${esc(s.name)}</h1><p class="muted">${esc(s.blurb || '')}</p></div></div>
      ${apps.length ? `<div class="app-list">${apps.map(appCard).join('')}</div>`
        : `<div class="panel empty-note"><b>Nothing here yet.</b><p class="muted">When a new ${esc(s.name.toLowerCase())} study guide arrives, its quiz will show up right here.</p></div>`}
    </section>`;
}

function route() {
  const m = location.hash.match(/^#\/([a-z0-9-]+)/);
  if (m) subjectView(m[1]); else subjectsView();
  renderHero();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
// coming back with the phone's back button restores the page from cache: refresh progress
window.addEventListener('pageshow', e => { if (e.persisted) route(); });
document.getElementById('hub-brand-icon').innerHTML = IC.brand[CFG.brandIcon] || IC.brand.peak;
document.getElementById('hub-switch-icon').innerHTML = IC.ui.swap;
const mark = SCHOOL.logo ? `<img src="${esc(CFG.paths.root + SCHOOL.logo)}" alt="">` : (IC.mark[SCHOOL.mark] || IC.mark.shield);
document.getElementById('hub-school').innerHTML = `${mark}<span class="st"><b>${esc(SCHOOL.name)}</b><i>${esc(SCHOOL.city)}</i></span>`;
route();
})();
