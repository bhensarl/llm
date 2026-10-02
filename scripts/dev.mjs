// npm run dev: build, serve on http://localhost:3000, and rebuild when you save a file.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';
import { serve } from './serve.mjs';

const rebuild = () => { const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], { stdio: 'inherit' }); return r.status === 0; };
rebuild();
const { port } = await serve(path.join(ROOT, 'dist'), Number(process.env.PORT) || 3000);
console.log(`\nQuest Hall is running: http://localhost:${port}\nSave a file and the site rebuilds. Ctrl+C to stop.\n`);

let timer = null;
for (const d of ['shared', 'content', 'config']) {
  fs.watch(path.join(ROOT, d), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => { console.log('Change detected, rebuilding...'); rebuild(); }, 250); });
}
