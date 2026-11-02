import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, dispatch, resolveContent, restoreSave, serializeSave, validatePackageSchema } from '@jy/game-core';
import type { Command, ContentPackage, GameState, ResolvedContent } from '@jy/game-core';
import mock from '../../../tests/fixtures/mock-wuxia-package.json';
import greetingMod from '../../../tests/fixtures/mock-greeting-mod.json';
import { MiniMap, SceneView } from './SceneView';
import { loadGame, saveGame, saveKey } from './storage';
import { SCREEN_BUTTONS, createMovementController, screenToGridDirection } from './view-controls';

type Session={content:ResolvedContent;state:GameState;original:boolean};
const messages:Record<string,string>={MOVE_BLOCKED:'前方無法通行。',PLAYER_MOVED:'',MAP_CHANGED:'已進入新場景。',EVENT_STARTED:'對話開始。',DIALOGUE:'對話進行中。',CHOICE:'請選擇回應。',EVENT_ENDED:'對話結束。'};

export default function App(){
  const [session,setSession]=useState<Session|null>(null),sessionRef=useRef<Session|null>(null);
  const [busy,setBusy]=useState(true),busyRef=useRef(true),generation=useRef(0);
  const [error,setError]=useState(''),[notice,setNotice]=useState('正在準備場景…');
  const [modEnabled,setModEnabled]=useState(false),[originalPackage,setOriginalPackage]=useState<ContentPackage|null>(null);
  const [log,setLog]=useState<string[]>([]);
  const originalInput=useRef<HTMLInputElement>(null),saveInput=useRef<HTMLInputElement>(null);
  function apply(next:Session){sessionRef.current=next;setSession(next);}
  function loading(value:boolean){busyRef.current=value;setBusy(value);}
  function announce(message:string){if(!message)return;setNotice(message);setLog(old=>[message,...old].slice(0,5));}
  function problem(cause:unknown){
    const code=(cause as {diagnostics?:{code:string}[]})?.diagnostics?.[0]?.code;
    const friendly:Record<string,string>={SAVE_CONTENT_MISMATCH:'這份存檔使用的內容包或 MOD 不同。請先載入相同版本的內容組合；目前進度與存檔都已保留。',
      NPC_REACH:'請先走到人物相鄰的一格，再開始對話。',SAVE_SCHEMA:'這不是此版本可讀取的存檔，或檔案內容不完整。',SAVE_JSON:'存檔不是有效的 JSON，請重新選擇檔案。',
      STATE_CURSOR:'存檔中的對話位置無法恢復，目前進度已保留。',SCHEMA:'內容包格式不完整或版本不相容，請使用準備工具產生的預覽包。'};
    const raw=cause instanceof Error?cause.message:'操作失敗，現有進度已保留。';setError(code&&friendly[code]?friendly[code]:raw);
  }
  async function start(pkg:unknown,withMod:boolean,original:boolean){
    const ticket=++generation.current;loading(true);setError('');
    try{
      if(!globalThis.crypto?.subtle)throw new Error('請使用 HTTPS 或 localhost 開啟網站，才能驗證內容包與存檔。');
      const content=await resolveContent(withMod?[pkg,greetingMod]:[pkg]);
      if(ticket!==generation.current)return;
      apply({content,state:createGame(content,42),original});setModEnabled(withMod);
      announce(original?'已載入本機原版預覽切片。':'已進入原創試玩場景。先和身旁的引路人聊聊吧。');
    }catch(cause){if(ticket===generation.current)problem(cause);}
    finally{if(ticket===generation.current)loading(false);}
  }
  useEffect(()=>{void start(mock,false,false);return()=>{generation.current++;};},[]);

  const send=useCallback((command:Command)=>{
    const current=sessionRef.current;if(!current||busyRef.current)return;
    try{const next=dispatch(current.content,current.state,command);apply({...current,state:next.state});setError('');
      const feedback=next.notifications.map(n=>messages[n.type]??n.type).filter(Boolean).join(' ');
      if(feedback)announce(feedback);
    }catch(cause){problem(cause);}
  },[]);
  const interact=useCallback((id?:string)=>{
    const current=sessionRef.current;if(!current||busyRef.current)return;
    if(current.state.cursor){if(current.state.cursor.waiting==='dialogue')send({type:'CONTINUE'});return;}
    const map=current.content.maps[current.state.mapId]!;
    const npc=id?map.npcs.find(n=>n.id===id):map.npcs.find(n=>Math.abs(n.x-current.state.x)+Math.abs(n.y-current.state.y)===1);
    if(!npc){announce('走到引路人相鄰的一格，再按 E 或「互動」。');return;}
    send({type:'INTERACT',npcId:npc.id});
  },[send]);
  useEffect(()=>{
    const movement=createMovementController(direction=>send({type:'MOVE',direction}),
      ()=>!!sessionRef.current&&!busyRef.current&&!sessionRef.current.state.cursor,
      {schedule:(callback,delay)=>window.setTimeout(callback,delay),cancel:id=>window.clearTimeout(id)});
    const handler=(event:KeyboardEvent)=>{
      if(event.ctrlKey||event.altKey||event.metaKey||event.isComposing){movement.clear();return;}
      const target=event.target as HTMLElement;
      if(target.closest('input,select,textarea,[contenteditable="true"]')){movement.clear();return;}
      if(movement.keyDown(event.key)){event.preventDefault();return;}
      if(!target.closest('button,a')&&['e','E','Enter',' '].includes(event.key)){
        event.preventDefault();movement.clear();if(!event.repeat)interact();
      }
    };
    const release=(event:KeyboardEvent)=>{if(movement.keyUp(event.key))event.preventDefault();};
    const stop=()=>movement.clear();
    const visibility=()=>{if(document.hidden)stop();};
    window.addEventListener('keydown',handler);window.addEventListener('keyup',release);
    window.addEventListener('blur',stop);document.addEventListener('visibilitychange',visibility);
    return()=>{movement.clear();window.removeEventListener('keydown',handler);window.removeEventListener('keyup',release);
      window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility);};
  },[send,interact]);

  async function importOriginal(file?:File){
    if(!file)return;loading(true);setError('');
    try{
      if(file.size>16_000_000)throw new Error('預覽包超過 16 MB，請選擇由準備工具產生的單場景切片。');
      const bundle=JSON.parse(await file.text());const pkg=bundle.package??bundle;
      if(!validatePackageSchema(pkg)||pkg.manifest.kind!=='base'||pkg.manifest.classification!=='original-derived')throw new Error('請選擇有效的原版預覽內容包。原始 DOS 檔案需先由準備工具轉換。');
      const content=await resolveContent([pkg]);
      setOriginalPackage(pkg);setModEnabled(false);apply({content,state:createGame(content,42),original:true});
      announce('原版預覽包已在本機載入。此切片僅含部分對話與占位場景。');
    }catch(cause){problem(cause);}finally{loading(false);if(originalInput.current)originalInput.current.value='';}
  }
  function save(){const current=sessionRef.current;if(!current)return;try{const existed=localStorage.getItem(saveKey(current.content))!==null;saveGame(localStorage,current.content,current.state);setError('');announce(existed?'已儲存到這個瀏覽器；上一份進度已保留為備份。':'已儲存第一份本機進度，可匯出存檔作為備份。');}catch(cause){problem(cause);}}
  function load(backup=false){const current=sessionRef.current;if(!current)return;try{const state=loadGame(localStorage,current.content,backup);apply({...current,state});setError('');announce(backup?'已還原上一份備份。':'已讀取本機進度。');}catch(cause){problem(cause);}}
  function download(){const current=sessionRef.current;if(!current)return;try{const raw=serializeSave(current.content,current.state);const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='jianghu-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('已匯出存檔，請保留下載的 JSON 檔。');}catch(cause){problem(cause);}}
  async function importSave(file?:File){
    const current=sessionRef.current;if(!file||!current)return;loading(true);setError('');
    try{if(file.size>8_000_000)throw new Error('存檔超過 8 MB。');const raw=await file.text();const state=restoreSave(current.content,raw);apply({...current,state});announce('已匯入進度，尚未覆寫瀏覽器本機存檔。');}
    catch(cause){problem(cause);}finally{loading(false);if(saveInput.current)saveInput.current.value='';}
  }
  const state=session?.state,content=session?.content,map=state&&content?.maps[state.mapId];
  const cursor=state?.cursor,step=cursor&&content?.events[cursor.eventId]?.steps[cursor.pc];
  const dialogue=step?.op==='say'?content?.dialogues[step.dialogueId]:null;
  const adjacent=map&&state?map.npcs.find(n=>Math.abs(n.x-state.x)+Math.abs(n.y-state.y)===1):undefined;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="./" aria-label="江湖初行首頁"><span className="brand-seal">俠</span><span>江湖初行<small>A WUXIA JOURNEY</small></span></a><div className="top-meta"><span className="live-indicator"/>場景試玩<span className="version">MVP 01</span></div></header>
    <main>
      <section className="page-heading"><div><p className="eyebrow">一方天地，一段江湖</p><h1>從此處，踏入江湖。</h1><p className="intro">走近一位引路人，開始你的第一段對話。</p></div><span className="edition-label">{session?.original?'本機原版切片':'原創測試內容 · Mock'}</span></section>
      <div className="play-layout">
        <section className="play-column" aria-label="遊戲區">
          <div className="map-heading"><div><span className="map-label">目前所在</span><h2>{map?.name.replace(/^Mock /,'')??'準備場景'}</h2></div><span className="map-kind">{session?.original?'唯讀對話預覽':'練習 · 探索 · 對話'}</span></div>
          <div className="stage">{map&&state?<SceneView map={map} state={state} onInteract={interact}/>:<div className="initial-loading">正在準備江湖…</div>}
            {dialogue&&<section className="dialogue-panel" aria-label="對話"><div className="speaker-avatar">言</div><div className="dialogue-copy"><p className="speaker">{dialogue.speaker.startsWith('portrait:')?'對方':dialogue.speaker.replace(/^Mock /,'')}</p><p className="dialogue-text">{dialogue.text}</p><button className="continue-button" onClick={()=>send({type:'CONTINUE'})} disabled={busy}>繼續 <span>↵</span></button></div></section>}
            {step?.op==='choice'&&<section className="dialogue-panel choices" aria-label="選擇回應"><p className="speaker">你的回應</p>{step.options.map((option,i)=><button key={i} onClick={()=>send({type:'CHOOSE',option:i})} disabled={busy}><span>0{i+1}</span>{option.text}<b>→</b></button>)}</section>}
          </div>
          <div className="control-bar"><div className="direction-pad screen-directions" aria-label="依畫面方向移動">{SCREEN_BUTTONS.map(button=><button key={button.name} style={{gridArea:button.name}} aria-label={button.label} disabled={busy||!!cursor} onClick={()=>{const direction=screenToGridDirection(button.x,button.y);if(direction)send({type:'MOVE',direction});}}>{button.arrow}</button>)}<span className="pad-center" aria-hidden="true">◇</span></div><div className="keyboard-hint"><b>方向鍵 / WASD</b><span>依畫面方向移動 · 組合兩鍵斜走</span></div><button className="primary interact-button" disabled={busy||(!adjacent&&!cursor)||step?.op==='choice'} onClick={()=>interact()}>{cursor?'繼續對話':'與鄰近人物互動'}<kbd>E</kbd></button></div>
          <div className="feedback" role="status" aria-live="polite"><span className="feedback-mark">◇</span>{notice}</div>
          {error&&<div className="error-panel" role="alert"><strong>這次操作未完成</strong><p>{error}</p><button onClick={()=>setError('')}>關閉訊息</button></div>}
        </section>
        <aside className="sidebar">
          <section className="side-card map-card"><div className="card-title"><h3>行跡</h3><span>MAP</span></div>{map&&state&&<MiniMap map={map} state={state}/>}<div className="map-legend"><span><i className="jade-dot"/>你</span><span><i className="ochre-dot"/>人物</span><span><i className="gold-dot"/>出口</span></div></section>
          <section className="side-card"><div className="card-title"><h3>行囊</h3><span>INVENTORY</span></div>{state&&Object.entries(state.inventory).some(([,n])=>n>0)?<ul className="inventory-list">{Object.entries(state.inventory).filter(([,n])=>n>0).map(([id,n])=><li key={id}><span>{content?.items[id]?.name.replace(/^Mock /,'')}</span><b>× {n}</b></li>)}</ul>:<p className="muted empty-inventory">輕裝上路，尚無隨身物品。</p>}</section>
          <section className="side-card"><div className="card-title"><h3>留存江湖</h3><span>SAVE</span></div><div className="save-buttons"><button className="primary" onClick={save} disabled={busy||!session}>儲存進度</button><button onClick={()=>load()} disabled={busy||!session}>讀取進度</button></div><div className="text-actions"><button onClick={download} disabled={busy||!session}>匯出存檔</button><button onClick={()=>saveInput.current?.click()} disabled={busy||!session}>匯入存檔</button><button onClick={()=>load(true)} disabled={busy||!session}>上一份備份</button></div><p className="fine-print">存檔留在此瀏覽器。換裝置前可先匯出備份。</p></section>
          <details className="side-card content-settings"><summary>內容與測試設定</summary><label className="mod-toggle"><input type="checkbox" checked={modEnabled} disabled={busy||session?.original} onChange={e=>void start(mock,e.target.checked,false)}/><span>啟用原創問候 MOD<small>切換後從入口重新開始。</small></span></label><button className="wide" disabled={busy} onClick={()=>originalInput.current?.click()}>匯入本機原版預覽包</button><p className="fine-print">選取準備工具產生的 JSON。檔案只在裝置內讀取。</p><div className="content-actions"><button disabled={busy} onClick={()=>void start(mock,modEnabled&&!session?.original,false)}>回到原創場景</button><button disabled={busy||!session} onClick={()=>void start(session?.original?originalPackage:mock,modEnabled,!!session?.original)}>重新開始</button></div></details>
        </aside>
      </div>
      <section className="journey-notes"><div><p className="eyebrow">小小的第一步</p><h3>一位引路人，兩處風景。</h3></div><ol><li><b>01</b><span>與身旁人物對話<br/><small>試著領取一枚練習銅錢</small></span></li><li><b>02</b><span>走向金色圓環<br/><small>探索庭院，再回到練功房</small></span></li><li><b>03</b><span>保存這一刻<br/><small>對話途中也能存檔續行</small></span></li></ol></section>
      {log.length>0&&<details className="journey-log"><summary>最近行程</summary><ul>{log.map((entry,i)=><li key={`${i}-${entry}`}>{entry}</li>)}</ul></details>}
    </main>
    <footer><span>江湖初行 <i>·</i> JY Web Remake</span><span>占位美術／原創測試內容。非原版遊戲完整重製。</span></footer>
    <input ref={originalInput} type="file" accept=".json,application/json" hidden aria-label="選擇原版預覽包" onChange={event=>void importOriginal(event.target.files?.[0])}/>
    <input ref={saveInput} type="file" accept=".json,application/json" hidden aria-label="選擇存檔" onChange={event=>void importSave(event.target.files?.[0])}/>
  </div>;
}
