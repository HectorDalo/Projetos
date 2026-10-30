import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve('vite'));
viteRequire('esbuild').buildSync({ entryPoints: ['worker/pages.ts'], bundle: true, format: 'esm', platform: 'browser', outfile: 'dist/_worker.js' });
writeFileSync('dist/_routes.json', JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
console.log('Pages Worker and API routes bundled.');
