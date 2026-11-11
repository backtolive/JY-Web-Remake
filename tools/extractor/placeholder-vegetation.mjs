import { createHash } from 'node:crypto';

/** Authored volumetric low-poly placeholders. No sprites, alpha cards or source pixels. */
export function placeholderVegetation(kind){
  if(!['tree','grass'].includes(kind))throw new Error('PLACEHOLDER_KIND');
  const surfaces=[];
  function cone(cx,cz,r,bottom,top,material,tipX=cx,tipZ=cz){
    const ring=Array.from({length:6},(_,i)=>[cx+r*Math.cos(i*Math.PI/3),bottom,cz+r*Math.sin(i*Math.PI/3)]);
    const triangles=[];
    for(let i=0;i<6;i++){
      const a=ring[i],b=ring[(i+1)%6];
      triangles.push([a,[tipX,top,tipZ],b],[[cx,bottom,cz],a,b]);
    }
    surfaces.push({triangles,material});
  }
  if(kind==='tree'){
    // Narrow trunk and three overlapping canopy volumes, all dimensions authored.
    cone(0,0,.065,0,.52,0);
    cone(0,0,.45,.27,.7,1);cone(0,0,.34,.48,.87,1);cone(0,0,.23,.68,1,1);
  }else{
    for(const [x,z,h] of [[-.2,0,.8],[0,.1,1],[.2,0,.7],[0,-.18,.85]])cone(x,z,.075,0,h,0,x+.08,z+.03);
  }
  const colors=kind==='tree'?[[.28,.17,.08,1],[.18,.32,.12,1]]:[[.25,.38,.13,1]];
  const binaryParts=[],views=[],accessors=[],primitives=[];let offset=0;
  for(const surface of surfaces){
    const positions=[],normals=[];
    for(const [a,b,c] of surface.triangles){
      const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
      for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(v=>v/length));}
    }
    const attrs={};
    for(const [name,values] of [['POSITION',positions],['NORMAL',normals]]){
      const bytes=Buffer.alloc(values.length*4);values.forEach((v,i)=>bytes.writeFloatLE(v,i*4));
      views.push({buffer:0,byteOffset:offset,byteLength:bytes.length});offset+=bytes.length;binaryParts.push(bytes);
      const accessor={bufferView:views.length-1,componentType:5126,count:values.length/3,type:'VEC3'};
      if(name==='POSITION')for(const mode of ['min','max'])accessor[mode]=[0,1,2].map(axis=>Math[mode](...values.filter((_,i)=>i%3===axis)));
      accessors.push(accessor);attrs[name]=accessors.length-1;
    }
    primitives.push({attributes:attrs,material:surface.material});
  }
  const bin=Buffer.concat(binaryParts),doc={asset:{version:'2.0',generator:`JY Mock ${kind} 0.1.0`},scene:0,scenes:[{nodes:[0]}],nodes:[{name:`Mock ${kind}`,mesh:0}],
    meshes:[{primitives}],materials:colors.map(color=>({pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:1,metallicFactor:0}})),
    buffers:[{byteLength:bin.length}],bufferViews:views,accessors};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
  const bytes=Buffer.concat([header,json,bh,bin]);
  return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),dataUri:`data:model/gltf-binary;base64,${bytes.toString('base64')}`};
}
