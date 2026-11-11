import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonical} from '../../packages/game-core/src/content.ts';
const source=process.argv[2];if(!source)throw new Error('Usage: node tools/analyzer/prepare-ground-review.mjs <source-region.json>');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bundle=JSON.parse(await readFile(source)),evidence=JSON.parse(await readFile('assets/generated/scene1-rle/manifest.local.json'));
if(hash(canonical(evidence))!==bundle.provenance?.imageEvidenceSha256)throw new Error('GROUND_STALE_EVIDENCE');
const observations=JSON.parse(await readFile('tools/scene1-ground-observations.json'));
const ids=[...new Set(bundle.region.cells.map(c=>c.layers.groundTileId))].sort((a,b)=>a-b),entries=[];
for(const tileValue of ids){
  if(tileValue<=0||tileValue%2)throw new Error('GROUND_ID');
  const resourceId=tileValue/2,image=evidence.images.find(i=>i.resourceId===resourceId);
  if(!image)throw new Error('GROUND_EVIDENCE');
  const bytes=await readFile(`assets/generated/scene1-rle/resource-${resourceId}.png`);
  entries.push({tileValue,resourceId,materialId:`local.ground:tile/${tileValue}`,sourceFile:'SMP001',...image,pngSha256:hash(bytes),
    cells:bundle.region.cells.filter(c=>c.layers.groundTileId===tileValue).map(c=>({x:c.x,y:c.y,relativeX:c.relativeX,relativeY:c.relativeY})),
    classification:'independent-resource',gameplayProperty:'Unknown',surfaceType:'Unknown',mergeWith:null,
    visualNotes:observations.entries.find(e=>e.tileValue===tileValue)?.visualNotes??'未核對',dataUri:`data:image/png;base64,${bytes.toString('base64')}`});
}
const cards=entries.map(e=>`<article data-tile="${e.tileValue}"><strong>ID ${e.tileValue} / image ${e.resourceId}</strong><img src="${e.dataUri}"/><small>${e.width}×${e.height} · ${e.cells.length} cells · offset ${e.sourceOffset}</small></article>`).join('');
const rows=Array.from({length:bundle.region.height},(_,y)=>`<tr>${Array.from({length:bundle.region.width},(_,x)=>{const c=bundle.region.cells.find(c=>c.relativeX===x&&c.relativeY===y);return `<td>${c.layers.groundTileId}</td>`;}).join('')}</tr>`).join('');
const html=`<!doctype html><meta charset="utf-8"><title>21 independent ground resources</title><style>body{font:15px system-ui;background:#eeece5;color:#202820;margin:24px}h1{font-size:22px}.cards{display:grid;grid-template-columns:repeat(5,200px);gap:12px}article{background:#dedbd0;padding:10px;border:1px solid #aaa}img{display:block;width:180px;height:90px;image-rendering:pixelated;object-fit:contain;margin:8px 0}small{display:block;font-size:11px}table{border-collapse:collapse}td{border:1px solid #aaa;padding:6px;text-align:center;width:44px}p{max-width:1050px}</style><h1>21 independent ground resources — source images</h1><p>Each source ID remains independent. No gameplay properties or material sharing inferred. Grid: columns +X, rows +Y; origin (${Math.min(...bundle.region.cells.map(c=>c.x))},${Math.min(...bundle.region.cells.map(c=>c.y))}).</p><section class="cards">${cards}</section><h2>Original 8×8 ground IDs</h2><table>${rows}</table>`;
const out='assets/generated/ground-id-review';await mkdir(out,{recursive:true});
await writeFile(`${out}/review.local.json`,JSON.stringify({version:1,source,evidenceSha256:hash(JSON.stringify(evidence)),entries,grid:bundle.region.cells.map(c=>({x:c.x,y:c.y,tileValue:c.layers.groundTileId}))},null,2)+'\n');
await writeFile(`${out}/review.local.html`,html);console.log(JSON.stringify({ids:entries.length,cells:entries.reduce((n,e)=>n+e.cells.length,0),output:out}));
