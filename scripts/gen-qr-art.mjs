#!/usr/bin/env node
// Render a QR code as a 4:3 landscape card-art PNG (black modules on a white
// field, centred with a generous quiet zone) so it sits in the card's
// cover-fit art box without being cropped.
//
// Usage: node scripts/gen-qr-art.mjs "<url>" <slug>
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import QRCode from "qrcode";
import { PNG } from "pngjs";

const [url, slug] = process.argv.slice(2);
if (!url || !slug) {
  console.error('Usage: node scripts/gen-qr-art.mjs "<url>" <slug>');
  process.exit(2);
}

const W = 1024, H = 768; // 4:3 to match the card art box (cover-fit, no crop)

// Build the QR matrix. Medium error correction tolerates a little print wear.
const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
const size = qr.modules.size;
const bits = qr.modules.data; // 1 = dark module

// Largest integer module size that keeps a >=4-module white quiet zone vertically.
const maxSide = Math.min(H * 0.82, W * 0.82);
const scale = Math.max(1, Math.floor(maxSide / (size + 8)));
const qrPx = size * scale;
const ox = Math.round((W - qrPx) / 2);
const oy = Math.round((H - qrPx) / 2);

const png = new PNG({ width: W, height: H });
// Fill white.
png.data.fill(0xff);
// Paint dark modules black.
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (!bits[r * size + c]) continue;
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const x = ox + c * scale + dx;
        const y = oy + r * scale + dy;
        const i = (y * W + x) << 2;
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0xff;
      }
    }
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artDir = join(root, "public", "art");
mkdirSync(artDir, { recursive: true });
const out = join(artDir, `${slug}.png`);
writeFileSync(out, PNG.sync.write(png));
console.log(`✓ ${slug}.png  (${size}×${size} modules, ${scale}px each → ${qrPx}px QR on ${W}×${H})  → ${url}`);
