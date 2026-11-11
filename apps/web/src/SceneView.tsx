import { useEffect, useRef, useState } from 'react';
import type { GameMap, GameState } from '@jy/game-core';
import type { SceneRenderer } from './renderer';
import { cameraGroundProjection, VIEW_CAMERA } from './view-controls';
import type { CameraView } from './view-controls';
import type {ProjectedMap} from '../../../packages/game-data/src/projected-map';

export function MiniMap({map,state,view=VIEW_CAMERA}:{map:GameMap;state:GameState;view?:CameraView}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
    canvas.width=192;canvas.height=192;
    const {a,b,c,d}=cameraGroundProjection(view);
    const extentX=Math.abs(a)*map.width+Math.abs(c)*map.height;
    const extentY=Math.abs(b)*map.width+Math.abs(d)*map.height;
    const scale=176/Math.max(extentX,extentY);
    ctx.translate(96,96);ctx.transform(a,b,c,d,0,0);ctx.translate(-map.width*scale/2,-map.height*scale/2);
    ctx.fillStyle='#e4dfcd';ctx.fillRect(0,0,map.width*scale,map.height*scale);
    ctx.fillStyle='#8d9986';map.blocked.forEach(cell=>ctx.fillRect(cell%map.width*scale,Math.floor(cell/map.width)*scale,Math.ceil(scale),Math.ceil(scale)));
    ctx.fillStyle='#bf9142';map.portals.forEach(p=>ctx.fillRect(p.x*scale,p.y*scale,scale,scale));
    ctx.fillStyle='#b7673c';map.npcs.forEach(n=>ctx.fillRect(n.x*scale,n.y*scale,Math.max(scale,3),Math.max(scale,3)));
    ctx.resetTransform();
    const px=(state.x+.5-map.width/2)*scale,py=(state.y+.5-map.height/2)*scale;
    ctx.fillStyle='#123e36';ctx.beginPath();ctx.arc(96+a*px+c*py,96+b*px+d*py,Math.max(3,scale*.23),0,Math.PI*2);ctx.fill();
  },[map,state.x,state.y,view.alpha,view.beta,view.gridYSign]);
  return <canvas ref={ref} className="mini-map" role="img" aria-label={`地圖位置：${state.x}, ${state.y}`}/>;
}

export type { RegionVisualAsset, RegionVisualCell } from './renderer';
import type { RegionVisualCell } from './renderer';
export function SceneView({map,state,onInteract,regionCells,projectedMap,cutaway=false,view=VIEW_CAMERA,onViewChange}:{map:GameMap;state:GameState;onInteract:(id:string)=>void;regionCells?:RegionVisualCell[];projectedMap?:ProjectedMap;cutaway?:boolean;view?:CameraView;onViewChange?:(view:CameraView)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<SceneRenderer|null>(null);
  const latest=useRef({state,onInteract,cutaway,onViewChange});latest.current={state,onInteract,cutaway,onViewChange};
  const [error,setError]=useState(''),[ready,setReady]=useState(false);
  useEffect(()=>{
    let cancelled=false;setReady(false);setError('');
    import('./renderer').then(async({createRenderer})=>{
      if(cancelled||!canvas.current)return;
      const active=createRenderer(canvas.current,map,latest.current.state,id=>latest.current.onInteract(id),regionCells,view=>latest.current.onViewChange?.(view),projectedMap);renderer.current=active;
      active.setCutaway(latest.current.cutaway);
      try{await active.ready;}catch(error){active.dispose();throw error;}
      if(!cancelled)setReady(true);
    }).catch(()=>{if(!cancelled)setError('3D 場景或本機模型載入失敗，可使用平面地圖繼續檢查。');});
    return()=>{cancelled=true;renderer.current?.dispose();renderer.current=null;};
  },[map,regionCells,projectedMap]);
  useEffect(()=>{renderer.current?.update(state);},[state]);
  useEffect(()=>{renderer.current?.setCutaway(cutaway);},[cutaway]);
  return <div className="scene-frame" data-renderer={ready?'ready':error?'fallback':'loading'}>
    <canvas ref={canvas} className="world-canvas" role="img" aria-label="固定斜角 3D 遊戲場景"/>
    {!ready&&!error&&<div className="scene-loading"><span className="seal">行</span>正在鋪展江湖…</div>}
    {error&&<div className="scene-fallback"><MiniMap map={map} state={state} view={view}/><p role="status">{error}</p></div>}
    <div className="scene-caption"><span className="status-dot"/>固定斜角 · {projectedMap?"原圖投影":"占位美術"}<span className="coordinates">{state.x.toString().padStart(2,'0')} / {state.y.toString().padStart(2,'0')}</span></div>
  </div>;
}
