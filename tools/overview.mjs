// overview.mjs – Kontaktbögen (PNG, dunkler Grund #1a1a2e, max. 2000 px breit) je Gruppe aus den dunklen HD-Vorschauen.
// Jedes Sheet bekommt eine Beschriftung (ID, Name, Atlasgröße, Status). Ausgabe: assets/preview/overview/<gruppe>.png
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BG = { r: 0x1a, g: 0x1a, b: 0x2e, alpha: 1 };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const COL = { ok: '#7be08a', mängel: '#ffd23f', problem: '#ff6a5a' };

export async function makeOverviews({ ROOT, CONFIG, GROUPS, manifest, width = 2000, gutter = 20, labelH = 30, maxH = 1000, maxHSingle = 620 }) {
  const outDir = path.join(ROOT, 'assets/preview/overview');
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.rmSync(path.join(outDir, f));
  const files = [];
  const byId = new Map(manifest.sheets.map((s) => [s.id, s]));
  for (const [gid, gtitle] of GROUPS) {
    const items = [];
    for (const cfg of CONFIG.filter((c) => c.group === gid)) {
      const m = byId.get(cfg.id); if (!m || !m.files) continue;
      const p = path.join(ROOT, 'assets/preview', `${cfg.name}_hd_dark.png`); if (!fs.existsSync(p)) continue;
      const meta = await sharp(p).metadata();
      // Darstellungsgröße: kleine Sheets vergrößern (mind. 560 px breit), große auf die Bogenbreite / maxH verkleinern
      let s = Math.max(1, 560 / meta.width); s = Math.min(s, (width - 2 * gutter) / meta.width, (gid === 'single' ? maxHSingle : maxH) / meta.height, 4);
      const w = Math.max(1, Math.round(meta.width * s)), h = Math.max(1, Math.round(meta.height * s));
      const buf = await sharp(p).resize(w, h, { kernel: s >= 1 ? 'nearest' : 'lanczos3' }).png().toBuffer();
      const lab = `${cfg.id}  ${cfg.name}  ·  ${meta.width}×${meta.height}  ·  ${m.frames} Frames`;
      items.push({ id: cfg.id, w, h, buf, lab, status: m.status, note: m.review || (m.warnings && m.warnings[0]) || '' });
    }
    // Regalpackung (Shelf): Zeilenweise füllen
    const rows = []; let cur = [], x = gutter;
    for (const it of items) {
      if (cur.length && x + it.w + gutter > width) { rows.push(cur); cur = []; x = gutter; }
      cur.push(it); x += it.w + gutter;
    }
    if (cur.length) rows.push(cur);
    let y = gutter + 44; const comps = []; const texts = [];
    texts.push(`<text x="${gutter}" y="34" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="bold" fill="#e8e8f4">${esc(gtitle)}</text>`);
    for (const row of rows) {
      let xx = gutter; const rh = Math.max(...row.map((i) => i.h));
      for (const it of row) {
        const lw = Math.max(it.w, 360);
        texts.push(`<text x="${xx + 20}" y="${y + 20}" font-family="DejaVu Sans, sans-serif" font-size="17" fill="#cfd0e0">${esc(it.lab)}</text>`);
        texts.push(`<circle cx="${xx + 8}" cy="${y + 14}" r="7" fill="${COL[it.status] || '#888'}"/>`);
        comps.push({ input: it.buf, left: xx, top: y + labelH });
        xx += Math.max(it.w, 0) + gutter; void lw;
      }
      y += labelH + rh + gutter;
    }
    const H = y;
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}">${texts.join('')}</svg>`);
    const outP = path.join(outDir, `${String(GROUPS.findIndex((g) => g[0] === gid) + 1).padStart(2, '0')}_${gid}.png`);
    await sharp({ create: { width, height: H, channels: 4, background: BG } }).composite([...comps, { input: svg, left: 0, top: 0 }]).png({ compressionLevel: 8 }).toFile(outP);
    files.push(outP);
  }
  return files;
}
