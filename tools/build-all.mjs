#!/usr/bin/env node
// build-all.mjs – erzeugt ALLE HD-Assets aus den KI-Rohbildern in einem Aufruf (wiederholbar, idempotent).
//   node tools/build-all.mjs                 alles neu bauen (parallel), dann Manifest, Prüfskript, Übersichts-Kontaktbögen
//   node tools/build-all.mjs --only S16,E01  nur diese IDs (Manifest/Übersicht werden mit den vorhandenen Ergebnissen ergänzt)
//   node tools/build-all.mjs --jobs 8        Anzahl paralleler Prozesse [8]
//   node tools/build-all.mjs --no-overview   Kontaktbögen weglassen
// Ausgaben: assets/hd/<name>.webp + .json, assets/hd/manifest.json, assets/preview/<name>_hd_dark.png, assets/preview/overview/*.png
// Die Sheet-Tabelle (Namen, Zielgröße, Zelle) kommt aus docs/asset-sheets.md (nur gelesen) bzw. aus der Konfiguration unten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RAW = path.join(ROOT, 'assets/raw'), HD = path.join(ROOT, 'assets/hd'), PREV = path.join(ROOT, 'assets/preview'), WORK = path.join(ROOT, 'assets/work');

// ============================================================================ Konfigurationstabelle
// raw:    Rohdatei in assets/raw (Array = Hälften, werden mit tools/stack.mjs untereinander gestapelt)
// id:     Sheet-ID in docs/asset-sheets.md (Namen/Gruppen kommen von dort)
// name:   Ausgabename (assets/hd/<name>.webp/.json)
// size:   Zielgröße in Art-Pixeln, cell: Zellgröße (HD-Frame = Zelle × 4)
// kind:   sheet (Standard: Hintergrund weg, Sprites je Zelle) | tiles (S29) | object (E01–E05) | overlay (E06) | background (E07–E10, ×2)
// hd:     zusätzliche Optionen für hd.mjs (z. B. holes, scaleMode:'fit', bg, bgTol, noLines)
// group:  Kontaktbogen (ui, icons, cards, hardware, board, fx, single)
export const CONFIG = [
  { id: 'S01', raw: 's01.png', name: 'sheet_ui_panels_24', size: [96, 120], cell: [24, 24], group: 'ui' },
  { id: 'S02', raw: 's02.png', name: 'sheet_ui_small_32x16', size: [128, 48], cell: [32, 16], group: 'ui', hd: { scaleMode: 'fit' } },
  { id: 'S03', raw: 's03.png', name: 'sheet_ui_bars_160x12', size: [160, 108], cell: [160, 12], group: 'ui' },
  { id: 'S04', raw: 's04.png', name: 'sheet_ui_boxes_56x24', size: [168, 72], cell: [56, 24], group: 'ui', hd: { scaleMode: 'fit' } },
  { id: 'S05', raw: ['s05a.png', 's05b.png'], name: 'sheet_tall_16x96', size: [128, 192], cell: [16, 96], group: 'ui' },
  { id: 'S06', raw: 's06.png', name: 'sheet_ui_slots_40x40', size: [240, 80], cell: [40, 40], group: 'ui' },
  { id: 'S07', raw: 's07.png', name: 'sheet_icons16_werte_16', size: [96, 64], cell: [16, 16], group: 'icons' },
  { id: 'S08', raw: 's08.png', name: 'sheet_icons16_menue_16', size: [96, 48], cell: [16, 16], group: 'icons' },
  { id: 'S09', raw: 's09.png', name: 'sheet_icons8_static_8', size: [40, 32], cell: [8, 8], group: 'icons' },
  { id: 'S10', raw: 's10.png', name: 'sheet_card_frames_48x64', size: [192, 192], cell: [48, 64], group: 'cards', hd: { keyCells: '2,2' } },
  { id: 'S11', raw: 's11.png', name: 'sheet_card_overlays_48x64', size: [192, 256], cell: [48, 64], group: 'cards', hd: { holes: true, keyCells: '3,0' } },
  { id: 'S12', raw: 's12.png', name: 'sheet_card_anim_52x68', size: [312, 204], cell: [52, 68], group: 'cards', hd: { holes: true } },
  { id: 'S13', raw: 's13.png', name: 'sheet_booster_40x56', size: [160, 56], cell: [40, 56], group: 'cards' },
  { id: 'S14', raw: 's14.png', name: 'sheet_misc_32', size: [96, 64], cell: [32, 32], group: 'cards' },
  { id: 'S15', raw: 's15.png', name: 'sheet_bench_boss_32', size: [192, 64], cell: [32, 32], group: 'cards' },
  // S16: s16v2.png gewählt (Begründung: DECISIONS unten bzw. manifest.json -> decisions)
  { id: 'S16', raw: 's16v2.png', name: 'sheet_hw_mb_cpu_32', size: [192, 96], cell: [32, 32], group: 'hardware' },
  { id: 'S17', raw: 's17.png', name: 'sheet_hw_gpu_ram_32', size: [192, 64], cell: [32, 32], group: 'hardware' },
  { id: 'S18', raw: 's18.png', name: 'sheet_hw_storage_psu_32', size: [192, 96], cell: [32, 32], group: 'hardware' },
  { id: 'S19', raw: 's19.png', name: 'sheet_hw_cooling_case_32', size: [160, 64], cell: [32, 32], group: 'hardware' },
  { id: 'S20', raw: 's20.png', name: 'sheet_icons32_treiber_werkzeug_32', size: [192, 96], cell: [32, 32], group: 'icons' },
  { id: 'S21', raw: 's21.png', name: 'sheet_icons32_software_32', size: [160, 96], cell: [32, 32], group: 'icons' },
  { id: 'S22', raw: 's22.png', name: 'sheet_board_parts_32x44', size: [96, 132], cell: [32, 44], group: 'board' },
  { id: 'S23', raw: 's23.png', name: 'sheet_board_slots_flat_64x16', size: [128, 64], cell: [64, 16], group: 'board' },
  { id: 'S24', raw: 's24.png', name: 'sheet_parts_flat_64x28', size: [128, 112], cell: [64, 28], group: 'board' },
  { id: 'S25', raw: 's25.png', name: 'sheet_cooler_anim_60x52', size: [240, 156], cell: [60, 52], group: 'board' },
  { id: 'S26', raw: 's26.png', name: 'sheet_aio_fan_32', size: [128, 96], cell: [32, 32], group: 'board' },
  { id: 'S27', raw: ['s27_s.png', 's27_m.png', 's27_l.png'], name: 'sheet_gpu_216x40', size: [220, 60], cell: [220, 20], group: 'board', kind: 'gpu' },
  { id: 'S28', raw: 's28.png', name: 'sheet_psu_radiator_96x40', size: [288, 80], cell: [96, 40], group: 'board', hd: { scaleMode: 'fit' } },
  // S29: deckende, kachelbare Kacheln (kein Hintergrund-Entfernen); die dritte (BIOS) ist laut Tabelle nur 16×16 und mittig
  { id: 'S29', raw: 's29.png', name: 'sheet_bg_tiles_64', size: [192, 64], cell: [64, 64], group: 'fx', kind: 'tiles',
    tiles: [{ name: 'bg_tile_pcb', fill: true }, { name: 'bg_tile_esd', fill: true }, { name: 'bg_tile_bios', fill: false, artSize: 16 }] },
  { id: 'S30', raw: 's30.png', name: 'sheet_logo_192x48', size: [768, 48], cell: [192, 48], group: 'fx', hd: { scaleMode: 'fit' } },
  { id: 'S31', raw: 's31.png', name: 'sheet_fx8_8', size: [64, 32], cell: [8, 8], group: 'fx', hd: { holes: true } },
  { id: 'S32', raw: 's32.png', name: 'sheet_fx16_16', size: [96, 48], cell: [16, 16], group: 'fx' },
  { id: 'S33', raw: 's33.png', name: 'sheet_fx_tall_16x32', size: [128, 96], cell: [16, 32], group: 'fx' },
  { id: 'S34', raw: 's34.png', name: 'sheet_fx32_32', size: [160, 96], cell: [32, 32], group: 'fx', hd: { holes: true, opaqueCells: '2,0;2,1;2,2;2,3' } },
  { id: 'S35', raw: 's35.png', name: 'sheet_fx_pack_open_64', size: [384, 64], cell: [64, 64], group: 'fx', hd: { scaleMode: 'fit' } },
  // Einzelbilder
  { id: 'E01', raw: 'e01.png', name: 'mb_pcb_matx', size: [160, 160], kind: 'object', group: 'single' },
  { id: 'E02', raw: 'e02.png', name: 'mb_pcb_atx', size: [160, 200], kind: 'object', group: 'single' },
  { id: 'E03', raw: 'e03.png', name: 'case_office', size: [240, 300], kind: 'object', group: 'single' },
  { id: 'E04', raw: 'e04.png', name: 'case_mesh', size: [260, 320], kind: 'object', group: 'single' },
  { id: 'E05', raw: 'e05.png', name: 'case_glass', size: [260, 320], kind: 'object', group: 'single' },
  { id: 'E06', raw: 'e06.png', name: 'case_glass_reflex', size: [260, 320], kind: 'overlay', group: 'single' },
  { id: 'E07', raw: 'e07.png', name: 'bg_shop_portrait', size: [400, 900], kind: 'background', group: 'single' },
  { id: 'E08', raw: 'e08.png', name: 'bg_shop_landscape', size: [800, 400], kind: 'background', group: 'single' },
  { id: 'E09', raw: 'e09.png', name: 'bg_title_portrait', size: [400, 900], kind: 'background', group: 'single' },
  { id: 'E10', raw: 'e10.png', name: 'bg_title_landscape', size: [800, 400], kind: 'background', group: 'single' },
];
export const GROUPS = [
  ['ui', 'UI'], ['icons', 'Icons'], ['cards', 'Karten, Booster, Bosse'], ['hardware', 'Hardware'],
  ['board', 'Board und Einbau'], ['fx', 'Effekte, Kacheln, Logo'], ['single', 'Einzelbilder'],
];
// Entscheidungen / Prüfhinweise, die ins Manifest gehen (von Hand nach Sichtprüfung gepflegt)
export const NOTES = {
  S10: 'Karten-Schatten (r3c3, Dither-Punkte): graue Zwischenräume per --key-cells transparent.',
  S11: 'Innenflächen der Rahmen per --holes transparent; Debuff-Raster (r4c1) per --key-cells.',
  S12: 'Innenflächen der Rahmen per --holes transparent. Highlight-Frames pulsieren (Silhouette ändert sich, kein Anker-Fehler).',
  S16: 's16v2.png statt s16.png (siehe decisions).',
  S27: 'Eigene Pipeline tools/gpu.mjs: 3 Rohbilder (s27_s/m/l.png), Zusammenhangskomponenten, jede Karte auf Zielbreite ×4 skaliert (kein Einpassen in die Zellhöhe), Frames links/unten ausgerichtet. Zellhöhe größer als in der Tabelle (siehe JSON meta.cell).',
  S29: 'Kein Hintergrund-Entfernen für Kachel 1/2; Kachel 3 (BIOS) als 16×16 mittig. Kachel-Test: assets/preview/sheet_bg_tiles_64_tiletest.png.',
  S30: 'scale-mode fit: Logo füllt die Frame-Höhe, Frames sind 768×192 (4:1) wie in der Tabelle, Logo selbst ist ~1,4:1.',
  S31: 'Slot-Glow (Ringe): Innenfläche per --holes transparent.',
  S34: 'fx_glitch_noise: deckende Vollflächen-Frames (--opaque-cells), kein Hintergrund-Entfernen; Klick-Ringe per --holes.',
  E06: 'Overlay: weiß #f4f4fa, Alpha aus der Helligkeit über Grau ~126 (Grau → 0, Streifen → 1), Vollbild ohne Zuschnitt, verlustfreies WebP; Engine multipliziert mit 0,5.',
};
// Sichtprüfung (Status ok | mängel | problem + Stichwort); überschreibt die automatische Einstufung im Manifest
export const REVIEW = {
  S01: { status: 'ok', note: 'sauber' },
  S02: { status: 'mängel', note: 'Quelle 3:1 statt 2,67:1 (Sprites anders proportioniert, einheitlicher Maßstab); lesbar' },
  S03: { status: 'ok', note: 'Balken sauber; Rahmen/Füllung ragen minimal über die Zelle' },
  S04: { status: 'mängel', note: 'Quelle 3:1 statt 2,33:1 (Boxen ~29 % anders proportioniert); lesbar' },
  S05: { status: 'ok', note: 'zwei Hälften gestapelt, 15/15 Zellen' },
  S06: { status: 'ok', note: 'sauber' },
  S07: { status: 'ok', note: 'sauber' },
  S08: { status: 'ok', note: 'sauber' },
  S09: { status: 'ok', note: 'sauber' },
  S10: { status: 'ok', note: 'Schatten-Dither jetzt transparent' },
  S11: { status: 'mängel', note: 'Flammen (uebertaktet) oben am Rohbild-Rand abgeschnitten' },
  S12: { status: 'ok', note: 'Rahmen innen transparent, Highlight pulsiert' },
  S13: { status: 'ok', note: 'sauber' },
  S14: { status: 'ok', note: 'Vollflächen-Art, sauber' },
  S15: { status: 'ok', note: 'sauber' },
  S16: { status: 'ok', note: 's16v2' },
  S17: { status: 'ok', note: 'sauber' },
  S18: { status: 'ok', note: 'Kabel von psu_1 ragen seitlich über die Zelle' },
  S19: { status: 'ok', note: 'sauber' },
  S20: { status: 'ok', note: 'sauber' },
  S21: { status: 'ok', note: 'sauber' },
  S22: { status: 'mängel', note: 'Quelle 0,78 statt 0,73 (7 %); Teile sauber' },
  S23: { status: 'ok', note: 'sauber' },
  S24: { status: 'ok', note: 'sauber' },
  S25: { status: 'ok', note: 'Tower-Kühler ragt oben leicht über die Zelle' },
  S26: { status: 'ok', note: 'sauber' },
  S27: { status: 'ok', note: 'Neu aus s27_s/m/l.png (2026): Karten auf Zielbreite, dicker als spezifiziert (M 176×37,8, L 216×58), Frames links/unten ausgerichtet; Lüfterdrehung kaum erkennbar' },
  S28: { status: 'mängel', note: 'Quelle 3:1 statt 3,6:1; Teile sauber, Proportionen abweichend' },
  S29: { status: 'mängel', note: 'PCB- und BIOS-Kachel nicht nahtlos (Leiterbahnen/Gitterlinien an den Kanten)' },
  S30: { status: 'mängel', note: 'Logo ~1,4:1 statt 4:1; Glanz-Frames ausgerichtet, nutzbar' },
  S31: { status: 'ok', note: 'sauber (Trennlinien entfernt)' },
  S32: { status: 'ok', note: 'sauber (Trennlinien entfernt)' },
  S33: { status: 'ok', note: 'sauber (Trennlinien entfernt)' },
  S34: { status: 'ok', note: 'Rausch-Frames deckend, Klick-Ringe transparent' },
  S35: { status: 'mängel', note: 'Quelle 3:1 statt 6:1; Lichtstrahlen in Frame 5 oben im Rohbild abgeschnitten' },
  E01: { status: 'ok', note: 'füllt das Bild randlos (1254² ≙ 160²), kein Hintergrund' },
  E02: { status: 'ok', note: 'randlos, ×4 = 640×800' },
  E03: { status: 'ok', note: 'Hintergrund (Ecken/Füße) entfernt' },
  E04: { status: 'ok', note: 'Hintergrund entfernt' },
  E05: { status: 'ok', note: 'Hintergrund entfernt' },
  E06: { status: 'ok', note: 'Overlay mit Alpha aus Helligkeit' },
  E07: { status: 'ok', note: 'WebP ×2' },
  E08: { status: 'ok', note: 'WebP ×2' },
  E09: { status: 'ok', note: 'WebP ×2' },
  E10: { status: 'ok', note: 'WebP ×2' },
};
export const DECISIONS = {
  S16: {
    chosen: 's16v2.png', rejected: 's16.png',
    reason: 'Beide 1774×887, 12/12 Zellen, gleiche Struktur. v2 ist besser lesbar und näher an der Tabelle: CPU 1→5 steigert den Glanz sichtbar (v1: C1 und C2 fast gleich), C5 hat goldene Pins, C9 hat ein klares rotes Cache-Stapel-Symbol (v1: graues, schwer lesbares Symbol), Mainboards mit kräftigeren Details und blauen DIMM-Slots. Sprite-Größen 26–28 px (v1 24–26) passen zu S17–S19 (27–30 px).',
  },
};

const rel = (p) => path.relative(ROOT, p);
const dims = (s, name) => { const m = /^(\d+)x(\d+)$/.exec(s || ''); if (!m) throw new Error(`--${name} WxH ungültig`); return [+m[1], +m[2]]; };

// ============================================================================ Einzel-Job (im Kindprozess)
async function runJob(id) {
  const cfg = CONFIG.find((c) => c.id === id);
  if (!cfg) throw new Error('unbekannte ID ' + id);
  const t0 = Date.now();
  const common = { outDir: HD, prevDir: PREV };
  let res;
  const { default: sharpMod } = await import('sharp');
  const rawFile = Array.isArray(cfg.raw) ? path.join(RAW, cfg.raw[0]) : path.join(RAW, cfg.raw);
  let rawPath = rawFile;
  if (Array.isArray(cfg.raw) && cfg.kind !== 'gpu') {
    rawPath = path.join(WORK, `${cfg.name}_stacked.png`);
    await new Promise((ok, fail) => spawn(process.execPath, [path.join(HERE, 'stack.mjs'), ...cfg.raw.map((f) => path.join(RAW, f)), '--out', rawPath], { stdio: 'ignore' }).on('exit', (c) => (c ? fail(new Error('stack.mjs fehlgeschlagen')) : ok())));
  }
  const meta = await sharpMod(rawPath).metadata();
  const kind = cfg.kind || 'sheet';
  if (kind === 'object' || kind === 'overlay' || kind === 'background') {
    const S = await import('./single.mjs');
    const base = { raw: rawPath, name: cfg.name, target: cfg.size, ...common };
    res = kind === 'object' ? await S.processObject(base) : kind === 'overlay' ? await S.processOverlay(base) : await S.processBackground(base);
    res.hdScale = kind === 'background' ? 2 : 4;
  } else if (kind === 'gpu') {
    const { processGpu } = await import('./gpu.mjs');
    res = await processGpu({ rawDir: RAW, name: cfg.name, outDir: HD, prevDir: PREV });
    res.hdScale = 4;
  } else if (kind === 'tiles') {
    const S = await import('./single.mjs');
    res = await S.processTiles({ raw: rawPath, name: cfg.name, size: cfg.size, cell: cfg.cell, tiles: cfg.tiles, ...common });
    res.hdScale = 4;
  } else {
    const { runHd } = await import('./hd.mjs');
    const o = cfg.hd || {};
    const args = {
      _: [rawPath], hd: true, size: cfg.size.join('x'), cell: cfg.cell.join('x'), sheet: cfg.id, name: cfg.name,
      bg: o.bg || 'auto', quiet: true, 'out-dir': HD, 'preview-dir': PREV,
    };
    if (o.holes) args.holes = true;
    if (o.bgConn) args['bg-conn'] = String(o.bgConn);
    if (o.keyCells) args['key-cells'] = o.keyCells;
    if (o.opaqueCells) args['opaque-cells'] = o.opaqueCells;
    if (o.holeMin !== undefined) args['hole-min'] = o.holeMin;
    if (o.scaleMode) args['scale-mode'] = o.scaleMode;
    if (o.noLines) args['no-lines'] = true;
    if (o.bgTol !== undefined) args['bg-tol'] = o.bgTol;
    if (o.edge !== undefined) args.edge = o.edge;
    if (o.minArea !== undefined) args['min-area'] = o.minArea;
    if (o.noRegister) args['no-register'] = true;
    if (o.quality !== undefined) args.quality = o.quality;
    res = await runHd(args, ROOT, { dims });
    res.hdScale = 4;
  }
  res.rawSize = [meta.width, meta.height];
  res.rawStacked = Array.isArray(cfg.raw) && cfg.kind !== 'gpu';
  res.ms = Date.now() - t0;
  return res;
}

// ============================================================================ Orchestrierung
function runChild(id) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--job', id], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('exit', (code) => {
      const m = /@@RESULT@@(.*)\n?$/s.exec(out);
      if (code === 0 && m) resolve({ id, ok: true, res: JSON.parse(m[1]) });
      else resolve({ id, ok: false, error: (err || out).split('\n').slice(-6).join('\n') });
    });
  });
}

const parseArgs = (argv) => { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); o[k] = ['no-overview', 'check-only'].includes(k) ? true : argv[++i]; } else o._.push(a); } return o; };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.job) {
    const res = await runJob(args.job);
    process.stdout.write('@@RESULT@@' + JSON.stringify(res) + '\n');
    return;
  }
  const only = args.only ? args.only.split(',').map((s) => s.trim().toUpperCase()) : null;
  const ids = CONFIG.map((c) => c.id).filter((id) => !only || only.includes(id));
  fs.mkdirSync(HD, { recursive: true }); fs.mkdirSync(PREV, { recursive: true }); fs.mkdirSync(WORK, { recursive: true });
  const t0 = Date.now();
  const results = new Map();
  if (!args['check-only']) {
    const jobs = +(args.jobs || 8);
    const queue = [...ids];
    console.log(`build-all: ${ids.length} Aufträge, ${jobs} parallel`);
    await Promise.all(Array.from({ length: jobs }, async () => {
      while (queue.length) {
        const id = queue.shift(); const r = await runChild(id);
        results.set(id, r);
        if (r.ok) { fs.mkdirSync(path.join(WORK, 'results'), { recursive: true }); fs.writeFileSync(path.join(WORK, 'results', `${id}.json`), JSON.stringify(r.res, null, 1)); }
        console.log(`  ${id} ${r.ok ? `ok (${(r.res.ms / 1000).toFixed(1)} s, ${r.res.warnings.length} Warnungen)` : 'FEHLER ' + r.error}`);
      }
    }));
  }
  const { writeManifest } = await import('./manifest.mjs');
  const man = await writeManifest({ ROOT, CONFIG, NOTES, REVIEW, DECISIONS });
  const { checkNames } = await import('./check-names.mjs');
  const chk = checkNames({ ROOT, print: true });
  if (!args['no-overview']) {
    const { makeOverviews } = await import('./overview.mjs');
    const files = await makeOverviews({ ROOT, CONFIG, GROUPS, manifest: man });
    console.log('Übersicht:\n  ' + files.map(rel).join('\n  '));
  }
  console.log(`fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s · ${rel(path.join(HD, 'manifest.json'))}`);
  if (!chk.ok) process.exitCode = 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
