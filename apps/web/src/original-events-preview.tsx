import { useMemo, useRef, useState } from 'react';
import { createControlledEventState, dispatchControlledEvent,
  restoreControlledEventSave, serializeControlledEventSave } from '@jy/game-core';
import type { ControlledEventAction, ControlledEventState, ControlledResult, DecisionChange,
  ResolvedControlledEventContent } from '@jy/game-core';
import './original-events-preview.css';

/** Local read-only browser for the generated original.jy.events controlled-event package.
 * It runs the standalone controlled-event runtime in an isolated state, so it never touches
 * the main game session. Battles resolve to a chosen mock outcome; there is no battle math yet. */
export function OriginalEventsPreview({ content, onClose }:
  { content: ResolvedControlledEventContent; onClose: () => void }) {
  const events = useMemo(() => Object.keys(content.data.events).sort((a, b) =>
    (Number(a.split('/').pop() ?? 0) || 0) - (Number(b.split('/').pop() ?? 0) || 0)), [content]);
  const [filter, setFilter] = useState('');
  const [eventId, setEventId] = useState('');
  const [useItemId, setUseItemId] = useState('');
  const [hostRole, setHostRole] = useState('0');
  const [hostSlot, setHostSlot] = useState('0');
  const [state, setState] = useState<ControlledEventState | null>(null);
  const [changes, setChanges] = useState<DecisionChange[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [iconUrls, setIconUrls] = useState<Map<string, string> | null>(null);
  const iconAtlasInput = useRef<HTMLInputElement>(null);
  const itemOptions = useMemo(() => Object.keys(content.data.items ?? {}).sort((a, b) =>
    (Number(a.split('/').pop() ?? 0) || 0) - (Number(b.split('/').pop() ?? 0) || 0)), [content]);
  const itemName = (id: string) => content.data.items?.[`${content.identity.id}:item/${id}`]?.name ?? '';
  const filtered = filter ? events.filter(id => id.includes(filter)) : events;
  const cursor = state?.cursor;
  const step = cursor ? content.data.events[cursor.eventId]?.steps[cursor.pc] : undefined;
  const dialogue = step?.op === 'say' ? content.data.dialogues[step.dialogueId] : null;
  const saveKey = `original-events:${content.identity.sha256}`;
  function start(id: string) {
    if (!id) return;
    try {
      // A no-cursor state (e.g. after a USE_ITEM selection) is kept so the event sees it.
      const base = state && !state.cursor ? state : createControlledEventState(content);
      const result = dispatchControlledEvent(content, base, { type: 'START', eventId: id });
      setState(result.state); setChanges(result.notices.flatMap(n => n.changes ?? []));
      setError(''); setMessage(`事件 ${id.split('/').pop()} 已開始。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '無法啟動事件。'); }
  }
  function useItem() {
    if (!useItemId) return;
    try {
      const result = dispatchControlledEvent(content, createControlledEventState(content),
        { type: 'USE_ITEM', itemId: Number(useItemId) });
      setState(result.state); setChanges(result.notices.flatMap(n => n.changes ?? []));
      setError('');
      setMessage(`已使用物品 ${useItemId}${itemName(useItemId) ? `（${itemName(useItemId)}）` : ''}；現在可啟動會檢查目前物品的場景事件（例如事件 16）。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '使用物品失敗。'); }
  }
  function equipPractice(kind: 'EQUIP' | 'PRACTICE') {
    if (!useItemId) return;
    try {
      const role = Number(hostRole), slot = Number(hostSlot);
      const action: ControlledEventAction = kind === 'EQUIP'
        ? { type: 'EQUIP', itemId: Number(useItemId), role, slot }
        : { type: 'PRACTICE', itemId: Number(useItemId), role };
      const result = dispatchControlledEvent(content, createControlledEventState(content), action);
      setState(result.state); setChanges(result.notices.flatMap(n => n.changes ?? []));
      setError('');
      setMessage(kind === 'EQUIP'
        ? `已將物品 ${useItemId}${itemName(useItemId) ? `（${itemName(useItemId)}）` : ''} 裝備給角色 ${role} 槽 ${slot}。`
        : `角色 ${role} 已修煉物品 ${useItemId}${itemName(useItemId) ? `（${itemName(useItemId)}）` : ''}。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : (kind === 'EQUIP' ? '裝備失敗。' : '修煉失敗。')); }
  }
  function act(action: Exclude<ControlledEventAction, { type: 'START' }>) {
    if (!state) return;
    try {
      const result = dispatchControlledEvent(content, state, action);
      setState(result.state); setChanges(old => [...old, ...result.notices.flatMap(n => n.changes ?? [])]);
      setError('');
      setMessage(result.notices.some(n => n.type === 'EVENT_ENDED') ? '事件已結束。' :
        result.notices.some(n => n.type === 'DECISION_APPLIED') ? '事件狀態已更新。' : '事件已續行。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失敗，原狀態已保留。'); }
  }
  function resolve(result: ControlledResult) { act({ type: 'RESOLVE', result }); }
  function restart() { setState(null); setChanges([]); setEventId(''); setMessage(''); setError(''); }
  function save() {
    if (!state) return;
    try { localStorage.setItem(saveKey, serializeControlledEventSave(content, state));
      setMessage('進度已存入此瀏覽器。'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '儲存失敗。'); }
  }
  function load() {
    try { const raw = localStorage.getItem(saveKey);
      if (!raw) throw new Error('此內容包還沒有儲存的進度。');
      setState(restoreControlledEventSave(content, raw)); setChanges([]);
      setMessage('已讀回進度。'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '讀取失敗。'); }
  }
  // Load the converter-generated item-icon atlas (800x400, 20 columns of 40px cells) and
  // slice each item's cell into a data URL. The engine content only carries an imageRef id;
  // decoding/positioning is a preview concern, so the grid layout lives here, not in content.
  const ICON_COLS = 20, ICON_CELL = 40;
  async function loadIconAtlas(file?: File) {
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve(); img.onerror = () => reject(new Error('ATLAS_LOAD')); img.src = url;
      });
      if (img.naturalWidth !== ICON_COLS * ICON_CELL || img.naturalHeight !== 10 * ICON_CELL)
        throw new Error('ATLAS_SIZE');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('ATLAS_CTX');
      const map = new Map<string, string>();
      for (const id of itemOptions) {
        const itemId = Number(id.split('/').pop());
        canvas.width = ICON_CELL; canvas.height = ICON_CELL;
        ctx.clearRect(0, 0, ICON_CELL, ICON_CELL);
        ctx.drawImage(img, (itemId % ICON_COLS) * ICON_CELL, Math.floor(itemId / ICON_COLS) * ICON_CELL,
          ICON_CELL, ICON_CELL, 0, 0, ICON_CELL, ICON_CELL);
        map.set(id, canvas.toDataURL('image/png'));
      }
      URL.revokeObjectURL(url);
      setIconUrls(map); setError('');
      setMessage(`已載入物品圖集：${map.size} 張圖示。`);
    } catch (cause) {
      setError(cause instanceof Error ? '物品圖集無法載入（請選擇轉換工具產生的 item-icons PNG）。' : '物品圖集無法載入。');
    }
  }
  const pending = state?.pending;
  return <section className="oe-preview" aria-label="原版事件本機唯讀預覽">
    <header><strong>原版事件 · 本機唯讀預覽</strong><button onClick={onClose}>關閉</button></header>
    {error && <p role="alert" className="oe-error">{error}</p>}
    <p className="oe-status" role="status">{message}</p>
    {!cursor && <div className="oe-select">
      <label>選擇要預覽的事件<input type="search" placeholder="以編號過濾，例如 581" value={filter} onChange={e => setFilter(e.target.value)}/></label>
      <select value={eventId} onChange={e => setEventId(e.target.value)}>
        <option value="">選取事件（{filtered.length}）</option>
        {filtered.map(id => <option key={id} value={id}>事件 {id.split('/').pop()}</option>)}
      </select>
      {itemOptions.length > 0 && <>
        <label>使用物品（選填；啟動前寫入「目前物品」，供檢查該欄的事件分支）
          <select value={useItemId} onChange={e => setUseItemId(e.target.value)}>
            <option value="">不選擇</option>
            {itemOptions.map(id => <option key={id} value={id.split('/').pop()}>
              {id.split('/').pop()}{content.data.items?.[id]?.name ? ` ${content.data.items[id].name}` : ''}</option>)}
          </select></label>
        <label>目標角色／槽（裝備／修煉用；角色編號 0 起，槽 0–1）
          <input type="number" min={0} value={hostRole} onChange={e => setHostRole(e.target.value)} />
          <input type="number" min={0} max={1} value={hostSlot} onChange={e => setHostSlot(e.target.value)} /></label>
        {useItemId && iconUrls?.get(`${content.identity.id}:item/${useItemId}`) &&
          <span className="oe-item-icon-wrap">
            <img className="oe-item-icon" src={iconUrls.get(`${content.identity.id}:item/${useItemId}`)}
              alt={`${useItemId} ${itemName(useItemId)}`} />
            <span className="oe-item-icon-label">{useItemId} {itemName(useItemId)}</span>
          </span>}
      </>}
      <button className="primary" disabled={!eventId} onClick={() => start(eventId)}>開始事件</button>
      <button disabled={!useItemId} onClick={useItem}>使用物品</button>
      <button disabled={!useItemId} onClick={() => equipPractice('EQUIP')}>裝備</button>
      <button disabled={!useItemId} onClick={() => equipPractice('PRACTICE')}>修煉</button>
      <button onClick={() => iconAtlasInput.current?.click()}>載入物品圖集（PNG）</button>
      <button onClick={load}>讀取進度</button>
      <input ref={iconAtlasInput} type="file" accept="image/png" hidden aria-label="選擇物品圖集 PNG"
        onChange={event => void loadIconAtlas(event.target.files?.[0])}/>
      <p className="oe-note">全量 {events.length} 筆事件（68 個已證 opcode）；對話、選項、分支與決策效果可操作，戰鬥為模擬結果。此為內容預覽，非完整原版遊玩。</p>
      {iconUrls && <div className="oe-icon-gallery">
        <p className="oe-note">物品圖示（{iconUrls.size} 張；點擊選取為使用物品）</p>
        <div className="oe-icon-grid">
          {itemOptions.map(id => {
            const itemId = id.split('/').pop() ?? '';
            const name = itemName(itemId);
            return <button key={id} className="oe-icon-cell" onClick={() => setUseItemId(itemId)} title={`${itemId} ${name}`}>
              <img src={iconUrls.get(id)} alt={name || `item ${itemId}`} />
            </button>;
          })}
        </div>
      </div>}
    </div>}
    {state && <>
      <p className="oe-event">目前事件 <strong>{cursor ? cursor.eventId.split('/').pop() : '已結束'}</strong> · 步驟 {cursor ? cursor.pc : '—'}</p>
      {dialogue && <div className="oe-dialogue"><p><b>{dialogue.speaker}</b>：{dialogue.text}</p>
        <button className="primary" onClick={() => act({ type: 'CONTINUE' })}>繼續</button></div>}
      {step?.op === 'choice' && <div className="oe-choices"><p>選擇回應</p>
        {step.options.map(option => <button key={option.id} onClick={() => act({ type: 'CHOOSE', optionId: option.id })}>{option.text}</button>)}</div>}
      {pending?.command.kind === 'battle' && <div className="oe-battle"><p><b>戰鬥</b>（{pending.command.encounterId.split('/').pop()}）：請選擇模擬結果（尚無戰鬥計算）。</p>
        {(['victory', 'defeat', 'escape'] as const).map((outcome, i) =>
          <button key={outcome} onClick={() => resolve({ schemaVersion: 1, requestId: pending.requestId, kind: 'battle', outcome })}>{['模擬勝利', '模擬失敗', '模擬撤退'][i]}</button>)}</div>}
      {pending?.command.kind === 'animation' && <div className="oe-anim"><p>動畫播放中…</p>
        <button onClick={() => resolve({ schemaVersion: 1, requestId: pending.requestId, kind: 'animation', outcome: 'completed' })}>完成</button></div>}
      {pending?.command.kind === 'transition' && <div className="oe-anim"><p>前往 {pending.command.destination.mapId}（{pending.command.destination.x}，{pending.command.destination.y}）</p>
        <button onClick={() => resolve({ schemaVersion: 1, requestId: pending.requestId, kind: 'transition', outcome: 'completed' })}>完成切換場景</button></div>}
      {pending?.command.kind === 'selection' && <div className="oe-choices"><p>選擇角色</p>
        {pending.command.candidates.map(id => <button key={id} onClick={() => resolve({ schemaVersion: 1, requestId: pending.requestId, kind: 'selection', selectedId: id })}>{id}</button>)}</div>}
      {!cursor && <p className="oe-ended">事件已結束。</p>}
      <p className="oe-state">目前狀態變更 {changes.length} 項{changes.length ? `；最近：${changes.slice(-6).map(c =>
        `${(c.target.domain.split(':').pop() ?? '')}/${(c.target.key?.split('/').pop() ?? '')} ${JSON.stringify(c.before)}→${JSON.stringify(c.after)}`).join('；')}` : ''}</p>
      <div className="oe-actions"><button disabled={!cursor} onClick={save}>儲存此進度</button><button onClick={restart}>重新開始</button></div>
    </>}
  </section>;
}
