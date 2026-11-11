import type { MoveDirection } from '@jy/game-core';

/** Shared by camera creation and input; screen Y grows downwards. */
export const VIEW_CAMERA = { alpha: -Math.PI / 4, beta: Math.PI / 3.1 } as const;
export interface CameraView { alpha:number; beta:number; gridYSign?:1|-1 }
export const PROJECTED_GRID_Y_SIGN=-1 as const;
export const projectedWorldPoint=(x:number,y:number)=>({x,y:0,z:y*PROJECTED_GRID_Y_SIGN});
/** Same source pixel basis for ground and upright images; only their depth differs. */
export function projectedImageOffset(image:{xOffset:number;yOffset:number},px:number,py:number,projection:'ground'|'billboard',layer=0){
  const sx=px-image.xOffset,sy=py-image.yOffset+8;
  if(projection==='ground')return {...projectedWorldPoint((sx/18+sy/9)/2,(sy/9-sx/18)/2),y:layer*.002};
  const {alpha,beta}=VIEW_CAMERA,dx=sx*Math.SQRT2/36,dy=sy*Math.SQRT2*Math.cos(beta)/18;
  return {x:-Math.sin(alpha)*dx+Math.cos(alpha)*Math.cos(beta)*dy,y:-Math.sin(beta)*dy+layer*.002,z:Math.cos(alpha)*dx+Math.sin(alpha)*Math.cos(beta)*dy};
}
/** Orthographic projection of world X/Z onto screen X/Y (screen Y grows down). */
export function cameraGroundProjection(view:CameraView){
  if(!Number.isFinite(view.alpha)||!Number.isFinite(view.beta))throw new Error('INVALID_CAMERA_VIEW');
  return {a:-Math.sin(view.alpha),b:Math.cos(view.alpha)*Math.cos(view.beta),
    c:Math.cos(view.alpha)*(view.gridYSign??1),d:Math.sin(view.alpha)*Math.cos(view.beta)*(view.gridYSign??1)};
}
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
export function screenToGridDirection(x: number, y: number, alpha:number=VIEW_CAMERA.alpha,gridYSign:1|-1=1): MoveDirection | null {
  if(!Number.isFinite(alpha))throw new Error('INVALID_CAMERA_VIEW');
  if (![-1, 0, 1].includes(x) || ![-1, 0, 1].includes(y)) throw new Error('INVALID_SCREEN_DIRECTION');
  if (x === 0 && y === 0) return null;
  const sign = (value: number) => Math.abs(value) < 1e-8 ? 0 : Math.sign(value);
  const dx = sign(-Math.sin(alpha) * x + Math.cos(alpha) * y);
  const dy = sign(Math.cos(alpha) * x + Math.sin(alpha) * y)*gridYSign;
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
export function createMovementController(move: (direction: MoveDirection) => void, canMove: () => boolean, clock: Clock, getView:()=>CameraView=()=>VIEW_CAMERA) {
  const held = new Map<string, ScreenDirection>();
  let timer: number | undefined, moved = false;
  const direction = () => {
    const values = [...held.values()];
    const x = Number(values.some(v => v.x > 0)) - Number(values.some(v => v.x < 0));
    const y = Number(values.some(v => v.y > 0)) - Number(values.some(v => v.y < 0));
    const view=getView();return screenToGridDirection(x,y,view.alpha,view.gridYSign??1);
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
      const next = direction();
      // Flush a quick chord before releasing its first key, not after it becomes a single key.
      if (!moved) {
        moved = true;
        if (canMove() && next) move(next);
        if (timer !== undefined) clock.cancel(timer);
        timer = undefined;
      }
      held.delete(normalized);
      if (!held.size) {
        clear();
      } else if (timer === undefined) timer = clock.schedule(tick, 140);
      return true;
    },
    clear,
  };
}
