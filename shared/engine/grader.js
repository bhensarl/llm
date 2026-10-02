/*
 * Quest Hall answer grader.
 * Runs in the browser (window.QuestGrader) and in Node (require) so the repo's tests
 * check the exact code the kids use.
 *
 * Answer key language (the "k" field of a question):
 *   parts are separated by  &      every part is needed (unless "need" says otherwise)
 *   wordings are separated by |    any one wording satisfies that part
 *   "Label::wordings"              names a part so feedback can say "✗ Euphrates"
 *   a word ending in !             must be spelled exactly (plural endings still OK)
 *
 * Spelling is forgiven: one slip for words of 5-8 letters, two for longer words, none for
 * 4 letters or fewer. Plurals and common endings are accepted. Small filler words are ignored.
 */
(function (root) {
  'use strict';

  var STOP = new Set(['the','a','an','of','to','in','on','is','was','it','he','she','his','her','they','their','by','for','with','as','at','that','this','be','been','and','or','are','were','from','its','then','so','i','my','me','you','your','we','our','um','uh','also','had','has','have','did','do','does']);
  var NUMW = {one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12',twenty:'20',sixty:'60'};

  function toks(s) {
    s = String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/(\d),(\d{3})/g, '$1$2').replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    return s ? s.split(' ').filter(function (t) { return t && !STOP.has(t); }).map(function (t) { return NUMW[t] || t; }) : [];
  }

  // Damerau-Levenshtein: swapping two neighbouring letters counts as one slip.
  function dl(a, b) {
    var m = a.length, n = b.length, i, j, d = [];
    if (!m) return n; if (!n) return m;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }

  // Does the typed word u match the answer word k?
  function tokMatch(u, k) {
    if (k[0] === '=') { k = k.slice(1); return u === k || (u.indexOf(k) === 0 && u.length - k.length <= 4); }
    if (u === k) return true;
    var lk = k.length, lu = u.length;
    if (lk <= 3 || lu <= 3 || /^\d+$/.test(k) || /^\d+$/.test(u)) return false;
    if (lk >= 4 && u.indexOf(k) === 0 && lu - lk <= 5) return true;
    if (lu >= 5 && k.indexOf(u) === 0 && lk - lu <= 2) return true;
    var tol = lk <= 4 ? 0 : lk <= 8 ? 1 : 2;
    return tol > 0 && Math.abs(lu - lk) <= tol && dl(u, k) <= tol;
  }

  function cap(s) { return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  function parseKey(spec) {
    return String(spec).split('&').map(function (part) {
      var label = null, bits = part.split('::');
      if (bits.length === 2) { label = bits[0].trim(); part = bits[1]; }
      var alts = part.split('|').map(function (a) {
        var out = [];
        a.trim().split(/\s+/).forEach(function (w) {
          var exact = w.charAt(w.length - 1) === '!';
          toks(w).forEach(function (t) { out.push(exact ? '=' + t : t); });
        });
        return out;
      }).filter(function (a) { return a.length; });
      return { label: label || (alts.length ? cap(alts[0].join(' ').replace(/=/g, '')) : ''), alts: alts };
    });
  }

  // Turn a quiz.json object into ready-to-play question objects.
  function compile(quiz) {
    var secs = {};
    (quiz.sections || []).forEach(function (s) { secs[s.id] = s; });
    return quiz.questions.map(function (r) {
      var slots = parseKey(r.k);
      var sec = secs[r.section] || { id: r.section, name: r.section, tag: r.section };
      var extra = (r.also || []).map(function (n) { return ' · Q' + n; }).join('');
      return {
        id: r.id, section: r.section, secName: sec.name, num: r.num, key: !!r.key,
        q: r.q, a: r.a, slots: slots, need: r.need || slots.length,
        lab: sec.tag + ' Q' + r.num + extra
      };
    });
  }

  // Grade typed text against a compiled question: {st:'ok'|'part'|'bad'|'empty', hits, n}
  function grade(q, raw) {
    var u = toks(raw);
    if (!u.length) return { st: 'empty' };
    var hits = q.slots.map(function (s) {
      return s.alts.some(function (alt) { return alt.every(function (k) { return u.some(function (t) { return tokMatch(t, k); }); }); });
    });
    var n = hits.filter(Boolean).length;
    if (n >= q.need) return { st: 'ok', hits: hits, n: n };
    if (q.need >= 2 && n >= Math.ceil(q.need / 2)) return { st: 'part', hits: hits, n: n };
    return { st: 'bad', hits: hits, n: n };
  }

  // A gentle hint: letter shapes for short answers, the first words for long ones.
  function hintFor(q) {
    var core = q.a.split(/ \(|\. |; |: /)[0].trim();
    var words = core.split(/\s+/);
    if (words.length <= 4) {
      return words.map(function (w) {
        return w.charAt(0) + ' ' + new Array(Math.max(0, Math.min(w.length - 1, 10)) + 1).join('_').split('').join(' ');
      }).join('   ');
    }
    return 'Starts with: “' + words.slice(0, 3).join(' ') + ' …”';
  }

  var api = { toks: toks, tokMatch: tokMatch, parseKey: parseKey, compile: compile, grade: grade, hintFor: hintFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QuestGrader = api;
})(typeof window !== 'undefined' ? window : globalThis);
