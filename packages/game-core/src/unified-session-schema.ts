import { saveSchema, stateSchema } from './schema.ts';
import { controlledEventSaveSchema } from './controlled-event-schema.ts';

const object = (properties: Record<string, unknown>) =>
  ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const controlledState = controlledEventSaveSchema.properties.state as { properties: Record<string, unknown> };
const { location: _location, ...eventProperties } = controlledState.properties;
export const unifiedSessionSaveSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://jy-web-remake.local/schema/unified-session-save-v4.json',
  ...object({ schemaVersion: { const: 4 }, runtimeVersion: { const: '0.4.0' },
    host: object({ content: saveSchema.properties.content, settings: saveSchema.properties.settings }),
    controlled: controlledEventSaveSchema.properties.content,
    state: object({ schemaVersion: { const: 1 }, mode: { enum: ['world', 'controlled'] },
      game: stateSchema, event: object(eventProperties) }) }),
};
