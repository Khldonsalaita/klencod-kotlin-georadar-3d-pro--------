import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a) {
  // Construct a minimal uncompressed/deflated RGBA PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crc = calcCRC(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function calcCRC(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with 1 byte filter per line
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(height * rowLen);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Draw rounded border and radar wave motif
      const distFromCenter = Math.sqrt(
        Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
      );
      const isRadarWave = Math.abs(distFromCenter - width * 0.28) < width * 0.03;
      const isCenterHyperbola = y > height * 0.45 && Math.abs(y - height * 0.65 + Math.pow((x - width / 2) / (width * 0.35), 2) * (height * 0.2)) < width * 0.04;

      if (isCenterHyperbola) {
        raw[pxOffset] = 245;     // Orange / Gold
        raw[pxOffset + 1] = 158;
        raw[pxOffset + 2] = 11;
        raw[pxOffset + 3] = 255;
      } else if (isRadarWave) {
        raw[pxOffset] = 16;      // Emerald Green wave
        raw[pxOffset + 1] = 185;
        raw[pxOffset + 2] = 129;
        raw[pxOffset + 3] = 255;
      } else {
        // Deep navy background
        raw[pxOffset] = r;
        raw[pxOffset + 1] = g;
        raw[pxOffset + 2] = b;
        raw[pxOffset + 3] = a;
      }
    }
  }

  const idatData = zlib.deflateSync(raw);
  const idat = chunk('IDAT', idatData);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
}

const pwa192 = createPNG(192, 192, 10, 15, 29, 255);
const pwa512 = createPNG(512, 512, 10, 15, 29, 255);
const appleIcon = createPNG(180, 180, 10, 15, 29, 255);

fs.writeFileSync('public/pwa-192x192.png', pwa192);
fs.writeFileSync('public/pwa-512x512.png', pwa512);
fs.writeFileSync('public/pwa-maskable-512x512.png', pwa512);
fs.writeFileSync('public/apple-touch-icon.png', appleIcon);
fs.writeFileSync('public/favicon.ico', createPNG(32, 32, 16, 185, 129, 255));

console.log('PWA PNG icons generated successfully in public/');
