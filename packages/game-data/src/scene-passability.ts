/** Community Implementation: fixed jinyong-legend SceneCanPass, not DOS verification. */
export const SCENE_PASSABILITY_PROFILE='community-scene-pass-v1';
const water=new Set<number>();
for(const [start,end] of [[0x166,0x16a],[0x176,0x17c],[0x1ca,0x1d0],[0x1fa,0x262],[0x332,0x338],[0x346,0x346],[0x3a6,0x3a8],[0x3f8,0x3fe],[0x52c,0x544]])for(let n=start!;n<=end!;n+=2)water.add(n);
export function scenePassability(ground:number,building:number,slot:number,eventFields?:readonly(readonly number[])[]){
  const reasons:string[]=[];
  if(![ground,building,slot].every(Number.isInteger))throw new Error('SCENE_PASSABILITY_INPUT');
  if(building!==0)reasons.push(building>0?'building':'unknown-negative-building');
  if(water.has(ground))reasons.push('water');
  if(slot>=0){
    const flag=eventFields?.[slot]?.[0];
    if(flag===undefined)reasons.push('unknown-event');
    else if(flag!==0)reasons.push('blocking-event');
  }
  return {blocked:reasons.length>0,reasons,profile:SCENE_PASSABILITY_PROFILE,confidence:'Community Implementation' as const};
}
