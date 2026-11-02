import type { MoveDirection } from '@jy/game-core';

/** Shared by camera creation and input; screen Y grows downwards. */
export const VIEW_CAMERA = { alpha: -Math.PI / 4, beta: Math.PI / 3.1 } as const;
export interface ScreenDirection { x: number; y: number }
export const SCREEN_BUTTONS = [
  { name: 'up-left', x: -1, y: -1, label: '向左上移動', arrow: '↖' },
  { name: 'up', x: 0, y: -1, label: '向上移動', arrow: '↑' },
  { name: 'up-right', x: 1, y: -1, label: '向右上移動', arrow: '↗' },
  { name: 'left', x: -1, y: 0, label: '向左移動', arrow: '←' },
  { name: 'right', x: 1, y: 0, label: '向右移動', arrow: '→' },
  { name: 'down-left', x: -1, y: 1, label: '向左下移動', arrow: '↙' },
  { name: 'down', x: 0, y: 1, label: '向下移動', arrow: '↓' },
  { name: 'down-right', x: 1, y: 1, label: '向右下移動', arrow: '↘' },
] as const;

/** Convert camera-relative directions to grid steps; core never knows camera angle. */
export function screenToGridDirection(x: number, y: number): MoveDirection | null {
  if (![-1, 0, 1].includes(x) || ![-1, 0, 1].includes(y)) throw new Error('INVALID_SCREEN_DIRECTION');
  if (x === 0 && y === 0) return null;
  const sign = (value: number) => Math.abs(value) < 1e-8 ? 0 : Math.sign(value);
  const dx = sign(-Math.sin(VIEW_CAMERA.alpha) * x + Math.cos(VIEW_CAMERA.alpha) * y);
  const dy = sign(Math.cos(VIEW_CAMERA.alpha) * x + Math.sin(VIEW_CAMERA.alpha) * y);
  if (dx === 0) return dy < 0 ? 'north' : 'south';
  if (dy === 0) return dx < 0 ? 'west' : 'east';
  return `${dy < 0 ? 'north' : 'south'}${dx < 0 ? 'west' : 'east'}` as MoveDirection;
}

const KEY_AXES: Readonly<Record<string, ScreenDirection>> = {
  arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
};
export function keyScreenDirection(key: string): ScreenDirection | undefined {
  return Object.hasOwn(KEY_AXES, key.toLowerCase()) ? KEY_AXES[key.toLowerCase()] : undefined;
}

interface Clock { schedule(callback: () => void, delay: number): number; cancel(id: number): void }
/** Brief chord window avoids moving along the first key before a two-key diagonal. */
export function createMovementController(move: (direction: MoveDirection) => void, canMove: () => boolean, clock: Clock) {
  const held = new Map<string, ScreenDirection>();
  let timer: number | undefined, moved = false;
  const direction = () => {
    const values = [...held.values()];
    const x = Number(values.some(v => v.x > 0)) - Number(values.some(v => v.x < 0));
    const y = Number(values.some(v => v.y > 0)) - Number(values.some(v => v.y < 0));
    return screenToGridDirection(x, y);
  };
  function clear() { if (timer !== undefined) clock.cancel(timer); timer = undefined; held.clear(); moved = false; }
  function tick() {
    timer = undefined;
    if (!canMove() || !held.size) { clear(); return; }
    const next = direction();
    moved = true;
    if (next) move(next);
    if (held.size) timer = clock.schedule(tick, 140);
  }
  return {
    keyDown(key: string) {
      const axis = keyScreenDirection(key); if (!axis) return false;
      if (!canMove()) { clear(); return true; }
      const normalized = key.toLowerCase();
      if (held.has(normalized)) return true;
      held.set(normalized, axis);
      if (timer === undefined) { moved = false; timer = clock.schedule(tick, 65); }
      return true;
    },
    keyUp(key: string) {
      const normalized = key.toLowerCase();
      if (!held.has(normalized)) return false;
      const next = direction(); held.delete(normalized);
      if (!held.size) {
        if (!moved && canMove() && next) move(next);
        clear();
      }
      return true;
    },
    clear,
  };
}
