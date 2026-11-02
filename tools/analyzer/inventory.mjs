import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = new Set(['.exe', '.idx', '.grp', '.col', '.dat', '.bin', '.sav']);

/** Read-only inventory. Extensions are hints, never proof of format. */
export async function inventory(root) {
  const base = await realpath(root);
  if (!(await lstat(base)).isDirectory()) throw new Error('Input must be a directory');
  const files = [];
  async function walk(dir) {
    const names = (await readdir(dir)).sort();
    for (const name of names) {
      const absolute = path.join(dir, name);
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Symbolic links are unsupported: ${name}`);
      if (stat.isDirectory()) { await walk(absolute); continue; }
      if (!stat.isFile()) throw new Error(`Unsupported filesystem entry: ${name}`);
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(absolute)) hash.update(chunk);
      const after = await lstat(absolute);
      if (stat.size !== after.size || stat.mtimeMs !== after.mtimeMs) throw new Error(`File changed during scan: ${name}`);
      const extension = path.extname(name).toLowerCase();
      files.push({ name, relativePath: path.relative(base, absolute).split(path.sep).join('/'), size: stat.size,
        sha256: hash.digest('hex'), formatGuess: candidates.has(extension) ? `extension-only:${extension}` : 'unknown',
        possibleUse: 'Unknown; requires version-specific source evidence', knownParser: null, parseStatus: 'not-parsed' });
    }
  }
  await walk(base);
  files.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
  return { schemaVersion: 1, scannerVersion: '0.1.0', files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) throw new Error('Usage: pnpm inventory <input-directory> <output.json>');
    const base = await realpath(input);
    const target = path.resolve(output);
    // Resolve parent too, so a junction cannot redirect the output into input.
    const resolvedTarget = path.join(await realpath(path.dirname(target)), path.basename(target));
    const relative = path.relative(base, resolvedTarget);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('Output must be outside the input directory');
    }
    await writeFile(target, JSON.stringify(await inventory(base), null, 2) + '\n', { flag: 'wx' });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
