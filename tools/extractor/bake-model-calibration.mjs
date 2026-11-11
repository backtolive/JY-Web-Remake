/** Embed a render-space diagonal fit into a glTF wrapper; preserve source meshes, textures and original binary chunk. */
export function bakeModelCalibration(source,{scale,offset},evidence,sourceYaw=0){
  const jsonLength=source.readUInt32LE(12),doc=JSON.parse(source.subarray(20,20+jsonLength));
  if(doc.scenes?.length!==1||doc.scene!==0||!doc.scenes[0].nodes?.length)throw new Error('MODEL_CALIBRATION_SCENE_SCOPE');
  let children=[...doc.scenes[0].nodes];
  if(Math.abs(sourceYaw)>1e-9){const rotation=doc.nodes.length;doc.nodes.push({name:'Model horizontal axis alignment',children,rotation:[0,-Math.sin(sourceYaw/2),0,Math.cos(sourceYaw/2)]});children=[rotation];}
  const wrapper=doc.nodes.length;
  // Babylon's glTF handedness root reflects X; conjugate translation to retain render-space position.
  doc.nodes.push({name:'Footprint calibrated model root',children,scale:[scale.x,scale.y,scale.z],translation:[-offset.x,offset.y,offset.z]});
  doc.scenes[0].nodes=[wrapper];doc.asset.generator=(doc.asset.generator??'glTF')+' / JY footprint calibration 0.1.0';
  doc.extras={...doc.extras,jyFootprintCalibration:evidence};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const binChunk=source.subarray(20+jsonLength),header=Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+binChunk.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  return Buffer.concat([header,json,binChunk]);
}
