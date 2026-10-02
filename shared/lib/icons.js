/*
 * Quest Hall icons. Every icon is inline SVG that inherits the text colour (currentColor),
 * so each kid's theme recolours them automatically.
 *   QH_ICONS.ui[name]       small interface icons
 *   QH_ICONS.brand[name]    little mark shown next to a quiz title (zig, peak, flower)
 *   QH_ICONS.subject[name]  one per school subject
 *   QH_ICONS.mark[name]     generic school marks (placeholders, not official logos)
 */
(function (root) {
  'use strict';
  function stroke(body, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>'; }
  function fill(body) { return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + body + '</svg>'; }

  var ui = {
    star: fill('<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/>'),
    flame: fill('<path d="M12 2.2c.6 2.6 2.1 3.8 3.4 5.4 1.2 1.5 2 3 2 4.9a5.4 5.4 0 0 1-10.8 0c0-1.6.6-2.9 1.6-4 .3 1.1.9 1.7 1.7 2C9.6 8 10.3 5 12 2.2z"/>'),
    check: stroke('<path d="M4 12.5l5 5L20 6.5"/>', 3),
    cross: stroke('<path d="M6 6l12 12M18 6L6 18"/>', 3),
    half: stroke('<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>', 2.6),
    crown: fill('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/>'),
    bulb: stroke('<path d="M9 21h6M10 18h4M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 2V16h5.4v-.2c0-.8.3-1.5.9-2A6 6 0 0 0 12 3z"/>'),
    arrow: stroke('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.6),
    back: stroke('<path d="M15 5l-7 7 7 7"/>', 2.6),
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    book: stroke('<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5z"/><path d="M6 21h13"/>'),
    on: stroke('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
    off: stroke('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
    close: stroke('<path d="M6 6l12 12M18 6L6 18"/>', 2.6),
    swap: stroke('<path d="M7 7h12l-3-3M17 17H5l3 3"/>', 2.2),
    play: fill('<path d="M7 4.5v15l13-7.5z"/>')
  };

  var brand = {
    zig: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="24" width="28" height="6" rx="1.5" fill="#E4B14E"/><rect x="6" y="18" width="20" height="6" rx="1.5" fill="#F7D98B"/><rect x="10" y="12" width="12" height="6" rx="1.5" fill="#E4B14E"/><rect x="13" y="6" width="6" height="6" rx="1.5" fill="#F7D98B"/></svg>',
    peak: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 28L12 10l5 8 4-6 9 16z" fill="currentColor"/><path d="M12 10l-3 5 3-1.5 2 2z" fill="#fff" opacity=".85"/></svg>',
    flower: '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><ellipse cx="16" cy="8" rx="4" ry="6.5"/><ellipse cx="16" cy="8" rx="4" ry="6.5" transform="rotate(72 16 15)"/><ellipse cx="16" cy="8" rx="4" ry="6.5" transform="rotate(144 16 15)"/><ellipse cx="16" cy="8" rx="4" ry="6.5" transform="rotate(216 16 15)"/><ellipse cx="16" cy="8" rx="4" ry="6.5" transform="rotate(288 16 15)"/></g><circle cx="16" cy="15" r="4" fill="#FFC93C"/></svg>'
  };

  var subject = {
    history: stroke('<path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M3 10l9-6 9 6z"/>'),
    math: stroke('<path d="M4.5 7h7M8 3.5v7"/><path d="M14.5 7h6"/><path d="M5 14l6 6M11 14l-6 6"/><path d="M14.5 15h6M14.5 19h6"/>'),
    science: stroke('<path d="M9 3h6M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7.5 15h9"/>'),
    bible: stroke('<path d="M5 4a2 2 0 0 1 2-2h12v18H7a2 2 0 0 0-2 2z"/><path d="M13 6v8M10 9h6"/>'),
    latin: stroke('<path d="M4 21V11a8 8 0 0 1 16 0v10M9 21v-7a3 3 0 0 1 6 0v7"/>'),
    english: stroke('<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>'),
    literature: stroke('<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>'),
    geography: stroke('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
    logic: stroke('<path d="M9 21h6M10 18h4M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 2V16h5.4v-.2c0-.8.3-1.5.9-2A6 6 0 0 0 12 3z"/>'),
    music: stroke('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    general: stroke('<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/>')
  };

  // Generic school marks. Placeholders on purpose: swap in the official artwork (with the school's OK)
  // by setting "logo" on the school in config/kids.json.
  function laurel() {
    // Two curved branches (cubic curves) with leaves alternating on either side of the stem.
    var P = [[12, 21.2], [6.2, 19.8], [3.8, 13.6], [6.4, 6.2]], out = '', side, i, t, u, x, y, dx, dy, ang, k, off, rot;
    function pt(t) { u = 1 - t; return [u*u*u*P[0][0] + 3*u*u*t*P[1][0] + 3*u*t*t*P[2][0] + t*t*t*P[3][0], u*u*u*P[0][1] + 3*u*u*t*P[1][1] + 3*u*t*t*P[2][1] + t*t*t*P[3][1]]; }
    function tan(t) { u = 1 - t; return [3*u*u*(P[1][0] - P[0][0]) + 6*u*t*(P[2][0] - P[1][0]) + 3*t*t*(P[3][0] - P[2][0]), 3*u*u*(P[1][1] - P[0][1]) + 6*u*t*(P[2][1] - P[1][1]) + 3*t*t*(P[3][1] - P[2][1])]; }
    for (side = -1; side <= 1; side += 2) {
      var m = function (px) { return side < 0 ? px : 24 - px; };
      out += '<path d="M' + m(P[0][0]).toFixed(1) + ' ' + P[0][1] + 'C' + m(P[1][0]).toFixed(1) + ' ' + P[1][1] + ' ' + m(P[2][0]).toFixed(1) + ' ' + P[2][1] + ' ' + m(P[3][0]).toFixed(1) + ' ' + P[3][1] + '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';
      for (i = 0; i < 6; i++) {
        t = 0.2 + i * 0.15;
        var p = pt(t), d = tan(t), len = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
        dx = d[0] / len; dy = d[1] / len;
        k = i % 2 ? 1 : -1;                         // alternate sides of the stem
        off = 1.7;
        x = p[0] + (-dy) * k * off; y = p[1] + dx * k * off;
        ang = Math.atan2(dy, dx) * 180 / Math.PI;   // stem direction
        rot = ang + k * 28;                         // leaf leans away from the stem
        out += '<ellipse transform="translate(' + m(x).toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + (side < 0 ? rot : 180 - rot).toFixed(1) + ')" rx="2.5" ry="1.15" fill="currentColor"/>';
      }
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + out + '</svg>';
  }
  var mark = {
    shield: stroke('<path d="M12 2.5l7.5 2.8v6c0 4.8-3.3 8.4-7.5 10.2-4.2-1.8-7.5-5.4-7.5-10.2v-6z"/><path d="M8.8 9h6.4M12 9v6.5"/>', 1.8),
    laurel: laurel()
  };

  root.QH_ICONS = { ui: ui, brand: brand, subject: subject, mark: mark };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.QH_ICONS;
})(typeof window !== 'undefined' ? window : globalThis);
