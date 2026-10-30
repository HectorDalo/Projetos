import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve('vite'));
const code = viteRequire('esbuild').buildSync({stdin:{contents:`
import {professional as p} from './src/content/professional';
import {projects} from './src/content/profile';
import {aiDevelopment,skillAssessments} from './src/content/skills';
const facts=Object.fromEntries(['pt','en'].map(lang=>[lang,[p.objective[lang],...p.experience.map(e=>e.organization+' — '+e.role[lang]+'; '+e.status[lang]+' '+e.activities[lang].join(' ')),'Courses / Cursos: '+p.courses.map(c=>c.title+' — '+c.institution+' ('+c.year+')').join('; '),p.knowledge[lang],aiDevelopment[lang],...skillAssessments.map(s=>s.name+": "+s.level[lang]+"; "+s.evidence[lang]),p.additionalStudies[lang],p.selfDescribedStrengths[lang],...projects.map(q=>q.title[lang]+': '+q.description[lang])]]));
console.log(JSON.stringify({schemaVersion:1,owner:'Hector Dalonso',updatedAt:'2026-10-28',summary:p.presentation,facts},null,2));
`,resolveDir:projectRoot,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'}).outputFiles[0].text;
writeFileSync(new URL('../elara-profile.json', import.meta.url),execFileSync(process.execPath,['--input-type=module','-'],{input:code,encoding:'utf8'}));
console.log('Exported curated public profile.');
