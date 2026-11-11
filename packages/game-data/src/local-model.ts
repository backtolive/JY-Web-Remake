/** Embedded local GLB contract, no network URI or gameplay collision. */
export interface LocalModel {
  version:1; assetId:string; dataUri:string; sha256:string;
  scale:{x:number;y:number;z:number};offset:{x:number;y:number;z:number};rotationY:number;
}
export function decodeLocalModel(model:LocalModel):Uint8Array {
  if(!model||model.version!==1||typeof model.assetId!=='string'||!model.assetId||!/^[a-f0-9]{64}$/.test(model.sha256)
    ||typeof model.dataUri!=='string'||model.dataUri.length>6_000_000||!model.dataUri.startsWith('data:model/gltf-binary;base64,'))throw new Error('LOCAL_MODEL_FORMAT');
  if(!model.scale||!model.offset||![model.scale.x,model.scale.y,model.scale.z].every(n=>Number.isFinite(n)&&n>0&&n<=64)
    ||![model.offset.x,model.offset.y,model.offset.z,model.rotationY].every(n=>Number.isFinite(n)&&Math.abs(n)<=64))throw new Error('LOCAL_MODEL_TRANSFORM');
  const raw=atob(model.dataUri.slice('data:model/gltf-binary;base64,'.length));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  if(bytes.length<28)throw new Error('LOCAL_MODEL_HEADER');
  const view=new DataView(bytes.buffer);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length||view.getUint32(16,true)!==0x4e4f534a)throw new Error('LOCAL_MODEL_HEADER');
  const length=view.getUint32(12,true);
  if(length%4||20+length+8>bytes.length)throw new Error('LOCAL_MODEL_CHUNKS');
  const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+length)));
  const bin=20+length;
  if(view.getUint32(bin+4,true)!==0x004e4942||bin+8+view.getUint32(bin,true)!==bytes.length)throw new Error('LOCAL_MODEL_CHUNKS');
  function inspect(value:unknown):void {
    if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
      if(key==='uri')throw new Error('LOCAL_MODEL_EXTERNAL_RESOURCE');inspect(child);
    }
  }
  inspect(json);
  if(json.asset?.version!=='2.0'||json.extensionsRequired?.length||json.nodes?.length>256||json.meshes?.length>128
    ||json.accessors?.some((a:{count:number;type?:string})=>!Number.isInteger(a.count)||a.count<0||a.count>(a.type==='SCALAR'?300_000:100_000)))throw new Error('LOCAL_MODEL_SCOPE');
  return bytes;
}
