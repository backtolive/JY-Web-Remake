import { useEffect, useMemo, useRef, useState } from 'react';
import { createControlledEventState, dispatchControlledEvent,
  resolveBattle, restoreControlledEventSave, serializeControlledEventSave } from '@jy/game-core';
import type { ControlledEventAction, ControlledEventState, ControlledResult, DecisionChange,
  ResolvedControlledEventContent } from '@jy/game-core';
import './original-events-preview.css';

/** Local read-only browser for the generated original.jy.events controlled-event package.
 * It runs the standalone controlled-event runtime in an isolated state, so it never touches
 * the main game session. Battles resolve to a chosen mock outcome; there is no battle math yet. */
export function OriginalEventsPreview({ content, targetEventId, initialState, onStateChange, onClose }:
  { content: ResolvedControlledEventContent; targetEventId?: string;
    initialState?: ControlledEventState; onStateChange?: (state: ControlledEventState | null) => void; onClose: () => void }) {
  const events = useMemo(() => Object.keys(content.data.events).sort((a, b) =>
    (Number(a.split('/').pop() ?? 0) || 0) - (Number(b.split('/').pop() ?? 0) || 0)), [content]);
  const [filter, setFilter] = useState('');
  const [eventId, setEventId] = useState('');
  const [useItemId, setUseItemId] = useState('');
  const [hostRole, setHostRole] = useState('0');
  const [hostSlot, setHostSlot] = useState('0');
  const [sceneId, setSceneId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [state, setState] = useState<ControlledEventState | null>(initialState ?? null);
  const [changes, setChanges] = useState<DecisionChange[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [iconUrls, setIconUrls] = useState<Map<string, string> | null>(null);
  const iconAtlasInput = useRef<HTMLInputElement>(null);
  const itemOptions = useMemo(() => Object.keys(content.data.items ?? {}).sort((a, b) =>
    (Number(a.split('/').pop() ?? 0) || 0) - (Number(b.split('/').pop() ?? 0) || 0)), [content]);
  const itemName = (id: string) => content.data.items?.[`${content.identity.id}:item/${id}`]?.name ?? '';
  /** Human-readable CanEquip thresholds (positive = floor ≥, negative = cap ≤, mpType = nature). */
  const canEquipText = (id: string): string => {
    const canEquip = content.data.items?.[`${content.identity.id}:item/${id}`]?.canEquip;
    if (!canEquip) return '';
    const signed = (label: string, value?: number) =>
      typeof value === 'number' ? `${label} ${value > 0 ? `≥${value}` : `≤${-value}`}` : '';
    const parts = [signed('內力', canEquip.mp), signed('攻擊', canEquip.attack),
      signed('速度', canEquip.speed), signed('資質', canEquip.aptitude),
      signed('用毒', canEquip.usePoi), signed('醫術', canEquip.medicine),
      signed('醫毒', canEquip.medPoi), signed('拳法', canEquip.fist),
      signed('劍法', canEquip.sword), signed('刀法', canEquip.knife),
      signed('奇門', canEquip.unusual), signed('暗器', canEquip.hidWeapon),
      typeof canEquip.mpType === 'number' ? `內力性質=${canEquip.mpType}` : '',
      typeof canEquip.onlyPracRole === 'number' && canEquip.onlyPracRole >= 0 ? `專用人物=${canEquip.onlyPracRole}` : '',
      typeof canEquip.magic === 'number' && canEquip.magic > 0 ? `武功=${canEquip.magic}` : ''].filter(Boolean);
    return parts.join('、');
  };
  const filtered = filter ? events.filter(id => id.includes(filter)) : events;
  const cursor = state?.cursor;
  const step = cursor ? content.data.events[cursor.eventId]?.steps[cursor.pc] : undefined;
  const dialogue = step?.op === 'say' ? content.data.dialogues[step.dialogueId] : null;
  const saveKey = `original-events:${content.identity.sha256}`;
  function start(id: string) {
    if (!id) return;
    try {
      // A no-cursor state (e.g. after a USE_ITEM selection) is kept so the event sees it.
      let base = state && !state.cursor ? state : createControlledEventState(content);
      // Seed magic arrays from RANGER.GRP role data (CanEquip magic level rule).
      const roleMagic = content.data.roleMagic;
      if (roleMagic && !base.decision.values['original.jy:role/magic-ids']) {
        for (const [roleId, data] of Object.entries(roleMagic)) {
          const ids: Record<string, number> = {};
          const levels: Record<string, number> = {};
          for (let i = 0; i < 10; i++) {
            ids[`original.jy:role/magic-${roleId}-${i}`] = data.magicIds[i] ?? 0;
            levels[`original.jy:role/mag-level-${roleId}-${i}`] = data.magicLevels[i] ?? 0;
          }
          base = { ...base, decision: { ...base.decision,
            values: { ...base.decision.values,
              'original.jy:role/magic-ids': { ...(base.decision.values['original.jy:role/magic-ids'] ?? {}), ...ids },
              'original.jy:role/magic-levels': { ...(base.decision.values['original.jy:role/magic-levels'] ?? {}), ...levels } } } };
        }
      }
      // Seed carried items from RANGER.GRP role data (inventory panel). Only roles with a
      // carried-item domain (used by opcode 41 events) can be seeded; others are skipped.
      const roleCarried = content.data.roleCarriedItems;
      const carriedDomain = content.data.decision.domains['original.jy:carried-item'];
      if (roleCarried && carriedDomain) {
        const allowed = new Set(carriedDomain.allowedKeys);
        const itemValues: Record<string, number> = {};
        const amountValues: Record<string, number> = {};
        for (const [roleId, data] of Object.entries(roleCarried)) {
          for (let slot = 0; slot < 4; slot++) {
            const key = `original.jy:carried/${roleId}/${slot}`;
            if (!allowed.has(key)) continue;
            itemValues[key] = data.items[slot] ?? -1;
            amountValues[key] = data.amounts[slot] ?? 0;
          }
        }
        if (Object.keys(itemValues).length) {
          base = { ...base, decision: { ...base.decision,
            values: { ...base.decision.values,
              'original.jy:carried-item': { ...(base.decision.values['original.jy:carried-item'] ?? {}), ...itemValues },
              'original.jy:carried-item-amount': { ...(base.decision.values['original.jy:carried-item-amount'] ?? {}), ...amountValues } } } };
        }
      }
      const result = dispatchControlledEvent(content, base, { type: 'START', eventId: id });
      setState(result.state); setChanges(result.notices.flatMap(n => n.changes ?? []));
      setError(''); setMessage(`事件 ${id.split('/').pop()} 已開始。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '無法啟動事件。'); }
  }
  // Auto-start when a target event ID is provided (from the main game's scene slot trigger).
  useEffect(() => {
    if (targetEventId) { setEventId(targetEventId); start(targetEventId); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetEventId]);
  // Report state changes to the parent (for combined save/load).
  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);
  // Sync external state changes (e.g. from a load operation).
  useEffect(() => { if (initialState) setState(initialState); }, [initialState]);
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
  /** Trigger an event from a scene slot (simulates NPC interaction). Looks up the event ID
   * from the content's sceneSlots mapping (ALLDEF.GRP field 0). */
  function triggerSceneSlot() {
    const key = `${sceneId}/${slotId}`;
    const eventId = content.data.sceneSlots?.[key];
    if (!eventId) { setError(`場景 ${sceneId} 槽 ${slotId} 沒有事件。`); return; }
    start(`${content.identity.id}:event/${eventId}`);
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
    {content.data.roleAttributes && <RoleAttributePanel roleId={hostRole} content={content} state={state} />}
    <HeldItemsPanel roleId={hostRole} content={content} state={state} />
    {!cursor && <div className="oe-select">
      <label>選擇要預覽的事件<input type="search" placeholder="以編號過濾，例如 581" value={filter} onChange={e => setFilter(e.target.value)}/></label>
      <select value={eventId} onChange={e => setEventId(e.target.value)}>
        <option value="">選取事件（{filtered.length}）</option>
        {filtered.map(id => <option key={id} value={id}>事件 {id.split('/').pop()}</option>)}
      </select>
      {content.data.sceneSlots && <>
        <label>場景槽觸發（模擬 NPC 互動）
          <input type="number" min={0} placeholder="場景" value={sceneId} onChange={e => setSceneId(e.target.value)} />
          <input type="number" min={0} max={199} placeholder="槽" value={slotId} onChange={e => setSlotId(e.target.value)} />
          <button disabled={!sceneId && !slotId} onClick={triggerSceneSlot}>觸發</button>
        </label>
      </>}
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
        {useItemId && canEquipText(useItemId) &&
          <p className="oe-can-equip">裝備資質（CanEquip）：{canEquipText(useItemId)}。預覽以空狀態（屬性 0）試算，未達門檻會以 EQUIP_CONDITION 拒絕。</p>}
        {useItemId && <ItemDetailPanel id={useItemId} content={content} iconUrl={iconUrls?.get(`${content.identity.id}:item/${useItemId}`)} />}
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
      <ItemCatalog content={content} iconUrls={iconUrls} selectedId={useItemId} onSelect={setUseItemId} />
    </div>}
    {state && <>
      <p className="oe-event">目前事件 <strong>{cursor ? cursor.eventId.split('/').pop() : '已結束'}</strong> · 步驟 {cursor ? cursor.pc : '—'}</p>
      {dialogue && <div className="oe-dialogue"><p><b>{dialogue.speaker}</b>：{dialogue.text}</p>
        <button className="primary" onClick={() => act({ type: 'CONTINUE' })}>繼續</button></div>}
      {step?.op === 'choice' && <div className="oe-choices"><p>選擇回應</p>
        {step.options.map(option => <button key={option.id} onClick={() => act({ type: 'CHOOSE', optionId: option.id })}>{option.text}</button>)}</div>}
      {pending?.command.kind === 'battle' && (() => {
        const encounterId = pending.command.encounterId;
        const enemy = content.data.battles?.[encounterId];
        const attrs = content.data.roleAttributes?.[hostRole];
        const playerHp = attrs?.currentHp ?? 100;
        const playerAttack = attrs?.attack ?? 20;
        const playerDefense = attrs?.aptitude ?? 10;
        const computed = enemy
          ? resolveBattle({ hp: playerHp, attack: playerAttack, defense: playerDefense },
              { hp: enemy.enemyHp, attack: enemy.enemyAttack, defense: enemy.enemyDefense })
          : null;
        return <div className="oe-battle">
          <p><b>戰鬥</b>（{encounterId.split('/').pop()}）</p>
          {enemy ? <p className="oe-battle-stats">
            敵人：{enemy.enemyName}（HP {enemy.enemyHp} / 攻 {enemy.enemyAttack} / 防 {enemy.enemyDefense}）
            {' · '}玩家（角色 {hostRole}）：HP {playerHp} / 攻 {playerAttack} / 防 {playerDefense}
          </p> : <p className="oe-note">無敵人資料，使用預設模擬。</p>}
          {computed && <p className="oe-battle-result">計算結果：<strong>{computed === 'victory' ? '勝利' : '失敗'}</strong>（Community Implementation 公式）</p>}
          <div className="oe-battle-actions">
            <button className="primary" onClick={() => resolve({ schemaVersion: 1, requestId: pending.requestId, kind: 'battle', outcome: computed ?? 'victory' })}>
              執行戰鬥（{computed === 'victory' ? '勝利' : computed === 'defeat' ? '失敗' : '模擬勝利'}）
            </button>
            <button onClick={() => resolve({ schemaVersion: 1, requestId: pending.requestId, kind: 'battle', outcome: 'escape' })}>撤退</button>
          </div>
        </div>;
      })()}
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

/** Full item-definition display panel. Shows all declared fields of an item from the
 * content package so the user can inspect name, description, category, equipment slot,
 * CanEquip thresholds, stackability, and use-layer fields (dialogue/conditions/effects/command). */
function ItemDetailPanel({ id, content, iconUrl }:
  { id: string; content: ResolvedControlledEventContent; iconUrl?: string }) {
  const def = content.data.items?.[`${content.identity.id}:item/${id}`];
  if (!def) return null;
  const rows: Array<[string, string]> = [];
  if (def.alias) rows.push(['別名', def.alias]);
  if (def.description) rows.push(['說明', def.description]);
  if (def.category) rows.push(['分類', def.category]);
  if (def.equipSlot !== undefined) rows.push(['裝備槽', def.equipSlot]);
  rows.push(['可堆疊', def.stackable ? '是' : '否']);
  if (def.maxStack !== undefined) rows.push(['堆疊上限', String(def.maxStack)]);
  if (def.imageRef) rows.push(['圖片引用', def.imageRef]);
  if (def.useDialogueRef) rows.push(['使用對話', def.useDialogueRef]);
  if (def.useCommand) rows.push(['使用命令', def.useCommand]);
  if (def.useConditions?.length) rows.push(['使用條件', `${def.useConditions.length} 項`]);
  if (def.useEffects?.length) rows.push(['使用效果', `${def.useEffects.length} 項`]);
  return <details className="oe-item-detail">
    <summary>物品定義（{id} {def.name}）</summary>
    {iconUrl && <img className="oe-item-detail-icon" src={iconUrl} alt={def.name} />}
    <table className="oe-item-detail-table">
      <tbody>
        <tr><th>名稱</th><td>{def.name}</td></tr>
        {rows.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value}</td></tr>)}
      </tbody>
    </table>
  </details>;
}

/** Character attribute panel. Shows a role's base attributes seeded from RANGER.GRP
 * (community TRole offsets) and any live decision-state overrides written by a running
 * event. The seed values are candidates, not Verified Original field semantics. */
function RoleAttributePanel({ roleId, content, state }:
  { roleId: string; content: ResolvedControlledEventContent; state: ControlledEventState | null }) {
  const base = content.data.roleAttributes?.[roleId];
  if (!base) return <p className="oe-note">角色 {roleId} 沒有 RANGER.GRP 屬性種子。</p>;
  // Map seed field names to the decision domains the converter declares (ROLE_FIELDS).
  const FIELD_DOMAIN: Record<string, string> = {
    currentHp: 'original.jy:role/current-hp', maxHp: 'original.jy:role/max-hp',
    currentMp: 'original.jy:role/current-mp', maxMp: 'original.jy:role/max-mp',
    attack: 'original.jy:role/attack', speed: 'original.jy:role/speed',
    aptitude: 'original.jy:role/aptitude',
  };
  const live = (domain: string | undefined): number | null => {
    if (!state || !domain) return null;
    const value = state.decision.values[domain]?.[`original.jy:role/${roleId}`];
    return typeof value === 'number' ? value : null;
  };
  const rows: Array<[string, number, string | undefined]> = [
    ['等級', base.level, undefined],
    ['生命', base.currentHp, FIELD_DOMAIN.currentHp],
    ['生命上限', base.maxHp, FIELD_DOMAIN.maxHp],
    ['內力', base.currentMp, FIELD_DOMAIN.currentMp],
    ['內力上限', base.maxMp, FIELD_DOMAIN.maxMp],
    ['攻擊', base.attack, FIELD_DOMAIN.attack],
    ['速度', base.speed, FIELD_DOMAIN.speed],
    ['資質', base.aptitude, FIELD_DOMAIN.aptitude],
  ];
  return <details className="oe-role-attrs">
    <summary>角色屬性（角色 {roleId} · RANGER.GRP 種子）</summary>
    <table className="oe-role-attrs-table">
      <thead><tr><th>欄位</th><th>種子值</th><th>目前狀態</th></tr></thead>
      <tbody>
        {rows.map(([label, seed, domain]) => {
          const value = live(domain);
          return <tr key={label}>
            <th>{label}</th><td>{seed}</td>
            <td>{value !== null ? <strong className={value !== seed ? 'oe-attr-changed' : ''}>{value}</strong> : '—'}</td>
          </tr>;
        })}
      </tbody>
    </table>
    <p className="oe-note">種子值來自 RANGER.GRP 角色表（社群 TRole 欄位偏移，候選非驗證）；「目前狀態」只在事件寫入該欄位後顯示，與種子不同時以金色標出。等級無對應決策欄位，僅顯示種子。</p>
  </details>;
}

/** Held items panel. Shows the items a role currently carries (from the carried-item
 * decision state). Only roles with a carried-item domain (used by opcode 41 events) have
 * slots; others show a note. Seeded from RANGER.GRP TakingItem data at event start. */
function HeldItemsPanel({ roleId, content, state }:
  { roleId: string; content: ResolvedControlledEventContent; state: ControlledEventState | null }) {
  const carriedDomain = content.data.decision.domains['original.jy:carried-item'];
  if (!carriedDomain) return <p className="oe-note">角色 {roleId} 沒有隨身物品欄位（無 opcode 41 事件用到）。</p>;
  const slots = [0, 1, 2, 3].map(slot => {
    const key = `original.jy:carried/${roleId}/${slot}`;
    if (!carriedDomain.allowedKeys.includes(key)) return null;
    const rawId = state?.decision.values['original.jy:carried-item']?.[key] ?? -1;
    const rawAmount = state?.decision.values['original.jy:carried-item-amount']?.[key] ?? 0;
    const itemId = typeof rawId === 'number' ? rawId : -1;
    const amount = typeof rawAmount === 'number' ? rawAmount : 0;
    if (itemId < 0) return { slot, empty: true, itemId, amount };
    const itemKey = `${content.identity.id}:item/${itemId}`;
    const name = content.data.items?.[itemKey]?.name ?? '';
    return { slot, empty: false, itemId, amount, name };
  }).filter(Boolean) as Array<{ slot: number; empty: boolean; itemId: number; amount: number; name?: string }>;
  if (!slots.length) return <p className="oe-note">角色 {roleId} 沒有隨身物品槽。</p>;
  return <details className="oe-held-items">
    <summary>隨身物品（角色 {roleId} · carried-item 決策欄位）</summary>
    <table className="oe-held-items-table">
      <thead><tr><th>槽</th><th>物品</th><th>數量</th></tr></thead>
      <tbody>
        {slots.map(row => <tr key={row.slot}>
          <th>{row.slot}</th>
          <td>{row.empty ? <span className="oe-muted">（空）</span> : `${row.itemId} ${row.name ?? ''}`}</td>
          <td>{row.empty ? '—' : row.amount}</td>
        </tr>)}
      </tbody>
    </table>
    <p className="oe-note">種子值來自 RANGER.GRP TakingItem（社群 TRole 欄位，候選非驗證；第 4 槽數量超出 182-byte 記錄，預設 0）；事件寫入後以即時狀態顯示。</p>
  </details>;
}

/** Full original item catalog. Lists every item in the content package (RANGER.GRP) with
 * icon, ID, name, and category. Clicking a cell selects that item as the "use item". */
function ItemCatalog({ content, iconUrls, selectedId, onSelect }:
  { content: ResolvedControlledEventContent; iconUrls: Map<string, string> | null;
    selectedId: string; onSelect: (id: string) => void }) {
  const items = Object.entries(content.data.items ?? {})
    .sort((a, b) => (Number(a[0].split('/').pop() ?? 0) || 0) - (Number(b[0].split('/').pop() ?? 0) || 0));
  return <details className="oe-item-catalog">
    <summary>完整物品清單（{items.length} 項 · 原版 RANGER.GRP）</summary>
    <div className="oe-catalog-grid">
      {items.map(([id, def]) => {
        const itemId = id.split('/').pop() ?? '';
        const icon = iconUrls?.get(id);
        return <button key={id} className={`oe-catalog-cell${selectedId === itemId ? ' selected' : ''}`}
          onClick={() => onSelect(itemId)} title={`${itemId} ${def.name}${def.category ? ` · ${def.category}` : ''}`}>
          {icon ? <img src={icon} alt={def.name} /> : <span className="oe-catalog-noicon">{itemId}</span>}
          <span className="oe-catalog-name">{def.name}</span>
          <span className="oe-catalog-meta">{itemId}{def.category ? ` · ${def.category}` : ''}</span>
        </button>;
      })}
    </div>
  </details>;
}
