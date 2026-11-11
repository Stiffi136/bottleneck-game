// manifest.mjs – schreibt assets/hd/manifest.json (alle Sheets mit Dateien, Frame-Anzahl, Warnungen, Status)
import fs from 'node:fs';
import path from 'node:path';
import { readSheetNames } from './hd.mjs';

export async function writeManifest({ ROOT, CONFIG, NOTES = {}, REVIEW = {}, DECISIONS = {} }) {
  const HD = path.join(ROOT, 'assets/hd'), PREV = path.join(ROOT, 'assets/preview'), RES = path.join(ROOT, 'assets/work/results');
  const doc = path.join(ROOT, 'docs/asset-sheets.md');
  const sheets = [];
  let totalBytes = 0;
  for (const cfg of CONFIG) {
    const kind = cfg.kind || 'sheet';
    const webp = path.join(HD, `${cfg.name}.webp`), json = path.join(HD, `${cfg.name}.json`);
    const resFile = path.join(RES, `${cfg.id}.json`);
    const res = fs.existsSync(resFile) ? JSON.parse(fs.readFileSync(resFile, 'utf8')) : null;
    const entry = { id: cfg.id, name: cfg.name, kind, group: cfg.group, raw: cfg.raw, target: { w: cfg.size[0], h: cfg.size[1] }, cell: cfg.cell ? { w: cfg.cell[0], h: cfg.cell[1] } : null };
    const warnings = [], info = [];
    if (!fs.existsSync(webp) || !fs.existsSync(json)) {
      entry.status = 'problem'; entry.warnings = ['Ausgabedateien fehlen (Build-Fehler?)']; sheets.push(entry); continue;
    }
    const j = JSON.parse(fs.readFileSync(json, 'utf8'));
    const bytes = fs.statSync(webp).size + fs.statSync(json).size; totalBytes += bytes;
    entry.files = { webp: `${cfg.name}.webp`, json: `${cfg.name}.json`, previewDark: `../preview/${cfg.name}_hd_dark.png`, bytes };
    entry.atlas = j.meta.size; entry.frameSize = j.meta.frame || j.meta.size;
    entry.frames = Object.keys(j.frames).length;
    entry.animations = Object.fromEntries(Object.entries(j.animations || {}).map(([k, v]) => [k, v.length]));
    entry.meta = { hdScale: j.meta.hdScale, scaleMode: j.meta.scaleMode, kind: j.meta.kind };
    if (res) {
      entry.rawSize = res.rawSize;
      if (res.gridLines) entry.gridLinesRemoved = res.gridLines.length;
      for (const w of res.warnings || []) warnings.push(w);
      if (res.info) entry.info = res.info;
    }
    // ---- Seitenverhältnis Rohbild gegen Ziel
    if (res && res.rawSize && kind !== 'overlay') {
      const rr = res.rawSize[0] / res.rawSize[1], tr = cfg.size[0] / cfg.size[1], dev = rr / tr - 1;
      entry.aspect = { raw: +rr.toFixed(3), target: +tr.toFixed(3), deviationPct: +(dev * 100).toFixed(1) };
      if (kind === 'sheet' && Math.abs(dev) > 0.03) warnings.push(`Seitenverhältnis Rohbild ${res.rawSize.join('×')} (${rr.toFixed(2)}) ≠ Ziel ${cfg.size.join('×')} (${tr.toFixed(2)}), Abweichung ${(dev * 100).toFixed(0)} %: Zellen/Sprites sind in der Quelle anders proportioniert als vorgesehen.`);
    }
    if (kind === 'sheet' || kind === 'gpu') {
      // ---- belegte Zellen gegen Belegungstabelle
      const exp = readSheetNames(doc, cfg.id).cells; const want = [...exp.values()], have = Object.keys(j.frames);
      const missing = want.filter((n) => !have.includes(n)), extra = have.filter((n) => !want.includes(n));
      entry.expectedFrames = want.length;
      if (missing.length) warnings.push(`Laut Tabelle erwartet, aber leer: ${missing.join(', ')}.`);
      if (extra.length) warnings.push(`Belegte Zellen ohne Namen in der Tabelle: ${extra.join(', ')}.`);
      // ---- zu große Sprites (Maßstab verkleinert), Animationsanker
      const fr = Object.entries(j.frames);
      const reduced = [...new Set(fr.filter(([, f]) => f.scaleReduced && f.scale / j.meta.baseScale < 0.97).map(([n, f]) => `${f.group || n} (${(f.scale / j.meta.baseScale).toFixed(2)}×)`))];
      entry.reducedSprites = reduced;
      if (reduced.length) warnings.push(`Sprites größer als ihr Frame, für die Zelle verkleinert: ${reduced.join(', ')}.`);
      const weak = cfg.group === 'fx' ? [] : fr.filter(([, f]) => f.registration && f.registration.iou < 0.7).map(([n, f]) => `${n} (IoU ${f.registration.iou})`);
      if (weak.length) warnings.push(`Animations-Anker unsicher (Silhouette weicht stark ab, nicht ausgerichtet): ${weak.join(', ')}.`);
      const shifted = fr.filter(([, f]) => f.registration && (Math.abs(f.registration.dx) > 0 || Math.abs(f.registration.dy) > 0) && f.registration.iou >= 0.8).length;
      if (shifted) info.push(`${shifted} Animationsframes per Silhouette feinjustiert.`);
      const clipped = fr.filter(([, f]) => f.rawClippedAt).map(([n, f]) => `${n} (${f.rawClippedAt.join('/')})`);
      if (clipped.length) warnings.push(`Im Rohbild am Bildrand abgeschnitten (Sprite berührt den Rand der Quelle): ${clipped.join(', ')}.`);
      const over = fr.filter(([, f]) => f.rawOverflowCell).map(([n, f]) => `${n} (${f.rawOverflowCell.join('/')})`);
      if (over.length) warnings.push(`Sprite ragt in der Quelle über seine Zellgrenze (nicht zentriert/zu groß): ${over.join(', ')}.`);
      // ---- Sprites nahe/an Frame-Rand
      const tight = fr.filter(([, f]) => f.contentBBox && (f.contentBBox.x < 2 || f.contentBBox.y < 2 || f.contentBBox.x + f.contentBBox.w > f.frame.w - 2 || f.contentBBox.y + f.contentBBox.h > f.frame.h - 2)).map(([n]) => n);
      if (tight.length && tight.length <= 40) entry.touchingFrameEdge = tight;
    }
    entry.warnings = [...new Set(warnings)]; entry.info = { ...(entry.info || {}), notes: info };
    // ---- automatische Einstufung
    const hardRe = /erwartet, aber leer|Seitenverhältnis Rohbild|nicht nahtlos|keine Kachel|Seitenverhältnis des Inhalts|Seitenverhältnis der Quelle|unsicher/;
    entry.status = entry.warnings.length === 0 ? 'ok' : entry.warnings.some((w) => hardRe.test(w)) ? 'problem' : 'mängel';
    const rv = REVIEW[cfg.id];
    if (rv) { entry.autoStatus = entry.status; entry.status = rv.status; entry.review = rv.note; }
    if (NOTES[cfg.id]) entry.note = NOTES[cfg.id];
    sheets.push(entry);
  }
  const manifest = {
    generated: new Date().toISOString(), tool: 'tools/build-all.mjs',
    totals: { sheets: sheets.filter((s) => s.kind === 'sheet' || s.kind === 'tiles').length, singles: sheets.filter((s) => !['sheet', 'tiles'].includes(s.kind)).length, frames: sheets.reduce((n, s) => n + (s.frames || 0), 0), hdBytes: 0 },
    decisions: DECISIONS, sheets,
  };
  const mp = path.join(HD, 'manifest.json');
  fs.writeFileSync(mp, JSON.stringify(manifest, null, 2));
  manifest.totals.hdBytes = dirSize(HD);
  fs.writeFileSync(mp, JSON.stringify(manifest, null, 2));
  return manifest;
}
function dirSize(d) { let n = 0; for (const f of fs.readdirSync(d)) { const p = path.join(d, f), st = fs.statSync(p); n += st.isDirectory() ? dirSize(p) : st.size; } return n; }
