const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const bg = { r: 37, g: 99, b: 235 };   // blue-600
  const fg = { r: 255, g: 255, b: 255 };  // white

  const raw = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const r = size * 0.28;
  const sw = size * 0.045;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // doc body
      const docW = size * 0.38, docH = size * 0.48;
      const docX = cx - docW / 2, docY = cy - docH / 2 + size * 0.02;
      const foldSize = docW * 0.28;
      const inDoc = x >= docX && x <= docX + docW && y >= docY && y <= docY + docH;
      const inFold = x >= docX + docW - foldSize && y <= docY + foldSize &&
                     (x - (docX + docW - foldSize)) + (docY + foldSize - y) <= foldSize;
      const isLine1 = Math.abs(y - (docY + docH * 0.52)) <= sw && x >= docX + docW * 0.2 && x <= docX + docW * 0.8;
      const isLine2 = Math.abs(y - (docY + docH * 0.67)) <= sw && x >= docX + docW * 0.2 && x <= docX + docW * 0.8;

      const c = (inDoc && !inFold) ? fg : bg;
      if (isLine1 || isLine2) { raw[i]=bg.r; raw[i+1]=bg.g; raw[i+2]=bg.b; raw[i+3]=255; }
      else { raw[i]=c.r; raw[i+1]=c.g; raw[i+2]=c.b; raw[i+3]=255; }
    }
  }

  // filter type 0 (None) per scanline
  const filtered = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    filtered[y * (size * 4 + 1)] = 0;
    raw.copy(filtered, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(filtered);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = crc32(Buffer.concat([t, data]));
    const c = Buffer.alloc(4); c.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, t, data, c]);
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = crc32.table || (crc32.table = (function () {
      const t = [];
      for (let n = 0; n < 256; n++) {
        let v = n;
        for (let k = 0; k < 8; k++) v = (v & 1) ? 0xEDB88320 ^ (v >>> 1) : (v >>> 1);
        t[n] = v;
      }
      return t;
    })());
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF);
  }

  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), createPNG(512));
console.log('Ícones gerados em /icons/');
