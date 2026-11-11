// logo.mjs – Logo-Atlas (BOTTLE + PC-Frames + NECK) aus Einzelbildern (aufgerufen von build-all.mjs, kind 'logo').
//  - Hintergrund (#808080) per Flood-Fill entfernen, Maske 1 px erodieren + weich zeichnen, vormultipliziert skalieren (kein grauer Saum)
//  - Wörter: gleicher Maßstab (gleiche Buchstabenhöhe), BOTTLE ≙ wordWidth px breit
//  - PC-Frames: ein gemeinsamer Maßstab (Gehäusehöhe von Frame 0 ≙ pcHeight px), Ankerpunkt = Unterkante/Mitte des Gehäuses,
//    alle Frames in gleich großen Zellen (Anker an derselben Stelle) → kein Wackeln
//  - Duplikate (Pixelvergleich) werden verworfen; Taillenbreite (schmalste Stelle des Gehäuses) wird gemessen
import path from 'node:path';
import sharp from 'sharp';
import { readRaw, backgroundMask, keepLargest, writeOut } from './single.mjs';

async function cutout(file, { keepAll, bgOpt }) {
  const { data, W, H } = await readRaw(file);
  const { bg } = backgroundMask(data, W, H, bgOpt);
  if (!keepAll) { // eingeschlossene Hintergrund-Taschen (z. B. zwischen C und K): zusammenhängende graue Flächen ≥ 150 px entfernen
    const m = bgOpt, g = new Uint8Array(W * H), seen = new Uint8Array(W * H), st = new Int32Array(W * H);
    for (let i = 0; i < W * H; i++) { const R = data[i * 3], G = data[i * 3 + 1], B = data[i * 3 + 2], l = 0.299 * R + 0.587 * G + 0.114 * B; g[i] = Math.max(R, G, B) - Math.min(R, G, B) <= m.maxChroma && l >= m.lumLo && l <= m.lumHi && !bg[i] ? 1 : 0; }
    for (let s0 = 0; s0 < W * H; s0++) {
      if (!g[s0] || seen[s0]) continue;
      let sp = 0, n = 0; const comp = []; st[sp++] = s0; seen[s0] = 1;
      while (sp) { const i = st[--sp]; comp.push(i); n++; const x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && g[j] && !seen[j]) { seen[j] = 1; st[sp++] = j; } }
      if (n >= 150) for (const i of comp) bg[i] = 1;
    }
  }
  const body = Uint8Array.from(bg); keepLargest(body, W, H);
  if (!keepAll) body.forEach((v, i) => (bg[i] = v));
  const toSoft = async (b) => {
    let mask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) mask[i] = b[i] ? 0 : 255;
    const nx = Uint8Array.from(mask);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      if ((x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W])) nx[i] = 0;
    }
    return sharp(Buffer.from(nx), { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  };
  const soft = await toSoft(bg), bodySoft = keepAll ? await toSoft(body) : soft;
  const bbox = (s) => { let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s[y * W + x] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = soft[i]; }
  return { rgba, W, H, bb: bbox(soft), body: bbox(bodySoft), bodySoft, soft };
}

// Ausschnitt skalieren (vormultipliziert); x0..y1 inklusive, s = Maßstab; liefert {buf,w,h}
async function cropScale(rgba, W, x0, y0, x1, y1, s) {
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, pm = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y0 + y) * W + x0 + x) * 4, o = (y * cw + x) * 4, a = rgba[si + 3] / 255;
    pm[o] = Math.round(rgba[si] * a); pm[o + 1] = Math.round(rgba[si + 1] * a); pm[o + 2] = Math.round(rgba[si + 2] * a); pm[o + 3] = rgba[si + 3];
  }
  const w = Math.max(1, Math.round(cw * s)), h = Math.max(1, Math.round(ch * s));
  const buf = await sharp(pm, { raw: { width: cw, height: ch, channels: 4 } }).resize(w, h, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer();
  for (let i = 0; i < w * h; i++) { const a = buf[i * 4 + 3]; if (a > 0 && a < 255) for (let c = 0; c < 3; c++) buf[i * 4 + c] = Math.min(255, Math.round((buf[i * 4 + c] * 255) / a)); else if (a === 0) buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = 0; }
  return { buf, w, h };
}

export async function processLogo({ rawDir, name, outDir, prevDir, words, pc, wordWidth = 1024, pcHeight = 512, atlasW = 2048, pad = 4, bgOpt = { lumLo: 100, lumHi: 156, maxChroma: 12 } }) {
  const warnings = [], info = {};
  // ---- PC: Duplikate prüfen
  const pcRaw = [];
  for (const k of pc) pcRaw.push({ k, ...(await readRaw(path.join(rawDir, `logo_pc_${k}.png`))) });
  const kept = [], dups = [];
  for (const f of pcRaw) {
    const same = kept.find((g) => { let d = 0; for (let i = 0; i < f.data.length; i++) d += Math.abs(f.data[i] - g.data[i]); return d / f.data.length < 0.05; });
    if (same) dups.push(`${f.k}=${same.k}`); else kept.push(f);
  }
  info.duplicates = dups; info.pcSources = kept.map((f) => f.k);
  if (dups.length) warnings.push(`Duplikate verworfen: ${dups.join(', ')}`);
  // ---- Wörter
  const bot = await cutout(path.join(rawDir, words[0]), { keepAll: false, bgOpt });
  const nek = await cutout(path.join(rawDir, words[1]), { keepAll: false, bgOpt });
  const sB = wordWidth / (bot.bb.x1 - bot.bb.x0 + 1);
  const hB = bot.bb.y1 - bot.bb.y0 + 1, hN = nek.bb.y1 - nek.bb.y0 + 1;
  const sN = sB * hB / hN;
  info.wordScale = { bottle: +sB.toFixed(4), neck: +sN.toFixed(4) };
  const wb = await cropScale(bot.rgba, bot.W, bot.bb.x0, bot.bb.y0, bot.bb.x1, bot.bb.y1, sB);
  const wn = await cropScale(nek.rgba, nek.W, nek.bb.x0, nek.bb.y0, nek.bb.x1, nek.bb.y1, sN);
  info.wordPx = { bottle: [wb.w, wb.h], neck: [wn.w, wn.h] };
  if (Math.abs(wb.h - wn.h) > 3) warnings.push(`Wörter haben verschiedene Höhe ${wb.h} vs ${wn.h}`);
  // ---- PC
  const cuts = [];
  for (const f of kept) cuts.push({ k: f.k, ...(await cutout(path.join(rawDir, `logo_pc_${f.k}.png`), { keepAll: true, bgOpt })) });
  const body0 = cuts[0].body, sP = pcHeight / (body0.y1 - body0.y0 + 1);
  info.pcScale = +sP.toFixed(4);
  const waist = [];
  for (const c of cuts) {
    const { body, bodySoft, W } = c, bh = body.y1 - body.y0 + 1;
    let min = 1e9, minY = 0, max = 0, minL = 0, minR = 0;
    for (let y = body.y0; y < body.y1; y++) {
      let n = 0; for (let x = 0; x < W; x++) if (bodySoft[y * W + x] >= 128) n++;
      max = Math.max(max, n);
      if (y >= body.y0 + bh * 0.2 && y <= body.y0 + bh * 0.85 && n < min) { min = n; minY = y; let l = 0, rr = W - 1; while (bodySoft[y * W + l] < 128) l++; while (bodySoft[y * W + rr] < 128) rr--; minL = l; minR = rr + 1; }
    }
    waist.push({ src: c.k, waistRawPx: min, waistAtY: +((minY - body.y0) / bh).toFixed(2), maxWidthRawPx: max, waistPct: +((min / max) * 100).toFixed(1), bodyHeightRawPx: bh, _l: minL, _r: minR, _y: minY });
    c.anchorX = (body.x0 + body.x1 + 1) / 2; c.anchorY = body.y1 + 1;
  }
  // Zelle: Vereinigung der Ausdehnungen relativ zum Anker
  let halfW = 0, up = 0, down = 0;
  for (const c of cuts) {
    halfW = Math.max(halfW, c.anchorX - c.bb.x0, c.bb.x1 + 1 - c.anchorX); up = Math.max(up, c.anchorY - c.bb.y0); down = Math.max(down, c.bb.y1 + 1 - c.anchorY);
  }
  const cellW = Math.ceil(halfW * 2 * sP) + 2, cellH = Math.ceil((up + down) * sP) + 2, ax = cellW / 2, ay = Math.ceil(up * sP) + 1;
  info.pcCell = [cellW, cellH]; info.pcAnchor = [ax, ay];
  // Taillen-Kanten in Zellkoordinaten (Atlas-px, Anker bei ax/ay)
  waist.forEach((w, i) => { const c = cuts[i]; w.left = +(ax + (w._l - c.anchorX) * sP).toFixed(1); w.right = +(ax + (w._r - c.anchorX) * sP).toFixed(1); w.y = +(ay + (w._y - c.anchorY) * sP).toFixed(1); delete w._l; delete w._r; delete w._y; });
  info.waist = waist;
  const pcImgs = [];
  for (const c of cuts) {
    const x0 = Math.floor(c.anchorX - halfW), x1 = Math.ceil(c.anchorX + halfW) - 1, y0 = Math.floor(c.anchorY - up), y1 = Math.ceil(c.anchorY + down) - 1;
    // Ausschnitt auf Bildgrenzen klemmen
    const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(c.W - 1, x1), cy1 = Math.min(c.H - 1, y1);
    const s = await cropScale(c.rgba, c.W, cx0, cy0, cx1, cy1, sP);
    // Platzierung so, dass der Anker bei (ax, ay) liegt
    const px = Math.round(ax + (cx0 - c.anchorX) * sP), py = Math.round(ay + (cy0 - c.anchorY) * sP);
    const cell = Buffer.alloc(cellW * cellH * 4);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const tx = px + x, ty = py + y; if (tx < 0 || ty < 0 || tx >= cellW || ty >= cellH) continue;
      s.buf.copy(cell, (ty * cellW + tx) * 4, (y * s.w + x) * 4, (y * s.w + x) * 4 + 4);
    }
    pcImgs.push(cell);
  }
  // ---- Atlas (Regalpackung)
  const items = [{ n: 'logo_bottle', w: wb.w, h: wb.h, buf: wb.buf }, { n: 'logo_neck', w: wn.w, h: wn.h, buf: wn.buf }, ...pcImgs.map((b, i) => ({ n: `logo_pc_${i}`, w: cellW, h: cellH, buf: b, pc: true }))];
  const pos = []; let cx = pad, cy = pad, rowH = 0;
  for (const it of items) {
    if (cx + it.w + pad > atlasW) { cx = pad; cy += rowH + pad; rowH = 0; }
    pos.push({ ...it, x: cx, y: cy }); cx += it.w + pad; rowH = Math.max(rowH, it.h);
  }
  const atlasH = cy + rowH + pad, out = Buffer.alloc(atlasW * atlasH * 4);
  for (const p of pos) for (let y = 0; y < p.h; y++) p.buf.copy(out, ((p.y + y) * atlasW + p.x) * 4, y * p.w * 4, (y + 1) * p.w * 4);
  const frames = {};
  for (const p of pos) frames[p.n] = { frame: { x: p.x, y: p.y, w: p.w, h: p.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h }, sourceSize: { w: p.w, h: p.h }, contentBBox: { x: 0, y: 0, w: p.w, h: p.h }, pivot: p.pc ? { x: ax / cellW, y: ay / cellH } : { x: 0.5, y: 0.5 } };
  const files = await writeOut({ rgba: out, w: atlasW, h: atlasH, name, outDir, prevDir, quality: 92, frames, meta: { hdScale: 4, kind: 'logo', pcAnchor: { x: ax, y: ay }, pcCell: { w: cellW, h: cellH }, pcSources: info.pcSources, waist: waist.map((w) => ({ src: w.src, px: w.waistRawPx, pct: w.waistPct, left: w.left, right: w.right, y: w.y })) } });
  return { ...files, warnings, info, frames: pos.length, hdScale: 4 };
}
