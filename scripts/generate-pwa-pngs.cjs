const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Lightweight standalone PNG generator without external dependencies
function createPngBuffer(width, height, drawFn) {
  // RGBA buffer + 1 filter byte per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Deflate compressed IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = calcCrc(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// CRC-32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calcCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

// RoV Theme Badge Drawing Logic
function drawRovBadge(x, y, w, h, isMaskable = false) {
  // Normalize coordinates (-1 to 1)
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background gradient: dark navy / slate
  let r = 15, g = 23, b = 42, a = 255;
  const grad = Math.max(0, 1 - dist * 0.7);
  r = Math.round(15 + 20 * grad);
  g = Math.round(23 + 35 * grad);
  b = Math.round(42 + 75 * grad);

  // Maskable padding: keep core within 80% safe zone
  const scale = isMaskable ? 0.75 : 0.9;
  const sx = nx / scale;
  const sy = ny / scale;

  // Gold Crest Ring
  const ringDist = Math.sqrt(sx * sx + sy * sy);
  if (ringDist > 0.82 && ringDist < 0.90) {
    return [234, 179, 8, 255]; // Gold
  }
  if (ringDist > 0.76 && ringDist < 0.79) {
    return [56, 189, 248, 255]; // Sky cyan
  }

  // Shield Shape: upper flat, tapering down
  const inShield = (sy >= -0.65 && sy <= 0.65) &&
    (Math.abs(sx) <= 0.65 * (1 - Math.max(0, sy) * 0.7));

  if (inShield) {
    // Shield border
    const borderThreshold = 0.55 * (1 - Math.max(0, sy) * 0.7);
    if (Math.abs(sx) > borderThreshold || sy < -0.58 || sy > 0.58) {
      return [234, 179, 8, 255]; // Gold edge
    }

    // Shield body: deep gradient
    const shieldGrad = (sy + 0.65) / 1.3;
    r = Math.round(2 + 25 * shieldGrad);
    g = Math.round(132 - 80 * shieldGrad);
    b = Math.round(199 - 130 * shieldGrad);

    // Center Diamond Gem
    const diamondDist = Math.abs(sx) * 2 + Math.abs(sy + 0.05) * 1.5;
    if (diamondDist < 0.35) {
      if (diamondDist > 0.28) {
        return [255, 255, 255, 255]; // White rim
      }
      return [56, 189, 248, 255]; // Cyan gem
    }

    // Crossed Swords
    if (Math.abs(Math.abs(sx) - Math.abs(sy + 0.05)) < 0.04 && Math.abs(sx) < 0.38) {
      return [253, 224, 71, 255]; // Gold swords
    }
  }

  // Text Banner at bottom
  if (sy > 0.45 && sy < 0.70 && Math.abs(sx) < 0.70) {
    if (Math.abs(sx) > 0.66 || sy < 0.48 || sy > 0.67) {
      return [253, 224, 71, 255]; // Gold banner border
    }
    return [202, 138, 4, 255]; // Dark gold bar
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA compliant PNG icons...');

// 1. 192x192
const p192 = createPngBuffer(192, 192, (x, y, w, h) => drawRovBadge(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), p192);

// 2. 512x512
const p512 = createPngBuffer(512, 512, (x, y, w, h) => drawRovBadge(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), p512);

// 3. Maskable 512x512 with safe zone padding
const pMask = createPngBuffer(512, 512, (x, y, w, h) => drawRovBadge(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pMask);

// 4. Apple Touch Icon 180x180
const pApple = createPngBuffer(180, 180, (x, y, w, h) => drawRovBadge(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pApple);

console.log('✅ Generated:');
console.log(' - public/pwa-192x192.png');
console.log(' - public/pwa-512x512.png');
console.log(' - public/pwa-maskable-512x512.png');
console.log(' - public/apple-touch-icon.png');
