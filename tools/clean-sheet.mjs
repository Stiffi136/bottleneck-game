#!/usr/bin/env node
// clean-sheet.mjs – säubert von einer Bild-KI erzeugte Pixel-Art-Sprite-Sheets (BOTTLENECK-35).
// Hintergrund entfernen -> auf Zielgröße abbilden (Modus im Kernbereich) -> Palette -> PNG + Vorschau + Prüfbericht.
// Mit --hd stattdessen HD-Pipeline (tools/hd.mjs): weiches Alpha, WebP-Atlas + JSON.
// Siehe docs/asset-sheets.md, Abschnitt 6.4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// ---------------------------------------------------------------- Palette
const PAL_HEX = ('0b0b12 1a1a2e 2a2a44 43435f 6a6a88 9b9bb4 cfd0e0 f4f4fa 0f2a1c 1d4a2c 2e7040 5fa35a 5a3216 a8642a e0a848 ffe28a ' +
  '1f3f9a 3a7bf0 8cc4ff 1f7a3a 3fbf5f a8f07a b9781c f2b233 5a2a9a a05cf0 ffd23f ff8a2e e8432d 8c1c2b ff3fa4 2ef2ff 8a7a5c c9b88f e8dcb8').split(' ');
const KEY_HEX = 'ff00ff c000c0 800080 00ff00 00c000 008000 00ffff'.split(' ');
const hex2rgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const OUTLINE = 0; // Index von #0b0b12

// ---------------------------------------------------------------- Farbraum (OKLab)
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function oklab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ---------------------------------------------------------------- CLI
const HELP = `Aufruf: node tools/clean-sheet.mjs <input.png> --size WxH --cell WxH [Optionen]

Pflicht:
  --size 192x96        Zielgröße des fertigen Sheets in Pixeln
  --cell 32x32         Zellgröße (für Zellbericht, Raster)
Optionen:
  --bg auto|#808080    Hintergrund: automatisch (Rand, Alpha, fast weiß) oder feste Farbe   [auto]
  --bg-tol 0.07        Toleranz Hintergrundfarbe (OKLab-Abstand)                           [0.07 auto, 0.05 fest]
  --holes              auch eingeschlossene Hintergrundflächen transparent machen (Ringe, Schlaufen)
  --out PFAD.png       Ausgabe (Standard assets/clean/<name>.png)
  --preview PFAD.png   Vorschau 4x (Standard assets/preview/<name>_x4.png)
  --scale 4            Vorschau-Faktor
  --grid               Zellraster in die Vorschau zeichnen
  --mode auto|native|resample  resample: festes Zielraster, Modus über Quellblöcke (Standard, auch bei nicht ganzzahligem Faktor);
                       native: Art-Pixel-Raster je Sprite erkennen, 1:1 abtasten, zentrieren; skaliert zu große Sprites herunter (nie abschneiden) und warnt;
                       auto = resample [auto]
  --phase auto|0       (resample) Rasterversatz der Quelle erkennen [auto]
  --no-center          (native) Sprites an ihrer Quellposition lassen statt zu zentrieren
  --remap SRC=DST[@Z]  nach der Palettenrundung Farbe SRC zu DST machen (z.B. 2ef2ff=00ffff@2: Cyan in Zeile 2 -> Schlüsselfarbe); mehrfach durch Komma
  --keys               Schlüsselfarben (#ff00ff/#c000c0/#800080, #00ff00/#00c000/#008000, #00ffff) zusätzlich erlauben
  --fringe N           Quellpixel, die der Hintergrund-Saum (helle Mischpixel außerhalb der Kontur) breit ist [auto ≈ 0.3·Faktor]
  --core 0.6           Anteil des Quellblocks (Mitte), der abgestimmt wird (0.2-1)          [0.6]
  --outline-weight 2   Stimmgewicht für Kontur-Pixel (#0b0b12)                              [2.0]
  --edge-weight 0.15   Stimmgewicht für Übergangs-Pixel (Nachbarn mit anderer Farbe)        [0.15]
  --bg-threshold 0.55  Zielpixel wird transparent, wenn Hintergrundanteil im Kern >= Wert   [0.55]
  --despeckle          einzelne verwaiste Pixel entfernen (Standard an; --no-despeckle)
  --no-prune           Ausreißer-Spitzen (helle, unsichere Halo-Pixel am Spriterand) NICHT entfernen
  --fix-outline        dunkle Randpixel (nicht #0b0b12) auf Kontur-Schwarz setzen
  --expect 5,6,1       erwartete belegte Zellen je Zeile (Prüfung)
  --report PFAD.json   JSON-Bericht (Standard assets/clean/<name>.report.json)
  --quiet              kein Konsolenbericht

HD-Modus (--hd): Original-Look der KI (weiche Kanten, alle Farben), keine Palette. Ausgabe assets/hd/<name>.webp + .json, Vorschauen in assets/preview/
  --hd                 HD-Modus einschalten (--bg, --bg-tol, --holes, --quiet, --grid gelten weiter)
  --hd-scale 4         Frame-Größe = Zelle x hd-scale (32x32 -> 128x128)                    [4]
  --sheet S16          Sprite-Namen (und Animationsgruppen) aus der Belegungstabelle in docs/asset-sheets.md; sonst r<Zeile>c<Spalte>
  --name NAME          Ausgabename (Standard: Name des Rohbilds)
  --quality 90 | --lossless   WebP-Qualität                                                 [90]
  --margin 1           Mindestrand im Frame in Ausgabe-px                                    [1]
  --edge 2             Breite des weichen Randbands in Quellpixeln (Alpha-Schätzung/Entmischung) [2]
  --kernel lanczos3    Filter (lanczos2|lanczos3|mitchell|cubic); --sharpen SIGMA optional nachschärfen
  --no-register        Animationsframes nicht per Silhouette aufeinander ausrichten
  --out-dir / --preview-dir / --preview-scale  Ausgabeordner, Vorschau-Faktor [1]
  Zusammensetzen von Hälften: node tools/stack.mjs a.png b.png --out assets/work/x.png
`;
function parseArgs(argv) {
  const o = { _: [] };
  const flags = new Set(['no-center', 'holes', 'grid', 'keys', 'despeckle', 'no-despeckle', 'no-prune', 'fix-outline', 'quiet', 'help', 'hd', 'lossless', 'no-register']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (flags.has(k)) o[k] = true; else o[k] = argv[++i];
    } else o._.push(a);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));
if (args.help || !args._[0]) { console.log(HELP); process.exit(args.help ? 0 : 1); }
const dims = (s, name) => {
  const m = /^(\d+)x(\d+)$/.exec(s || '');
  if (!m) { console.error(`Fehler: --${name} WxH fehlt oder ist ungültig`); process.exit(1); }
  return [+m[1], +m[2]];
};
if (args.hd) { const { runHd } = await import('./hd.mjs'); await runHd(args, ROOT, { dims }); process.exit(0); }
const [TW, TH] = dims(args.size, 'size');
const [CW, CH] = dims(args.cell, 'cell');
if (TW % CW || TH % CH) console.error(`Warnung: Zielgröße ${TW}x${TH} ist kein Vielfaches der Zelle ${CW}x${CH}`);
const COLS = Math.ceil(TW / CW), ROWS = Math.ceil(TH / CH);
const num = (k, d) => (args[k] !== undefined ? +args[k] : d);
const CORE = Math.min(1, Math.max(0.1, num('core', 0.6)));
const W_OUT = num('outline-weight', 2);
const W_EDGE = num('edge-weight', 0.15);
const BG_THR = num('bg-threshold', 0.55);
const bgMode = args.bg || 'auto';
const BG_TOL = num('bg-tol', bgMode === 'auto' ? 0.07 : 0.05);
const MODE_ARG = args.mode || 'auto';
if (!['auto', 'native', 'resample'].includes(MODE_ARG)) { console.error('Fehler: --mode native|resample'); process.exit(1); }
const DESPECKLE = !args['no-despeckle'];
const inPath = path.resolve(args._[0]);
const name = path.basename(inPath, path.extname(inPath));
const outPath = path.resolve(args.out || path.join(ROOT, 'assets/clean', `${name}.png`));
const PSCALE = num('scale', 4);
const prevPath = path.resolve(args.preview || path.join(ROOT, 'assets/preview', `${name}_x${PSCALE}.png`));
const repPath = path.resolve(args.report || outPath.replace(/\.png$/i, '.report.json'));

// Palette inkl. optionaler Schlüsselfarben
const PAL = PAL_HEX.map((h) => ({ hex: '#' + h, rgb: hex2rgb(h), key: false }));
if (args.keys) for (const h of KEY_HEX) PAL.push({ hex: '#' + h, rgb: hex2rgb(h), key: true });
for (const p of PAL) p.lab = oklab(...p.rgb);

// ---------------------------------------------------------------- Einlesen
const src = PNG.sync.read(fs.readFileSync(inPath));
const W = src.width, H = src.height, D = src.data;
const SX = W / TW, SY = H / TH;
const INT_FACTOR = Math.abs(SX - Math.round(SX)) < 0.02 && Math.abs(SY - Math.round(SY)) < 0.02;
const MODE = MODE_ARG === 'auto' ? 'resample' : MODE_ARG; // auto = resample (native nur auf ausdrücklichen Wunsch: --mode native)
const warnings = [];
if (Math.abs(SX / SY - 1) > 0.02) warnings.push(`Seitenverhältnis der Quelle (${W}x${H}) passt nicht zu ${TW}x${TH} (Faktor x=${SX.toFixed(2)}, y=${SY.toFixed(2)}).`);

// Farbe über Weiß gelegt (für Hintergrund-Analyse) und OKLab-Cache
const compLab = new Float32Array(W * H * 3);
const alphaAt = (i) => D[i * 4 + 3];
for (let i = 0; i < W * H; i++) {
  const a = D[i * 4 + 3] / 255;
  const r = D[i * 4] * a + 255 * (1 - a), g = D[i * 4 + 1] * a + 255 * (1 - a), b = D[i * 4 + 2] * a + 255 * (1 - a);
  const l = oklab(r, g, b);
  compLab[i * 3] = l[0]; compLab[i * 3 + 1] = l[1]; compLab[i * 3 + 2] = l[2];
}

// ---------------------------------------------------------------- Hintergrund
function medianOf(arr) { const s = [...arr].sort((a, b) => a - b); return s[s.length >> 1]; }
let bgRef; // OKLab
const ring = Math.max(2, Math.round(Math.min(W, H) * 0.01));
if (bgMode === 'auto') {
  const L = [], A = [], B = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x >= ring && x < W - ring && y >= ring && y < H - ring) { x = Math.max(x, W - ring - 1); continue; }
    const i = y * W + x;
    L.push(compLab[i * 3]); A.push(compLab[i * 3 + 1]); B.push(compLab[i * 3 + 2]);
  }
  bgRef = [medianOf(L), medianOf(A), medianOf(B)];
} else {
  if (!/^#?[0-9a-f]{6}$/i.test(bgMode)) { console.error('Fehler: --bg erwartet "auto" oder #rrggbb'); process.exit(1); }
  bgRef = oklab(...hex2rgb(bgMode));
}
const bgLike = new Uint8Array(W * H);
// Auto: sehr transparent oder dicht an der Randfarbe; fest: nahe an der Farbe (oder transparent)
const ALPHA_BG = 110;
for (let i = 0; i < W * H; i++) {
  const d = Math.hypot(compLab[i * 3] - bgRef[0], compLab[i * 3 + 1] - bgRef[1], compLab[i * 3 + 2] - bgRef[2]);
  const transparent = alphaAt(i) < ALPHA_BG;
  bgLike[i] = (transparent || d <= BG_TOL) ? 1 : 0;
}
// Flood-Fill (4er-Nachbarschaft) von allen Randpixeln
const isBg = new Uint8Array(W * H);
{
  const stack = new Int32Array(W * H); let sp = 0;
  const push = (i) => { if (bgLike[i] && !isBg[i]) { isBg[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (sp) {
    const i = stack[--sp], x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
}
if (args.holes) for (let i = 0; i < W * H; i++) {
  if (bgLike[i] && !isBg[i]) {
    const d = Math.hypot(compLab[i * 3] - bgRef[0], compLab[i * 3 + 1] - bgRef[1], compLab[i * 3 + 2] - bgRef[2]);
    if (d <= BG_TOL * 0.6 || alphaAt(i) < ALPHA_BG) isBg[i] = 1;
  }
}

// ---------------------------------------------------------------- Saum (Weichzeichner-Halo) abtragen
// Helle Mischpixel zwischen Hintergrund und Kontur würden sonst als Steel-/Grau-Pixel außen an der Kontur landen.
// Nicht-dunkle Vordergrundpixel im Abstand <= FRINGE vom Hintergrund werden zu Hintergrund; dunkle Konturpixel bleiben.
const FRINGE = args.fringe !== undefined ? +args.fringe : Math.min(4, Math.round(Math.min(SX, SY) * 0.3));
let fringePx = 0;
for (let pass = 0; pass < FRINGE; pass++) {
  const kill = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (isBg[i] || compLab[i * 3] < 0.28) continue;
    if ((x > 0 && isBg[i - 1]) || (x < W - 1 && isBg[i + 1]) || (y > 0 && isBg[i - W]) || (y < H - 1 && isBg[i + W])) kill.push(i);
  }
  for (const i of kill) isBg[i] = 1;
  fringePx += kill.length;
}

// ---------------------------------------------------------------- Kleine Reste im Quellbild entfernen
let srcSpecks = 0;
{
  const minArea = Math.round(0.4 * SX * SY);
  const seen = new Uint8Array(W * H);
  const st = new Int32Array(W * H);
  for (let s0 = 0; s0 < W * H; s0++) {
    if (isBg[s0] || seen[s0]) continue;
    let sp = 0, n = 0; st[sp++] = s0; seen[s0] = 1;
    const members = [];
    while (sp) {
      const i = st[--sp]; members.push(i); n++;
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!isBg[j] && !seen[j]) { seen[j] = 1; st[sp++] = j; }
      }
    }
    if (n < minArea) { for (const i of members) isBg[i] = 1; srcSpecks++; }
  }
}


// ---------------------------------------------------------------- Palette je Quellpixel
const cache = new Map();
function nearest(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  let v = cache.get(key);
  if (v !== undefined) return v;
  const lab = oklab(r, g, b);
  let best = 0, bd = Infinity;
  for (let k = 0; k < PAL.length; k++) { const d = dist(lab, PAL[k].lab); if (d < bd) { bd = d; best = k; } }
  v = [best, bd]; cache.set(key, v);
  return v;
}
const idx = new Int8Array(W * H); // -1 = Hintergrund
let rawExact = 0, rawFg = 0, errSum = 0;
const palInts = new Set(PAL_HEX.map((h) => parseInt(h, 16)));
for (let i = 0; i < W * H; i++) {
  if (isBg[i]) { idx[i] = -1; continue; }
  const r = D[i * 4], g = D[i * 4 + 1], b = D[i * 4 + 2];
  const [k, d] = nearest(r, g, b);
  idx[i] = k; rawFg++; errSum += d;
  if (palInts.has((r << 16) | (g << 8) | b)) rawExact++;
}

// ---------------------------------------------------------------- Abstimmen (Modus im Kern des Quellblocks)
const FL = Math.max(1, Math.round(Math.min(SX, SY) * 0.25));
const wgt = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, v = idx[i];
  const at = (xx, yy) => idx[Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))];
  const flat = at(x - FL, y) === v && at(x + FL, y) === v && at(x, y - FL) === v && at(x, y + FL) === v;
  wgt[i] = (flat ? 1 : W_EDGE) * (v === OUTLINE ? W_OUT : 1);
}
// Quellbereich [x0,x1]x[y0,y1] (Gleitkomma, Pixelmitten) -> [Farbindex | -1, Anteil der Siegerstimmen]
function vote(x0, x1, y0, y1) {
  const xs = Math.max(0, Math.ceil(x0 - 0.5)), xe = Math.min(W - 1, Math.floor(x1 - 0.5));
  const ys = Math.max(0, Math.ceil(y0 - 0.5)), ye = Math.min(H - 1, Math.floor(y1 - 0.5));
  const votes = new Float64Array(PAL.length); let bgN = 0, fgN = 0, fgW = 0;
  for (let y = ys; y <= ye; y++) for (let x = xs; x <= xe; x++) {
    const i = y * W + x, v = idx[i];
    if (v < 0) bgN++; else { fgN++; votes[v] += wgt[i]; fgW += wgt[i]; }
  }
  const n = bgN + fgN;
  if (!n || !fgN || bgN / n >= BG_THR) return [-1, 0];
  let best = 0; for (let k = 1; k < PAL.length; k++) if (votes[k] > votes[best]) best = k;
  return [best, votes[best] / fgW];
}
const out = Array.from({ length: TH }, () => new Int16Array(TW).fill(-1));
const conf = Array.from({ length: TH }, () => new Float32Array(TW));
let lowConf = 0;
const sprites = []; // Analyse je Zelle (Quellkoordinaten, erkanntes Art-Pixel-Raster)

// --- Sprite-Analyse je Zelle: Bounding-Box der Vordergrundpixel, Art-Pixel-Raster aus Kantenenergie
// e[x] = Änderungsenergie zwischen x-1 und x. Score: mittlere Energie auf den Rasterlinien minus Energie in den Pixelmitten.
function gridScore(e, b0, b1, n) {
  const B = b1 + 1 - b0, p = B / n;
  const at = (q) => { const k = Math.round(q); return Math.max(e[k - 1] || 0, e[k] || 0, e[k + 1] || 0); };
  let sb = 0, sm = 0;
  for (let k = 1; k < n; k++) sb += at(b0 + k * p);
  for (let k = 0; k < n; k++) sm += at(b0 + (k + 0.5) * p);
  return sb / Math.max(1, n - 1) - sm / n;
}
// Zusammenhangskomponenten (8er) des Vordergrunds, je Komponente Zelle des Schwerpunkts: Sprites, die über die Zellgrenze ragen, bleiben vollständig
const own = new Int32Array(W * H); // Zellindex+1 (r*COLS+c+1) oder 0
const mergedSplit = [];
{
  const seen = new Uint8Array(W * H), st = new Int32Array(W * H);
  for (let s0 = 0; s0 < W * H; s0++) {
    if (isBg[s0] || seen[s0]) continue;
    let sp = 0, n = 0, sx = 0, sy = 0; const mem = []; st[sp++] = s0; seen[s0] = 1;
    while (sp) {
      const i = st[--sp]; mem.push(i); n++; const x = i % W, y = (i / W) | 0; sx += x; sy += y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!isBg[j] && !seen[j]) { seen[j] = 1; st[sp++] = j; }
      }
    }
    const cw = W / COLS, ch = H / ROWS;
    const cr = Math.min(ROWS - 1, Math.floor(sy / n / ch)), cc = Math.min(COLS - 1, Math.floor(sx / n / cw));
    let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
    for (const i of mem) { const x = i % W, y = (i / W) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    if (bx1 - bx0 + 1 > 1.45 * cw || by1 - by0 + 1 > 1.45 * ch) {
      // verschmolzene Sprites: an der schmalsten Stelle nahe der Zellgrenze trennen
      mergedSplit.push(`${cr + 1}.${cc + 1}`);
      const cuts = (cnt, k, size, lo, hi) => {
        const out = [];
        for (let q = 1; q < k; q++) {
          const bnd = q * size;
          if (bnd <= lo || bnd >= hi) { out.push(Math.round(bnd)); continue; }
          if (bnd >= hi - 0.15 * size) { out.push(hi + 1); continue; }
          if (bnd <= lo + 0.15 * size) { out.push(lo); continue; }
          let best = Math.round(bnd), bc = Infinity;
          for (let p = Math.max(lo + 1, Math.round(bnd - 0.35 * size)); p <= Math.min(hi - 1, Math.round(bnd + 0.35 * size)); p++) {
            if (cnt[p] < bc || (cnt[p] === bc && Math.abs(p - bnd) < Math.abs(best - bnd))) { bc = cnt[p]; best = p; }
          }
          out.push(best);
        }
        return out;
      };
      const cX = new Int32Array(W + 1), cY = new Int32Array(H + 1);
      for (const i of mem) { cX[i % W]++; cY[(i / W) | 0]++; }
      const kx = cuts(cX, COLS, cw, bx0, bx1), ky = cuts(cY, ROWS, ch, by0, by1);
      for (const i of mem) { const x = i % W, y = (i / W) | 0; own[i] = ky.filter((v) => v <= y).length * COLS + kx.filter((v) => v <= x).length + 1; }
    } else for (const i of mem) own[i] = cr * COLS + cc + 1;
  }
}
// Bounding-Boxen je Zelle (nur zugeordnete Komponenten, auch über die Zellgrenze hinaus)
const ownBox = new Map();
for (let i = 0; i < W * H; i++) {
  const o = own[i]; if (!o) continue; const x = i % W, y = (i / W) | 0; let b = ownBox.get(o);
  if (!b) ownBox.set(o, b = [1e9, 1e9, -1, -1]);
  if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y < b[1]) b[1] = y; if (y > b[3]) b[3] = y;
}
function analyzeCell(r, c) {
  const wx0 = Math.round(c * CW * SX), wx1 = Math.min(W, Math.round((c + 1) * CW * SX));
  const wy0 = Math.round(r * CH * SY), wy1 = Math.min(H, Math.round((r + 1) * CH * SY));
  const id = r * COLS + c + 1, bb = ownBox.get(id);
  if (!bb) return null;
  const [x0, y0, x1, y1] = bb;
  const ex = new Float64Array(W + 2), ey = new Float64Array(H + 2);
  const dl = (i, j) => Math.abs(compLab[i * 3] - compLab[j * 3]) + Math.abs(compLab[i * 3 + 1] - compLab[j * 3 + 1]) + Math.abs(compLab[i * 3 + 2] - compLab[j * 3 + 2]);
  for (let y = y0; y <= y1; y++) for (let x = x0 + 1; x <= x1; x++) { const i = y * W + x; if (own[i] === id && own[i - 1] === id) ex[x] += dl(i, i - 1); }
  for (let y = y0 + 1; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; if (own[i] === id && own[i - W] === id) ey[y] += dl(i, i - W); }
  return { r, c, x0, y0, x1, y1, ex, ey,
    touchesWindow: x0 <= wx0 + 1 || y0 <= wy0 + 1 || x1 >= wx1 - 2 || y1 >= wy1 - 2 };
}
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const q = analyzeCell(r, c); if (q) sprites.push(q); }
// Globale Art-Pixel-Größe: Konsens aller Sprites (beide Achsen), dann je Sprite/Achse die Pixelanzahl n nahe B/p
let artPitch = null, pitchReliable = true;
if (sprites.length) {
  const axes = sprites.flatMap((q) => [[q.ex, q.x0, q.x1], [q.ey, q.y0, q.y1]]);
  let bestP = 0, bestS = -Infinity;
  const ratio0 = (SX + SY) / 2;
  for (let p = ratio0 * 0.75; p <= ratio0 * 1.25; p += 0.02) {
    let tot = 0;
    for (const [e, b0, b1] of axes) {
      const B = b1 + 1 - b0, n = Math.max(1, Math.round(B / p));
      if (n < 2 || Math.abs(B / n / p - 1) > 0.04) { tot -= 0.5; continue; }
      tot += gridScore(e, b0, b1, n);
    }
    if (tot > bestS) { bestS = tot; bestP = p; }
  }
  if (bestS <= 0 || bestP <= ratio0 * 0.76 || bestP >= ratio0 * 1.24) { bestP = ratio0; pitchReliable = false; } // kein verlässliches Raster erkannt -> erwarteter Faktor
  artPitch = bestP; if (process.env.DBG) { const sc = []; for (let p = 4; p <= 16; p += 0.25) { let tot = 0; for (const [e, b0, b1] of axes) { const B = b1 + 1 - b0, n = Math.max(1, Math.round(B / p)); if (Math.abs(B / n / p - 1) > 0.04) { tot -= 0.5; continue; } tot += gridScore(e, b0, b1, n); } sc.push(p.toFixed(1) + ":" + tot.toFixed(0)); } console.error(sc.join(" ")); }
  for (const q of sprites) {
    const fit = (e, b0, b1) => {
      const B = b1 + 1 - b0, n0 = Math.round(B / artPitch); let bn = Math.max(1, n0), bs = -Infinity;
      for (let n = Math.max(2, n0 - 1); n <= n0 + 1; n++) { const sc = gridScore(e, b0, b1, n) - (n === n0 ? 0 : 1e-9 + 0.02 * Math.abs(gridScore(e, b0, b1, n0))); if (sc > bs) { bs = sc; bn = n; } }
      return bn;
    };
    q.nx = fit(q.ex, q.x0, q.x1); q.ny = fit(q.ey, q.y0, q.y1);
    q.px = (q.x1 + 1 - q.x0) / q.nx; q.py = (q.y1 + 1 - q.y0) / q.ny;
    delete q.ex; delete q.ey;
  }
}

let phaseX = 0, phaseY = 0;
if (MODE === 'resample' && INT_FACTOR && args.phase !== '0') {
  // Rasterversatz: Kantenenergie (nur Vordergrund) modulo Faktor, Maximum = Blockgrenze
  const PX = Math.round(SX), PY = Math.round(SY), hx = new Float64Array(PX), hy = new Float64Array(PY);
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) {
    const i = y * W + x; if (isBg[i]) continue;
    if (!isBg[i - 1]) hx[x % PX] += Math.abs(compLab[i * 3] - compLab[(i - 1) * 3]) + Math.abs(compLab[i * 3 + 1] - compLab[(i - 1) * 3 + 1]) + Math.abs(compLab[i * 3 + 2] - compLab[(i - 1) * 3 + 2]);
    if (!isBg[i - W]) hy[y % PY] += Math.abs(compLab[i * 3] - compLab[(i - W) * 3]) + Math.abs(compLab[i * 3 + 1] - compLab[(i - W) * 3 + 1]) + Math.abs(compLab[i * 3 + 2] - compLab[(i - W) * 3 + 2]);
  }
  const pick = (h) => { const m = h.reduce((a, b) => a + b, 0) / h.length; let bi = 0; for (let k = 1; k < h.length; k++) if (h[k] > h[bi]) bi = k; return h[bi] > 1.3 * m ? bi : 0; };
  phaseX = pick(hx); phaseY = pick(hy);
  if (phaseX > PX / 2) phaseX -= PX; if (phaseY > PY / 2) phaseY -= PY;
}
if (MODE === 'resample') {
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const [v, cf] = vote(phaseX + (tx + (1 - CORE) / 2) * SX, phaseX + (tx + (1 + CORE) / 2) * SX, phaseY + (ty + (1 - CORE) / 2) * SY, phaseY + (ty + (1 + CORE) / 2) * SY);
    out[ty][tx] = v; conf[ty][tx] = cf;
  }
} else {
  // native: jedes Sprite wird auf seinem erkannten Art-Pixel-Raster abgetastet und (zentriert) in die Zelle gesetzt
  for (const s of sprites) {
    // nie abschneiden: ist das Sprite (in Art-Pixeln) größer als die Zelle, wird es proportional herunterskaliert (Raster gröber abgetastet)
    let gx = s.nx, gy = s.ny;
    if (gx > CW || gy > CH) {
      const f = Math.min(CW / gx, CH / gy);
      gx = Math.max(1, Math.min(CW, Math.round(s.nx * f))); gy = Math.max(1, Math.min(CH, Math.round(s.ny * f)));
      s.downscaled = `${s.nx}x${s.ny} -> ${gx}x${gy}`;
      warnings.push(`Zelle ${s.r + 1}.${s.c + 1}: Sprite hat ${s.nx}x${s.ny} Art-Pixel (Zelle ${CW}x${CH}). native skaliert es herunter auf ${gx}x${gy} (Details gehen verloren). Besser --mode resample (Standard) nutzen.`);
    }
    const px = (s.x1 + 1 - s.x0) / gx, py = (s.y1 + 1 - s.y0) / gy;
    let ox = args['no-center'] ? Math.round((s.x0 - s.c * CW * SX) / SX) : Math.floor((CW - gx) / 2);
    let oy = args['no-center'] ? Math.round((s.y0 - s.r * CH * SY) / SY) : Math.floor((CH - gy) / 2);
    ox = Math.max(0, Math.min(CW - gx, ox)); oy = Math.max(0, Math.min(CH - gy, oy));
    s.placed = { x: ox, y: oy, w: gx, h: gy };
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      const [v, cf] = vote(s.x0 + (i + (1 - CORE) / 2) * px, s.x0 + (i + (1 + CORE) / 2) * px, s.y0 + (j + (1 - CORE) / 2) * py, s.y0 + (j + (1 + CORE) / 2) * py);
      const tx = s.c * CW + ox + i, ty = s.r * CH + oy + j;
      if (tx >= TW || ty >= TH) { if (v >= 0) s.clipped = (s.clipped || 0) + 1; continue; }
      out[ty][tx] = v; conf[ty][tx] = cf;
    }
    if (s.clipped) warnings.push(`Zelle ${s.r + 1}.${s.c + 1}: ${s.clipped} Pixel liegen außerhalb des Sheets und fehlen.`);
  }
}


// ---------------------------------------------------------------- Nachbearbeitung
const get = (x, y) => (x < 0 || y < 0 || x >= TW || y >= TH) ? -1 : out[y][x];
let speckles = 0;
if (DESPECKLE) {
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    if (out[y][x] < 0) continue;
    let nb = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && get(x + dx, y + dy) >= 0) nb++;
    if (!nb) { out[y][x] = -1; speckles++; }
  }
}
// --remap SRC=DST[@Zeilen]: Farbe SRC (nach Palettenrundung) wird zu DST, optional nur in Zellzeilen (z. B. @2 oder @1+2)
let remapped = 0;
const remapSpecs = [];
if (args.remap) for (const part of args.remap.split(',')) {
  const m = /^#?([0-9a-f]{6})=#?([0-9a-f]{6})(?:@([\d+]+))?$/i.exec(part.trim());
  if (!m) { console.error('Fehler: --remap erwartet SRC=DST[@Zeilen], z. B. 2ef2ff=00ffff@2'); process.exit(1); }
  const find = (h) => { let k = PAL.findIndex((p) => p.hex.toLowerCase() === '#' + h.toLowerCase()); if (k < 0) { PAL.push({ hex: '#' + h.toLowerCase(), rgb: hex2rgb(h), lab: oklab(...hex2rgb(h)), key: KEY_HEX.includes(h.toLowerCase()) }); k = PAL.length - 1; } return k; };
  const rows = m[3] ? m[3].split('+').map(Number) : null;
  remapSpecs.push({ from: find(m[1]), to: find(m[2]), rows, text: part.trim() });
}
for (const sp of remapSpecs) for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
  if (out[y][x] === sp.from && (!sp.rows || sp.rows.includes(Math.floor(y / CH) + 1))) { out[y][x] = sp.to; remapped++; }
}
// Ausreißer-Spitzen: helle, unsichere Pixel, die nur mit <= 2 Nachbarn (4er) am Sprite hängen und nicht dunkel sind (Halo-Reste)
let pruned = 0;
if (!args['no-prune']) for (let pass = 0; pass < 2; pass++) {
  const kill = [];
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const v = out[y][x]; if (v < 0 || PAL[v].key || PAL[v].lab[0] < 0.4 || conf[y][x] >= 0.75) continue;
    const nb = (get(x - 1, y) >= 0) + (get(x + 1, y) >= 0) + (get(x, y - 1) >= 0) + (get(x, y + 1) >= 0);
    if (nb <= 2) kill.push([x, y]);
  }
  for (const [x, y] of kill) { out[y][x] = -1; pruned++; }
}
const DARK_L = 0.35;
function boundaryPixels() {
  const res = [];
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const v = out[y][x]; if (v < 0) continue;
    if (get(x - 1, y) < 0 || get(x + 1, y) < 0 || get(x, y - 1) < 0 || get(x, y + 1) < 0) res.push([x, y, v]);
  }
  return res;
}
let fixedOutline = 0;
if (args['fix-outline']) {
  for (const [x, y, v] of boundaryPixels()) if (v !== OUTLINE && PAL[v].lab[0] < DARK_L && !PAL[v].key) { out[y][x] = OUTLINE; fixedOutline++; }
}

// ---------------------------------------------------------------- PNG-Ausgabe
function writePNG(file, w, h, fill) {
  const p = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = fill(x, y); const o = (y * w + x) * 4;
    p.data[o] = r; p.data[o + 1] = g; p.data[o + 2] = b; p.data[o + 3] = a;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(p));
}
writePNG(outPath, TW, TH, (x, y) => { const v = out[y][x]; return v < 0 ? [0, 0, 0, 0] : [...PAL[v].rgb, 255]; });
const CHK = [[0x4a, 0x54, 0x5e], [0x5e, 0x69, 0x74]];
writePNG(prevPath, TW * PSCALE, TH * PSCALE, (px, py) => {
  const x = (px / PSCALE) | 0, y = (py / PSCALE) | 0, v = out[y][x];
  let c;
  if (v >= 0) c = PAL[v].rgb;
  else c = CHK[(((px >> 3) + (py >> 3)) & 1)];
  if (args.grid && (px % (CW * PSCALE) === 0 || py % (CH * PSCALE) === 0)) c = [Math.round(c[0] * 0.4 + 255 * 0.6), Math.round(c[1] * 0.4 + 40 * 0.6), Math.round(c[2] * 0.4 + 255 * 0.6)];
  return [...c, 255];
});

// ---------------------------------------------------------------- Prüfbericht
const used = new Map(); let opaque = 0;
for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const v = out[y][x]; if (v >= 0) { opaque++; used.set(v, (used.get(v) || 0) + 1); } }
const colorsUsed = [...used].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ hex: PAL[k].hex, count: n, key: PAL[k].key }));
const keyPixels = colorsUsed.filter((c) => c.key).reduce((s, c) => s + c.count, 0);

// Zellen
const cells = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, touch = false;
  for (let y = r * CH; y < Math.min(TH, (r + 1) * CH); y++) for (let x = c * CW; x < Math.min(TW, (c + 1) * CW); x++) {
    if (out[y][x] < 0) continue;
    n++; x0 = Math.min(x0, x - c * CW); x1 = Math.max(x1, x - c * CW); y0 = Math.min(y0, y - r * CH); y1 = Math.max(y1, y - r * CH);
  }
  const cell = { row: r + 1, col: c + 1, occupied: n > 0, pixels: n };
  if (n) {
    cell.bbox = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    cell.touchesBorder = x0 === 0 || y0 === 0 || x1 === CW - 1 || y1 === CH - 1;
    cell.centerOffset = { dx: +((x0 + x1 + 1) / 2 - CW / 2).toFixed(1), dy: +((y0 + y1 + 1) / 2 - CH / 2).toFixed(1) };
  }
  cells.push(cell);
}
// Zusammenhangskomponenten (8er) über Zellgrenzen
const comp = Array.from({ length: TH }, () => new Int32Array(TW).fill(-1));
const crossing = [];
{
  let id = 0;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    if (out[y][x] < 0 || comp[y][x] >= 0) continue;
    const st = [[x, y]]; comp[y][x] = id; const cs = new Set(); let n = 0;
    while (st.length) {
      const [cx, cy] = st.pop(); n++;
      cs.add(`${Math.floor(cy / CH) + 1}.${Math.floor(cx / CW) + 1}`);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < TW && ny < TH && out[ny][nx] >= 0 && comp[ny][nx] < 0) { comp[ny][nx] = id; st.push([nx, ny]); }
      }
    }
    if (cs.size > 1) crossing.push({ cells: [...cs], pixels: n, at: [x, y] });
    id++;
  }
}
// Konturlücken
const gaps = [];
for (const [x, y, v] of boundaryPixels()) if (v !== OUTLINE) gaps.push({ x, y, cell: `${Math.floor(y / CH) + 1}.${Math.floor(x / CW) + 1}`, hex: PAL[v].hex });
const gapsByCell = {}; for (const g of gaps) gapsByCell[g.cell] = (gapsByCell[g.cell] || 0) + 1;
const edgeFg = boundaryPixels().length;

// Art-Pixel-Größe der Quelle (aus dem je Sprite erkannten Raster; nur Warnung)
const pitches = sprites.flatMap((q) => [q.px, q.py]).sort((p, q) => p - q);
const artPx = pitches.length && pitchReliable ? pitches[pitches.length >> 1] : null;
const ratio = (SX + SY) / 2;
let gridNote = null;
if (artPx) {
  const rel = artPx / ratio;
  if (Math.abs(rel - 1) > 0.06) {
    warnings.push(`Art-Pixel der Quelle ≈ ${artPx.toFixed(1)} px, erwartet ${ratio.toFixed(2)} px (Faktor ${rel.toFixed(2)}): Die KI hat ${rel < 1 ? 'feiner' : 'gröber'} gezeichnet als das Zielraster (≈ ${(W / artPx).toFixed(0)}x${(H / artPx).toFixed(0)} Art-Pixel statt ${TW}x${TH}). Details werden beim Abbilden verschoben/verloren.`);
  }
  gridNote = { estimatedArtPixel: +artPx.toFixed(2), expected: +ratio.toFixed(2), impliedGrid: [Math.round(W / artPx), Math.round(H / artPx)] };
}
if (Math.abs(ratio - Math.round(ratio)) > 0.02) warnings.push(`Skalierungsfaktor ${ratio.toFixed(2)} ist nicht ganzzahlig (empfohlen: ganzzahliges Vielfaches, siehe Spalte „KI-Größe“).`);

const occupiedCells = cells.filter((c) => c.occupied);
if (mergedSplit.length) warnings.push(`Verschmolzene Sprites (Zellen ${mergedSplit.join(', ')}) an der schmalsten Stelle nahe der Zellgrenze getrennt.`);
const rowCounts = Array.from({ length: ROWS }, (_, r) => cells.filter((c) => c.row === r + 1 && c.occupied).length);
if (args.expect) {
  const exp = args.expect.split(',').map(Number);
  rowCounts.forEach((n, r) => { if (exp[r] !== undefined && exp[r] !== n) warnings.push(`Zeile ${r + 1}: ${n} belegte Zellen, erwartet ${exp[r]}.`); });
}
if (crossing.length) warnings.push(`${crossing.length} Sprite(s) überschreiten eine Zellgrenze: ${crossing.map((c) => c.cells.join('+')).join(', ')}.`);
const touching = occupiedCells.filter((c) => c.touchesBorder);
if (touching.length) warnings.push(`Sprites berühren den Zellrand: ${touching.map((c) => `${c.row}.${c.col}`).join(', ')}.`);
const offCenter = occupiedCells.filter((c) => Math.abs(c.centerOffset.dx) > 1 || Math.abs(c.centerOffset.dy) > 1);
if (offCenter.length) warnings.push(`Nicht zentriert (>1 px): ${offCenter.map((c) => `${c.row}.${c.col}(${c.centerOffset.dx},${c.centerOffset.dy})`).join(', ')}.`);
if (gaps.length) warnings.push(`${gaps.length} Randpixel ohne Kontur-Schwarz (Konturlücken): ${Object.entries(gapsByCell).map(([k, v]) => `${k}:${v}`).join(', ')}.`);
const hasCyanPal = colorsUsed.some((c) => c.hex === '#2ef2ff'), hasKeyCyan = colorsUsed.some((c) => c.hex === '#00ffff');
if (hasCyanPal && !hasKeyCyan) warnings.push('Palette-Cyan #2ef2ff kommt vor, Schlüssel-Cyan #00ffff nicht. Hat das Sheet RGB-Lichter (z. B. S05, Zeile 2)? Die KI malt meist #2ef2ff statt #00ffff -> --remap 2ef2ff=00ffff@<Zeile> setzen.');
if (keyPixels && !args.keys && !remapSpecs.length) warnings.push('Schlüsselfarben vorhanden, obwohl --keys nicht gesetzt ist.');
{
  let low = 0; for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (out[y][x] >= 0 && conf[y][x] < 0.6) low++;
  lowConf = low;
}

const report = {
  input: inPath, output: outPath, preview: prevPath,
  source: { width: W, height: H, factor: { x: +SX.toFixed(3), y: +SY.toFixed(3) }, background: bgMode, bgTolerance: BG_TOL },
  target: { width: TW, height: TH, cell: [CW, CH], grid: [COLS, ROWS] },
  params: { fringe: FRINGE, mode: MODE, phase: [phaseX, phaseY], core: CORE, outlineWeight: W_OUT, edgeWeight: W_EDGE, bgThreshold: BG_THR, keys: !!args.keys, despeckle: DESPECKLE, fixOutline: !!args['fix-outline'] },
  source_stats: {
    foregroundPixels: rawFg, backgroundPixels: W * H - rawFg,
    exactOnPaletteShare: rawFg ? +(rawExact / rawFg).toFixed(4) : 0,
    meanRoundingError_oklab: rawFg ? +(errSum / rawFg).toFixed(4) : 0,
  },
  result: {
    opaquePixels: opaque, transparentPixels: TW * TH - opaque,
    onPaletteShare: 1, keyColorPixels: keyPixels,
    colorsUsed: colorsUsed.length, colors: colorsUsed,
    lowConfidencePixels: lowConf, speckleRemoved: speckles, pruned, fringeSourcePx: fringePx, sourceSpecksRemoved: srcSpecks, outlineFixed: fixedOutline, remapped, remap: remapSpecs.map((r) => r.text),
  },
  cells: { occupiedPerRow: rowCounts, occupied: occupiedCells.length, empty: cells.length - occupiedCells.length, list: cells },
  crossingSprites: crossing,
  touchingCellBorder: touching.map((c) => `${c.row}.${c.col}`),
  outlineGaps: { count: gaps.length, ofBoundaryPixels: edgeFg, byCell: gapsByCell, pixels: gaps },
  artPixelEstimate: gridNote,
  warnings,
};
fs.mkdirSync(path.dirname(repPath), { recursive: true });
fs.writeFileSync(repPath, JSON.stringify(report, null, 2));

if (!args.quiet) {
  const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + ' %' : '–');
  console.log(`clean-sheet: ${path.relative(process.cwd(), inPath)}  ${W}x${H} -> ${TW}x${TH} (Faktor ${SX.toFixed(2)}x${SY.toFixed(2)}), Zellen ${CW}x${CH}, ${COLS}x${ROWS}`);
  console.log(`Modus: ${MODE}${MODE === 'resample' ? ` (Rasterversatz ${phaseX},${phaseY} px)` : ' (Art-Pixel-Raster je Sprite)'}`);
  console.log(`Hintergrund: ${bgMode}${bgMode === 'auto' ? ` (Rand-Referenz OKLab L=${bgRef[0].toFixed(2)})` : ''}, Quelle: ${pct(W * H - rawFg, W * H)} Hintergrund`);
  console.log(`Quelle exakt auf Palette: ${pct(rawExact, rawFg)} · mittlerer Rundungsfehler ΔOKLab ${(errSum / Math.max(1, rawFg)).toFixed(3)}`);
  console.log(`Ergebnis: ${opaque} deckende Pixel, ${colorsUsed.length} Farben, 100 % auf Palette${args.keys ? ` (davon ${keyPixels} px Schlüsselfarben)` : ''}, unsichere Pixel (<60 % Stimmen): ${lowConf} (${pct(lowConf, opaque)})`);
  console.log('Farben: ' + colorsUsed.map((c) => `${c.hex}×${c.count}`).join(' '));
  console.log(`Zellen: ${occupiedCells.length} belegt, ${cells.length - occupiedCells.length} leer · je Zeile belegt: ${rowCounts.join(',')}`);
  console.log('Belegt: ' + occupiedCells.map((c) => `${c.row}.${c.col}[${c.bbox.w}x${c.bbox.h}]`).join(' '));
  console.log(`Konturlücken: ${gaps.length} von ${edgeFg} Randpixeln${gaps.length ? ' (' + Object.entries(gapsByCell).map(([k, v]) => `${k}:${v}`).join(' ') + ')' : ''}${fixedOutline ? `, ${fixedOutline} per --fix-outline korrigiert` : ''}`);
  console.log(`Verwaiste Pixel entfernt: ${speckles}, Halo-Spitzen entfernt: ${pruned}${remapped ? ` · per --remap umgefärbt: ${remapped}` : ''}`);
  if (gridNote) console.log(`Art-Pixel Quelle ≈ ${gridNote.estimatedArtPixel} px (erwartet ${gridNote.expected}), ≈ ${gridNote.impliedGrid.join('x')} Art-Pixel`);
  for (const w of warnings) console.log('WARNUNG: ' + w);
  console.log(`-> ${path.relative(process.cwd(), outPath)}\n-> ${path.relative(process.cwd(), prevPath)}\n-> ${path.relative(process.cwd(), repPath)}`);
}
