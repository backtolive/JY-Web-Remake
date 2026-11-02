import { restoreSave, serializeSave } from '@jy/game-core';
import type { GameState, ResolvedContent } from '@jy/game-core';

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function saveKey(content: ResolvedContent) {
  return 'jy.web.save.v1:' + content.identities.map(pkg => pkg.id).join('|');
}
export function saveGame(storage: StorageLike, content: ResolvedContent, state: GameState) {
  const key = saveKey(content), raw = serializeSave(content, state);
  // Validate first; a failed backup or main write never removes the old main slot.
  restoreSave(content, raw);
  const old = storage.getItem(key);
  if (old !== null) storage.setItem(key + ':backup', old);
  storage.setItem(key, raw);
  return raw;
}
export function loadGame(storage: StorageLike, content: ResolvedContent, backup = false) {
  const raw = storage.getItem(saveKey(content) + (backup ? ':backup' : ''));
  if (raw === null) throw new Error(backup ? '還沒有備份存檔。' : '這個內容組合還沒有本機存檔。');
  return restoreSave(content, raw);
}
