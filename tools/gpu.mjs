// gpu.mjs – S27 (Grafikkarten): 3 Rohbilder (s27_s/m/l.png, Hintergrund #808080), Frames bei m/l untereinander.
// Sprites per Zusammenhangskomponenten; jede Karte wird auf ihre ZIELBREITE skaliert (ein Maßstab je Animation),
// Frames links (Slotblech) und unten ausgerichtet. Ausgabe: ein Sheet, eine Zeile pro Karte (s, m, l), Frames nebeneinander.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BG = [128, 128, 128], TOL = 26;

async function loadSprites(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const isBg = (i) => Math.hypot(data[i * 4] - BG[0], data[i * 4 + 1] - BG[1], data[i * 4 + 2] - BG[2]) < TOL;
  // Hintergrund = vom Rand erreichbare Hintergrundfarbe
  const bg = new Uint8Array(N), st = [];
  const push = (i) => { if (!bg[i] && isBg(i)) { bg[i] = 1; st.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W); }
  // 1 px erodieren (Saum), Alpha binär
  const fg = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (bg[i]) continue;
    let ok = 1;
    if (x > 0 && bg[i - 1]) ok = 0; else if (x < W - 1 && bg[i + 1]) ok = 0; else if (y > 0 && bg[i - W]) ok = 0; else if (y < H - 1 && bg[i + W]) ok = 0;
    fg[i] = ok;
  }
  // Zusammenhangskomponenten (8er)
  const lab = new Int32Array(N); const comps = []; 
  for (let s = 0; s < N; s++) {
    if (!fg[s] || lab[s]) continue;
    const id = comps.length + 1, c = { x0: W, y0: H, x1: 0, y1: 0, n: 0 }; const q = [s]; lab[s] = id;
    while (q.length) {
      const i = q.pop(), x = i % W, y = (i / W) | 0; c.n++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (fg[j] && !lab[j]) { lab[j] = id; q.push(j); }
      }
    }
    comps.push(c);
  }
  const big = Math.max(...comps.map((c) => c.n));
  let keep = comps.map((c, k) => ({ ...c, id: k + 1 })).filter((c) => c.n > big * 0.02);
  // Komponenten mit überlappendem Vertikalbereich zu einem Sprite zusammenfassen, oben -> unten
  keep.sort((a, b) => a.y0 - b.y0);
  const groups = [];
  for (const c of keep) {
    const g = groups[groups.length - 1];
    if (g && c.y0 <= g.y1) { g.ids.push(c.id); g.x0 = Math.min(g.x0, c.x0); g.x1 = Math.max(g.x1, c.x1); g.y1 = Math.max(g.y1, c.y1); g.n += c.n; }
    else groups.push({ ids: [c.id], x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, n: c.n });
  }
  // Sprite-Bilder (RGBA, zugeschnitten)
  const out = [];
  for (const g of groups) {
    const w = g.x1 - g.x0 + 1, h = g.y1 - g.y0 + 1, buf = Buffer.alloc(w * h * 4); const set = new Set(g.ids);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = (y + g.y0) * W + x + g.x0; if (!set.has(lab[si])) continue;
      const o = (y * w + x) * 4; buf[o] = data[si * 4]; buf[o + 1] = data[si * 4 + 1]; buf[o + 2] = data[si * 4 + 2]; buf[o + 3] = 255;
    }
    out.push({ w, h, buf, box: [g.x0, g.y0, g.x1, g.y1] });
  }
  return { sprites: out, rawSize: [W, H] };
}

export async function processGpu({ rawDir, name, hd = 4, outDir, prevDir, quality = 90 }) {
  const specs = [
    { file: 's27_s.png', names: ['gpu_s'], artW: 112 },
    { file: 's27_m.png', names: [0, 1, 2, 3].map((i) => `gpu_m_${i}`), artW: 176, group: 'gpu_m' },
    { file: 's27_l.png', names: [0, 1, 2, 3].map((i) => `gpu_l_${i}`), artW: 216, group: 'gpu_l' },
  ];
  const warnings = [], info = [], rawSizes = [];
  const rows = [];
  for (const sp of specs) {
    const { sprites, rawSize } = await loadSprites(path.join(rawDir, sp.file)); rawSizes.push(rawSize);
    if (sprites.length !== sp.names.length) throw new Error(`${sp.file}: ${sprites.length} Sprites gefunden, erwartet ${sp.names.length}`);
    const meanW = sprites.reduce((s, c) => s + c.w, 0) / sprites.length;
    const scale = (sp.artW * hd) / meanW;
    const frames = [];
    for (const s of sprites) {
      const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
      const buf = await sharp(s.buf, { raw: { width: s.w, height: s.h, channels: 4 } }).resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer();
      frames.push({ w, h, buf });
    }
    rows.push({ sp, frames, scale, sprites });
    info.push(`${sp.file}: ${sprites.length} Sprites, Maßstab ${scale.toFixed(4)}, ${frames.map((f) => `${(f.w / hd).toFixed(1)}×${(f.h / hd).toFixed(1)}`).join(' | ')} Art-px`);
  }
  const PADX = 2 * hd, PADY = hd;
  const maxW = Math.max(...rows.flatMap((r) => r.frames.map((f) => f.w))), maxH = Math.max(...rows.flatMap((r) => r.frames.map((f) => f.h)));
  const FW = Math.ceil((maxW + 2 * PADX) / hd) * hd, FH = Math.ceil((maxH + 2 * PADY) / hd) * hd;
  const COLS = 4, ROWS = 3, SW = FW * COLS, SH = FH * ROWS;
  const comps = [], frames = {}, animations = {};
  rows.forEach((r, ri) => {
    r.frames.forEach((f, k) => {
      const nm = r.sp.names[k], x = k * FW, y = ri * FH, ox = PADX, oy = FH - PADY - f.h;
      comps.push({ input: f.buf, raw: { width: f.w, height: f.h, channels: 4 }, left: x + ox, top: y + oy });
      frames[nm] = {
        frame: { x, y, w: FW, h: FH }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: FW, h: FH }, sourceSize: { w: FW, h: FH },
        contentBBox: { x: ox, y: oy, w: f.w, h: f.h }, artSize: { w: +(f.w / hd).toFixed(1), h: +(f.h / hd).toFixed(1) },
        pivot: { x: 0.5, y: 0.5 }, cell: { row: ri + 1, col: k + 1 }, scale: +r.scale.toFixed(4), scaleReduced: false,
        ...(r.sp.group ? { group: r.sp.group } : {}),
      };
    });
    if (r.sp.group) animations[r.sp.group] = r.sp.names;
  });
  // Sheet zusammensetzen (rohe Puffer müssen einzeln als PNG vorliegen)
  const layers = [];
  for (const c of comps) layers.push({ input: await sharp(c.input, { raw: c.raw }).png().toBuffer(), left: c.left, top: c.top });
  const sheet = sharp({ create: { width: SW, height: SH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers);
  const png = await sheet.png().toBuffer();
  const webpPath = path.join(outDir, `${name}.webp`), jsonPath = path.join(outDir, `${name}.json`);
  await sharp(png).webp({ quality, alphaQuality: 100 }).toFile(webpPath);
  const json = {
    frames, animations,
    meta: {
      app: 'bottleneck tools/gpu.mjs', version: '1.0', image: `${name}.webp`, format: 'RGBA8888', size: { w: SW, h: SH }, scale: '1', hdScale: hd,
      cell: { w: FW / hd, h: FH / hd }, frame: { w: FW, h: FH }, grid: { cols: COLS, rows: ROWS }, targetSize: { w: SW / hd, h: SH / hd },
      source: 's27_s.png, s27_m.png, s27_l.png', sheet: 'S27', background: '#808080', quality, alpha: 'straight (nicht vormultipliziert)', filter: 'linear',
      baseScale: +rows[2].scale.toFixed(4), scaleMode: 'target-width (ein Maßstab je Karte/Animation, links+unten ausgerichtet)', kind: 'gpu',
      cardArtSize: { gpu_s: frames.gpu_s.artSize, gpu_m: frames.gpu_m_0.artSize, gpu_l: frames.gpu_l_0.artSize },
    },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  const dark = await sharp({ create: { width: SW, height: SH, channels: 4, background: { r: 0x1a, g: 0x1a, b: 0x2e, alpha: 1 } } }).composite([{ input: png }]).png().toFile(path.join(prevDir, `${name}_hd_dark.png`));
  void dark;
  const ck = Buffer.alloc(SW * SH * 4);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const v = ((x >> 4) + (y >> 4)) & 1 ? 0x5e : 0x4a, o = (y * SW + x) * 4; ck[o] = v; ck[o + 1] = v + 11; ck[o + 2] = v + 22; ck[o + 3] = 255; }
  await sharp(ck, { raw: { width: SW, height: SH, channels: 4 } }).composite([{ input: png }]).png().toFile(path.join(prevDir, `${name}_hd_checker.png`));
  // Animationsprüfung: Pixeldifferenz zwischen den Frames (Mittel |ΔRGB| über Pixel, die in beiden Frames deckend sind, und Anteil > 24)
  const anim = {};
  for (const r of rows.filter((r) => r.sp.group)) {
    const diffs = [];
    for (let k = 1; k < 4; k++) {
      const a = r.frames[0], b = r.frames[k]; const w = Math.min(a.w, b.w), h = Math.min(a.h, b.h); let sum = 0, cnt = 0, big = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ia = ((a.h - 1 - y) * a.w + x) * 4, ib = ((b.h - 1 - y) * b.w + x) * 4; // unten/links ausgerichtet
        if (a.buf[ia + 3] < 250 || b.buf[ib + 3] < 250) continue;
        const d = (Math.abs(a.buf[ia] - b.buf[ib]) + Math.abs(a.buf[ia + 1] - b.buf[ib + 1]) + Math.abs(a.buf[ia + 2] - b.buf[ib + 2])) / 3;
        sum += d; cnt++; if (d > 24) big++;
      }
      diffs.push({ vs: `0→${k}`, meanAbsDiff: +(sum / cnt).toFixed(2), pctPixelsOver24: +(100 * big / cnt).toFixed(2) });
    }
    anim[r.sp.group] = diffs;
  }
  json.meta.animationCheck = anim; fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  return { webpPath, jsonPath, previewDark: path.join(prevDir, `${name}_hd_dark.png`), warnings, reduced: [], gridLines: [], info, animationCheck: anim, sourceSize: rawSizes[2], rawSizes };
}
