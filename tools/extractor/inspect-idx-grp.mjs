import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { IDX_GRP_PARSER_VERSION, parseIdxGrpIndex } from '../../packages/game-data/src/idx-grp.ts';

/** Metadata only. Never writes files or exports commercial resource contents. */
export async function inspectIdxGrp(indexPath, groupPath) {
  async function readStable(file) {
    const before = await stat(file);
    if (!before.isFile()) throw new Error('Input must be a regular file');
    const bytes = await readFile(file);
    const after = await stat(file);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || bytes.length !== before.size) {
      throw new Error(`Input changed while reading: ${path.basename(file)}`);
    }
    return bytes;
  }
  const index = await readStable(indexPath);
  const group = await readStable(groupPath);
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const ranges = parseIdxGrpIndex(index, group.length);
  return {
    schemaVersion: 1,
    parserVersion: IDX_GRP_PARSER_VERSION,
    layout: 'uint32-le-exclusive-end-offsets',
    confidence: 'Community Implementation',
    inputs: {
      index: { sourceFile: path.basename(indexPath), byteLength: index.length, sha256: sha256(index) },
      group: { sourceFile: path.basename(groupPath), byteLength: group.length, sha256: sha256(group) },
    },
    resources: ranges.map(range => ({ ...range,
      sha256: sha256(group.subarray(range.sourceOffset, range.sourceOffset + range.byteLength)),
    })),
    limitations: 'Container boundaries only; resource contents, text encoding and event semantics are not decoded or verified.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2) throw new Error('Usage: node tools/extractor/inspect-idx-grp.mjs <file.IDX> <file.GRP>');
    console.log(JSON.stringify(await inspectIdxGrp(args[0], args[1]), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.code ?? 'INPUT_ERROR', message: error.message,
      resourceId: error.resourceId }));
    process.exitCode = 1;
  }
}
