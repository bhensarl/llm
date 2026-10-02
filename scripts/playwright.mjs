// Finds Playwright wherever it is installed (project, global, or a cloud sandbox) and launches Chromium.
import { createRequire } from 'node:module';
import fs from 'node:fs';

export async function launch(opts = {}) {
  const tries = [process.cwd() + '/', '/opt/node-tools/node_modules/', '/usr/lib/node_modules/', '/usr/local/lib/node_modules/'];
  let pw = null;
  for (const base of tries) {
    try { pw = createRequire(base)('playwright'); break; } catch (e) { /* keep looking */ }
  }
  if (!pw) return null;
  try { return await pw.chromium.launch(opts); } catch (e) { /* fall through to known paths */ }
  const found = ['/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
    .concat(fs.existsSync('/opt/pw-browsers') ? fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : [])
    .find((p) => fs.existsSync(p));
  return found ? pw.chromium.launch({ ...opts, executablePath: found }) : null;
}
