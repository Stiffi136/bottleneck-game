// hd.mjs – HD-Modus von clean-sheet.mjs (`--hd`): KI-Rohbilder im Original-Look (weiche Kanten, alle Farbnuancen) als Atlas.
// Ablauf: Hintergrund -> weiches Alpha + Farb-Entmischung -> Sprites (Zusammenhangskomponenten) -> Zelle per Schwerpunkt
//         -> je Zelle ein Frame (Zelle x hd-scale), Lanczos, gleicher Maßstab im ganzen Sheet, zentriert, nie abgeschnitten
//         -> assets/hd/<name>.webp + .json (TexturePacker-JSON-Hash) + Vorschauen (Schachbrett / dunkel #1a1a2e).
// Siehe docs/assets.md Abschnitt 1.4.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { removeGridLines } from './lines.mjs';

const hex2rgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function oklab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const median = (arr) => { const s = Float64Array.from(arr).sort(); return s[s.length >> 1]; };

// ------------------------------------------------------------------ Sprite-Namen aus docs/asset-sheets.md
// Liest die Belegungstabelle von "### S16 · ..." : Zeile `| Z1 · S5–6 | asset | `a` … `b` | ... |` -> Namen je (Zeile,Spalte).
export function readSheetNames(docPath, sheetId) {
  const lines = fs.readFileSync(docPath, 'utf8').split(/\r?\n/);
  const id = sheetId.toUpperCase();
  const start = lines.findIndex((l) => new RegExp(`^###\\s+${id}\\s+·`).test(l));
  if (start < 0) throw new Error(`Sheet ${sheetId} nicht in ${docPath} gefunden`);
  const cells = new Map(); // "r,c" (0-basiert) -> {name, group}
  const groups = [];
  let title = lines[start];
  for (let i = start + 1; i < lines.length && !/^#{2,3}\s/.test(lines[i]); i++) {
    if (!/^\|\s*Z\d+\s*·/.test(lines[i])) continue;
    const col = lines[i].split('|').map((s) => s.trim());
    const m = /Z(\d+)\s*·\s*S(\d+)(?:\s*[–-]\s*(\d+))?/.exec(col[1]);
    if (!m) continue;
    const r = +m[1] - 1, c0 = +m[2] - 1, c1 = (m[3] ? +m[3] : +m[2]) - 1;
    const toks = [...col[3].matchAll(/`([^`]+)`/g)].map((t) => t[1]);
    if (!toks.length) continue; // (leer)
    const n = c1 - c0 + 1;
    let names;
    if (toks.length >= 2 && n > 1) {
      const a = /^(.*?)(\d+)$/.exec(toks[0]), b = /^(.*?)(\d+)$/.exec(toks[toks.length - 1]);
      if (a && b && a[1] === b[1] && +b[2] - +a[2] + 1 === n) names = Array.from({ length: n }, (_, k) => a[1] + (+a[2] + k));
    }
    if (!names) names = n === 1 ? [toks[0]] : Array.from({ length: n }, (_, k) => `${toks[0]}_${k}`);
    names.forEach((nm, k) => cells.set(`${r},${c0 + k}`, nm));
    if (n > 1) groups.push({ row: r, cols: Array.from({ length: n }, (_, k) => c0 + k), base: toks[0].replace(/_?\d+$/, '') });
  }
  const g = /Raster:\*\*\s*(\d+)\s*Spalten\s*×\s*(\d+)\s*Zeilen/.exec(lines.slice(start, start + 12).join('\n'));
  return { cells, groups, title, grid: g ? [+g[1], +g[2]] : null };
}

// ------------------------------------------------------------------ Hauptprogramm
export async function runHd(args, ROOT, helpers) {
  const { dims } = helpers;
  const num = (k, d) => (args[k] !== undefined ? +args[k] : d);
  const log = args.quiet ? () => {} : console.log;
  const warnings = [];
  const inPath = path.resolve(args._[0]);
  const name = args.name || path.basename(inPath, path.extname(inPath));
  const [TW, TH] = dims(args.size, 'size');
  const [CW, CH] = dims(args.cell, 'cell');
  const COLS = Math.ceil(TW / CW), ROWS = Math.ceil(TH / CH);
  const HD = num('hd-scale', 4);
  const FW = Math.round(CW * HD), FH = Math.round(CH * HD);
  const MARGIN = num('margin', 1);          // Mindestrand im Frame (Ausgabe-px), gegen Bluten bei linearer Filterung
  const EDGE = Math.max(1, Math.round(num('edge', 2))); // Breite des weichen Randbands (Quellpixel)
  const KERNEL = args.kernel || 'lanczos3';
  const QUALITY = num('quality', 90);
  const bgArg = args.bg || 'auto';
  const auto = bgArg === 'auto';
  const outDir = path.resolve(args['out-dir'] || path.join(ROOT, 'assets/hd'));
  const prevDir = path.resolve(args['preview-dir'] || path.join(ROOT, 'assets/preview'));
  const PSC = num('preview-scale', 1);

  // ---- Einlesen
  const { data: raw, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const SXc = W / COLS, SYc = H / ROWS; // Quell-Zellgröße (Gleitkomma)
  if (Math.abs(W / TW / (H / TH) - 1) > 0.02) warnings.push(`Seitenverhältnis der Quelle (${W}x${H}) passt nicht zu ${TW}x${TH}.`);
  const S0 = (FW / SXc + FH / SYc) / 2; // einheitlicher Maßstab Quelle -> Frame

  // Analysefarben: über Weiß (auto) bzw. über die Hintergrundfarbe (fest) gelegt; Original-Straight-Farben für deckende Pixel
  const fixedBg = auto ? null : (/^#?[0-9a-f]{6}$/i.test(bgArg) ? hex2rgb(bgArg) : (() => { throw new Error('--bg erwartet "auto" oder #rrggbb'); })());
  const A = new Uint8Array(N);
  const CR = new Float32Array(N), CG = new Float32Array(N), CB = new Float32Array(N); // Analyse
  const SR = new Uint8Array(N), SG = new Uint8Array(N), SB = new Uint8Array(N);       // Straight
  const under = fixedBg || [255, 255, 255];
  for (let i = 0; i < N; i++) {
    const a = raw[i * 4 + 3] / 255; A[i] = raw[i * 4 + 3];
    SR[i] = raw[i * 4]; SG[i] = raw[i * 4 + 1]; SB[i] = raw[i * 4 + 2];
    CR[i] = raw[i * 4] * a + under[0] * (1 - a); CG[i] = raw[i * 4 + 1] * a + under[1] * (1 - a); CB[i] = raw[i * 4 + 2] * a + under[2] * (1 - a);
  }

  // ---- Hintergrundfarbe + Maske
  const ring = Math.max(2, Math.round(Math.min(W, H) * 0.01));
  let bg;
  if (auto) {
    const r = [], g = [], b = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x >= ring && x < W - ring && y >= ring && y < H - ring) { x = W - ring - 1; continue; }
      const i = y * W + x; r.push(CR[i]); g.push(CG[i]); b.push(CB[i]);
    }
    bg = [median(r), median(g), median(b)];
  } else bg = fixedBg;
  const bgLab = oklab(...bg);
  const TOL = num('bg-tol', auto ? 0.07 : 0.05);
  const hasAlphaBg = auto && A.some((a) => a < 170);
  const ALPHA_BG = 170;
  const bgLike = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (hasAlphaBg && A[i] < ALPHA_BG) { bgLike[i] = 1; continue; }
    const l = oklab(CR[i], CG[i], CB[i]);
    bgLike[i] = Math.hypot(l[0] - bgLab[0], l[1] - bgLab[1], l[2] - bgLab[2]) <= TOL ? 1 : 0;
  }
  // ---- Trennlinien zwischen den Zellen (gerade, durchgehende Linien an den Zellgrenzen) zu Hintergrund machen
  let gridLines = [];
  if (!args['no-lines']) {
    const labAt = (i) => oklab(CR[i], CG[i], CB[i]);
    gridLines = removeGridLines({ bgLike, W, H, cellW: SXc, cellH: SYc, cols: COLS, rows: ROWS, lab: labAt });
    if (gridLines.length) log(`Trennlinien entfernt: ${gridLines.map((l) => `${l.axis === 'v' ? 'senkr.' : 'waagr.'} Grenze ${l.boundary} (${l.thickness} px, ${l.cleared} px)`).join(', ')}`);
  }
  const conn8 = String(args['bg-conn']) === '8';
  const isBg = new Uint8Array(N);
  {
    const st = new Int32Array(N); let sp = 0;
    const push = (i) => { if (bgLike[i] && !isBg[i]) { isBg[i] = 1; st[sp++] = i; } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (sp) {
      const i = st[--sp], x = i % W, y = (i / W) | 0;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
      if (conn8) { // auch über Ecken (Schachbrett-Raster aus Punkten, z. B. Karten-Schatten)
        if (x > 0 && y > 0) push(i - W - 1); if (x < W - 1 && y > 0) push(i - W + 1); if (x > 0 && y < H - 1) push(i + W - 1); if (x < W - 1 && y < H - 1) push(i + W + 1);
      }
    }
  }
  if (args.holes) { // eingeschlossene Hintergrundflächen (Ringe, hohle Rahmen) ab Mindestgröße
    const minHole = num('hole-min', 150), seen = new Uint8Array(N), st = new Int32Array(N);
    for (let s0 = 0; s0 < N; s0++) {
      if (!bgLike[s0] || isBg[s0] || seen[s0]) continue;
      const mem = []; let sp = 0; st[sp++] = s0; seen[s0] = 1;
      while (sp) {
        const i = st[--sp]; mem.push(i); const x = i % W, y = (i / W) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && bgLike[j] && !isBg[j] && !seen[j]) { seen[j] = 1; st[sp++] = j; }
      }
      if (mem.length >= minHole) for (const i of mem) isBg[i] = 1;
    }
  }

  // --key-cells "r,c;r,c": in diesen Zellen wird JEDES hintergrundfarbene Pixel transparent, auch eingeschlossene (Schachbrett-/Dither-Schatten)
  if (args['key-cells']) for (const part of String(args['key-cells']).split(';')) {
    const [r, c] = part.split(',').map(Number); if (!(r >= 0 && c >= 0)) continue;
    for (let y = Math.round(r * SYc); y < Math.min(H, Math.round((r + 1) * SYc)); y++) for (let x = Math.round(c * SXc); x < Math.min(W, Math.round((c + 1) * SXc)); x++) { const i = y * W + x; if (bgLike[i]) isBg[i] = 1; }
  }

  // ---- Abstand zum Hintergrund (Chessboard, BFS) bis EDGE+1
  const dist = new Uint8Array(N).fill(255);
  {
    let cur = [];
    for (let i = 0; i < N; i++) if (isBg[i]) { dist[i] = 0; cur.push(i); }
    for (let d = 1; d <= EDGE + 1; d++) {
      const nxt = [];
      for (const i of cur) {
        const x = i % W, y = (i / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx; if (dist[j] === 255) { dist[j] = d; nxt.push(j); }
        }
      }
      cur = nxt;
    }
  }

  // ---- lokale Hintergrundfarbe (Integralbild über Hintergrundpixel)
  const W1 = W + 1;
  const iR = new Float64Array(W1 * (H + 1)), iG = new Float64Array(W1 * (H + 1)), iB = new Float64Array(W1 * (H + 1)), iN = new Float64Array(W1 * (H + 1));
  for (let y = 0; y < H; y++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (isBg[i]) { r += CR[i]; g += CG[i]; b += CB[i]; n++; }
      const o = (y + 1) * W1 + x + 1, u = y * W1 + x + 1;
      iR[o] = iR[u] + r; iG[o] = iG[u] + g; iB[o] = iB[u] + b; iN[o] = iN[u] + n;
    }
  }
  const RB = Math.max(8, Math.round(Math.min(SXc, SYc) * 0.05));
  function localBg(x, y) {
    for (let k = 1; k <= 4; k *= 2) {
      const r = RB * k, x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      const f = (T) => T[y1 * W1 + x1] - T[y0 * W1 + x1] - T[y1 * W1 + x0] + T[y0 * W1 + x0];
      const n = f(iN); if (n >= 8) return [f(iR) / n, f(iG) / n, f(iB) / n];
    }
    return bg;
  }

  // ---- weiches Alpha + Entmischung im Randband
  const AL = new Float32Array(N);           // Alpha 0..1
  const OR = new Uint8Array(N), OG = new Uint8Array(N), OB = new Uint8Array(N); // entmischte Farbe
  let bandPx = 0, bandDropped = 0, bandSolid = 0;
  const minSep2 = 30 * 30;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (isBg[i]) continue;
    // deckende Quellfarbe (ohne Analyse-Überlagerung)
    OR[i] = SR[i]; OG[i] = SG[i]; OB[i] = SB[i]; AL[i] = 1;
    if (dist[i] > EDGE) continue;
    // Vordergrundfarbe F: vom Randpixel nach innen laufen, bis Abstand > EDGE
    let cx = x, cy = y, cd = dist[i];
    for (let step = 0; step < EDGE + 2 && cd <= EDGE; step++) {
      let bx = cx, by = cy, bd = cd;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const dd = dist[ny * W + nx]; if (dd > bd) { bd = dd; bx = nx; by = ny; }
      }
      if (bx === cx && by === cy) break;
      cx = bx; cy = by; cd = bd;
    }
    let fr = 0, fg = 0, fb = 0, fn = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (isBg[j] || dist[j] <= EDGE) continue;
      fr += SR[j]; fg += SG[j]; fb += SB[j]; fn++;
    }
    if (!fn) { fr = SR[i]; fg = SG[i]; fb = SB[i]; fn = 1; }
    fr /= fn; fg /= fn; fb /= fn;
    const b = localBg(x, y);
    const dR = fr - b[0], dG = fg - b[1], dB = fb - b[2], dd = dR * dR + dG * dG + dB * dB;
    bandPx++;
    if (dd < minSep2) { bandSolid++; continue; } // Vordergrund ≈ Hintergrund: Alpha nicht schätzbar, Pixel bleibt deckend
    let a = ((CR[i] - b[0]) * dR + (CG[i] - b[1]) * dG + (CB[i] - b[2]) * dB) / dd;
    if (a >= 0.94) continue;                      // praktisch deckend: unverändert
    if (a < 0.06) { isBg[i] = 1; AL[i] = 0; bandDropped++; continue; }
    // c = (c_obs - (1-a)·bg) / a
    const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
    OR[i] = cl((CR[i] - (1 - a) * b[0]) / a); OG[i] = cl((CG[i] - (1 - a) * b[1]) / a); OB[i] = cl((CB[i] - (1 - a) * b[2]) / a);
    AL[i] = a;
  }

  // ---- Zusammenhangskomponenten (8er) über Alpha >= 0.5; weiche Randpixel hängen sich danach an ihren Nachbarn
  // (so verschmelzen zwei Sprites nicht über einen weichen Saum)
  const lab = new Int32Array(N); // 0 = keine
  const comps = [null];          // Index = Label
  const CELL_W = SXc, CELL_H = SYc;
  const minArea = num('min-area', Math.max(12, Math.round(0.0004 * CELL_W * CELL_H)));
  let droppedSpecks = 0;
  {
    const st = new Int32Array(N);
    for (let s0 = 0; s0 < N; s0++) {
      if (AL[s0] < 0.5 || lab[s0]) continue;
      const id = comps.length; let sp = 0; st[sp++] = s0; lab[s0] = id;
      const c = { id, area: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, px: [] };
      while (sp) {
        const i = st[--sp], x = i % W, y = (i / W) | 0;
        c.area++; c.sx += x; c.sy += y; c.px.push(i);
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx; if (AL[j] >= 0.5 && !lab[j]) { lab[j] = id; st[sp++] = j; }
        }
      }
      c.cx = c.sx / c.area; c.cy = c.sy / c.area;
      comps.push(c);
    }
    // weiche Pixel (0 < Alpha < 0.5): Label des (ersten) benachbarten Pixels, in Wellen von innen nach außen
    let front = [];
    for (let i = 0; i < N; i++) if (AL[i] > 0 && AL[i] < 0.5) front.push(i);
    for (let pass = 0; pass < EDGE + 2 && front.length; pass++) {
      const rest = [], set = [];
      for (const i of front) {
        const x = i % W, y = (i / W) | 0; let l = 0;
        for (let dy = -1; dy <= 1 && !l; dy++) for (let dx = -1; dx <= 1 && !l; dx++) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          l = lab[ny * W + nx];
        }
        if (l) set.push([i, l]); else rest.push(i);
      }
      for (const [i, l] of set) { lab[i] = l; comps[l].px.push(i); comps[l].area++; }
      front = rest;
    }
    for (const i of front) AL[i] = 0; // alleinstehende Reste ohne Verbindung zu einem Sprite
    for (const c of comps) if (c && c.area < minArea) { for (const i of c.px) { AL[i] = 0; lab[i] = 0; } droppedSpecks++; comps[c.id] = null; }
  }

  // ---- Zuordnung zu Zellen (Schwerpunkt); kleine Bruchstücke gehen zur nächsten großen Komponente
  const cellOfPt = (x, y) => [Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL_H))), Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL_W)))];
  const live = comps.filter(Boolean);
  const owner = new Int16Array(N).fill(-1); // Zellindex r*COLS+c
  const splitComps = [];
  const big = live.filter((c) => c.area >= 0.05 * Math.max(...live.map((q) => q.area)));
  const gapPx = Math.round(0.08 * Math.min(CELL_W, CELL_H));
  for (const c of live) {
    let [r, cc] = cellOfPt(c.cx, c.cy);
    if (!big.includes(c)) { // Fragment: bei Nähe zu einer großen Komponente (Bbox-Abstand) deren Zelle übernehmen
      let best = null, bd = gapPx + 1;
      for (const b of big) {
        const dx = Math.max(0, b.x0 - c.x1, c.x0 - b.x1), dy = Math.max(0, b.y0 - c.y1, c.y0 - b.y1), d = Math.max(dx, dy);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) [r, cc] = cellOfPt(best.cx, best.cy);
    }
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
    if (w > 1.45 * CELL_W || h > 1.45 * CELL_H) { // Sprites verschmolzen: an der schmalsten Stelle nahe der Zellgrenze trennen
      splitComps.push(`${r + 1}.${cc + 1}`);
      const cuts = (n, size, lo, hi, axisX) => { // Schnittpositionen je Zellgrenze k*size
        const cnt = new Int32Array(Math.ceil(n * size) + 2);
        for (const i of c.px) cnt[axisX ? i % W : ((i / W) | 0)]++;
        const out = [];
        for (let k = 1; k < n; k++) {
          const bnd = k * size;
          if (bnd <= lo || bnd >= hi) { out.push(Math.round(bnd)); continue; }
          if (bnd >= hi - 0.15 * size) { out.push(hi + 1); continue; } // nur ein kleiner Überstand: bleibt beim Sprite links/oben
          if (bnd <= lo + 0.15 * size) { out.push(lo); continue; }     // ... rechts/unten
          let best = Math.round(bnd), bc = Infinity;
          for (let p = Math.max(lo + 1, Math.round(bnd - 0.35 * size)); p <= Math.min(hi - 1, Math.round(bnd + 0.35 * size)); p++) {
            if (cnt[p] < bc || (cnt[p] === bc && Math.abs(p - bnd) < Math.abs(best - bnd))) { bc = cnt[p]; best = p; }
          }
          out.push(best);
        }
        return out;
      };
      const cx = cuts(COLS, CELL_W, c.x0, c.x1, true), cy = cuts(ROWS, CELL_H, c.y0, c.y1, false);
      for (const i of c.px) {
        const x = i % W, y = (i / W) | 0;
        owner[i] = cy.filter((v) => v <= y).length * COLS + cx.filter((v) => v <= x).length;
      }
    } else for (const i of c.px) owner[i] = r * COLS + cc;
  }
  if (splitComps.length) warnings.push(`Verschmolzene Sprites an der schmalsten Stelle nahe der Zellgrenze getrennt: ${splitComps.join(', ')}.`);

  // ---- --opaque-cells "r,c;r,c": Zellen, die vollflächig deckend sind (Rauschtextur, Kachel): kein Hintergrund-Entfernen, Zelle (minus Rand) = Sprite
  const opaqueSet = new Set();
  if (args['opaque-cells']) {
    const inset = Math.max(2, Math.round(0.012 * Math.min(CELL_W, CELL_H)));
    const cells = String(args['opaque-cells']).split(';').map((p) => p.split(',').map(Number)).filter(([r, c]) => r >= 0 && c >= 0);
    for (const [r, c] of cells) opaqueSet.add(r * COLS + c);
    // 1) alles freigeben, was bisher (z. B. durch eine verschmolzene Komponente) diesen Zellen gehört
    for (let i = 0; i < N; i++) if (owner[i] >= 0 && opaqueSet.has(owner[i])) { owner[i] = -1; AL[i] = 0; }
    // Warnung über getrennte verschmolzene Sprites entfällt, wenn nur deckende Zellen betroffen sind
    const wi = warnings.findIndex((w) => w.startsWith('Verschmolzene'));
    if (wi >= 0) { const lst = /: (.*)\.$/.exec(warnings[wi])[1].split(', '); if (lst.every((k) => { const [r, c] = k.split('.').map(Number); return opaqueSet.has((r - 1) * COLS + c - 1); })) warnings.splice(wi, 1); }
    // 2) Zellkern (Zelle minus Rand für Trennlinien) deckend setzen
    for (const [r, c] of cells) {
      const idx = r * COLS + c;
      const xa = Math.round(c * CELL_W) + inset, xb = Math.round((c + 1) * CELL_W) - inset, ya = Math.round(r * CELL_H) + inset, yb = Math.round((r + 1) * CELL_H) - inset;
      for (let y = ya; y < Math.min(H, yb); y++) for (let x = xa; x < Math.min(W, xb); x++) {
        const i = y * W + x; owner[i] = idx; AL[i] = 1; OR[i] = SR[i]; OG[i] = SG[i]; OB[i] = SB[i];
      }
    }
  }

  // ---- Sprites je Zelle
  const sprites = new Map(); // idx -> {r,c,x0,y0,x1,y1,...}
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = owner[i]; if (o < 0 || AL[i] <= 0) continue;
    let s = sprites.get(o);
    if (!s) { s = { idx: o, r: (o / COLS) | 0, c: o % COLS, x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0 }; sprites.set(o, s); }
    s.n++;
    if (AL[i] >= 0.5) { if (x < s.x0) s.x0 = x; if (x > s.x1) s.x1 = x; if (y < s.y0) s.y0 = y; if (y > s.y1) s.y1 = y; }
  }
  for (const [k, s] of [...sprites]) if (s.x1 < 0) sprites.delete(k);

  // ---- Quellprüfung: Sprite am Bildrand abgeschnitten? Sprite ragt über die Zellgrenze?
  const rawClip = new Map(), rawOver = new Map();
  for (const s of sprites.values()) {
    if (opaqueSet.has(s.idx)) continue;
    const e = []; if (s.x0 <= 1) e.push('links'); if (s.y0 <= 1) e.push('oben'); if (s.x1 >= W - 2) e.push('rechts'); if (s.y1 >= H - 2) e.push('unten');
    if (e.length) rawClip.set(s.idx, e);
    const tx = 0.012 * CELL_W + 2, ty = 0.012 * CELL_H + 2, o = [];
    if (s.x0 < s.c * CELL_W - tx) o.push('links'); if (s.x1 > (s.c + 1) * CELL_W + tx) o.push('rechts');
    if (s.y0 < s.r * CELL_H - ty) o.push('oben'); if (s.y1 > (s.r + 1) * CELL_H + ty) o.push('unten');
    if (o.length) rawOver.set(s.idx, o);
  }
  if (process.env.DBG) for (const s of sprites.values()) console.error("sprite", s.r, s.c, s.x0, s.y0, s.x1, s.y1, s.n);
  // ---- Namen und Gruppen (Animationsframes)
  let names = null, nameGroups = null;
  if (args.sheet) {
    const info2 = readSheetNames(path.join(ROOT, 'docs/asset-sheets.md'), args.sheet);
    names = info2.cells; nameGroups = info2.groups;
    if (info2.grid && (info2.grid[0] !== COLS || info2.grid[1] !== ROWS)) warnings.push(`Raster laut Dokument ${info2.grid.join('x')}, aus --size/--cell ${COLS}x${ROWS}.`);
  }
  const nameOf = (s) => (names && names.get(`${s.r},${s.c}`)) || `r${s.r + 1}c${s.c + 1}`;
  if (names) {
    const unnamed = [...sprites.values()].filter((s) => !names.has(`${s.r},${s.c}`)).map((s) => `${s.r + 1}.${s.c + 1}`);
    if (unnamed.length) warnings.push(`Belegte Zellen ohne Namen in der Tabelle: ${unnamed.join(', ')} (heißen r<Zeile>c<Spalte>).`);
    const missing = [...names.keys()].filter((k) => !sprites.has(+k.split(',')[0] * COLS + +k.split(',')[1])).map((k) => names.get(k));
    if (missing.length) warnings.push(`Laut Tabelle erwartet, aber leer: ${missing.join(', ')}.`);
  }
  const groups = []; // [{base, members:[sprite]}]
  const inGroup = new Set();
  if (nameGroups) {
    for (const g of nameGroups) {
      const mem = g.cols.map((c) => sprites.get(g.row * COLS + c)).filter(Boolean);
      if (mem.length) { groups.push({ base: g.base, members: mem }); mem.forEach((m) => inGroup.add(m.idx)); }
    }
  } else { // ohne Namen: benachbarte Sprites einer Zeile mit ähnlicher Größe (±8 %) gelten als Frames
    for (let r = 0; r < ROWS; r++) {
      let cur = [];
      const flush = () => { if (cur.length > 1) { groups.push({ base: `r${r + 1}c${cur[0].c + 1}`, members: cur }); cur.forEach((m) => inGroup.add(m.idx)); } cur = []; };
      for (let c = 0; c < COLS; c++) {
        const s = sprites.get(r * COLS + c);
        if (!s) { flush(); continue; }
        const last = cur[cur.length - 1];
        const sim = last && Math.abs((s.x1 - s.x0) / (last.x1 - last.x0) - 1) < 0.08 && Math.abs((s.y1 - s.y0) / (last.y1 - last.y0) - 1) < 0.08;
        if (last && !sim) flush();
        cur.push(s);
      }
      flush();
    }
  }
  for (const s of sprites.values()) if (!inGroup.has(s.idx)) groups.push({ base: nameOf(s), members: [s] });

  // ---- Registrierung der Frames einer Gruppe (gleicher Ankerpunkt)
  const maskAt = (s, x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return 0; const i = y * W + x; return owner[i] === s.idx && AL[i] >= 0.5 ? 1 : 0; };
  function register(ref, s, bx, by) { // bx,by: Zellversatz s gegenüber ref (Quellpixel)
    const M = Math.max(2, Math.round(0.05 * Math.min(CELL_W, CELL_H)));
    const pts = []; const st = 2;
    for (let y = ref.y0; y <= ref.y1; y += st) for (let x = ref.x0; x <= ref.x1; x += st) if (maskAt(ref, x, y)) pts.push(x, y);
    const ptsN = pts.length / 2;
    let cntF = 0; for (let y = s.y0; y <= s.y1; y += st) for (let x = s.x0; x <= s.x1; x += st) if (maskAt(s, x, y)) cntF++;
    let best = [0, 0], bestIoU = -1, zeroIoU = 0;
    for (let dy = -M; dy <= M; dy++) for (let dx = -M; dx <= M; dx++) {
      let inter = 0;
      for (let k = 0; k < pts.length; k += 2) inter += maskAt(s, pts[k] + bx + dx, pts[k + 1] + by + dy);
      const iou = inter / (ptsN + cntF - inter);
      if (dx === 0 && dy === 0) zeroIoU = iou;
      if (iou > bestIoU + 1e-9 || (Math.abs(iou - bestIoU) <= 1e-9 && Math.hypot(dx, dy) < Math.hypot(...best))) { bestIoU = iou; best = [dx, dy]; }
    }
    return { dx: best[0], dy: best[1], iou: bestIoU, zeroIoU };
  }
  const NO_REG = !!args['no-register'];
  for (const g of groups) {
    const ref = g.members[0]; ref.d = [0, 0];
    for (const s of g.members.slice(1)) {
      const bx = Math.round((s.c - ref.c) * CELL_W), by = Math.round((s.r - ref.r) * CELL_H);
      const r = NO_REG ? { dx: 0, dy: 0, iou: 0 } : register(ref, s, bx, by);
      const ok = !NO_REG && r.iou >= 0.7;
      s.reg = ok ? [r.dx, r.dy] : [0, 0]; // reine Feinausrichtung
      s.d = [bx + s.reg[0], by + s.reg[1]];
      s.regIoU = r.iou;
    }
    ref.reg = [0, 0];
  }

  // ---- Frames rendern
  const SHW = COLS * FW, SHH = ROWS * FH;
  const sheetBuf = Buffer.alloc(SHW * SHH * 4);
  const frames = {}, animations = {}, reduced = [];
  const kernelName = KERNEL;
  // --scale-mode fit: ein einheitlicher Maßstab für das ganze Sheet, so groß, dass kein Sprite abgeschnitten/verkleinert werden muss
  // (für Sheets, deren KI-Zellen ein anderes Seitenverhältnis haben als die Zielzelle)
  const boxOf = (g) => {
    let ux0 = 1e9, uy0 = 1e9, ux1 = -1e9, uy1 = -1e9;
    for (const s of g.members) { ux0 = Math.min(ux0, s.x0 - s.d[0]); uy0 = Math.min(uy0, s.y0 - s.d[1]); ux1 = Math.max(ux1, s.x1 - s.d[0]); uy1 = Math.max(uy1, s.y1 - s.d[1]); }
    const o = g.members.some((m) => opaqueSet.has(m.idx));
    return { ux0, uy0, ux1, uy1, uw: ux1 + 1 - ux0 + (o ? 0 : 2), uh: uy1 + 1 - uy0 + (o ? 0 : 2), mg: o ? 0 : MARGIN };
  };
  let S_BASE = S0;
  if (args['scale-mode'] === 'fit' && groups.length) {
    S_BASE = Math.min(...groups.map((g) => { const b = boxOf(g); return Math.min((FW - 2 * b.mg) / b.uw, (FH - 2 * b.mg) / b.uh); }));
  }
  for (const g of groups) {
    // Gemeinsame Box im Referenzsystem (Frame f = Referenz + d_f)
    let ux0 = 1e9, uy0 = 1e9, ux1 = -1e9, uy1 = -1e9;
    for (const s of g.members) { ux0 = Math.min(ux0, s.x0 - s.d[0]); uy0 = Math.min(uy0, s.y0 - s.d[1]); ux1 = Math.max(ux1, s.x1 - s.d[0]); uy1 = Math.max(uy1, s.y1 - s.d[1]); }
    const opq = g.members.some((m) => opaqueSet.has(m.idx)), pad = opq ? 0 : 2, mg = opq ? 0 : MARGIN;
    const uw = ux1 + 1 - ux0 + pad, uh = uy1 + 1 - uy0 + pad; // +2: weicher Rand
    const fit = Math.min((FW - 2 * mg) / uw, (FH - 2 * mg) / uh);
    const s = Math.min(S_BASE, fit);
    const wasReduced = fit < S_BASE - 1e-9;
    if (wasReduced) reduced.push(`${g.base} (${(fit / S_BASE).toFixed(2)}×)`);
    const ww = Math.round(FW / s), wh = Math.round(FH / s);
    const ucx = (ux0 + ux1 + 1) / 2, ucy = (uy0 + uy1 + 1) / 2;
    g.scale = s; g.reduced = wasReduced; g.names = [];
    for (const sp of g.members) {
      const ox = Math.round(ucx + sp.d[0] - ww / 2), oy = Math.round(ucy + sp.d[1] - wh / 2);
      const win = Buffer.alloc(ww * wh * 4);
      for (let y = 0; y < wh; y++) {
        const sy = oy + y; if (sy < 0 || sy >= H) continue;
        for (let x = 0; x < ww; x++) {
          const sx = ox + x; if (sx < 0 || sx >= W) continue;
          const i = sy * W + sx; if (owner[i] !== sp.idx || AL[i] <= 0) continue;
          const o = (y * ww + x) * 4;
          win[o] = OR[i]; win[o + 1] = OG[i]; win[o + 2] = OB[i]; win[o + 3] = Math.round(AL[i] * 255);
        }
      }
      let pipe = sharp(win, { raw: { width: ww, height: wh, channels: 4 } }).resize(FW, FH, { kernel: kernelName, fit: 'fill' });
      if (args.sharpen) pipe = pipe.sharpen({ sigma: +args.sharpen });
      const fr = await pipe.raw().toBuffer();
      // Inhalts-Bounding-Box + Saumprüfung
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        if (fr[(y * FW + x) * 4 + 3] >= 20) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      }
      for (let y = 0; y < FH; y++) fr.copy(sheetBuf, ((sp.r * FH + y) * SHW + sp.c * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
      const nm = nameOf(sp);
      g.names.push(nm);
      frames[nm] = {
        frame: { x: sp.c * FW, y: sp.r * FH, w: FW, h: FH },
        rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: FW, h: FH },
        sourceSize: { w: FW, h: FH },
        contentBBox: bx1 < 0 ? null : { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 },
        pivot: { x: 0.5, y: 0.5 },
        cell: { row: sp.r + 1, col: sp.c + 1 },
        scale: +(s).toFixed(4), scaleReduced: wasReduced,
      };
      if (rawClip.has(sp.idx)) frames[nm].rawClippedAt = rawClip.get(sp.idx);
      if (rawOver.has(sp.idx)) frames[nm].rawOverflowCell = rawOver.get(sp.idx);
      if (g.members.length > 1) { frames[nm].group = g.base; frames[nm].registration = { dx: sp.reg[0], dy: sp.reg[1], iou: +(sp.regIoU ?? 1).toFixed(3) }; }
      if (bx1 >= 0 && !opq && (bx0 < MARGIN || by0 < MARGIN || bx1 > FW - 1 - MARGIN || by1 > FH - 1 - MARGIN)) warnings.push(`${nm}: Inhalt berührt den Frame-Rand (Rand < ${MARGIN} px).`);
    }
    if (g.members.length > 1) animations[g.base] = g.names;
  }

  // ---- Schreiben
  fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(prevDir, { recursive: true });
  const webpPath = path.join(outDir, `${name}.webp`), jsonPath = path.join(outDir, `${name}.json`);
  let webp = sharp(sheetBuf, { raw: { width: SHW, height: SHH, channels: 4 } });
  webp = args.lossless ? webp.webp({ lossless: true, effort: 6 }) : webp.webp({ quality: QUALITY, alphaQuality: 100, effort: 6, smartSubsample: true });
  await webp.toFile(webpPath);
  const json = {
    frames: Object.fromEntries(Object.entries(frames).sort((a, b) => a[1].frame.y - b[1].frame.y || a[1].frame.x - b[1].frame.x)),
    animations,
    meta: {
      app: 'bottleneck tools/clean-sheet.mjs --hd', version: '1.0', image: `${name}.webp`, format: 'RGBA8888', size: { w: SHW, h: SHH }, scale: '1',
      hdScale: HD, cell: { w: CW, h: CH }, frame: { w: FW, h: FH }, grid: { cols: COLS, rows: ROWS }, targetSize: { w: TW, h: TH },
      source: path.basename(inPath), sheet: args.sheet || null, background: auto ? 'auto' : bgArg, quality: args.lossless ? 'lossless' : QUALITY,
      alpha: 'straight (nicht vormultipliziert)', filter: 'linear', baseScale: +S_BASE.toFixed(5), scaleMode: args['scale-mode'] || 'cell', gridLinesRemoved: gridLines.length,
    },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));

  // ---- Vorschauen aus der fertigen WebP (zeigt auch Kompressionsfehler)
  const { data: dec } = await sharp(webpPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mk = async (suffix, bgAt) => {
    const w = SHW * PSC, h = SHH * PSC, buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = (x / PSC) | 0, sy = (y / PSC) | 0, i = (sy * SHW + sx) * 4, a = dec[i + 3] / 255, b = bgAt(x, y), o = (y * w + x) * 4;
      buf[o] = Math.round(dec[i] * a + b[0] * (1 - a)); buf[o + 1] = Math.round(dec[i + 1] * a + b[1] * (1 - a)); buf[o + 2] = Math.round(dec[i + 2] * a + b[2] * (1 - a)); buf[o + 3] = 255;
      if (args.grid && (x % (FW * PSC) === 0 || y % (FH * PSC) === 0)) { buf[o] = 255; buf[o + 1] = 60; buf[o + 2] = 255; }
    }
    const p = path.join(prevDir, `${name}_hd_${suffix}.png`);
    await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(p);
    return p;
  };
  const CK = [[0x4a, 0x54, 0x5e], [0x5e, 0x69, 0x74]];
  const pChk = await mk('checker', (x, y) => CK[(((x >> 4) + (y >> 4)) & 1)]);
  const pDark = await mk('dark', () => [0x1a, 0x1a, 0x2e]);

  // ---- Saumprüfung: halbtransparente Pixel, deren Farbe dem Hintergrund gleicht (grau/weiß)
  let semi = 0, bgish = 0;
  for (let i = 0; i < SHW * SHH; i++) {
    const a = dec[i * 4 + 3]; if (a < 13 || a > 242) continue; semi++;
    const dr = dec[i * 4] - bg[0], dg = dec[i * 4 + 1] - bg[1], db = dec[i * 4 + 2] - bg[2];
    if (Math.hypot(dr, dg, db) < 28) bgish++;
  }

  const size = (p) => `${(fs.statSync(p).size / 1024).toFixed(1)} KB`;
  log(`clean-sheet --hd: ${path.relative(process.cwd(), inPath)} ${W}x${H} -> Zellen ${CW}x${CH} (${COLS}x${ROWS}), Frame ${FW}x${FH}, Atlas ${SHW}x${SHH}`);
  log(`Hintergrund: ${auto ? 'auto' : bgArg} (Referenz RGB ${bg.map(Math.round).join(',')}${hasAlphaBg ? ', Alpha-Hintergrund erkannt' : ''}), Randband ${EDGE} px: ${bandPx} Pixel, ${bandDropped} entfernt, ${bandSolid} nicht schätzbar`);
  log(`Maßstab Quelle->Frame: ${S0.toFixed(4)} · Sprites: ${sprites.size} (Splitter < ${minArea} px entfernt: ${droppedSpecks}) · Gruppen mit Animation: ${Object.keys(animations).join(', ') || '–'}`);
  for (const g of groups) if (g.members.length > 1) log(`  Gruppe ${g.base}: Versatz je Frame ${g.members.map((m) => m.reg.join(',')).join(' | ')}`);
  if (reduced.length) log(`Maßstab verkleinert (Sprite wäre größer als der Frame): ${reduced.join(', ')}`);
  log(`Saumprüfung: ${semi} Randpixel (α 5–95 %), davon ${bgish} mit Hintergrundfarbe (${semi ? (100 * bgish / semi).toFixed(1) : 0} %)`);
  for (const w of warnings) log('WARNUNG: ' + w);
  log(`-> ${path.relative(process.cwd(), webpPath)} (${size(webpPath)})\n-> ${path.relative(process.cwd(), jsonPath)} (${size(jsonPath)})\n-> ${path.relative(process.cwd(), pChk)}\n-> ${path.relative(process.cwd(), pDark)}`);
  return { webpPath, jsonPath, previewDark: pDark, previewChecker: pChk, warnings, reduced, gridLines: gridLines.map((l) => ({ axis: l.axis, boundary: l.boundary, thickness: l.thickness, cleared: l.cleared })), bg: bg.map(Math.round), semiBgPct: semi ? +(100 * bgish / semi).toFixed(1) : 0, droppedSpecks, sourceSize: [W, H], baseScale: S_BASE, nativeScale: S0 };
}
