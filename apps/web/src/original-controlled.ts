/** Bind the original events content package to the host game for unified session use.
 * The original events have no transition commands in the current package, so the
 * location check passes trivially. Resources are empty (no battle/animation/selection
 * commands that reference external resources). */
import { bindControlledEventHost, resolveControlledEventContent } from '@jy/game-core';
import type { ResolvedContent, ResolvedControlledEventContent, BoundControlledEventContent } from '@jy/game-core';

const EMPTY_RESOURCES = {
  encounters: {},
  animations: {},
  characters: {},
};

export async function resolveOriginalEventsForHost(
  host: ResolvedContent,
  parsed: unknown,
): Promise<BoundControlledEventContent> {
  const content = await resolveControlledEventContent(parsed);
  return bindControlledEventHost(content, host, EMPTY_RESOURCES);
}
