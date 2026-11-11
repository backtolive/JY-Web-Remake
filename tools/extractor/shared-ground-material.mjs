import {createHash} from 'node:crypto';

/** @deprecated Rejected visual experiment. Use independent-ground-resources; no inferred color grouping in current workflow. */
export function sharedGroundMaterial(cells,png){
  if(png.length>3_500_000||png.readUInt32BE(0)!==0x89504e47)throw new Error('GROUND_TEXTURE');
  const tiles=cells.flatMap(c=>c.assets.filter(v=>v.layer==='groundTileId').map(v=>({visual:v,x:v.world.x,z:v.world.z,color:v.asset.geometry?.parts[0]?.material.color??v.asset.color})));
  if(!tiles.length||tiles.length>4096)throw new Error('GROUND_TILES');
  const keys=new Set();for(const tile of tiles){
    if(!Number.isInteger(tile.x)||!Number.isInteger(tile.z)||!/^#[a-f0-9]{6}$/i.test(tile.color)||keys.has(`${tile.x},${tile.z}`))throw new Error('GROUND_LAYOUT');
    keys.add(`${tile.x},${tile.z}`);
    const rgb=[1,3,5].map(i=>parseInt(tile.color.slice(i,i+2),16)/255);
    // Color families are authored for this sample, not verified terrain semantics.
    tile.tint=rgb[0]>rgb[1]*1.1?[1,.82,.5]:[.74,.9,.72];
  }
  const positions=[],normals=[],uv=[],colors=[],indices=[];
  for(const tile of tiles){
    const base=positions.length/3;
    for(const [dx,dz] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){
      const x=tile.x+dx,z=tile.z+dz;
      // Babylon glTF LH conversion flips X; author inverse so grid X/Z remain intact.
      positions.push(-x,0,z);normals.push(0,1,0);uv.push((x+.5)/2,(z+.5)/2);
      const near=tiles.filter(t=>Math.abs(t.x-x)<=.50001&&Math.abs(t.z-z)<=.50001);
      colors.push(...[0,1,2].map(axis=>near.reduce((s,t)=>s+t.tint[axis],0)/near.length),1);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const parts=[],bufferViews=[],accessors=[];let offset=0;
  function add(bytes){const padded=Buffer.concat([bytes,Buffer.alloc((4-bytes.length%4)%4)]);bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});parts.push(padded);offset+=padded.length;return bufferViews.length-1;}
  function attribute(values,type,width){const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));
    const a={bufferView:add(b),componentType:5126,count:values.length/width,type};
    if(values===positions)for(const mode of ['min','max'])a[mode]=[0,1,2].map(axis=>Math[mode](...values.filter((_,i)=>i%3===axis)));
    accessors.push(a);return accessors.length-1;}
  const attrs={POSITION:attribute(positions,'VEC3',3),NORMAL:attribute(normals,'VEC3',3),TEXCOORD_0:attribute(uv,'VEC2',2),COLOR_0:attribute(colors,'VEC4',4)};
  const ib=Buffer.alloc(indices.length*4);indices.forEach((v,i)=>ib.writeUInt32LE(v,i*4));
  accessors.push({bufferView:add(ib),componentType:5125,count:indices.length,type:'SCALAR'});const index=accessors.length-1;
  const imageView=add(png),bin=Buffer.concat(parts);
  const doc={asset:{version:'2.0',generator:'JY shared ground material 0.1.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:'Shared terrain surface'}],
    meshes:[{primitives:[{attributes:attrs,indices:index,material:0}]}],
    materials:[{name:'authored.terrain:olive-grass-soil-v1',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],baseColorTexture:{index:0},roughnessFactor:1,metallicFactor:0}}],
    textures:[{sampler:0,source:0}],samplers:[{wrapS:10497,wrapT:10497,magFilter:9729,minFilter:9987}],images:[{bufferView:imageView,mimeType:'image/png'}],
    buffers:[{byteLength:bin.length}],bufferViews,accessors};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
  const bytes=Buffer.concat([header,json,bh,bin]),sha256=createHash('sha256').update(bytes).digest('hex');
  return {bytes,tiles:tiles.length,triangles:indices.length/3,model:{version:1,assetId:'local.art:terrain/olive-grass-soil-v1',sha256,dataUri:`data:model/gltf-binary;base64,${bytes.toString('base64')}`,scale:{x:1,y:1,z:1},offset:{x:0,y:0,z:0},rotationY:0}};
}
