// single.mjs – HD-Aufbereitung für Einzelbilder und Sonderfälle (aufgerufen von build-all.mjs).
//   processObject     E01–E05: Hintergrund entfernen (falls vorhanden), auf den Inhalt zuschneiden, proportional auf Ziel×hd einpassen
//   processOverlay    E06: halbtransparentes Overlay: Alpha aus der Helligkeit über dem Grauhintergrund, Vollbild
//   processBackground E07–E10: randlos, nur auf Zielverhältnis zuschneiden und auf Ziel×scale skalieren
//   processTiles      S29: deckende, kachelbare Hintergrundkacheln (kein Hintergrund-Entfernen), Kanten-Kachelbarkeit prüfen
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BG_DARK = [0x1a, 0x1a, 0x2e];

export async function readRaw(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}
export async function writeOut({ rgba, w, h, name, outDir, prevDir, quality = 92, lossless = false, meta, frames }) {
  fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(prevDir, { recursive: true });
  const webpPath = path.join(outDir, `${name}.webp`), jsonPath = path.join(outDir, `${name}.json`);
  let img = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
  img = lossless ? img.webp({ lossless: true, effort: 5 }) : img.webp({ quality, alphaQuality: 100, effort: 5, smartSubsample: false });
  await img.toFile(webpPath);
  const json = { frames, animations: {}, meta: { app: 'bottleneck tools/build-all.mjs', version: '1.0', image: `${name}.webp`, format: 'RGBA8888', size: { w, h }, scale: '1', alpha: 'straight (nicht vormultipliziert)', filter: 'linear', ...meta } };
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  // Vorschau aus der fertigen WebP, auf dunklem Grund #1a1a2e
  const dec = await sharp(webpPath).ensureAlpha().raw().toBuffer();
  const prev = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const a = dec[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) prev[i * 3 + c] = Math.round(dec[i * 4 + c] * a + BG_DARK[c] * (1 - a));
  }
  const previewDark = path.join(prevDir, `${name}_hd_dark.png`);
  await sharp(prev, { raw: { width: w, height: h, channels: 3 } }).png().toFile(previewDark);
  return { webpPath, jsonPath, previewDark };
}

const chroma = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// Hintergrund-Maske: Flood-Fill von den Randpixeln aus über "graue" Pixel (kaum Farbe, mittlere Helligkeit, grob #808080).
// Ein Objekt mit schwarzer Außenkontur (Pixel-Art-Regel) stoppt den Fill; sitzt es randlos im Bild, bleibt die Maske leer.
export function backgroundMask(data, W, H, opt = {}) {
  const maxChroma = opt.maxChroma ?? 14, lo = opt.lumLo ?? 85, hi = opt.lumHi ?? 200;
  const grayish = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], l = lum(r, g, b);
    grayish[i] = chroma(r, g, b) <= maxChroma && l >= lo && l <= hi ? 1 : 0;
  }
  const bg = new Uint8Array(W * H), st = new Int32Array(W * H); let sp = 0;
  const push = (i) => { if (grayish[i] && !bg[i]) { bg[i] = 1; st[sp++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (sp) {
    const i = st[--sp], x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  let n = 0; for (let i = 0; i < W * H; i++) n += bg[i];
  return { bg, share: n / (W * H) };
}

// größte Zusammenhangskomponente (8er) des Vordergrunds behalten, Rest (Staub, Reste) als Hintergrund
export function keepLargest(bg, W, H) {
  const lab = new Int32Array(W * H), st = new Int32Array(W * H); let best = 0, bestN = 0, id = 0;
  for (let s0 = 0; s0 < W * H; s0++) {
    if (bg[s0] || lab[s0]) continue;
    id++; let sp = 0, n = 0; st[sp++] = s0; lab[s0] = id;
    while (sp) {
      const i = st[--sp]; n++; const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!bg[j] && !lab[j]) { lab[j] = id; st[sp++] = j; }
      }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  let removed = 0;
  for (let i = 0; i < W * H; i++) if (!bg[i] && lab[i] !== best) { bg[i] = 1; removed++; }
  return removed;
}

export const frameOf = (OW, OH, content) => ({ frame: { x: 0, y: 0, w: OW, h: OH }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: OW, h: OH }, sourceSize: { w: OW, h: OH }, contentBBox: content, pivot: { x: 0.5, y: 0.5 } });

// ---------------------------------------------------------------- E01–E05
export async function processObject({ raw, name, target, hd = 4, outDir, prevDir, quality = 92, erode = 1 }) {
  const warnings = [], info = {};
  const { data, W, H } = await readRaw(raw);
  const { bg, share } = backgroundMask(data, W, H);
  info.bgShare = +share.toFixed(4);
  const removed = keepLargest(bg, W, H);
  // Maske um `erode` Pixel in den Vordergrund hinein verschieben (Saum), dann weich zeichnen
  let mask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) mask[i] = bg[i] ? 0 : 255;
  for (let pass = 0; pass < erode; pass++) {
    const nx = Uint8Array.from(mask);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      // Der Bildrand zählt nicht als Hintergrund (randlose Objekte bleiben vollständig)
      if ((x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W])) nx[i] = 0;
    }
    mask = nx;
  }
  const soft = await sharp(Buffer.from(mask), { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (soft[y * W + x] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error(`${name}: kein Inhalt gefunden`);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  info.sourceSize = [W, H]; info.cropBox = { x: x0, y: y0, w: cw, h: ch };
  info.cropMargins = { left: x0, top: y0, right: W - 1 - x1, bottom: H - 1 - y1 };
  info.dustRemovedPx = removed;
  const [TW, TH] = target, OW = TW * hd, OH = TH * hd;
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = (y0 + y) * W + x0 + x, o = (y * cw + x) * 4;
    crop[o] = data[si * 3]; crop[o + 1] = data[si * 3 + 1]; crop[o + 2] = data[si * 3 + 2]; crop[o + 3] = soft[si];
  }
  const contentRatio = cw / ch, targetRatio = TW / TH, dev = contentRatio / targetRatio - 1;
  info.contentRatio = +contentRatio.toFixed(4); info.targetRatio = +targetRatio.toFixed(4); info.ratioDeviationPct = +(dev * 100).toFixed(2);
  let fw, fh, mode;
  if (Math.abs(dev) <= 0.02) { fw = OW; fh = OH; mode = 'fill (Abweichung ≤ 2 %, nur Zuschnitt auf Inhalt)'; }
  else {
    const s = Math.min(OW / cw, OH / ch); fw = Math.round(cw * s); fh = Math.round(ch * s); mode = 'contain (nicht verzerrt, transparenter Rand)';
    warnings.push(`Seitenverhältnis des Inhalts ${contentRatio.toFixed(3)} weicht um ${(dev * 100).toFixed(1)} % vom Ziel ${targetRatio.toFixed(3)} ab (nicht verzerrt: ${fw}x${fh} in ${OW}x${OH}).`);
  }
  info.fitMode = mode; info.contentOut = [fw, fh];
  const scaled = await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } }).resize(fw, fh, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer();
  const out = Buffer.alloc(OW * OH * 4);
  const ox = Math.floor((OW - fw) / 2), oy = Math.floor((OH - fh) / 2);
  for (let y = 0; y < fh; y++) scaled.copy(out, ((oy + y) * OW + ox) * 4, y * fw * 4, (y + 1) * fw * 4);
  const m = info.cropMargins;
  if (m.left + m.right + m.top + m.bottom > 4) info.note = `zugeschnittene Ränder l/o/r/u = ${m.left}/${m.top}/${m.right}/${m.bottom} px`;
  const frames = { [name]: frameOf(OW, OH, { x: ox, y: oy, w: fw, h: fh }) };
  const files = await writeOut({ rgba: out, w: OW, h: OH, name, outDir, prevDir, quality, frames, meta: { hdScale: hd, targetSize: { w: TW, h: TH }, source: path.basename(raw), kind: 'object', crop: info.cropBox, fit: mode, background: share > 0 ? 'entfernt (grau, Flood-Fill)' : 'keiner im Bild' } });
  return { ...files, warnings, info, frames: 1 };
}

// ---------------------------------------------------------------- E06
export async function processOverlay({ raw, name, target, hd = 4, outDir, prevDir, white = [244, 244, 250] }) {
  const warnings = [], info = {};
  const { data, W, H } = await readRaw(raw);
  const ls = []; for (let i = 0; i < W * H; i += 7) { const l = lum(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]); if (l < 180 && l > 90) ls.push(l); }
  ls.sort((a, b) => a - b); const base = ls[ls.length >> 1];
  const top = lum(...white);
  const rgba = Buffer.alloc(W * H * 4);
  let opaque = 0, soft = 0;
  for (let i = 0; i < W * H; i++) {
    let a = (lum(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) - base) / (top - base);
    a = a < 0.06 ? 0 : a > 0.94 ? 1 : a;
    if (a >= 1) opaque++; else if (a > 0) soft++;
    rgba[i * 4] = white[0]; rgba[i * 4 + 1] = white[1]; rgba[i * 4 + 2] = white[2]; rgba[i * 4 + 3] = Math.round(a * 255);
  }
  info.baseGray = Math.round(base); info.opaqueShare = +(opaque / (W * H)).toFixed(4); info.softShare = +(soft / (W * H)).toFixed(4);
  const [TW, TH] = target, OW = TW * hd, OH = TH * hd;
  const dev = (W / H) / (TW / TH) - 1; info.ratioDeviationPct = +(dev * 100).toFixed(2);
  if (Math.abs(dev) > 0.02) warnings.push(`Seitenverhältnis der Quelle weicht um ${(dev * 100).toFixed(1)} % ab (Overlay wird vollflächig gestreckt).`);
  const out = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).resize(OW, OH, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer();
  const frames = { [name]: frameOf(OW, OH, { x: 0, y: 0, w: OW, h: OH }) };
  const files = await writeOut({ rgba: out, w: OW, h: OH, name, outDir, prevDir, lossless: true, frames, meta: { hdScale: hd, targetSize: { w: TW, h: TH }, source: path.basename(raw), kind: 'overlay', overlay: `weiß #f4f4fa, Alpha aus Helligkeit (Grau ${Math.round(base)} -> 0, Streifen -> 1), Vollbild ohne Zuschnitt; die Engine multipliziert mit 0,5` } });
  return { ...files, warnings, info, frames: 1 };
}

// ---------------------------------------------------------------- E07–E10
export async function processBackground({ raw, name, target, scale = 2, outDir, prevDir, quality = 88 }) {
  const warnings = [], info = {};
  const { data, W, H } = await readRaw(raw);
  const [TW, TH] = target, OW = TW * scale, OH = TH * scale;
  const tr = TW / TH, sr = W / H;
  let cw = W, ch = H;
  if (sr > tr) cw = Math.round(H * tr); else if (sr < tr) ch = Math.round(W / tr);
  const cx = Math.floor((W - cw) / 2), cy = Math.floor((H - ch) / 2);
  info.sourceSize = [W, H]; info.crop = { x: cx, y: cy, w: cw, h: ch }; info.cropLossPct = +(100 * (1 - (cw * ch) / (W * H))).toFixed(2);
  if (info.cropLossPct > 2) warnings.push(`Zuschnitt auf Zielverhältnis entfernt ${info.cropLossPct} % der Fläche.`);
  const edgeLum = (d0, d1) => { let s = 0, n = 0; for (let y = 0; y < H; y += 3) for (const x of [d0, W - 1 - d0, d1, W - 1 - d1]) { const i = (y * W + x) * 3; s += lum(data[i], data[i + 1], data[i + 2]); n++; } return s / n; };
  const e0 = edgeLum(1, 2), e1 = edgeLum(14, 16);
  info.edgeLum = [+e0.toFixed(1), +e1.toFixed(1)];
  if (e0 < 0.4 * e1 && e1 > 25) warnings.push('Dunkler Rand am Bildrand (Rahmenlinie?) – nicht randlos.');
  const out = await sharp(raw).removeAlpha().extract({ left: cx, top: cy, width: cw, height: ch }).resize(OW, OH, { kernel: 'lanczos3', fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const frames = { [name]: frameOf(OW, OH, { x: 0, y: 0, w: OW, h: OH }) };
  const files = await writeOut({ rgba: out, w: OW, h: OH, name, outDir, prevDir, quality, frames, meta: { hdScale: scale, targetSize: { w: TW, h: TH }, source: path.basename(raw), kind: 'background', crop: info.crop } });
  return { ...files, warnings, info, frames: 1 };
}

// ---------------------------------------------------------------- S29
// tiles: [{ name, fill }] von links nach rechts. fill: Kachel füllt die Zelle (deckend). !fill: kleinere Kachel (artSize), mittig; Inhalt per Abweichung vom Zell-Grau erkannt.
export async function processTiles({ raw, name, size, cell, tiles, hd = 4, outDir, prevDir, quality = 92 }) {
  const warnings = [], info = { tiles: {} };
  const { data, W, H } = await readRaw(raw);
  const [CW, CH] = cell, COLS = size[0] / CW, FW = CW * hd, FH = CH * hd;
  const cwSrc = W / COLS;
  const SHW = COLS * FW, SHH = FH, sheet = Buffer.alloc(SHW * SHH * 4);
  const frames = {}, tileImgs = [];
  const px = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const diff = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (let c = 0; c < tiles.length; c++) {
    const t = tiles[c];
    let sx0 = Math.round(c * cwSrc), sx1 = Math.round((c + 1) * cwSrc) - 1, sy0 = 0, sy1 = H - 1;
    let tw = FW, th = FH, ox = 0, oy = 0; const ti = { fill: t.fill };
    if (!t.fill) {
      const bgc = px(sx0 + 3, sy0 + 3);
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = sy0 + 6; y <= sy1 - 6; y++) for (let x = sx0 + 6; x <= sx1 - 6; x++) {
        if (diff(px(x, y), bgc) > 40) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      }
      if (bx1 < 0) { warnings.push(`${t.name}: keine Kachel gefunden.`); continue; }
      sx0 = bx0; sx1 = bx1; sy0 = by0; sy1 = by1;
      const w = bx1 - bx0 + 1, h = by1 - by0 + 1; ti.contentSrc = [w, h];
      if (Math.abs(w / h - 1) > 0.04) warnings.push(`${t.name}: Kachel ist nicht quadratisch (${w}x${h}).`);
      tw = Math.round((t.artSize || 16) * hd); th = tw; ox = Math.floor((FW - tw) / 2); oy = Math.floor((FH - th) / 2);
    } else {
      // Trennlinien/Rahmen am Zellrand: dünne Streifen mit abweichender Farbe an den Außenkanten abschneiden (max. 1,5 % der Zelle)
      const maxCut = Math.max(2, Math.round(0.015 * cwSrc));
      const avg = (get, n) => { const m = [0, 0, 0]; for (let k = 0; k < n; k++) { const p = get(k); m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; } return m.map((v) => v / n); };
      const col = (x) => avg((k) => px(x, Math.round(((k + 0.5) / 40) * (H - 1))), 40);
      const row = (y) => avg((k) => px(sx0 + Math.round(((k + 0.5) / 40) * (sx1 - sx0)), y), 40);
      const cut = { l: 0, r: 0, t: 0, b: 0 };
      for (let k = 0; k < maxCut; k++) {
        if (diff(col(sx0 + k), col(sx0 + maxCut + 4)) > 10) cut.l = k + 1;
        if (diff(col(sx1 - k), col(sx1 - maxCut - 4)) > 10) cut.r = k + 1;
        if (diff(row(sy0 + k), row(sy0 + maxCut + 4)) > 10) cut.t = k + 1;
        if (diff(row(sy1 - k), row(sy1 - maxCut - 4)) > 10) cut.b = k + 1;
      }
      ti.edgeCutSrc = cut; sx0 += cut.l; sx1 -= cut.r; sy0 += cut.t; sy1 -= cut.b;
    }
    const w = sx1 - sx0 + 1, h = sy1 - sy0 + 1;
    const tile = await sharp(raw).removeAlpha().extract({ left: sx0, top: sy0, width: w, height: h }).resize(tw, th, { kernel: 'lanczos3', fit: 'fill' }).ensureAlpha().raw().toBuffer();
    for (let y = 0; y < th; y++) tile.copy(sheet, ((oy + y) * SHW + c * FW + ox) * 4, y * tw * 4, (y + 1) * tw * 4);
    // Kachelbarkeit: Unterschied der gegenüberliegenden Kanten (über den Bruch hinweg) gegenüber dem Unterschied benachbarter Spalten/Zeilen
    const T = (x, y) => (y * tw + x) * 4;
    const cdiff = (xa, xb) => { let s = 0; for (let y = 0; y < th; y++) for (let k = 0; k < 3; k++) s += Math.abs(tile[T(xa, y) + k] - tile[T(xb, y) + k]); return s / (th * 3); };
    const rdiff = (ya, yb) => { let s = 0; for (let x = 0; x < tw; x++) for (let k = 0; k < 3; k++) s += Math.abs(tile[T(x, ya) + k] - tile[T(x, yb) + k]); return s / (tw * 3); };
    const innerX = (cdiff(1, 2) + cdiff(tw - 3, tw - 2) + cdiff(tw >> 1, (tw >> 1) + 1)) / 3, innerY = (rdiff(1, 2) + rdiff(th - 3, th - 2) + rdiff(th >> 1, (th >> 1) + 1)) / 3;
    const seamX = cdiff(tw - 1, 0), seamY = rdiff(th - 1, 0);
    ti.seam = { horizontal: +seamX.toFixed(1), vertical: +seamY.toFixed(1), neighbourX: +innerX.toFixed(1), neighbourY: +innerY.toFixed(1) };
    const bad = (s, n) => s > Math.max(2, 1.8 * n);
    ti.tileable = !(bad(seamX, innerX) || bad(seamY, innerY));
    if (!ti.tileable) warnings.push(`${t.name}: Kanten nicht nahtlos (Naht links/rechts ${seamX.toFixed(1)}, oben/unten ${seamY.toFixed(1)} gegenüber Nachbarn ${innerX.toFixed(1)}/${innerY.toFixed(1)}).`);
    info.tiles[t.name] = ti; tileImgs.push({ buf: Buffer.from(tile), tw, th, name: t.name });
    frames[t.name] = { ...frameOf(FW, FH, { x: ox, y: oy, w: tw, h: th }), frame: { x: c * FW, y: 0, w: FW, h: FH }, cell: { row: 1, col: c + 1 }, tileable: ti.tileable };
  }
  // Kachel-Test: jede Kachel 3×3 nebeneinander gelegt, Nähte sichtbar (assets/preview/<name>_tiletest.png)
  { const comps = []; let x = 0, hh = 0;
    for (const t of tileImgs) { const raw = await sharp(t.buf, { raw: { width: t.tw, height: t.th, channels: 4 } }).png().toBuffer(); for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) comps.push({ input: raw, left: x + i * t.tw, top: k * t.th }); x += 3 * t.tw + 16; hh = Math.max(hh, 3 * t.th); }
    await sharp({ create: { width: Math.max(1, x - 16), height: hh, channels: 3, background: BG_DARK } }).composite(comps).png().toFile(path.join(prevDir, `${name}_tiletest.png`)); }
  const files = await writeOut({ rgba: sheet, w: SHW, h: SHH, name, outDir, prevDir, quality, frames, meta: { hdScale: hd, cell: { w: CW, h: CH }, frame: { w: FW, h: FH }, grid: { cols: COLS, rows: 1 }, targetSize: { w: size[0], h: size[1] }, source: path.basename(raw), kind: 'opaque-tiles' } });
  return { ...files, warnings, info, frames: Object.keys(frames).length };
}
