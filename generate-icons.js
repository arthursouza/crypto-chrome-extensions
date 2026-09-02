// Generates clean PNG icons without external npm dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawFn) {
  // Create RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const pixel = drawFn(x, y, width, height);
      buffer[idx] = pixel[0];     // R
      buffer[idx + 1] = pixel[1]; // G
      buffer[idx + 2] = pixel[2]; // B
      buffer[idx + 3] = pixel[3]; // A
    }
  }

  // Create scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0; // Filter: None
    buffer.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(scanlines);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(6, 9);  // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc >>> 0, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

// Draw icon: Sleek rounded neon badge with 'GM' or GMGN cat eyes / badge
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;

  // Normalized distance from center
  const dx = x - cx + 0.5;
  const dy = y - cy + 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded square border
  const cornerRadius = w * 0.28;
  const qx = Math.max(0, Math.abs(dx) - (w / 2 - cornerRadius - 1));
  const qy = Math.max(0, Math.abs(dy) - (h / 2 - cornerRadius - 1));
  const boxDist = Math.sqrt(qx * qx + qy * qy);

  if (boxDist > cornerRadius) {
    return [0, 0, 0, 0]; // Transparent outside rounded rect
  }

  // Inside background: deep dark purple / indigo gradient
  const grad = y / h;
  const bgR = Math.round(18 + grad * 12);
  const bgG = Math.round(20 + grad * 15);
  const bgB = Math.round(38 + grad * 40);

  // Neon green / cyan accent for GMGN
  const accentR = 34;
  const accentG = 211;
  const accentB = 153;

  // Outer border highlight
  if (boxDist >= cornerRadius - 1.5) {
    return [accentR, accentG, accentB, 255];
  }

  // Draw GM letters or GMGN icon
  const nx = x / w;
  const ny = y / h;

  // Draw sleek stylized "G" and "M"
  const isG = (
    (nx >= 0.20 && nx <= 0.46 && ny >= 0.26 && ny <= 0.74) &&
    (nx <= 0.28 || ny <= 0.36 || ny >= 0.64 || (nx >= 0.36 && ny >= 0.48))
  );

  const isM = (
    (nx >= 0.54 && nx <= 0.80 && ny >= 0.26 && ny <= 0.74) &&
    (nx <= 0.61 || nx >= 0.73 || (ny <= 0.50 && Math.abs((nx - 0.67)) <= 0.05))
  );

  if (isG || isM) {
    return [accentR, accentG, accentB, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createPNG(size, size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png`);
});

