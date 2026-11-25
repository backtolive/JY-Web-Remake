// Convert the decoded item-icon PPM files to PNG (minimal encoder: RGB8, filter 0).
// Read-only over the probe output; writes PNG next to each PPM.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

for (const itemId of [0, 110, 160]) {
  const files = { 0: 'item-0-kangbeitete-0', 110: 'item-110-jinse-sword-110', 160: 'item-160-tang-poetry-160' };
  const raw = readFileSync(`assets/generated/pic-atlas-probe/${files[itemId]}.ppm`);
  // Parse P6 header.
  let pos = 0;
  const readToken = () => {
    while (pos < raw.length && (raw[pos] === 0x20 || raw[pos] === 0x0a || raw[pos] === 0x0d)) pos++;
    const start = pos;
    while (pos < raw.length && raw[pos] > 0x20) pos++;
    return raw.toString('ascii', start, pos);
  };
  const magic = readToken();
  if (magic !== 'P6') throw new Error('not P6');
  const w = Number(readToken()), h = Number(readToken()), max = Number(readToken());
  pos++; // single whitespace after max
  const pixels = raw.subarray(pos, pos + w * h * 3);
  const scanlines = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    scanlines[y * (1 + w * 3)] = 0;
    pixels.copy(scanlines, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  const out = `assets/generated/pic-atlas-probe/${files[itemId]}.png`;
  writeFileSync(out, png);
  console.log(`${out} (${w}x${h})`);
}
