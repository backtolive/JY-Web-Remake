import { bindControlledEventHost, resolveControlledEventContent } from '@jy/game-core';
import type { ResolvedContent } from '@jy/game-core';
import source from '../../../tests/fixtures/mock-controlled-event.json';
import resources from '../../../tests/fixtures/mock-controlled-resources.json';

export async function resolveMockControlledForHost(host: ResolvedContent) {
  return bindControlledEventHost(await resolveControlledEventContent(source), host, resources);
}
