import { canonical, contentHash, isBlocked } from './content.ts';
import type { ResolvedContent } from './types.ts';
import type { ResolvedControlledEventContent } from './controlled-event.ts';

export interface ControlledHostResources {
  encounters: Record<string, { name: string }>;
  animations: Record<string, { name: string }>;
  characters: Record<string, { name: string }>;
}
export interface BoundControlledEventContent extends ResolvedControlledEventContent {
  resources: ControlledHostResources;
}
function fail(code: string): never { throw new Error(`CONTROLLED_HOST_${code}`); }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function names(registry: Record<string, { name: string }>): void {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry) || Object.keys(registry).length > 1000) fail('CATALOGUE');
  for (const [id, value] of Object.entries(registry)) if (!/^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$/.test(id) ||
    !value || typeof value.name !== 'string' || !value.name || value.name.length > 160 ||
    Object.keys(value).some(key => key !== 'name')) fail('CATALOGUE');
}
/** Bind a Mock command package to exact host maps and explicit resource catalogues. */
export async function bindControlledEventHost(event: ResolvedControlledEventContent, host: ResolvedContent,
  resources: ControlledHostResources): Promise<BoundControlledEventContent> {
  const copy = JSON.parse(canonical(resources)) as ControlledHostResources;
  if (!copy || Object.keys(copy).sort().join(',') !== 'animations,characters,encounters') fail('CATALOGUE');
  names(copy.encounters); names(copy.animations); names(copy.characters);
  function location(mapId: string, x: number, y: number) {
    const map = host.maps[mapId];
    if (!map || isBlocked(map, x, y)) fail('LOCATION');
  }
  location(event.data.entry.mapId, event.data.entry.x, event.data.entry.y);
  for (const entry of Object.values(event.data.events)) for (const step of entry.steps) if (step.op === 'invoke') {
    const command = step.command;
    if (command.kind === 'battle' && !Object.hasOwn(copy.encounters, command.encounterId)) fail('ENCOUNTER_REFERENCE');
    if (command.kind === 'animation' && !Object.hasOwn(copy.animations, command.animationId)) fail('ANIMATION_REFERENCE');
    if (command.kind === 'selection' && command.candidates.some(id => !Object.hasOwn(copy.characters, id))) fail('CHARACTER_REFERENCE');
    if (command.kind === 'transition') location(command.destination.mapId, command.destination.x, command.destination.y);
  }
  const sha256 = await contentHash({ event: event.identity, host: host.identities,
    settings: host.settings, resources: copy });
  return freeze({ identity: { ...event.identity, sha256 }, data: event.data, resources: copy });
}
