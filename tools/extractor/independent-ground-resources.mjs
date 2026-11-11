import {createHash} from 'node:crypto';

/** Lossless source image embedding. Every resource owns a material and image, without terrain inference. */
export function independentGroundResources(cells,entries){
  const tiles=cells.flatMap(c=>c.assets.filter(v=>v.layer==='groundTileId').map(v=>({id:v.resourceId,x:v.world.x,z:v.world.z})));
  if(!tiles.length||tiles.length>4096)throw new Error('GROUND_TILES');
  const ids=[...new Set(tiles.map(t=>t.id))].sort((a,b)=>a-b);
  if(entries.length!==ids.length||new Set(entries.map(e=>e.tileValue)).size!==ids.length)throw new Error('GROUND_RESOURCE_SET');
  const bufferViews=[],accessors=[],chunks=[],primitives=[],images=[],materials=[],textures=[],bindings=[];let offset=0;
  function add(bytes){bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});const padded=Buffer.concat([bytes,Buffer.alloc((4-bytes.length%4)%4)]);chunks.push(padded);offset+=padded.length;return bufferViews.length-1;}
  function attribute(values,type,width){
    const bytes=Buffer.alloc(values.length*4);values.forEach((v,i)=>bytes.writeFloatLE(v,i*4));
    const a={bufferView:add(bytes),componentType:5126,count:values.length/width,type};
    if(type==='VEC3')for(const mode of ['min','max'])a[mode]=[0,1,2].map(axis=>Math[mode](...values.filter((_,i)=>i%3===axis)));
    accessors.push(a);return accessors.length-1;
  }
  for(const id of ids){
    const entry=entries.find(e=>e.tileValue===id);
    if(!entry||entry.resourceId!==id/2||!Buffer.isBuffer(entry.png)||entry.png.length<24||entry.png.readUInt32BE(0)!==0x89504e47
      ||entry.png.readUInt32BE(16)!==entry.width||entry.png.readUInt32BE(20)!==entry.height
      ||createHash('sha256').update(entry.png).digest('hex')!==entry.pngSha256)throw new Error('GROUND_SOURCE_IMAGE');
    const positions=[],normals=[],uv=[],indices=[],instances=tiles.filter(t=>t.id===id);
    for(const tile of instances){
      if(!Number.isInteger(tile.x)||!Number.isInteger(tile.z))throw new Error('GROUND_CELL');
      const base=positions.length/3;
      // Inverse of documented source screenX=(x-y)*18-xOffset, screenY=(x+y)*9-yOffset.
      // Common display translation aligns the usual 36x18 top to existing cell centres.
      // Full 36x22 image stays intact: no crop, no inferred 3D extrusion.
      for(const [px,py,u,v] of [[0,0,0,0],[entry.width,0,1,0],[entry.width,entry.height,1,1],[0,entry.height,0,1]]){
        const sx=(px-entry.xOffset)/18,sy=(py-entry.yOffset)/9;
        const x=tile.x+(sx+sy)/2+4/9,z=tile.z+(sy-sx)/2+4/9;
        positions.push(-x,(tile.x+tile.z)*.00001,z);normals.push(0,1,0);uv.push(u,v);
      }
      indices.push(base,base+1,base+2,base,base+2,base+3);
    }
    const attributes={POSITION:attribute(positions,'VEC3',3),NORMAL:attribute(normals,'VEC3',3),TEXCOORD_0:attribute(uv,'VEC2',2)};
    const ib=Buffer.alloc(indices.length*4);indices.forEach((n,i)=>ib.writeUInt32LE(n,i*4));
    accessors.push({bufferView:add(ib),componentType:5125,count:indices.length,type:'SCALAR'});
    const material=materials.length;
    primitives.push({attributes,indices:accessors.length-1,material});
    images.push({name:`source-image-${entry.resourceId}`,bufferView:add(entry.png),mimeType:'image/png'});
    textures.push({sampler:0,source:images.length-1});
    materials.push({name:entry.materialId,alphaMode:'MASK',alphaCutoff:.5,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],baseColorTexture:{index:textures.length-1},roughnessFactor:1,metallicFactor:0},
      extras:{tileValue:id,resourceId:entry.resourceId,pngSha256:entry.pngSha256,classification:'independent-resource',gameplayProperty:'Unknown'}});
    bindings.push({tileValue:id,resourceId:entry.resourceId,materialId:entry.materialId,pngSha256:entry.pngSha256,instances:instances.length,
      cells:instances.map(t=>({relativeX:t.x,relativeY:t.z})),sourceOffset:entry.sourceOffset,width:entry.width,height:entry.height,xOffset:entry.xOffset,yOffset:entry.yOffset});
  }
  const bin=Buffer.concat(chunks),doc={asset:{version:'2.0',generator:'JY independent source ground projection 0.1.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives}],materials,textures,images,
    samplers:[{wrapS:33071,wrapT:33071,magFilter:9728,minFilter:9728}],buffers:[{byteLength:bin.length}],bufferViews,accessors};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
  const bytes=Buffer.concat([header,json,bh,bin]),sha256=createHash('sha256').update(bytes).digest('hex');
  return {bytes,bindings,model:{version:1,assetId:'local.ground:independent-source-review',sha256,dataUri:`data:model/gltf-binary;base64,${bytes.toString('base64')}`,scale:{x:1,y:1,z:1},offset:{x:0,y:0,z:0},rotationY:0}};
}
