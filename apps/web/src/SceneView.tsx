import { useEffect, useRef, useState } from 'react';
import type { GameMap, GameState } from '@jy/game-core';
import type { SceneRenderer } from './renderer';

export function MiniMap({map,state}:{map:GameMap;state:GameState}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
    const scale=192/Math.max(map.width,map.height);canvas.width=192;canvas.height=192;
    ctx.fillStyle='#e4dfcd';ctx.fillRect(0,0,192,192);
    ctx.fillStyle='#8d9986';map.blocked.forEach(cell=>ctx.fillRect(cell%map.width*scale,Math.floor(cell/map.width)*scale,Math.ceil(scale),Math.ceil(scale)));
    ctx.fillStyle='#bf9142';map.portals.forEach(p=>ctx.fillRect(p.x*scale,p.y*scale,scale,scale));
    ctx.fillStyle='#b7673c';map.npcs.forEach(n=>ctx.fillRect(n.x*scale,n.y*scale,Math.max(scale,3),Math.max(scale,3)));
    ctx.fillStyle='#123e36';ctx.beginPath();ctx.arc((state.x+0.5)*scale,(state.y+0.5)*scale,Math.max(3,scale*0.23),0,Math.PI*2);ctx.fill();
  },[map,state.x,state.y]);
  return <canvas ref={ref} className="mini-map" aria-label={`地圖位置：${state.x}, ${state.y}`}/>;
}

export function SceneView({map,state,onInteract}:{map:GameMap;state:GameState;onInteract:(id:string)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<SceneRenderer|null>(null);
  const latest=useRef({state,onInteract});latest.current={state,onInteract};
  const [error,setError]=useState(''),[ready,setReady]=useState(false);
  useEffect(()=>{
    let cancelled=false;setReady(false);setError('');
    import('./renderer').then(({createRenderer})=>{
      if(cancelled||!canvas.current)return;
      renderer.current=createRenderer(canvas.current,map,latest.current.state,id=>latest.current.onInteract(id));setReady(true);
    }).catch(()=>{if(!cancelled)setError('此裝置暫時無法啟用 3D，可使用平面地圖與操作按鈕繼續測試。');});
    return()=>{cancelled=true;renderer.current?.dispose();renderer.current=null;};
  },[map]);
  useEffect(()=>{renderer.current?.update(state);},[state]);
  return <div className="scene-frame" data-renderer={ready?'ready':error?'fallback':'loading'}>
    <canvas ref={canvas} className="world-canvas" aria-label="固定斜角 3D 遊戲場景"/>
    {!ready&&!error&&<div className="scene-loading"><span className="seal">行</span>正在鋪展江湖…</div>}
    {error&&<div className="scene-fallback"><MiniMap map={map} state={state}/><p role="status">{error}</p></div>}
    <div className="scene-caption"><span className="status-dot"/>固定斜角 · 占位美術<span className="coordinates">{state.x.toString().padStart(2,'0')} / {state.y.toString().padStart(2,'0')}</span></div>
  </div>;
}
