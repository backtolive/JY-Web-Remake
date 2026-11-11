import {readFile} from 'node:fs/promises';
/** Count storage independently of triangle cost; no rendering or external resource loading. */
for(const file of process.argv.slice(2)){
  const b=await readFile(file);
  if(b.length<28||b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(8)!==b.length)throw new Error(`GLB_HEADER:${file}`);
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),views=j.bufferViews??[];
  const imageViews=new Set((j.images??[]).map(i=>i.bufferView));
  const images=(j.images??[]).map(i=>({mime:i.mimeType,bytes:views[i.bufferView]?.byteLength??0}));
  console.log(JSON.stringify({file,bytes:b.length,triangles:(j.meshes??[]).reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+(p.indices!==undefined?j.accessors[p.indices].count:j.accessors[p.attributes.POSITION].count)/3,0),0),
    imageBytes:images.reduce((s,i)=>s+i.bytes,0),geometryBytes:views.reduce((s,v,i)=>s+(imageViews.has(i)?0:v.byteLength),0),images}));
}
