import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root='apps/web/dist';
const html=await readFile(path.join(root,'index.html'),'utf8');
assert.match(html,/<html lang="zh-Hant">/);
const paths=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>match[1]);
assert.ok(paths.some(file=>file.endsWith('.js')));
for(const file of paths){assert.ok(file.startsWith('./'),`Non-relative asset path: ${file}`);assert.ok((await stat(path.join(root,file))).isFile());}
const files=await readdir(root,{recursive:true});
assert.ok(files.every(file=>!(/\.(grp|idx|exe|com|local\.json)$/i.test(file))));
assert.ok(!files.some(file=>/(^|[/\\])(original|references)([/\\]|$)/i.test(file)));
console.log(JSON.stringify({status:'PASS',staticDirectory:root,relativeAssets:paths.length,files:files.length,commercialResourceFiles:0}));
