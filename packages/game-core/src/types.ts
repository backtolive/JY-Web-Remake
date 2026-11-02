export const RUNTIME_VERSION = '0.1.0';
export type Condition = { op: 'flag'; key: string; equals: boolean }
  | { op: 'itemAtLeast'; itemId: string; count: number }
  | { op: 'all' | 'any'; conditions: Condition[] } | { op: 'not'; condition: Condition };
export type Step = { op: 'say'; dialogueId: string } | { op: 'setFlag'; key: string; value: boolean }
  | { op: 'giveItem'; itemId: string; amount: number }
  | { op: 'if'; condition: Condition; onTrue: number; onFalse: number }
  | { op: 'choice'; options: { text: string; target: number }[] } | { op: 'end' };
export interface GameEvent { id: string; steps: Step[] }
export interface Dialogue { id: string; text: string; speaker: string }
export interface GameMap {
  id: string; name: string; width: number; height: number; blocked: number[];
  npcs: { id: string; x: number; y: number; eventId: string }[];
  portals: { x: number; y: number; mapId: string; toX: number; toY: number }[];
}
export interface ContentPackage {
  manifest: { id: string; version: string; schemaVersion: 1; runtimeVersion: string;
    kind: 'base' | 'mod'; classification: 'mock' | 'original-derived'; license: string;
    ruleset: string; priority: number; dependencies: { id: string; version: string }[] };
  entry?: { mapId: string; x: number; y: number };
  maps: GameMap[]; dialogues: Dialogue[]; events: GameEvent[];
  items: { id: string; name: string }[];
  patches: { target: string; expectedText: string; text: string }[];
}
export interface ContentIdentity { id: string; version: string; sha256: string; kind: 'base' | 'mod'; priority: number }
export interface ResolvedContent {
  identities: readonly ContentIdentity[];
  settings: Readonly<Record<string, string | boolean | number>>;
  maps: Readonly<Record<string, GameMap>>; dialogues: Readonly<Record<string, Dialogue>>;
  events: Readonly<Record<string, GameEvent>>; items: Readonly<Record<string, { id: string; name: string }>>;
  entry: { mapId: string; x: number; y: number };
}
export interface EventCursor { eventId: string; pc: number; waiting: 'dialogue' | 'choice' | null }
export interface GameState {
  mapId: string; x: number; y: number;
  flags: Record<string, boolean>; inventory: Record<string, number>; cursor: EventCursor | null; rngState: number;
}
export type MoveDirection = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
export type Command = { type: 'MOVE'; direction: MoveDirection }
  | { type: 'INTERACT'; npcId: string } | { type: 'CONTINUE' } | { type: 'CHOOSE'; option: number };
export interface SaveEnvelope {
  schemaVersion: 1; runtimeVersion: string; content: readonly ContentIdentity[];
  settings: Readonly<Record<string, string | boolean | number>>; state: GameState;
}
