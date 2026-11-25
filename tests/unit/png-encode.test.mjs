import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { encodeRgbaPng } from '../../tools/extractor/png-encode.mjs';

test('PNG encoder emits a valid 8-bit RGBA signature and IHDR', () => {
  const rgba = Buffer.alloc(2 * 2 * 4);
  rgba.set([255, 0, 0, 255], 0);
  rgba.set([0, 255, 0, 255], 4);
  rgba.set([0, 0, 255, 255], 8);
  rgba.set([128, 128, 128, 0], 12); // transparent
  const png = encodeRgbaPng(2, 2, rgba);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 2); // width
  assert.equal(png.readUInt32BE(20), 2); // height
  assert.equal(png[24], 8); // bit depth
  assert.equal(png[25], 6); // color type: RGBA
  // Walk chunks; the IDAT must inflate to (width*4 + 1) * height raw bytes (filter byte per row).
  let offset = 8, idat = null;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') idat = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
  }
  assert.ok(idat);
  assert.equal(inflateSync(idat).length, (2 * 4 + 1) * 2);
  // Deflate round-trip preserves the raw scanlines (filter 0 + RGBA rows).
  const raw = inflateSync(idat);
  assert.equal(raw[0], 0); // first row filter byte
  assert.equal(raw[1], 255); // first pixel R
});

test('PNG encoder rejects size and dimension mismatches', () => {
  assert.throws(() => encodeRgbaPng(2, 2, Buffer.alloc(8)), { message: 'PNG_SIZE_MISMATCH' });
  assert.throws(() => encodeRgbaPng(0, 2, Buffer.alloc(16)), { message: 'PNG_DIMENSIONS' });
  assert.throws(() => encodeRgbaPng(2, 2.5, Buffer.alloc(16)), { message: 'PNG_DIMENSIONS' });
});
