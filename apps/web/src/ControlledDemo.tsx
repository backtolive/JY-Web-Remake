import { useEffect, useRef, useState } from 'react';
import { createUnifiedSession, dispatchUnifiedControlled,
  enterUnifiedControlled, leaveUnifiedControlled, readDecisionValue } from '@jy/game-core';
import type { ControlledEventAction, GameState, ResolvedContent, UnifiedSessionState } from '@jy/game-core';
import type { BoundControlledEventContent } from '@jy/game-core';
import { loadUnifiedSession, migrateStoredLegacySave, saveUnifiedSession } from './storage';
import { resolveMockControlledForHost } from './mock-controlled';
import './controlled-demo.css';

type Demo = { content: BoundControlledEventContent; state: UnifiedSessionState };
const eventId = 'mock.controlled:event/trial';
const flag = { domain: 'mock.controlled:flags', key: 'mock.controlled:trial/won' };
const party = { domain: 'mock.controlled:party', key: 'mock.controlled:members' };

export function ControlledDemo({ host, initialGame, previousUnified, onClose, onLocation }:
  { host: ResolvedContent; initialGame: GameState; previousUnified?: UnifiedSessionState;
    onClose: (state: UnifiedSessionState, content: BoundControlledEventContent) => void;
    onLocation: (location: { mapId: string; x: number; y: number }) => void }) {
  const [demo, setDemo] = useState<Demo | null>(null);
  const demoRef = useRef<Demo | null>(null);
  function applyDemo(next: Demo) { demoRef.current = next; setDemo(next); }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('正在準備 Mock 事件…');
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const content = await resolveMockControlledForHost(host);
        const session = { host, controlled: content };
        const initial = previousUnified ?? createUnifiedSession(session, initialGame);
        const state = initial.mode === 'world' ? enterUnifiedControlled(session, initial, eventId).state : initial;
        if (live) { applyDemo({ content, state }); onLocation(state.game); setMessage('對話已開始。'); }
      } catch (cause) { if (live) setError(cause instanceof Error ? cause.message : 'Mock 事件無法啟動。'); }
    })();
    return () => { live = false; };
  }, [host]);
  function act(action: Exclude<ControlledEventAction, { type: 'START' }>) {
    const current = demoRef.current;
    if (!current) return;
    try {
      const result = dispatchUnifiedControlled({ host, controlled: current.content }, current.state, action);
      applyDemo({ ...current, state: result.state }); onLocation(result.state.game); setError('');
      setMessage(result.notices.some(notice => notice.type === 'EVENT_ENDED') ? 'Mock 事件已結束。' :
        result.notices.some(notice => notice.type === 'DECISION_APPLIED') ? '事件狀態已更新。' : '事件已續行。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失敗，原狀態已保留。'); }
  }
  const pending = demo?.state.event.pending;
  useEffect(() => {
    if (!pending || pending.command.kind !== 'animation') return;
    const timer = window.setTimeout(() => act({ type: 'RESOLVE', result: {
      schemaVersion: 1, requestId: pending.requestId, kind: 'animation', outcome: 'completed',
    } }), 900);
    return () => window.clearTimeout(timer);
  }, [pending?.requestId]);
  function save() {
    if (!demo) return;
    try { saveUnifiedSession(localStorage, { host, controlled: demo.content }, demo.state); setMessage('統一工作階段已儲存。'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '儲存失敗。'); }
  }
  function load() {
    if (!demo) return;
    try { const state = loadUnifiedSession(localStorage, { host, controlled: demo.content });
      applyDemo({ ...demo, state }); onLocation(state.game); setMessage('已讀回統一工作階段。'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '讀取失敗。'); }
  }
  function migrate() {
    if (!demo) return;
    try { const { state } = migrateStoredLegacySave(localStorage, { host, controlled: demo.content });
      applyDemo({ ...demo, state }); onLocation(state.game); setMessage('舊版進度已匯入新版；舊存檔仍保留。'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '舊版存檔匯入失敗。'); }
  }
  function close() {
    if (!demo) return;
    if (demo.state.event.cursor) {
      // Explicit abandonment of the in-memory event; a previously saved v4 checkpoint remains available.
      onClose(previousUnified ?? createUnifiedSession({ host, controlled: demo.content }, initialGame), demo.content);
    } else {
      const state = demo.state.mode === 'controlled' ?
        leaveUnifiedControlled({ host, controlled: demo.content }, demo.state) : demo.state;
      onClose(state, demo.content);
    }
  }
  const cursor = demo?.state.event.cursor;
  const step = cursor && demo?.content.data.events[cursor.eventId]?.steps[cursor.pc];
  const dialogue = step?.op === 'say' ? demo?.content.data.dialogues[step.dialogueId] : null;
  const won = demo ? readDecisionValue(demo.content.data.decision, demo.state.event.decision, flag) : false;
  const members = demo ? readDecisionValue(demo.content.data.decision, demo.state.event.decision, party) as string[] : [];
  const exchangeValue = (key: 'material' | 'reward') => demo ? Number(readDecisionValue(
    demo.content.data.decision, demo.state.event.decision,
    { domain: 'mock.controlled:exchange', key: `mock.controlled:${key}` })) : 0;
  const material = exchangeValue('material'), reward = exchangeValue('reward');
  function startExchange() {
    if (!demo || cursor) return;
    const context = { host, controlled: demo.content };
    const world = demo.state.mode === 'controlled' ? leaveUnifiedControlled(context, demo.state) : demo.state;
    const state = enterUnifiedControlled(context, world, 'mock.controlled:event/exchange',
      { preserveDecision: true }).state;
    applyDemo({ ...demo, state });
    setMessage('');
    setError('');
  }
  const result = (kind: 'battle' | 'transition', outcome: 'victory' | 'defeat' | 'escape' | 'completed') => {
    if (pending) act({ type: 'RESOLVE', result: { schemaVersion: 1, requestId: pending.requestId, kind, outcome } as
      Extract<ControlledEventAction, { type: 'RESOLVE' }>['result'] });
  };
  return <section className="controlled-demo" aria-label="Mock 受控事件測試">
    <header><strong>受控事件試玩 · Mock</strong><button onClick={close}>{cursor ? previousUnified?.mode==='controlled'?'暫停並離開':'放棄本次並離開' : '離開測試'}</button></header>
    {error && <p role="alert" className="controlled-error">{error}</p>}
    <p className="controlled-status" role="status">{message}</p>
    {!demo && !error && <p>正在檢查地圖與資源引用…</p>}
    {dialogue && <div><p><b>{dialogue.speaker}</b>：{dialogue.text}</p><button className="primary" onClick={() => act({ type: 'CONTINUE' })}>繼續</button></div>}
    {step?.op === 'choice' && <div><p>選擇回應</p>{step.options.map(option =>
      <button key={option.id} onClick={() => act({ type: 'CHOOSE', optionId: option.id })}>{option.text}</button>)}</div>}
    {pending?.command.kind === 'battle' && <div><p><b>{demo?.content.resources.encounters[pending.command.encounterId]?.name}</b>：請選擇模擬結果（尚無戰鬥計算）。</p>
      {(['victory', 'defeat', 'escape'] as const).map((outcome, i) =>
        <button key={outcome} onClick={() => result('battle', outcome)}>{['模擬勝利', '模擬失敗', '模擬撤退'][i]}</button>)}</div>}
    {pending?.command.kind === 'animation' && <div><p className="controlled-animation">{demo?.content.resources.animations[pending.command.animationId]?.name}播放中…</p></div>}
    {pending?.command.kind === 'transition' && <div><p>前往 {host.maps[pending.command.destination.mapId]?.name}（X {pending.command.destination.x} · Y {pending.command.destination.y}）</p>
      <button className="primary" onClick={() => result('transition', 'completed')}>完成切換場景</button></div>}
    {pending?.command.kind === 'selection' && <div><p>選擇加入的 Mock 同伴</p>{pending.command.candidates.map(id =>
      <button key={id} onClick={() => act({ type: 'RESOLVE', result: { schemaVersion: 1,
        requestId: pending.requestId, kind: 'selection', selectedId: id } })}>{demo?.content.resources.characters[id]?.name}</button>)}</div>}
    {demo && <p className="controlled-state">地圖：{host.maps[demo.state.game.mapId]?.name} · 勝利旗標：{won ? '是' : '否'} · 同伴：{members.map(id => demo.content.resources.characters[id]?.name ?? id).join('、') || '無'}</p>}
    {demo && <p>測試背包：材料 ×{material} · 獎勵 ×{reward} · {reward ? '已兌換' :
      material && members.includes('mock.controlled:character/b') ? '可兌換' : '條件不足'}</p>}
    <div className="controlled-actions"><button disabled={!demo} onClick={save}>儲存此測試</button><button disabled={!demo} onClick={load}>讀取此測試</button>
      {demo && !cursor && <button onClick={startExchange}>與交換商人交談</button>}
      {demo && <button onClick={migrate}>匯入舊版存檔</button>}
      {demo && !cursor && <button onClick={() => { const world = demo.state.mode === 'controlled' ?
        leaveUnifiedControlled({ host, controlled: demo.content }, demo.state) : demo.state;
        const state = enterUnifiedControlled({ host, controlled: demo.content }, world, eventId).state;
        applyDemo({ ...demo, state }); onLocation(state.game); setMessage('Mock 事件重新開始。'); setError(''); }}>重新測試</button>}</div>
  </section>;
}
