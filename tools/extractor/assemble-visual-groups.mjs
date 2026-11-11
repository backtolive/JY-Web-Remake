import { validatePrimitiveGeometry } from '../../packages/game-data/src/visual-primitive.ts';

/** Explicit authored grouping, never image-to-3D inference or collision editing. */
export function assembleVisualGroups(region,evidence,rules=[]) {
  if(!Array.isArray(rules))throw new Error('GROUP_RULES');
  const groups=[],consumed=new Set(),ids=new Set();
  for(const rule of rules){
    if(typeof rule.id!=='string'||!rule.id||ids.has(rule.id)||!Array.isArray(rule.members)||rule.members.length!==2)throw new Error('GROUP_RULE');
    ids.add(rule.id);validatePrimitiveGeometry(rule.geometry);
    if(rule.geometry.classification!=='original-authored')throw new Error('GROUP_GEOMETRY');
    if(rule.members[0].dx!==0||rule.members[0].dy!==0)throw new Error('GROUP_ANCHOR');
    for(const member of rule.members)if(!Number.isInteger(member.tileValue)||member.tileValue<=0||member.tileValue%2||![member.dx,member.dy].every(n=>Number.isInteger(n)&&Math.abs(n)<=64))throw new Error('GROUP_MEMBER');
    if(rule.members[0].dx===rule.members[1].dx&&rule.members[0].dy===rule.members[1].dy)throw new Error('GROUP_DUPLICATE_MEMBER');
    for(const anchor of region.cells.filter(c=>c.layers.buildingTileId===rule.members[0].tileValue)){
      const members=rule.members.map(member=>{
        const cell=region.cells.find(c=>c.x===anchor.x+member.dx&&c.y===anchor.y+member.dy&&c.layers.buildingTileId===member.tileValue);
        if(!cell)throw new Error(`GROUP_INCOMPLETE:${rule.id}@${anchor.x},${anchor.y}`);
        const key=`${cell.x},${cell.y}`;
        if(consumed.has(key))throw new Error('GROUP_OVERLAP');
        const placements=evidence.placements.filter(p=>p.layer===1&&p.cellX===cell.x&&p.cellY===cell.y&&p.tileValue===member.tileValue&&p.resourceId===member.tileValue/2);
        const image=evidence.images.find(i=>i.resourceId===member.tileValue/2);
        if(placements.length!==1||!image||![image.width,image.height].every(n=>Number.isInteger(n)&&n>0))throw new Error('GROUP_EVIDENCE');
        return {key,cell,placement:placements[0],image};
      });
      const [left,right]=members;
      if(![left.placement.screenX,left.placement.screenY,right.placement.screenX,right.placement.screenY,left.image.width,left.image.height,right.image.width,right.image.height].every(Number.isFinite)
        ||left.placement.screenX+left.image.width!==right.placement.screenX
        ||Math.min(left.placement.screenY+left.image.height,right.placement.screenY+right.image.height)<=Math.max(left.placement.screenY,right.placement.screenY))throw new Error('GROUP_SEAM');
      for(const member of members)consumed.add(member.key);
      groups.push({id:`${rule.id}@${anchor.x},${anchor.y}`,confidence:'Inferred',anchor:{x:anchor.x,y:anchor.y},
        seam:{x:right.placement.screenX,gap:0},members:members.map(({cell,image,placement})=>({tileValue:cell.layers.buildingTileId,x:cell.x,y:cell.y,
          resourceId:image.resourceId,sourceFile:'SMP001',sourceOffset:image.sourceOffset,byteLength:image.byteLength,sha256:image.sha256,
          imageAnchor:{xOffset:image.xOffset,yOffset:image.yOffset},screen:{x:placement.screenX,y:placement.screenY}})),
        visual:{layer:'buildingTileId',resourceId:anchor.layers.buildingTileId,logicalX:anchor.x,logicalY:anchor.y,
          relativeX:anchor.relativeX,relativeY:anchor.relativeY,world:{x:anchor.relativeX,y:0,z:anchor.relativeY},
          asset:{kind:'box',height:1.8,color:rule.geometry.parts[0].material.color,geometry:rule.geometry,label:'Authored grouped proxy'}}});
    }
  }
  return {groups,consumed};
}
