// Minimal PNG reader used by the alignment check: 8-bit non-interlaced images
// (colour types 0/2/3/4/6), which is what Chromium screenshots produce.

import zlib from 'node:zlib';

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('not a PNG file');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  const idat = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = Buffer.from(data);
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (interlace !== 0) throw new Error('interlaced PNG not supported');
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth: ${bitDepth}`);
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type: ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = Buffer.alloc(height * stride);
  let pos = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const previous = y === 0 ? null : data.subarray((y - 1) * stride, y * stride);
    const current = data.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? current[x - channels] : 0;
      const b = previous ? previous[x] : 0;
      const c = previous && x >= channels ? previous[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value = (value + a) & 0xff;
      else if (filter === 2) value = (value + b) & 0xff;
      else if (filter === 3) value = (value + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        value = (value + predictor) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`unknown PNG filter type: ${filter}`);
      }
      current[x] = value;
    }
  }

  return {
    width,
    height,
    colorType,
    channels,
    pixel(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      const index = y * stride + x * channels;
      if (colorType === 6) return [data[index], data[index + 1], data[index + 2], data[index + 3]];
      if (colorType === 2) return [data[index], data[index + 1], data[index + 2], 255];
      if (colorType === 4) return [data[index], data[index], data[index], data[index + 1]];
      if (colorType === 0) return [data[index], data[index], data[index], 255];
      const paletteIndex = data[index] * 3;
      return [palette[paletteIndex], palette[paletteIndex + 1], palette[paletteIndex + 2], 255];
    },
  };
}
