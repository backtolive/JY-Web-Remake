/** Source-locked static route from initial scene data to dynamically installed event 581. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { readOriginalScene } from '../../packages/game-data/src/original.ts';

const pinned = {
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'ALLDEF.GRP': '3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480',
  'ALLSIN.GRP': '830ae313ccabe310a16d330eac83647a9c81a6c23efce6069ca87dc653f0e154',
  'RANGER.IDX': '52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  'RANGER.GRP': '07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab',
};
const events = {
  533: [83154, 110, '2f1193ac1a0055b1d267823823aea445b60f76040fbbe9e123a96fe387314a3e'],
  534: [83264, 482, '678434a1bc435dd84551b664b159cb37848b1de4a9e93664f37b8c5aea1e92f2'],
  536: [83944, 514, '3ce0c72b7820a3b1675796c478583d903f2b4b9e1daa33c38cc16c621f23b86e'],
  581: [88988, 106, 'ac27f3fee143440e3d3af716d1b460e703959545f58d7f93a604c3a7f5e74386'],
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(`EVENT581_ROUTE_${code}`); };
const equal = (left, right) => left.length === right.length && left.every((v, i) => v === right[i]);

function instruction(raw, wordOffset) {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  return Array.from({ length: 14 }, (_, index) => view.getInt16((wordOffset + index) * 2, true));
}

export function traceOriginal581Route(sources) {
  for (const [name, expected] of Object.entries(pinned))
    if (!(sources[name] instanceof Uint8Array) || sha(sources[name]) !== expected) fail(`SOURCE:${name}`);
  const ranges = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length);
  const records = {};
  for (const [idText, [offset, length, hash]] of Object.entries(events)) {
    const id = Number(idText), range = ranges[id];
    if (!range || range.sourceOffset !== offset || range.byteLength !== length) fail(`EVENT_RANGE:${id}`);
    const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
    if (sha(raw) !== hash) fail(`EVENT_HASH:${id}`);
    records[id] = raw;
  }
  const chain = [
    { writerEventId: 533, wordOffset: 40, targetScene: -2, targetSlot: -2, installedEventId: 534 },
    { writerEventId: 534, wordOffset: 205, targetScene: -2, targetSlot: 2, installedEventId: 536 },
    { writerEventId: 536, wordOffset: 90, targetScene: -2, targetSlot: 2, installedEventId: 581 },
  ];
  for (const step of chain) {
    const words = instruction(records[step.writerEventId], step.wordOffset);
    if (words[0] !== 3 || words[1] !== step.targetScene || words[2] !== step.targetSlot ||
        words[5] !== step.installedEventId) fail(`CHAIN:${step.writerEventId}`);
  }
  // Event 536 embeds event 581's complete executable body (without its terminator)
  // at word 160. This is a byte identity statement only, not reachability evidence.
  const event581Body = records[581].subarray(0, records[581].byteLength - 2);
  const event536Shared = records[536].subarray(160 * 2, 160 * 2 + event581Body.byteLength);
  if (!equal(event536Shared, event581Body)) fail('SHARED_BODY');
  const scene = readOriginalScene(sources['RANGER.IDX'], sources['RANGER.GRP'],
    sources['ALLSIN.GRP'], sources['ALLDEF.GRP'], 53);
  if (scene.name !== '擂鼓山' || !equal(scene.eventFields[0],
      [1, 0, 533, -1, -1, 6340, 6340, 6340, 0, 16, 28]) ||
      !equal(scene.eventFields[2], [0, 2, -1, -1, -1, -1, -1, -1, 0, 24, 18]))
    fail('SCENE_PRECONDITION');
  const cells = [];
  for (let cell = 0; cell < 4096; cell++) if ([0, 2].includes(scene.layers[3][cell]))
    cells.push({ slotId: scene.layers[3][cell], arrayIndex1: Math.floor(cell / 64), arrayIndex2: cell % 64 });
  if (JSON.stringify(cells) !== JSON.stringify([
    { slotId: 2, arrayIndex1: 18, arrayIndex2: 24 },
    { slotId: 0, arrayIndex1: 28, arrayIndex2: 16 },
  ])) fail('SCENE_CELLS');
  return {
    routeVersion: 1,
    classification: 'source-locked-static-dynamic-event-route',
    sourceHashes: pinned,
    scene: { sceneId: 53, name: scene.name, initialEventSlot: 0, installedEventSlot: 2, cells },
    chain,
    sharedBody: {
      sourceEventId: 581,
      sourceWordOffset: 0,
      wordLength: event581Body.byteLength / 2,
      embeddedEventId: 536,
      embeddedWordOffset: 160,
      classification: 'source-confirmed-byte-identical; runtime-reachability-unverified',
    },
    limitations: [
      'The chain is source-confirmed static data; natural gameplay traversal through every event is not replayed here.',
      'Layer coordinates are arrayIndex1/arrayIndex2 and are not renamed to unverified world X/Y.',
      'Event 536 shares the event 581 body bytes, but its branch reachability and later scene-28 writes are not DOS-verified.',
    ],
  };
}
