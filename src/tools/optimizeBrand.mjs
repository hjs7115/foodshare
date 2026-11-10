// Optimize the original 960px brand illustration for its 176px displayed size.
// Pure Node.js; no new dependencies, and no changes to the original artwork.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const input = readFileSync(new URL('../assets/brand-mark.png', import.meta.url));
const output = new URL('../assets/brand-mark-optimized.png', import.meta.url);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!input.subarray(0, 8).equals(signature)) throw new Error('Not a PNG image');

let width = 0, height = 0;
const compressed = [];
for (let offset = 8; offset < input.length;) {
  const length = input.readUInt32BE(offset);
  const type = input.toString('ascii', offset + 4, offset + 8);
  const payload = input.subarray(offset + 8, offset + 8 + length);
  if (type === 'IHDR') {
    width = payload.readUInt32BE(0);
    height = payload.readUInt32BE(4);
    if (payload[8] !== 8 || payload[9] !== 6 || payload[12] !== 0)
      throw new Error('Expected an 8-bit noninterlaced RGBA brand PNG');
  } else if (type === 'IDAT') compressed.push(payload);
  offset += length + 12;
  if (type === 'IEND') break;
}
if (!width || !height || !compressed.length) throw new Error('Invalid PNG chunks');

const stride = width * 4;
const raw = inflateSync(Buffer.concat(compressed));
if (raw.length !== height * (stride + 1)) throw new Error('Unexpected PNG data length');
const pixels = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  for (let x = 0; x < stride; x++) {
    const i = y * stride + x;
    const left = x >= 4 ? pixels[i - 4] : 0;
    const up = y > 0 ? pixels[i - stride] : 0;
    const upperLeft = x >= 4 && y > 0 ? pixels[i - stride - 4] : 0;
    let predictor = 0;
    if (filter === 1) predictor = left;
    else if (filter === 2) predictor = up;
    else if (filter === 3) predictor = (left + up) >>> 1;
    else if (filter === 4) {
      const p = left + up - upperLeft;
      const a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upperLeft);
      predictor = a <= b && a <= c ? left : b <= c ? up : upperLeft;
    } else if (filter !== 0) throw new Error('Unsupported PNG row filter');
    pixels[i] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
  }
}

const outW = Math.ceil(width / 2), outH = Math.ceil(height / 2);
const outStride = outW * 4;
const out = Buffer.alloc(outH * (outStride + 1));
for (let y = 0; y < outH; y++) {
  const row = y * (outStride + 1);
  out[row] = 1; // PNG Sub filter
  let last = [0, 0, 0, 0];
  for (let x = 0; x < outW; x++) {
    let alphaSum = 0, rSum = 0, gSum = 0, bSum = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = Math.min(width - 1, x * 2 + dx);
      const sy = Math.min(height - 1, y * 2 + dy);
      const i = (sy * width + sx) * 4, a = pixels[i + 3];
      alphaSum += a;
      rSum += pixels[i] * a;
      gSum += pixels[i + 1] * a;
      bSum += pixels[i + 2] * a;
    }
    const rgba = [
      alphaSum ? Math.round(rSum / alphaSum) : 0,
      alphaSum ? Math.round(gSum / alphaSum) : 0,
      alphaSum ? Math.round(bSum / alphaSum) : 0,
      Math.round(alphaSum / 4),
    ];
    const base = row + 1 + x * 4;
    for (let c = 0; c < 4; c++) out[base + c] = (rgba[c] - last[c] + 256) & 255;
    last = rgba;
  }
}

let table;
function crc32(bytes) {
  table ||= Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    return c >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(outW, 0);
header.writeUInt32BE(outH, 4);
header[8] = 8; // 8-bit
header[9] = 6; // RGBA
const result = Buffer.concat([
  signature,
  pngChunk('IHDR', header),
  pngChunk('IDAT', deflateSync(out, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(output, result);
console.log('Brand logo:', width + 'x' + height, input.length + 'B',
  '->', outW + 'x' + outH, result.length + 'B');
