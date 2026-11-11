import { createHash } from 'node:crypto';
/** Authored, deterministic octahedron; not a reconstruction of an original rock. */
export function placeholderRock({uniformScale=1,translation=[0,0,0],color=[.36,.28,.18,1]}={}) {
  if(!Number.isFinite(uniformScale)||uniformScale<=0||!Array.isArray(translation)||translation.length!==3||!translation.every(Number.isFinite)
    ||!Array.isArray(color)||color.length!==4||!color.every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new Error('MOCK_ROCK_OPTIONS');
  const vertices=[[0,1,0],[.5,.3,0],[0,.3,.5],[-.5,.3,0],[0,.3,-.5],[0,0,0]].map(p=>p.map((n,i)=>n*uniformScale+translation[i]));
  const faces=[[0,2,1],[0,3,2],[0,4,3],[0,1,4],[5,1,2],[5,2,3],[5,3,4],[5,4,1]];
  const positions=[],normals=[];
  for(const face of faces){
    const [a,b,c]=face.map(i=>vertices[i]);
    const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length=Math.hypot(...normal);
    for(const point of [a,b,c]){positions.push(...point);normals.push(...normal.map(n=>n/length));}
  }
  const binary=Buffer.alloc((positions.length+normals.length)*4);
  [...positions,...normals].forEach((n,i)=>binary.writeFloatLE(n,i*4));
  const gltf={asset:{version:'2.0',generator:'JY Mock rock 0.1.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:'Mock Rock'}],
    meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},material:0}]}],
    materials:[{name:'Authored rough stone',pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:0,roughnessFactor:1}}],
    buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:positions.length*4},{buffer:0,byteOffset:positions.length*4,byteLength:normals.length*4}],
    accessors:[{bufferView:0,componentType:5126,count:24,type:'VEC3',min:[-.5,0,-.5].map((n,i)=>n*uniformScale+translation[i]),max:[.5,1,.5].map((n,i)=>n*uniformScale+translation[i])},{bufferView:1,componentType:5126,count:24,type:'VEC3'}]};
  let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  const bytes=Buffer.concat([header,json,binHeader,binary]);
  return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),dataUri:`data:model/gltf-binary;base64,${bytes.toString('base64')}`};
}
