import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, dispatch, dispatchUnifiedWorld, migrateLegacySave, resolveContent,
  resolveControlledEventContent, restoreSave, restoreUnifiedSession, serializeSave,
  serializeUnifiedSession, validatePackageSchema, createUnifiedSession, enterUnifiedControlled } from '@jy/game-core';
import type { Command, ContentPackage, GameState, ResolvedContent, ResolvedControlledEventContent,
  BoundControlledEventContent, ControlledEventState, UnifiedSessionContent, UnifiedSessionState } from '@jy/game-core';
import mock from '../../../tests/fixtures/mock-wuxia-package.json';
import greetingMod from '../../../tests/fixtures/mock-greeting-mod.json';
import { MiniMap, SceneView } from './SceneView';
import type { RegionVisualCell } from './SceneView';
import { loadGame, loadUnifiedSession, saveGame, saveKey, saveUnifiedSession, unifiedSaveKey,
  saveCombined, loadCombined, combinedSaveKey } from './storage';
import { SCREEN_BUTTONS, createMovementController, screenToGridDirection, VIEW_CAMERA } from './view-controls';
import type { CameraView } from './view-controls';
import { placePrimitive } from '../../../packages/game-data/src/visual-primitive';
import { decodeLocalModel } from '../../../packages/game-data/src/local-model';
import { replaceModelInstances } from '../../../packages/game-data/src/model-replacement';
import {decodeProjectedMap} from '../../../packages/game-data/src/projected-map';
import type {ProjectedMap} from '../../../packages/game-data/src/projected-map';
import { ControlledDemo } from './ControlledDemo';
import { OriginalEventsPreview } from './original-events-preview';
import { resolveMockControlledForHost } from './mock-controlled';
import { resolveOriginalEventsForHost } from './original-controlled';
import { bindObserved673, dispatchObserved673, observed673Aptitude, observed673SaveKey,
  observed673Slot, restoreObserved673, serializeObserved673 } from './original-673-web';
import type { Observed673Runtime } from './original-673-web';

/** MVP NPC collision: world positions that trigger original events via scene slots.
 * Key: "mapId/x/y" → Value: "scene/slot" (ALLDEF.GRP mapping).
 * These are test positions in the Mock world that correspond to known scene slots. */
const SCENE_SLOT_POSITIONS: Record<string, string> = {
  'mock.wuxia:map/room/5/5': '0/0',    // Event 1 (scene 0, slot 0)
  'mock.wuxia:map/room/10/10': '32/0',  // Event 1 (scene 32, slot 0)
  'mock.wuxia:map/room/15/15': '53/0',  // Event 533 (scene 53, slot 0 - 擂鼓山)
};

type Session={content:ResolvedContent;state:GameState;original:boolean};
type UnifiedRuntime={content:UnifiedSessionContent;state:UnifiedSessionState};
const messages:Record<string,string>={MOVE_BLOCKED:'前方無法通行。',PLAYER_MOVED:'',MAP_CHANGED:'已進入新場景。',EVENT_STARTED:'對話開始。',DIALOGUE:'對話進行中。',CHOICE:'請選擇回應。',EVENT_ENDED:'對話結束。'};

export default function App(){
  const [session,setSession]=useState<Session|null>(null),sessionRef=useRef<Session|null>(null);
  const [unified,setUnified]=useState<UnifiedRuntime|null>(null),unifiedRef=useRef<UnifiedRuntime|null>(null);
  const [observed673,setObserved673]=useState<Observed673Runtime|null>(null),observed673Ref=useRef<Observed673Runtime|null>(null);
  const observed673BundleRef=useRef<unknown>(null);
  const availableUnifiedRef=useRef<UnifiedSessionContent|null>(null);
  const [busy,setBusy]=useState(true),busyRef=useRef(true),generation=useRef(0);
  const [error,setError]=useState(''),[notice,setNotice]=useState('正在準備場景…');
  const [modEnabled,setModEnabled]=useState(false),[originalPackage,setOriginalPackage]=useState<ContentPackage|null>(null);
  const [regionCells,setRegionCells]=useState<RegionVisualCell[]>([]);
  const [projectedMap,setProjectedMap]=useState<ProjectedMap>();
  const [regionBaseline,setRegionBaseline]=useState<RegionVisualCell[]>([]),[modelId,setModelId]=useState(''),[replacementInfo,setReplacementInfo]=useState('');
  const [regionNotes,setRegionNotes]=useState<string[]>([]);
  const [cameraView,setCameraView]=useState<CameraView>(VIEW_CAMERA),cameraViewRef=useRef<CameraView>(VIEW_CAMERA);
  const updateCameraView=useCallback((view:CameraView)=>{cameraViewRef.current=view;setCameraView(view);},[]);
  const [cutaway,setCutaway]=useState(false);
  const [gamePanel,setGamePanel]=useState<'map'|'inventory'|'save'|'sceneSlot'|null>(null);
  const [controlledDemo,setControlledDemo]=useState(false);
  const controlledDemoRef=useRef(false);
  const [controlledLocation,setControlledLocation]=useState<{mapId:string;x:number;y:number}|null>(null);
  useEffect(()=>{controlledDemoRef.current=controlledDemo;},[controlledDemo]);
  const [originalEvents,setOriginalEvents]=useState<ResolvedControlledEventContent|null>(null);
  const [originalEventsBound,setOriginalEventsBound]=useState<BoundControlledEventContent|null>(null);
  const originalEventsTargetRef=useRef<string|null>(null);
  const originalEventStateRef=useRef<ControlledEventState|null>(null);
  const [showOriginalEvents,setShowOriginalEvents]=useState(false);
  const [currentOriginalScene,setCurrentOriginalScene]=useState<number|null>(null);
  const [selectedItem,setSelectedItem]=useState('');
  const [log,setLog]=useState<string[]>([]);
  const originalInput=useRef<HTMLInputElement>(null),regionInput=useRef<HTMLInputElement>(null),saveInput=useRef<HTMLInputElement>(null);
  const modelInput=useRef<HTMLInputElement>(null),originalEventsInput=useRef<HTMLInputElement>(null);
  function clearModelReplacement(){setRegionBaseline([]);setModelId('');setReplacementInfo('');}
  function apply(next:Session){sessionRef.current=next;setSession(next);}
  function applyUnified(next:UnifiedRuntime|null){unifiedRef.current=next;setUnified(next);}
  function applyObserved673(next:Observed673Runtime|null){observed673Ref.current=next;setObserved673(next);}
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
    const ticket=++generation.current;loading(true);setError('');applyUnified(null);applyObserved673(null);observed673BundleRef.current=null;availableUnifiedRef.current=null;controlledDemoRef.current=false;setControlledDemo(false);setControlledLocation(null);setOriginalEvents(null);setShowOriginalEvents(false);setRegionCells([]);setProjectedMap(undefined);setRegionNotes([]);setCutaway(false);clearModelReplacement();
    try{
      if(!globalThis.crypto?.subtle)throw new Error('請使用 HTTPS 或 localhost 開啟網站，才能驗證內容包與存檔。');
      const content=await resolveContent(withMod?[pkg,greetingMod]:[pkg]);
      let existingUnified:UnifiedSessionContent|null=null;
      if(!original&&content.maps['mock.wuxia:map/room']){
        const bound=await resolveMockControlledForHost(content);
        const pair={host:content,controlled:bound};
        if(localStorage.getItem(unifiedSaveKey(pair))!==null)existingUnified=pair;
      }
      if(ticket!==generation.current)return;
      apply({content,state:createGame(content,42),original});availableUnifiedRef.current=existingUnified;setModEnabled(withMod);
      announce(original?'已載入本機原版預覽切片。':'已進入原創試玩場景。先和身旁的引路人聊聊吧。');
    }catch(cause){if(ticket===generation.current)problem(cause);}
    finally{if(ticket===generation.current)loading(false);}
  }
  useEffect(()=>{
    const ticket=++generation.current;
    const controller=new AbortController();
    async function bootstrap(){
      if(location.hostname==='127.0.0.1'&&['4173','5173'].includes(location.port)){
        try{
          const response=await fetch('/__local-world.json',{signal:controller.signal});
          if(response.ok&&response.headers.get('content-type')?.includes('application/json')){
            const file=new File([await response.blob()],'world.local.json');
            if(ticket===generation.current)await importRegionPreview(file);
            return;
          }
        }catch{ /* A local preview can run without the generated world. */ }
      }
      if(ticket===generation.current)await start(mock,false,false);
    }
    void bootstrap();
    return()=>{controller.abort();generation.current++;};
  },[]);

  const send=useCallback((command:Command)=>{
    const current=sessionRef.current;if(!current||busyRef.current)return;
    try{const observed=observed673Ref.current;
      if(observed){const next=dispatchObserved673(observed,command);applyObserved673(next.runtime);
        apply({...current,state:next.runtime.state.game});setError('');
        const feedback=next.notices.map(n=>messages[n]??n).filter(Boolean).join(' ');if(feedback)announce(feedback);return;}
      const runtime=unifiedRef.current;
      const next=runtime&&runtime.content.host===current.content?
        dispatchUnifiedWorld(runtime.content,runtime.state,command):dispatch(current.content,current.state,command);
      if(runtime&&runtime.content.host===current.content)applyUnified({...runtime,state:next.state as UnifiedSessionState});
      apply({...current,state:runtime&&runtime.content.host===current.content?(next.state as UnifiedSessionState).game:next.state as GameState});setError('');
      const feedback=next.notifications.map(n=>messages[n.type]??n.type).filter(Boolean).join(' ');
      if(feedback)announce(feedback);
    }catch(cause){problem(cause);}
  },[]);
  const interact=useCallback((id?:string)=>{
    const current=sessionRef.current;if(!current||busyRef.current)return;
    if(controlledDemoRef.current)return;
    if(observed673Ref.current?.state.original.event.cursor){send({type:'CONTINUE'});return;}
    if(unifiedRef.current?.state.mode==='controlled'){announce('請先繼續受控事件。');return;}
    if(current.state.cursor){if(current.state.cursor.waiting==='dialogue')send({type:'CONTINUE'});return;}
    const map=current.content.maps[current.state.mapId]!;
    // Scene slot position check (MVP NPC collision): if the player is at a position
    // mapped to a scene slot, trigger that event instead of a Mock NPC interaction.
    if(originalEvents) {
      const posKey = `${current.state.mapId}/${current.state.x}/${current.state.y}`;
      const slotKey = SCENE_SLOT_POSITIONS[posKey];
      if (slotKey) {
        const parts = slotKey.split('/');
        const sceneId = Number(parts[0]);
        const slotId = Number(parts[1]);
        if (Number.isInteger(sceneId) && Number.isInteger(slotId)) {
          triggerSceneSlotEvent(sceneId, slotId);
          return;
        }
      }
    }
    const npc=id?map.npcs.find(n=>n.id===id):map.npcs.find(n=>Math.abs(n.x-current.state.x)+Math.abs(n.y-current.state.y)===1);
    if(!npc){announce('走到引路人相鄰的一格，再按 E 或「互動」。');return;}
    send({type:'INTERACT',npcId:npc.id});
  },[send]);
  useEffect(()=>{
    const movement=createMovementController(direction=>send({type:'MOVE',direction}),
      ()=>!!sessionRef.current&&!busyRef.current&&!sessionRef.current.state.cursor&&!observed673Ref.current?.state.original.event.cursor&&!controlledDemoRef.current&&unifiedRef.current?.state.mode!=='controlled',
      {schedule:(callback,delay)=>window.setTimeout(callback,delay),cancel:id=>window.clearTimeout(id)},()=>cameraViewRef.current);
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
  // Announce scene changes from controlled events (MVP scene transition tracking).
  const prevSceneRef=useRef<number|null>(null);
  useEffect(()=>{
    if(currentOriginalScene!==null&&currentOriginalScene!==prevSceneRef.current){
      if(prevSceneRef.current!==null)announce(`已切換到場景 ${currentOriginalScene}。`);
      prevSceneRef.current=currentOriginalScene;
    }
  },[currentOriginalScene]);

  async function importOriginal(file?:File, suppliedBundle?:unknown){
    if(!file&&!suppliedBundle)return;loading(true);setError('');
    applyUnified(null);availableUnifiedRef.current=null;controlledDemoRef.current=false;setControlledDemo(false);setControlledLocation(null);
    try{
      if(file&&file.size>16_000_000)throw new Error('預覽包超過 16 MB，請選擇由準備工具產生的單場景切片。');
      const bundle=suppliedBundle??JSON.parse(await file!.text());const pkg=bundle.package??bundle;
      if(!validatePackageSchema(pkg)||pkg.manifest.kind!=='base'||pkg.manifest.classification!=='original-derived')throw new Error('請選擇有效的原版預覽內容包。原始 DOS 檔案需先由準備工具轉換。');
      const content=await resolveContent([pkg]);
      const is673=pkg.manifest.id==='original.jy.observed673';
      const observed=is673?await bindObserved673(content,bundle.observedEvent673):null;
      applyObserved673(observed);observed673BundleRef.current=observed?bundle:null;
      setRegionCells([]);setProjectedMap(undefined);setRegionNotes([]);setCutaway(false);clearModelReplacement();setOriginalPackage(pkg);setModEnabled(false);apply({content,state:observed?.state.game??createGame(content,42),original:true});
      announce(observed?'已載入事件 673 本機採樣切片。前置資質採 DOS 觀察值 72。':'原版預覽包已在本機載入。此切片僅含部分對話與占位場景。');
    }catch(cause){problem(cause);}finally{loading(false);if(originalInput.current)originalInput.current.value='';}
  }
  async function importOriginalEvents(file?:File){
    if(!file)return;loading(true);setError('');
    try{
      if(file.size>16_000_000)throw new Error('預覽包超過 16 MB，請選擇轉換工具產生的 original.jy.events 內容包。');
      const parsed=JSON.parse(await file.text());
      if(parsed?.schemaVersion!==3||parsed?.id!=='original.jy.events'||parsed?.classification!=='original-derived')throw new Error('請選擇有效的 original.jy.events 受控事件包（由 convert_original_events_generic 產生）。');
      const content=await resolveControlledEventContent(parsed);
      setOriginalEvents(content);setShowOriginalEvents(true);
      // Bind to host for unified session integration (MVP: events become part of game save).
      if(sessionRef.current){
        const bound=await resolveOriginalEventsForHost(sessionRef.current.content, parsed);
        setOriginalEventsBound(bound);
      }
      announce(`已載入原版事件包：${Object.keys(content.data.events).length} 筆事件、${Object.keys(content.data.dialogues).length} 段對話。`);
    }catch(cause){problem(cause);}finally{loading(false);if(originalEventsInput.current)originalEventsInput.current.value='';}
  }
  /** Trigger an original event from a scene slot, opening the preview with the event started (MVP). */
  function triggerSceneSlotEvent(sceneId: number, slotId: number) {
    const bound = originalEvents;
    if (!bound) return;
    const key = `${sceneId}/${slotId}`;
    const eventId = bound.data.sceneSlots?.[key];
    if (!eventId) { setError(`場景 ${sceneId} 槽 ${slotId} 沒有事件。`); return; }
    // Open the preview panel with the event pre-selected via the ref.
    setShowOriginalEvents(true);
    setGamePanel(null);
    setError('');
    announce(`已定位事件 ${eventId}（場景 ${sceneId} 槽 ${slotId}）。在測試面板中啟動。`);
    // Store the target event ID so the preview can auto-start it.
    originalEventsTargetRef.current = `${bound.data.id}:event/${eventId}`;
  }
  async function importRegionPreview(file?:File){
    if(!file)return;loading(true);setError('');
    applyObserved673(null);observed673BundleRef.current=null;
    applyUnified(null);availableUnifiedRef.current=null;controlledDemoRef.current=false;setControlledDemo(false);setControlledLocation(null);
    try{
      if(file.size>16_000_000)throw new Error('預覽包超過 16 MB，請選擇由準備工具產生的區域預覽。');
      const bundle=JSON.parse(await file.text());const pkg=bundle.package??bundle;
      if(!validatePackageSchema(pkg)||pkg.manifest.kind!=='base')throw new Error('請選擇有效的地圖區域預覽包。');
      const content=await resolveContent([pkg]);
      const projected=bundle.projectedMap?await decodeProjectedMap(bundle.projectedMap):undefined;
      if(projected&&(projected.width!==content.maps[content.entry.mapId]!.width||projected.height!==content.maps[content.entry.mapId]!.height))throw new Error('PROJECTED_MAP_SIZE');
      const cells:RegionVisualCell[]=Array.isArray(bundle?.assembled?.cells)?bundle.assembled.cells:[];
      if(projected&&cells.length)throw new Error('PROJECTED_AMBIGUOUS');
      if(cells.length>4096)throw new Error('REGION_CELL_LIMIT');
      let parts=0;
      let models=0;
      for(const cell of cells){
        if(!Array.isArray(cell.assets))throw new Error('REGION_ASSETS');
        for(const visual of cell.assets){
          if(visual.asset.cutaway!==undefined&&typeof visual.asset.cutaway!=='boolean')throw new Error('REGION_CUTAWAY');
          if(visual.asset.model){
            if(++models>32||![visual.world.x,visual.world.y,visual.world.z].every(Number.isFinite))throw new Error('LOCAL_MODEL_BUDGET_OR_ANCHOR');
            if(visual.asset.geometry)throw new Error('LOCAL_MODEL_AMBIGUOUS');
            const bytes=decodeLocalModel(visual.asset.model);
            const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);
            const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
            if(actual!==visual.asset.model.sha256)throw new Error('LOCAL_MODEL_HASH');
          }
          parts+=visual.asset.geometry?placePrimitive(visual.asset.geometry,visual.world).length:1;
          if(parts>8192)throw new Error('REGION_PART_LIMIT');
        }
      }
      const notes=bundle.previewNotes??[];
      if(!Array.isArray(notes)||notes.length>8||!notes.every((n:unknown)=>typeof n==='string'&&n.length<=200))throw new Error('REGION_NOTES');
      setRegionCells(cells);setProjectedMap(projected);setRegionBaseline(cells);setModelId('');setReplacementInfo('');setRegionNotes(notes);setCutaway(false);
      setOriginalPackage(null);setModEnabled(false);apply({content,state:createGame(content,42),original:!!projected});
      const omitted=Array.isArray(bundle.assembled?.unmapped)?bundle.assembled.unmapped.length:0;
      announce(projected?`完整地圖已載入：${projected.width}×${projected.height}，${projected.images.length} 個獨立圖片 ID；可用方向鍵持續探索。`:omitted?`本機地圖區域預覽已載入。${omitted} 種資源尚未呈現；碰撞仍依獨立地圖資料，空白處也可能無法通行。`:'本機地圖區域預覽已載入，使用明確定義的原創測試幾何。');
    }catch(cause){problem(cause);}finally{loading(false);if(regionInput.current)regionInput.current.value='';}
  }
  const modelOptions=Array.from(new Set(regionCells.flatMap(c=>c.assets.filter(v=>v.asset.model).map(v=>v.asset.model!.assetId))));
  const selectedModel=modelOptions.includes(modelId)?modelId:modelOptions[0]??'';
  async function importReplacement(file?:File){
    const current=sessionRef.current;if(!file||!current||!selectedModel)return;
    loading(true);setError('');
    try{
      if(file.size>4_000_000)throw new Error('模型檔案超過目前預覽上限 4 MB。');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const previous=regionCells.flatMap(c=>c.assets).find(v=>v.asset.model?.assetId===selectedModel)!.asset.model!;
      const digest=await crypto.subtle.digest('SHA-256',bytes.buffer);
      const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const chunks:string[]=[];for(let i=0;i<bytes.length;i+=16384)chunks.push(String.fromCharCode(...bytes.subarray(i,i+16384)));
      const dataUri='data:model/gltf-binary;base64,'+btoa(chunks.join(''));
      const candidate={...previous,dataUri,sha256};decodeLocalModel(candidate);
      const {inspectLocalModel}=await import('./model-inspection');
      const oldReport=await inspectLocalModel(previous),nextReport=await inspectLocalModel(candidate);
      if(sessionRef.current?.content!==current.content)throw new Error('模型檢查期間場景已變更，請重新選取。');
      const result=replaceModelInstances(regionCells,selectedModel,{dataUri,sha256},oldReport.bounds,nextReport.bounds);
      setRegionCells(result.cells);
      setReplacementInfo(`已替換 ${result.count} 個實例，保留原占位外框與底部位置；新模型 ${nextReport.triangles} 個三角面。`);
      announce('已替換本機模型，遊戲進度與碰撞未變。重新整理後需重新匯入。');
    }catch(cause){problem(cause);}finally{loading(false);if(modelInput.current)modelInput.current.value='';}
  }
  function save(){const current=sessionRef.current;if(!current)return;try{const runtime=unifiedRef.current;
    const observed=observed673Ref.current;
    if(observed){const key=observed673SaveKey(observed),raw=serializeObserved673(observed);
      const old=localStorage.getItem(key);if(old!==null)localStorage.setItem(key+':backup',old);
      localStorage.setItem(key,raw);setError('');announce(old?'已儲存採樣切片進度；上一份已備份。':'已儲存採樣切片進度。');return;}
    const evContent=originalEvents,evState=originalEventStateRef.current;
    const existed=localStorage.getItem(evContent?combinedSaveKey(current.content):runtime?unifiedSaveKey(runtime.content):saveKey(current.content))!==null;
    if(evContent)saveCombined(localStorage,current.content,current.state,evContent,evState??undefined);
    else if(runtime)saveUnifiedSession(localStorage,runtime.content,runtime.state);else saveGame(localStorage,current.content,current.state);
    setError('');announce(existed?'已儲存到這個瀏覽器；上一份進度已保留為備份。':'已儲存第一份本機進度，可匯出存檔作為備份。');}catch(cause){problem(cause);}}
  function load(backup=false){const current=sessionRef.current;if(!current)return;try{const runtime=unifiedRef.current;
    const observed=observed673Ref.current;
    if(observed){const raw=localStorage.getItem(observed673SaveKey(observed)+(backup?':backup':''));
      if(raw===null)throw new Error('尚無這份採樣切片存檔。');const next=restoreObserved673(observed,raw);
      applyObserved673(next);apply({...current,state:next.state.game});setError('');announce(backup?'已還原採樣切片備份。':'已讀取採樣切片進度。');return;}
    if(originalEvents){const {state,eventState}=loadCombined(localStorage,current.content,originalEvents,backup);
      apply({...current,state});if(eventState){originalEventStateRef.current=eventState;const scene=eventState.decision.values['original.jy:scene/current'];if(typeof scene==='number')setCurrentOriginalScene(scene);}setShowOriginalEvents(true);}
    else if(runtime){const state=loadUnifiedSession(localStorage,runtime.content,backup);applyUnified({...runtime,state});apply({...current,state:state.game});}
    else if(availableUnifiedRef.current){const pair=availableUnifiedRef.current;const state=loadUnifiedSession(localStorage,pair,backup);
      applyUnified({content:pair,state});apply({...current,state:state.game});}
    else{const state=loadGame(localStorage,current.content,backup);apply({...current,state});}
    setError('');announce(backup?'已還原上一份備份。':'已讀取本機進度。');}catch(cause){problem(cause);}}
  function download(){const current=sessionRef.current;if(!current)return;try{const runtime=unifiedRef.current;
    const observed=observed673Ref.current;
    const raw=observed?serializeObserved673(observed):runtime?serializeUnifiedSession(runtime.content,runtime.state):serializeSave(current.content,current.state);
    const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=observed?'observed-673-web-slice.json':runtime?'jianghu-session-v4.json':'jianghu-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('已匯出存檔，請保留下載的 JSON 檔。');}catch(cause){problem(cause);}}
  async function importSave(file?:File){
    const current=sessionRef.current;if(!file||!current)return;loading(true);setError('');
    try{if(file.size>8_000_000)throw new Error('存檔超過 8 MB。');const raw=await file.text();
      const observed=observed673Ref.current;
      if(observed){const next=restoreObserved673(observed,raw);applyObserved673(next);apply({...current,state:next.state.game});announce('已匯入採樣切片進度，尚未覆寫瀏覽器本機存檔。');return;}
      let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new Error('存檔不是有效的 JSON。');}
      const version=(parsed as {schemaVersion?:unknown})?.schemaVersion;
      const pair=unifiedRef.current?.content??availableUnifiedRef.current;
      if(version===4&&pair){const state=restoreUnifiedSession(pair,raw);
        applyUnified({content:pair,state});apply({...current,state:state.game});}
      else if(version===1&&unifiedRef.current){const runtime=unifiedRef.current;
        const state=migrateLegacySave(runtime.content,raw);applyUnified({...runtime,state});apply({...current,state:state.game});}
      else if(version===4)throw new Error('目前內容組合無法讀取統一工作階段存檔。');
      else{const state=restoreSave(current.content,raw);apply({...current,state});}
      announce('已匯入進度，尚未覆寫瀏覽器本機存檔。');}
    catch(cause){problem(cause);}finally{loading(false);if(saveInput.current)saveInput.current.value='';}
  }
  const state=session?.state,content=session?.content;
  const displayState=controlledDemo&&controlledLocation&&state?{...state,...controlledLocation}:state;
  const map=displayState&&content?.maps[displayState.mapId];
  const cursor=state?.cursor,step=cursor&&content?.events[cursor.eventId]?.steps[cursor.pc];
  const dialogue=step?.op==='say'?content?.dialogues[step.dialogueId]:null;
  const observedCursor=observed673?.state.original.event.cursor;
  const observedStep=observedCursor&&observed673.context.content.data.events[observedCursor.eventId]?.steps[observedCursor.pc];
  const observedDialogue=observedStep?.op==='say'?observed673?.context.content.data.dialogues[observedStep.dialogueId]:null;
  const adjacent=map&&state&&!controlledDemo?map.npcs.find(n=>Math.abs(n.x-state.x)+Math.abs(n.y-state.y)===1):undefined;
  const atSceneSlot=originalEvents&&session?SCENE_SLOT_POSITIONS[`${session.state.mapId}/${session.state.x}/${session.state.y}`]??null:null;
  const carriedItems=state&&content?Object.entries(state.inventory).filter(([id,count])=>count>0&&content.items[id]):[];
  const activeItemId=carriedItems?.some(([id])=>id===selectedItem)?selectedItem:carriedItems?.[0]?.[0]??'';
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="./" aria-label="江湖初行首頁"><span className="brand-seal">俠</span><span>江湖初行<small>A WUXIA JOURNEY</small></span></a><div className="top-meta"><span className="live-indicator"/>場景試玩<span className="version">MVP 01</span></div></header>
    <main>
      <section className="page-heading"><div><p className="eyebrow">一方天地，一段江湖</p><h1>從此處，踏入江湖。</h1><p className="intro">{projectedMap?"沿著道路探索世界，使用方向鍵或 WASD 持續行走。":"走近一位引路人，開始你的第一段對話。"}</p></div><span className="edition-label">{projectedMap?'本機完整世界':session?.original?'本機原版切片':'原創測試內容 · Mock'}</span></section>
      <div className="play-layout">
        <section className="play-column" aria-label="遊戲區">
          <div className="map-heading"><div><span className="map-label">目前所在</span><h2>{map?.name.replace(/^Mock /,'')??'準備場景'}</h2></div><span className="map-kind">{controlledDemo?'受控事件 · Mock':projectedMap?'世界探索':observed673?'事件 673 · 採樣測試':session?.original?'唯讀對話預覽':'練習 · 探索 · 對話'}</span></div>
          {observed673&&<p className="map-coordinate">測試前置：DOS 採樣資質 72（原始素材 50）；目前資質 <strong>{observed673Aptitude(observed673)}</strong> · 事件槽 <strong>{observed673Slot(observed673)}</strong> · X {state?.x} · Y {state?.y}。僅驗證此路徑，非原版存檔。</p>}
          {!controlledDemo&&unified?.state.mode==='controlled'&&<p className="map-coordinate">有待完成的 Mock 受控事件，請從「內容與測試設定」繼續。</p>}
          {projectedMap&&displayState&&<p className="map-coordinate">目前世界座標　<strong>X {displayState.x} · Y {displayState.y}</strong></p>}
          <div className="stage">{map&&displayState?<SceneView map={map} state={displayState} onInteract={controlledDemo?()=>{}:interact} regionCells={regionCells} projectedMap={projectedMap} cutaway={cutaway} view={cameraView} onViewChange={updateCameraView}/>:<div className="initial-loading">正在準備江湖…</div>}
            {!controlledDemo&&dialogue&&<section className="dialogue-panel" aria-label="對話"><div className="speaker-portrait" aria-hidden="true"><div className="portrait-head"/><div className="portrait-body"/></div><div className="dialogue-copy"><p className="speaker">{dialogue.speaker.startsWith('portrait:')?'對方':dialogue.speaker.replace(/^Mock /,'')}</p><p className="dialogue-text">{dialogue.text}</p><button className="continue-button" onClick={()=>send({type:'CONTINUE'})} disabled={busy}>繼續 <span>↵</span></button></div></section>}
            {observedDialogue&&<section className="dialogue-panel" aria-label="原版事件對話"><div className="speaker-portrait" aria-hidden="true"><div className="portrait-head"/><div className="portrait-body"/></div><div className="dialogue-copy"><p className="speaker">{observedDialogue.speaker.startsWith('portrait:')?'對方':observedDialogue.speaker}</p><p className="dialogue-text">{observedDialogue.text}</p><button className="continue-button" onClick={()=>send({type:'CONTINUE'})} disabled={busy}>繼續 <span>↵</span></button></div></section>}
            {!controlledDemo&&step?.op==='choice'&&<section className="dialogue-panel choices" aria-label="選擇回應"><p className="speaker">你的回應</p>{step.options.map((option,i)=><button key={i} onClick={()=>send({type:'CHOOSE',option:i})} disabled={busy}><span>0{i+1}</span>{option.text}<b>→</b></button>)}</section>}
            {controlledDemo&&content&&state&&<ControlledDemo host={content} initialGame={state} previousUnified={unified?.state}
              onClose={(next,bound)=>{const current=sessionRef.current;if(current){const pair={host:current.content,controlled:bound};availableUnifiedRef.current=pair;applyUnified({content:pair,state:next});apply({...current,state:next.game});}
                controlledDemoRef.current=false;setControlledDemo(false);setControlledLocation(null);}}
              onLocation={setControlledLocation}/>}
            {showOriginalEvents&&originalEvents&&<OriginalEventsPreview content={originalEvents} targetEventId={originalEventsTargetRef.current??undefined} initialState={originalEventStateRef.current??undefined} onStateChange={s=>{originalEventStateRef.current=s;if(s){const scene=s.decision.values['original.jy:scene/current'];if(typeof scene==='number')setCurrentOriginalScene(scene);}}} onClose={()=>{originalEventsTargetRef.current=null;originalEventStateRef.current=null;setShowOriginalEvents(false);}}/>}
            <div className="game-hud"><button aria-pressed={gamePanel==='map'} onClick={()=>setGamePanel(gamePanel==='map'?null:'map')}>地圖</button><button aria-pressed={gamePanel==='inventory'} disabled={controlledDemo} onClick={()=>setGamePanel(gamePanel==='inventory'?null:'inventory')}>行囊 {carriedItems?.length?`· ${carriedItems.length}`:''}</button><button aria-pressed={gamePanel==='save'} onClick={()=>setGamePanel(gamePanel==='save'?null:'save')}>存檔</button>{originalEvents&&<button aria-pressed={showOriginalEvents} onClick={()=>{setGamePanel(null);setShowOriginalEvents(!showOriginalEvents);}}>測試</button>}{originalEventsBound&&!controlledDemo&&<button aria-pressed={gamePanel==='sceneSlot'} onClick={()=>setGamePanel(gamePanel==='sceneSlot'?null:'sceneSlot')}>NPC</button>}{currentOriginalScene!==null&&<span className="scene-indicator" aria-label="目前原版場景">場景 {currentOriginalScene}</span>}</div>
            {gamePanel==='map'&&map&&displayState&&<section className="game-overlay map-overlay" aria-label="行跡地圖"><h3>行跡</h3><MiniMap map={map} state={displayState} view={cameraView}/><p>X {displayState.x} · Y {displayState.y}</p></section>}
            {gamePanel==='inventory'&&<section className="game-overlay inventory-overlay" aria-label="行囊"><h3>行囊</h3>{carriedItems?.length?<><ul className="game-inventory-list">{carriedItems.map(([id,count])=><li key={id}><button aria-pressed={activeItemId===id} onClick={()=>setSelectedItem(id)}>{content?.items[id]?.name.replace(/^Mock /,'')}<b>× {count}</b></button></li>)}</ul><article className="item-description"><h4>{content?.items[activeItemId]?.name.replace(/^Mock /,'')??'選擇一件道具'}</h4><p>{content?.items[activeItemId]?.description??'此道具尚無說明。'}</p></article></>:<p className="muted">行囊目前是空的。</p>}{originalEvents&&<button className="wide" onClick={()=>{setGamePanel(null);setShowOriginalEvents(true);}}>開啟測試面板</button>}<button className="overlay-close" onClick={()=>setGamePanel(null)}>收起</button></section>}
            {gamePanel==='save'&&<section className="game-overlay save-overlay" aria-label="存檔操作"><h3>留存江湖</h3>{controlledDemo?<p className="fine-print">受控事件的獨立存讀請使用測試面板。</p>:<><div className="save-buttons"><button className="primary" onClick={save} disabled={busy||!session}>儲存進度</button><button onClick={()=>load()} disabled={busy||!session}>讀取進度</button></div><div className="text-actions"><button onClick={download} disabled={busy||!session}>匯出存檔</button><button onClick={()=>saveInput.current?.click()} disabled={busy||!session}>匯入存檔</button><button onClick={()=>load(true)} disabled={busy||!session}>上一份備份</button></div></>}<button className="overlay-close" onClick={()=>setGamePanel(null)}>收起</button></section>}
            {gamePanel==='sceneSlot'&&originalEventsBound&&!controlledDemo&&<section className="game-overlay save-overlay" aria-label="場景槽觸發"><h3>NPC 互動</h3><p className="fine-print">輸入場景 ID 與槽號，觸發該位置的事件（ALLDEF.GRP 映射）。</p><div className="text-actions"><label>場景 <input type="number" min={0} max={99} placeholder="0" id="ss-scene"/></label><label>槽 <input type="number" min={0} max={199} placeholder="0" id="ss-slot"/></label><button className="primary" onClick={()=>{const s=Number((document.getElementById('ss-scene') as HTMLInputElement|null)?.value??'');const sl=Number((document.getElementById('ss-slot') as HTMLInputElement|null)?.value??'');setGamePanel(null);triggerSceneSlotEvent(s,sl);}}>觸發事件</button></div><button className="overlay-close" onClick={()=>setGamePanel(null)}>收起</button></section>}
          </div>
          <div className="control-bar"><div className="direction-pad screen-directions" aria-label="依畫面方向移動">{SCREEN_BUTTONS.map(button=><button key={button.name} style={{gridArea:button.name}} aria-label={button.label} disabled={busy||!!cursor||!!observedCursor||controlledDemo||unified?.state.mode==='controlled'} onClick={()=>{const direction=screenToGridDirection(button.x,button.y,cameraViewRef.current.alpha,cameraViewRef.current.gridYSign??1);if(direction)send({type:'MOVE',direction});}}>{button.arrow}</button>)}<span className="pad-center" aria-hidden="true">◇</span></div><div className="keyboard-hint"><b>方向鍵 / WASD</b><span>依畫面方向移動 · 組合兩鍵斜走</span></div><button className="primary interact-button" disabled={controlledDemo||unified?.state.mode==='controlled'||busy||(!adjacent&&!cursor&&!observedCursor&&!atSceneSlot)||step?.op==='choice'} onClick={()=>interact()}>{cursor||observedCursor?'繼續對話':atSceneSlot?'觸發場景事件':'與鄰近人物互動'}<kbd>E</kbd></button></div>
          <div className="feedback" role="status" aria-live="polite"><span className="feedback-mark">◇</span>{notice}</div>
          {regionNotes.length>0&&<section aria-label="預覽說明">{regionNotes.map((note,i)=><p className="fine-print" key={i}>{note}</p>)}</section>}
          {regionCells.some(c=>c.assets.some(v=>v.asset.cutaway))&&<label className="fine-print"><input type="checkbox" checked={cutaway} onChange={e=>setCutaway(e.target.checked)}/>隱藏屋頂與遮擋牆面（僅改顯示）</label>}
          {error&&<div className="error-panel" role="alert"><strong>這次操作未完成</strong><p>{error}</p><button onClick={()=>setError('')}>關閉訊息</button></div>}
        </section>
        <aside className="sidebar">
          <section className="side-card"><div className="card-title"><h3>留存江湖</h3><span>SAVE</span></div><div className="save-buttons"><button className="primary" onClick={save} disabled={busy||!session||controlledDemo}>儲存進度</button><button onClick={()=>load()} disabled={busy||!session||controlledDemo}>讀取進度</button></div><div className="text-actions"><button onClick={download} disabled={busy||!session||controlledDemo}>匯出存檔</button><button onClick={()=>saveInput.current?.click()} disabled={busy||!session||controlledDemo}>匯入存檔</button><button onClick={()=>load(true)} disabled={busy||!session||controlledDemo}>上一份備份</button></div><p className="fine-print">{controlledDemo?'受控事件的獨立存讀請使用遊戲畫面中的按鈕。':'存檔留在此瀏覽器。換裝置前可先匯出備份。'}</p></section>
          <details className="side-card content-settings"><summary>內容與測試設定</summary><label className="mod-toggle"><input type="checkbox" checked={modEnabled} disabled={busy||session?.original} onChange={e=>void start(mock,e.target.checked,false)}/><span>啟用原創問候 MOD<small>切換後從入口重新開始。</small></span></label><button className="wide" disabled={busy||!!session?.original||!!session?.state.cursor||!session?.content.maps['mock.wuxia:map/room']||controlledDemo} onClick={()=>{controlledDemoRef.current=true;setGamePanel(null);setControlledLocation(session!.state);setControlledDemo(true);}}>試玩受控事件 · Mock</button><button className="wide" disabled={busy} onClick={()=>originalInput.current?.click()}>匯入本機原版預覽包</button>
<button className="wide" disabled={busy} onClick={()=>originalEventsInput.current?.click()}>載入原版事件包（local）</button>
<button className="wide" disabled={busy} onClick={()=>regionInput.current?.click()}>匯入本機地圖區域預覽</button><button className="wide" disabled={busy} onClick={()=>regionInput.current?.click()}>匯入完整世界地圖</button><p className="fine-print">選取準備工具產生的 JSON。檔案只在裝置內讀取。</p>
{modelOptions.length>0&&<section aria-label="本機模型替換"><label className="fine-print">替換的視覺資產<select aria-label="替換的視覺資產" value={selectedModel} disabled={busy} onChange={e=>setModelId(e.target.value)}>{modelOptions.map(id=><option key={id} value={id}>{id}</option>)}</select></label><button className="wide" disabled={busy} onClick={()=>modelInput.current?.click()}>匯入替換 GLB</button><button className="wide" disabled={busy||!replacementInfo} onClick={()=>{setRegionCells(regionBaseline);setReplacementInfo('');announce('已還原匯入時的模型，遊戲進度與碰撞未變。');}}>還原匯入時的模型</button><p className="fine-print">只替換目前預覽的相同資產；自動對齊原占位尺寸與底部。僅支援靜態、內嵌資源 GLB，最多 4 MB。</p>{replacementInfo&&<p className="fine-print">{replacementInfo}</p>}</section>}
<div className="content-actions"><button disabled={busy} onClick={()=>void start(mock,modEnabled&&!session?.original,false)}>回到原創場景</button><button disabled={busy||!session} onClick={()=>observed673BundleRef.current?void importOriginal(undefined,observed673BundleRef.current):void start(session?.original?originalPackage:mock,modEnabled,!!session?.original)}>重新開始</button></div></details>
        </aside>
      </div>
      {projectedMap?<section className="journey-notes"><div><p className="eyebrow">世界探索</p><h3>從腳下，走向遠方。</h3></div><ol><li><b>01</b><span>方向鍵或 WASD<br/><small>沿畫面方向持續行走</small></span></li><li><b>02</b><span>查看行跡與座標<br/><small>場景入口尚未開放</small></span></li><li><b>03</b><span>保存探索進度<br/><small>下次匯入同一世界包後讀取</small></span></li></ol></section>:<section className="journey-notes"><div><p className="eyebrow">小小的第一步</p><h3>一位引路人，兩處風景。</h3></div><ol><li><b>01</b><span>與身旁人物對話<br/><small>試著領取一枚練習銅錢</small></span></li><li><b>02</b><span>走向金色圓環<br/><small>探索庭院，再回到練功房</small></span></li><li><b>03</b><span>保存這一刻<br/><small>對話途中也能存檔續行</small></span></li></ol></section>}
      {log.length>0&&<details className="journey-log"><summary>最近行程</summary><ul>{log.map((entry,i)=><li key={`${i}-${entry}`}>{entry}</li>)}</ul></details>}
    </main>
    <footer><span>江湖初行 <i>·</i> JY Web Remake</span><span>占位美術／原創測試內容。非原版遊戲完整重製。</span></footer>
    <input ref={originalInput} type="file" accept=".json,application/json" hidden aria-label="選擇原版預覽包" onChange={event=>void importOriginal(event.target.files?.[0])}/>
    <input ref={originalEventsInput} type="file" accept=".json,application/json" hidden aria-label="選擇原版事件包" onChange={event=>void importOriginalEvents(event.target.files?.[0])}/>
<input ref={regionInput} type="file" accept=".json,application/json" hidden aria-label="選擇地圖區域預覽包" onChange={event=>void importRegionPreview(event.target.files?.[0])}/>
    <input ref={saveInput} type="file" accept=".json,application/json" hidden aria-label="選擇存檔" onChange={event=>void importSave(event.target.files?.[0])}/>
    <input ref={modelInput} type="file" accept=".glb,model/gltf-binary" hidden aria-label="選擇替換 GLB" onChange={event=>void importReplacement(event.target.files?.[0])}/>
  </div>;
}
