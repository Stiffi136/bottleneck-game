#!/usr/bin/env node
// stack.mjs – stapelt Rohbild-Hälften (z. B. S05a + S05b) zu einem Sheet, bevor clean-sheet.mjs läuft.
// Ebene: Rohbild. Dann gilt für das ganze Sheet derselbe Maßstab/Raster, und Namen und Gruppen kommen aus einer Tabelle.
// Aufruf: node tools/stack.mjs <oben.png> <unten.png> [weitere...] [--out assets/work/<name>.png] [--horizontal]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [], opt = {};
const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) {
  if (av[i] === '--horizontal') opt.horizontal = true;
  else if (av[i] === '--out') opt.out = av[++i];
  else if (av[i] === '--help') opt.help = true;
  else files.push(av[i]);
}
if (opt.help || files.length < 2) {
  console.log('Aufruf: node tools/stack.mjs <oben.png> <unten.png> [weitere...] [--out PFAD.png] [--horizontal]\n' +
    'Stapelt Rohbilder untereinander (a oben). Abweichende Breite: die späteren Bilder werden auf die Breite des ersten skaliert.\n' +
    'Standard-Ausgabe: assets/work/<erste>_stacked.png');
  process.exit(opt.help ? 0 : 1);
}
const imgs = [];
for (const f of files) {
  const { data, info } = await sharp(path.resolve(f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  imgs.push({ f, data, w: info.width, h: info.height });
}
const ref = imgs[0];
for (const im of imgs.slice(1)) {
  const same = opt.horizontal ? im.h === ref.h : im.w === ref.w;
  if (!same) {
    const nw = opt.horizontal ? Math.round(im.w * ref.h / im.h) : ref.w, nh = opt.horizontal ? ref.h : Math.round(im.h * ref.w / im.w);
    console.warn(`Warnung: ${path.basename(im.f)} ${im.w}x${im.h} -> ${nw}x${nh} skaliert`);
    im.data = await sharp(im.data, { raw: { width: im.w, height: im.h, channels: 4 } }).resize(nw, nh, { kernel: 'lanczos3' }).raw().toBuffer();
    im.w = nw; im.h = nh;
  }
}
const W = opt.horizontal ? imgs.reduce((s, i) => s + i.w, 0) : ref.w;
const H = opt.horizontal ? ref.h : imgs.reduce((s, i) => s + i.h, 0);
const out = Buffer.alloc(W * H * 4);
let ox = 0, oy = 0;
for (const im of imgs) {
  for (let y = 0; y < im.h; y++) im.data.copy(out, ((oy + y) * W + ox) * 4, y * im.w * 4, (y + 1) * im.w * 4);
  if (opt.horizontal) ox += im.w; else oy += im.h;
}
const outPath = path.resolve(opt.out || path.join(ROOT, 'assets/work', path.basename(files[0], path.extname(files[0])) + '_stacked.png'));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
console.log(`stack: ${files.map((f) => path.basename(f)).join(' + ')} -> ${path.relative(process.cwd(), outPath)} (${W}x${H})`);
