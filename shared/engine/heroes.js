/*
 * Progress "hero" pictures for quizzes. Each takes (lit, n, label):
 *   lit   how far along, in steps, 0..n (fractions fill part of a step)
 *   n     number of steps (ranks)
 *   label accessible description
 * Colours come from CSS variables (--hero-*), so every kid theme and quiz "world" can restyle them.
 */
(function (root) {
  'use strict';
  var W = 360, H = 262;
  function v(name, fallback) { return 'var(' + name + ',' + fallback + ')'; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function open(label, id) {
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + '"><defs>' +
      '<linearGradient id="' + id + 'L" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + v('--hero-lit-1', '#F7D98B') + '"/><stop offset="1" style="stop-color:' + v('--hero-lit-2', '#B9822C') + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'D" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + v('--hero-dim-1', '#1B3A86') + '"/><stop offset="1" style="stop-color:' + v('--hero-dim-2', '#12285F') + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'S" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + v('--hero-stair-1', '#F2E2BD') + '"/><stop offset="1" style="stop-color:' + v('--hero-stair-2', '#C9AE78') + '"/></linearGradient>' +
      '</defs>';
  }

  /* ---------- Ziggurat: stepped tiers fill with gold, a climber on the stairs ---------- */
  function ziggurat(lit, n, label) {
    var TH = 25, base = H - 12, s = open(label, 'zg');
    s += '<ellipse cx="' + W / 2 + '" cy="' + (base + 6) + '" rx="170" ry="7" fill="rgba(0,0,0,.35)"/>';
    for (var i = 0; i < n; i++) {
      var w = 336 - i * Math.min(38, 300 / n), x = (W - w) / 2, y = base - TH * (i + 1), f = clamp(lit - i, 0, 1);
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + TH + '" rx="3" fill="url(#zgD)" style="stroke:' + v('--hero-dim-stroke', '#2A4CA3') + '" stroke-width="1.2"/>';
      if (f > 0) {
        s += '<clipPath id="zc' + i + '"><rect x="' + x + '" y="' + y + '" width="' + (w * f).toFixed(1) + '" height="' + TH + '"/></clipPath>';
        s += '<rect class="' + (f < 1 ? 'now-tier' : '') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + TH + '" rx="3" fill="url(#zgL)" style="stroke:' + v('--hero-lit-stroke', '#8C5F1B') + '" stroke-width="1.2" clip-path="url(#zc' + i + ')"/>';
      }
      var d = 'M' + x + ' ' + (y + TH / 2) + 'H' + (x + w), j;
      for (j = 14; j < w; j += 28) d += 'M' + (x + j) + ' ' + y + 'V' + (y + TH / 2);
      for (j = 28; j < w; j += 28) d += 'M' + (x + j) + ' ' + (y + TH / 2) + 'V' + (y + TH);
      s += '<path d="' + d + '" style="stroke:' + v('--hero-joint', 'rgba(10,20,49,.38)') + '" stroke-width="1" fill="none"/>';
    }
    var topY = base - TH * n, full = lit >= n;
    s += '<rect x="' + (W / 2 - 26) + '" y="' + (topY - 22) + '" width="52" height="22" rx="2" fill="' + (full ? 'url(#zgL)' : 'url(#zgD)') + '" style="stroke:' + (full ? v('--hero-lit-stroke', '#8C5F1B') : v('--hero-dim-stroke', '#2A4CA3')) + '" stroke-width="1.2"/>';
    s += '<path d="M' + (W / 2 - 32) + ' ' + (topY - 22) + 'H' + (W / 2 + 32) + 'L' + (W / 2) + ' ' + (topY - 40) + 'z" style="fill:' + (full ? v('--hero-lit-1', '#F7D98B') : v('--hero-dim-1', '#1B3A86')) + ';stroke:' + (full ? v('--hero-lit-stroke', '#8C5F1B') : v('--hero-dim-stroke', '#2A4CA3')) + '" stroke-width="1.2"/>';
    s += '<rect x="' + (W / 2 - 5) + '" y="' + (topY - 14) + '" width="10" height="14" rx="2" style="fill:' + v('--hero-ink', '#0A1431') + '"/>';
    s += '<path d="M' + (W / 2 - 17) + ' ' + base + 'L' + (W / 2 - 6) + ' ' + topY + 'H' + (W / 2 + 6) + 'L' + (W / 2 + 17) + ' ' + base + 'z" fill="url(#zgS)" style="stroke:' + v('--hero-stair-stroke', '#8C6B2F') + '" stroke-width="1"/>';
    var st = '';
    for (var k = 1; k <= n * 2; k++) { var yy = base - k * (TH / 2), hw = 17 - 11 * ((base - yy) / (base - topY)); st += 'M' + (W / 2 - hw) + ' ' + yy + 'H' + (W / 2 + hw); }
    s += '<path d="' + st + '" stroke="rgba(90,60,20,.45)" stroke-width="1" fill="none"/>';
    var ci = Math.min(Math.floor(lit), n - 1), cy = base - TH * (ci + 0.5) - (full ? TH * 0.5 + 10 : 0);
    s += '<circle cx="' + W / 2 + '" cy="' + cy + '" r="8" style="fill:' + v('--hero-ink', '#0A1431') + ';stroke:' + v('--hero-lit-1', '#F7D98B') + '" stroke-width="2.5"/><circle cx="' + W / 2 + '" cy="' + cy + '" r="3" style="fill:' + v('--hero-lit-1', '#F7D98B') + '"/>';
    return s + '</svg>';
  }

  /* ---------- Mountain: switchback trail with camps, a flag at the summit ---------- */
  function mountain(lit, n, label) {
    var base = H - 16, sx = 78, ex = 214, ey = 58, s = open(label, 'mt'), i, P = [];
    for (i = 0; i <= n; i++) {
      var t = i / n; P.push([sx + (ex - sx) * t + (i > 0 && i < n ? (i % 2 ? -16 : 16) : 0), base - 6 + (ey - (base - 6)) * t]);
    }
    s += '<ellipse cx="' + W / 2 + '" cy="' + (base + 6) + '" rx="165" ry="7" fill="rgba(0,0,0,.3)"/>';
    s += '<polygon points="18,' + base + ' 112,112 160,' + base + '" fill="url(#mtD)" opacity=".75" style="stroke:' + v('--hero-dim-stroke', '#2A4CA3') + '" stroke-width="1.2"/>';
    s += '<polygon points="60,' + base + ' 214,34 342,' + base + '" fill="url(#mtD)" style="stroke:' + v('--hero-dim-stroke', '#2A4CA3') + '" stroke-width="1.5" stroke-linejoin="round"/>';
    s += '<polygon points="214,34 189,78 203,70 214,84 226,68 240,78" style="fill:' + v('--hero-snow', '#F3EEDD') + '" opacity=".92"/>';
    var path = P.map(function (p, k) { return (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
    s += '<path d="' + path + '" fill="none" style="stroke:' + v('--hero-dim-stroke', '#2A4CA3') + '" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" stroke-linejoin="round"/>';
    var k = clamp(Math.floor(lit), 0, n - 1), f = lit >= n ? 1 : lit - k, a = P[k], b = P[k + 1];
    var cx = a[0] + (b[0] - a[0]) * f, cy = a[1] + (b[1] - a[1]) * f, litPath = '', m;
    for (m = 0; m <= k; m++) litPath += (m ? 'L' : 'M') + P[m][0].toFixed(1) + ' ' + P[m][1].toFixed(1);
    litPath += 'L' + cx.toFixed(1) + ' ' + cy.toFixed(1);
    if (lit > 0) s += '<path class="' + (lit < n ? 'now-tier' : '') + '" d="' + litPath + '" fill="none" style="stroke:' + v('--hero-lit-1', '#F7D98B') + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    for (i = 0; i <= n; i++) s += '<circle cx="' + P[i][0].toFixed(1) + '" cy="' + P[i][1].toFixed(1) + '" r="' + (i === n ? 5 : 4) + '" style="fill:' + (i <= lit ? v('--hero-lit-1', '#F7D98B') : v('--hero-dim-2', '#12285F')) + ';stroke:' + v('--hero-dim-stroke', '#2A4CA3') + '" stroke-width="1.5"/>';
    // summit flag
    s += '<path d="M' + ex + ' ' + ey + 'V' + (ey - 34) + '" style="stroke:' + v('--hero-snow', '#F3EEDD') + '" stroke-width="2.5" stroke-linecap="round"/>';
    s += '<path d="M' + ex + ' ' + (ey - 34) + 'L' + (ex + 26) + ' ' + (ey - 26) + 'L' + ex + ' ' + (ey - 16) + 'z" style="fill:' + (lit >= n ? v('--hero-lit-1', '#F7D98B') : v('--hero-dim-2', '#12285F')) + ';stroke:' + v('--hero-lit-stroke', '#8C5F1B') + '" stroke-width="1.2" stroke-linejoin="round"/>';
    s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="8" style="fill:' + v('--hero-ink', '#0A1431') + ';stroke:' + v('--hero-lit-1', '#F7D98B') + '" stroke-width="2.5"/><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3" style="fill:' + v('--hero-lit-1', '#F7D98B') + '"/>';
    return s + '</svg>';
  }

  /* ---------- Garden: a flower whose petals light up one by one ---------- */
  function garden(lit, n, label) {
    var s = open(label, 'gd'), cx = W / 2, cy = 100, i, leaf = v('--hero-leaf', '#3DB37A'), leafDeep = v('--hero-leaf-deep', '#2A8F5E');
    s += '<ellipse cx="' + cx + '" cy="' + (H - 6) + '" rx="150" ry="16" style="fill:' + v('--hero-dim-1', '#D9CCFF') + '" opacity=".8"/>';
    s += '<path d="M' + cx + ' ' + (H - 14) + 'C' + (cx - 10) + ' 200 ' + (cx + 12) + ' 160 ' + cx + ' ' + (cy + 24) + '" fill="none" stroke="' + leaf + '" stroke-width="7" stroke-linecap="round"/>';
    s += '<path d="M' + cx + ' 196C' + (cx - 30) + ' 196 ' + (cx - 58) + ' 176 ' + (cx - 62) + ' 152C' + (cx - 34) + ' 150 ' + (cx - 8) + ' 168 ' + cx + ' 196z" fill="' + leaf + '" stroke="' + leafDeep + '" stroke-width="1.5"/>';
    s += '<path d="M' + cx + ' 176C' + (cx + 28) + ' 176 ' + (cx + 54) + ' 158 ' + (cx + 60) + ' 134C' + (cx + 32) + ' 132 ' + (cx + 8) + ' 148 ' + cx + ' 176z" fill="' + leaf + '" stroke="' + leafDeep + '" stroke-width="1.5"/>';
    for (i = 0; i < n; i++) {
      var ang = i * 360 / n, f = clamp(lit - i, 0, 1), on = f > 0;
      s += '<g transform="rotate(' + ang.toFixed(1) + ' ' + cx + ' ' + cy + ')"><ellipse class="' + (f > 0 && f < 1 ? 'now-tier' : '') + '" cx="' + cx + '" cy="' + (cy - 40) + '" rx="' + Math.min(19, 150 / n) + '" ry="34" fill="' + (on ? 'url(#gdL)' : 'url(#gdD)') + '" opacity="' + (on ? (0.45 + 0.55 * f).toFixed(2) : '.55') + '" style="stroke:' + (on ? v('--hero-lit-stroke', '#C2307A') : v('--hero-dim-stroke', '#B7A6F5')) + '" stroke-width="1.5"/></g>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="21" style="fill:' + (lit >= n ? v('--hero-center', '#FFC93C') : v('--hero-dim-2', '#EFE8FF')) + ';stroke:' + (lit >= n ? v('--hero-lit-stroke', '#C2307A') : v('--hero-dim-stroke', '#B7A6F5')) + '" stroke-width="2"/>';
    if (lit >= n) s += '<g style="fill:' + v('--hero-center', '#FFC93C') + '"><path d="M42 54l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M312 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M300 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>';
    return s + '</svg>';
  }

  root.QuestHeroes = { ziggurat: ziggurat, mountain: mountain, garden: garden };
})(typeof window !== 'undefined' ? window : globalThis);
