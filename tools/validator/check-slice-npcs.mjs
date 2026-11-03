import assert from 'node:assert/strict';
import { createGame, dispatch, serializeSave, restoreSave } from '../../packages/game-core/src/runtime.ts';

/** Walk actual core commands from the preview entry; never teleport to an NPC. */
export function checkSliceNpcs(content) {
  const initial = createGame(content), map = content.maps[initial.mapId];
  const directions = ['north', 'east', 'south', 'west'];
  const queue = [{ state: initial, path: [] }], seen = new Set([`${initial.x},${initial.y}`]);
  const approaches = new Map();
  for (let i = 0; i < queue.length; i++) {
    const {state,path} = queue[i];
    for (const npc of map.npcs) if (!approaches.has(npc.id) && Math.abs(state.x-npc.x)+Math.abs(state.y-npc.y)===1) {
      approaches.set(npc.id,{state,path});
    }
    for (const direction of directions) {
      const next = dispatch(content,state,{type:'MOVE',direction}).state;
      const key = `${next.x},${next.y}`;
      if (next.mapId !== initial.mapId || seen.has(key)) continue;
      seen.add(key); queue.push({state:next,path:[...path,direction]});
    }
  }
  const unreachable = map.npcs.filter(npc => !approaches.has(npc.id)).map(npc => npc.id);
  assert.equal(unreachable.length,0,`NPC_UNREACHABLE:${unreachable.join(',')}; reachableCells=${seen.size}`);
  return map.npcs.map(npc => {
    const approach = approaches.get(npc.id);
    assert.ok(approach,`NPC_UNREACHABLE:${npc.id}`);
    const dx=npc.x-approach.state.x,dy=npc.y-approach.state.y;
    const direction=dx===1?'east':dx===-1?'west':dy===1?'south':'north';
    const collision=dispatch(content,approach.state,{type:'MOVE',direction});
    assert.equal(collision.notifications[0].type,'MOVE_BLOCKED');
    let state=dispatch(content,approach.state,{type:'INTERACT',npcId:npc.id}).state;
    assert.equal(state.cursor?.eventId,npc.eventId);
    assert.equal(state.cursor?.waiting,'dialogue');
    state=restoreSave(content,serializeSave(content,state));
    for(let budget=0;state.cursor;budget++) {
      assert.ok(budget<100,'DIALOGUE_BUDGET');
      state=dispatch(content,state,{type:'CONTINUE'}).state;
    }
    assert.deepEqual(state.inventory,initial.inventory);
    assert.deepEqual(state.flags,initial.flags);
    return {npcId:npc.id,eventId:npc.eventId,x:approach.state.x,y:approach.state.y,path:approach.path,
      collision:true,saveContinuation:true};
  });
}
