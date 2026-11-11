#!/usr/bin/env node
// check-names.mjs – Prüfskript: Jeder Sprite-Name aus den Belegungstabellen (MVP S01–S35 plus die Einzelbilder E01–E10, ohne Schriften)
// muss genau einmal in den JSONs unter assets/hd/ vorkommen. Gibt fehlende und doppelte Namen aus (Exit-Code 2 bei Fehlern).
//   node tools/check-names.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheetNames } from './hd.mjs';

export function checkNames({ ROOT, print = true } = {}) {
  ROOT = ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const doc = path.join(ROOT, 'docs/asset-sheets.md'), HD = path.join(ROOT, 'assets/hd');
  const text = fs.readFileSync(doc, 'utf8');
  // erwartete Namen: je Sheet aus der Belegungstabelle; Einzelbilder E01–E10: Dateiname ohne .png (Abschnitt 4)
  const expected = new Map(); // name -> Quelle
  const baseSprites = []; let frames = 0;
  for (let i = 1; i <= 35; i++) {
    const id = 'S' + String(i).padStart(2, '0');
    const r = readSheetNames(doc, id);
    const inGroup = new Set(r.groups.flatMap((g) => g.cols.map((c) => `${g.row},${c}`)));
    for (const [k, n] of r.cells) { expected.set(n, id); frames++; if (!inGroup.has(k)) baseSprites.push(n); }
    for (const g of r.groups) baseSprites.push(g.base);
  }
  const singles = [...text.matchAll(/^### (E\d\d) · `([^`]+)\.png`/gm)].map((m) => [m[1], m[2]]);
  for (const [id, n] of singles) { expected.set(n, id); frames++; baseSprites.push(n); }
  // vorhandene Namen aus den JSONs
  const found = new Map(); // name -> [json]
  for (const f of fs.readdirSync(HD).filter((f) => f.endsWith('.json') && f !== 'manifest.json')) {
    const j = JSON.parse(fs.readFileSync(path.join(HD, f), 'utf8'));
    for (const n of Object.keys(j.frames || {})) { if (!found.has(n)) found.set(n, []); found.get(n).push(f); }
  }
  const missing = [...expected].filter(([n]) => !found.has(n)).map(([n, s]) => `${n} (${s})`);
  const duplicate = [...found].filter(([n, a]) => a.length > 1).map(([n, a]) => `${n}: ${a.join(', ')}`);
  const unknown = [...found].filter(([n]) => !expected.has(n)).map(([n, a]) => `${n} (${a[0]})`);
  const ok = !missing.length && !duplicate.length;
  if (print) {
    console.log(`Namensprüfung: ${expected.size} erwartete Frame-Namen (${baseSprites.length} Sprites ohne Frames gezählt, davon ${singles.length} Einzelbilder; ${frames} Frames) · gefunden: ${found.size}`);
    console.log(`  fehlend: ${missing.length}${missing.length ? '\n    ' + missing.join('\n    ') : ''}`);
    console.log(`  doppelt: ${duplicate.length}${duplicate.length ? '\n    ' + duplicate.join('\n    ') : ''}`);
    console.log(`  unbekannt (nicht in Tabelle, z. B. r<Z>c<S>): ${unknown.length}${unknown.length ? '\n    ' + unknown.join(', ') : ''}`);
    console.log(ok ? '  -> OK: jeder Name genau einmal' : '  -> FEHLER');
  }
  return { ok, expected: expected.size, sprites: baseSprites.length, frames, found: found.size, missing, duplicate, unknown };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const r = checkNames(); process.exitCode = r.ok ? 0 : 2; }
