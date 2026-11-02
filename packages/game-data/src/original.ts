import { parseIdxGrpIndex, readIdxGrpResource } from './idx-grp.ts';

export const ORIGINAL_PARSER_VERSION = '0.1.0';
export const ORIGINAL_CONFIDENCE = 'Community Implementation';
export type TalkToken = { kind: 'text'; text: string } | { kind: 'lineBreak'; offset: number }
  | { kind: 'control'; offset: number; value: number };

/** WHATWG Big5 is explicitly not claimed to be identical to CP950 or DOS glyphs. */
export function decodeTalk(raw: Uint8Array) {
  if (!raw.length || raw[raw.length - 1] !== 0) throw new Error('TALK_TERMINATOR: expected encoded final 00');
  const transformed = Uint8Array.from(raw, byte => byte ^ 0xff);
  const tokens: TalkToken[] = [];
  let start = 0;
  const decoder = new TextDecoder('big5', { fatal: true });
  function flush(end: number) {
    if (end > start) tokens.push({ kind: 'text', text: decoder.decode(transformed.subarray(start, end)) });
  }
  for (let i = 0; i < transformed.length - 1; i++) {
    const value = transformed[i]!;
    if (value === 0x2a || value < 0x20 || value === 0xff || value === 0x7f) {
      flush(i);
      tokens.push(value === 0x2a ? { kind: 'lineBreak', offset: i } : { kind: 'control', offset: i, value });
      start = i + 1;
    }
  }
  flush(transformed.length - 1);
  return { codec: 'WHATWG Big5', tokens, transformed, terminalOffset: raw.length - 1,
    hasUnknownControls: tokens.some(token => token.kind === 'control'),
    displayText: tokens.map(token => token.kind === 'text' ? token.text : token.kind === 'lineBreak' ? '\n' : '\ufffd').join('') };
}

export interface OriginalScene {
  id: number;
  sourceOffset: number;
  name: string;
  recordBytes: Uint8Array;
  entranceRaw: number[];
  layers: readonly (readonly number[])[];
  eventFields: readonly (readonly number[])[];
  sceneCount: number;
  mapCapacity: number;
  eventCapacity: number;
}

/** Layer cells use [arrayIndex1 * 64 + arrayIndex2], not unverified world X/Y. */
export function readOriginalScene(index: Uint8Array, record: Uint8Array, maps: Uint8Array,
  events: Uint8Array, sceneId: number): OriginalScene {
  const sections = parseIdxGrpIndex(index, record.length);
  const sceneSection = sections[3];
  if (sections.length !== 6 || !sceneSection || sceneSection.byteLength % 52) throw new Error('SCENE_RECORD_LAYOUT');
  const sceneCount = sceneSection.byteLength / 52;
  if (!Number.isInteger(sceneId) || sceneId < 0 || sceneId >= sceneCount) throw new Error('SCENE_ID');
  if (maps.length % 49152 || events.length % 4400 || maps.length / 49152 < sceneCount || events.length / 4400 < sceneCount) {
    throw new Error('SCENE_CAPACITY');
  }
  const sourceOffset = sceneSection.sourceOffset + sceneId * 52;
  const recordBytes = new Uint8Array(record.subarray(sourceOffset, sourceOffset + 52));
  const view = new DataView(recordBytes.buffer);
  const nameBytes = recordBytes.subarray(2, 12);
  const nul = nameBytes.indexOf(0);
  const name = new TextDecoder('big5', { fatal: true }).decode(nameBytes.subarray(0, nul < 0 ? nameBytes.length : nul));
  const mapView = new DataView(maps.buffer, maps.byteOffset, maps.byteLength);
  const eventView = new DataView(events.buffer, events.byteOffset, events.byteLength);
  const layers = Array.from({ length: 6 }, (_, layer) => Array.from({ length: 4096 }, (_, cell) =>
    mapView.getInt16(sceneId * 49152 + layer * 8192 + cell * 2, true)));
  const eventFields = Array.from({ length: 200 }, (_, slot) => Array.from({ length: 11 }, (_, field) =>
    eventView.getInt16(sceneId * 4400 + slot * 22 + field * 2, true)));
  return { id: sceneId, sourceOffset, name, recordBytes, entranceRaw: [20, 22, 24, 26].map(offset => view.getInt16(offset, true)),
    layers, eventFields, sceneCount, mapCapacity: maps.length / 49152, eventCapacity: events.length / 4400 };
}

export interface OriginalDialogueRef { wordOffset: number; talkId: number; portraitId: number; side: number }

/** Only read-only 0/1/7/-1 events. Unsupported effects are never skipped. */
export function readDialogueOnlyEvent(index: Uint8Array, group: Uint8Array, eventId: number) {
  const ranges = parseIdxGrpIndex(index, group.length);
  if (!Number.isInteger(eventId) || eventId < 0 || !ranges[eventId]) throw new Error('EVENT_ID');
  const raw = readIdxGrpResource(group, ranges[eventId]!);
  if (raw.length % 2) throw new Error('EVENT_ALIGNMENT');
  const view = new DataView(raw.buffer);
  const dialogues: OriginalDialogueRef[] = [];
  let cursor = 0, terminated = false;
  while (cursor < raw.length / 2) {
    const opcode = view.getInt16(cursor * 2, true);
    if (opcode === -1 || opcode === 7) {
      if (cursor !== raw.length / 2 - 1) throw new Error('EVENT_TRAILING_DATA');
      terminated = true;
      break;
    }
    if (opcode === 0) { cursor++; continue; }
    if (opcode !== 1) throw new Error(`UNSUPPORTED_OPCODE:${opcode}@${cursor}`);
    if (cursor + 4 > raw.length / 2) throw new Error('EVENT_TRUNCATED');
    const talkId = view.getInt16((cursor + 1) * 2, true);
    const portraitId = view.getInt16((cursor + 2) * 2, true);
    const side = view.getInt16((cursor + 3) * 2, true);
    if (talkId < 0 || portraitId < 0 || ![0, 1, 2].includes(side)) throw new Error('EVENT_DIALOGUE_PARAMETERS');
    dialogues.push({ wordOffset: cursor, talkId, portraitId, side });
    cursor += 4;
  }
  if (!terminated) throw new Error('EVENT_UNTERMINATED');
  return { eventId, dialogues, raw };
}
