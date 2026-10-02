// Draws the home-screen icons (the picture a phone shows when you "Add to Home Screen").
// Needs Playwright. Re-run only if you change the artwork:  node scripts/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { launch } from './playwright.mjs';

const BRETTON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="g" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#1D2F7A"/><stop offset="1" stop-color="#070B16"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<g fill="none" stroke="#6FE3FF" stroke-width="11" stroke-linecap="square"><path d="M104 150V104H150"/><path d="M362 104H408V150"/><path d="M408 362V408H362"/><path d="M150 408H104V362"/></g>
<polygon points="124,350 236,168 296,262 340,206 396,350" fill="#FF7A1A"/>
<polygon points="236,168 206,218 228,206 246,224 266,204 286,218" fill="#FFFFFF" opacity=".95"/>
<path d="M236 168V128" stroke="#EAF0FF" stroke-width="7" stroke-linecap="round"/><path d="M236 128L274 140L236 154Z" fill="#6FE3FF"/>
<rect x="140" y="378" width="232" height="16" rx="8" fill="#FFFFFF" opacity=".16"/><rect x="140" y="378" width="148" height="16" rx="8" fill="#6FE3FF"/></svg>`;

const AUDREY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6FB"/><stop offset="1" stop-color="#EBDDFF"/></linearGradient><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9BC9"/><stop offset="1" stop-color="#F0529C"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#bg)"/>
<path d="M256 332C246 372 266 396 256 424" fill="none" stroke="#3DB37A" stroke-width="14" stroke-linecap="round"/>
<path d="M256 392C226 392 200 372 196 346C226 344 250 362 256 392Z" fill="#3DB37A"/><path d="M256 372C286 372 312 352 316 326C286 324 262 342 256 372Z" fill="#3DB37A"/>
<g transform="translate(256 232)" fill="url(#p)" stroke="#C2276F" stroke-width="5">
<ellipse cx="0" cy="-74" rx="40" ry="66"/><ellipse cx="0" cy="-74" rx="40" ry="66" transform="rotate(72)"/><ellipse cx="0" cy="-74" rx="40" ry="66" transform="rotate(144)"/><ellipse cx="0" cy="-74" rx="40" ry="66" transform="rotate(216)"/><ellipse cx="0" cy="-74" rx="40" ry="66" transform="rotate(288)"/></g>
<circle cx="256" cy="232" r="42" fill="#FFC93C" stroke="#E0A000" stroke-width="5"/>
<path d="M120 140l8 24 24 8-24 8-8 24-8-24-24-8 24-8z" fill="#7B4DE8"/><path d="M398 116l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill="#FFC93C"/><path d="M404 316l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="#F0529C"/></svg>`;

const page = (svg, size) => `<body style="margin:0;background:#000"><div style="width:${size}px;height:${size}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`;
const browser = await launch();
if (!browser) { console.error('Playwright with Chromium is needed to draw the icons.'); process.exit(1); }
const p = await browser.newPage();
for (const [kid, svg] of [['bretton', BRETTON], ['audrey', AUDREY]]) {
  const dir = path.join(ROOT, 'shared/assets/icons', kid);
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(page(svg, size));
    await p.screenshot({ path: path.join(dir, file) });
  }
  console.log('icons for', kid);
}
await browser.close();
