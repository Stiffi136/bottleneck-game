# BOTTLENECK – Asset-Liste (2D-Pixel-Art)

Bezug: `docs/game-design.md` (IDs der Bauteile, Bosse, Software). Alle Maße sind **virtuelle Pixel** im Pixel-Art-Raster (1 Asset-Pixel = 1 virtueller Pixel). Die Auslieferung erfolgt als HD-Sheet (Zelle × `hd-scale` 4), gerendert wird mit linearer Filterung (siehe 1.4).

---

## 1. Stilvorgabe

### 1.1 Grundregeln
- **Stil: „HD-Pixel-Look“.** Die Sprites bleiben so weich, wie die Bild-KI sie liefert (Original-Look, alle Farbnuancen). Die Palette in 1.2 ist nur ein **Richtwert**, keine Pflicht. Es gibt keine Palettenrundung und kein erzwungenes Pixelraster.
- **Perspektive:** Spielkarten und UI sind frontal. Das Mainboard ist eine **schematische Seitenansicht in das offene Gehäuse** (Board frontal). Erweiterungskarten sind „aufgeklappt“ gezeichnet (Lüfterseite sichtbar). Dadurch verdecken sie sichtbar die Slots darunter (Spielregel K10).
- **Maßstab der Einbauansicht:** ca. **0,65 px pro mm** (ATX 244 × 305 mm → 160 × 200 px). Kleine Teile dürfen zur Lesbarkeit leicht übergroß sein.
- **Kontur:** 1 px Außenkontur in `#0b0b12`. Innenkonturen in einem dunkleren Ton des Materials (Selective Outlining).
- **Licht:** von oben links. Pro Material maximal 4 Tonstufen (Schatten, Grund, Licht, Glanz).
- **Anti-Aliasing** an den Kanten ist ok (weicher Alpha-Rand), aber ohne grauen oder weißen Saum (Farbe wird beim Freistellen vom Hintergrund entmischt). Keine absichtliche Halbtransparenz in Sprites (Ausnahme: Effekt-Overlays mit 50 % per Shader).
- **Dithering:** nur in Hintergründen und großen Flächen, Schachbrettmuster.
- **Rotation:** keine gedrehten Pixel-Art-Varianten. Karten-Wackeln (max. ±4°) passiert per Shader mit Pixel-Snapping.
- **Text:** Nie in Sprites einbacken (Lokalisierung). Ausnahme: Logo und das „:(“ des Bluescreens.
- **Farbunterscheidung:** Kartentypen und Status haben immer **Farbe + eigene Form** (Farbenblindheit).
- **Raster:** UI auf 4-px-Raster, Karten und Icons auf geraden Maßen.
- **Varianten per Palette-Swap:** Markenfarben (Intellion blau / AMX rot; Veridia grün / Rubeon rot), Board-Farben (grünes Budget-PCB, schwarzes Premium-PCB) und RGB-Zyklen entstehen per Shader aus **Schlüsselfarben**. Darum werden diese Sprites mit festen „Schlüsselfarben“ gezeichnet (siehe 1.3), nicht als eigene Dateien. Der Shader erkennt sie per **Toleranz bzw. Farbton-Maske**, nicht exakt.
- **Animation:** 8–12 fps für Loops, 15–20 fps für Effekte. Frames liegen im Atlas horizontal nebeneinander.
- **Format:** WebP-Sheet (RGBA, Qualität ca. 90) + JSON-Hash (TexturePacker-Format), `hd-scale` 4 (Zelle 32×32 → Frame 128×128), siehe 1.4. Ein Sprite-Atlas pro Bereich (UI, Karten, Hardware, Effekte, Hintergründe), 2 px Padding mit Kanten-Extrusion beim Packen.

### 1.2 Palette „BOTTLENECK-35“

Richtwert für Farbstimmung und Prompts. Die fertigen HD-Sprites werden nicht auf diese Farben gerundet.

| # | Hex | Name | Verwendung |
|---|---|---|---|
| 1 | `#0b0b12` | Schwarz | Kontur, tiefste Schatten |
| 2 | `#1a1a2e` | Nacht | Panel-Hintergrund |
| 3 | `#2a2a44` | Schiefer | Panel |
| 4 | `#43435f` | Stahl dunkel | Panel-Licht, Metall-Schatten |
| 5 | `#6a6a88` | Stahl | Metall, Kühlkörper |
| 6 | `#9b9bb4` | Alu | Metall-Licht |
| 7 | `#cfd0e0` | Hellgrau | Text sekundär, Glanz |
| 8 | `#f4f4fa` | Weiß | Text primär |
| 9 | `#0f2a1c` | PCB dunkel | Platine Schatten, Spieltisch |
| 10 | `#1d4a2c` | PCB | Platine |
| 11 | `#2e7040` | Leiterbahn | Platine Licht |
| 12 | `#5fa35a` | Leiterbahn hell | Glanz |
| 13 | `#5a3216` | Kupfer dunkel | Kontakte Schatten, Holz |
| 14 | `#a8642a` | Kupfer | Kupfer, Kabel |
| 15 | `#e0a848` | Gold | Kontakte, Geld |
| 16 | `#ffe28a` | Gold hell | Glanz, Geld-Licht |
| 17 | `#1f3f9a` | Blau dunkel | CPU-Typ Schatten, BIOS, Bluescreen |
| 18 | `#3a7bf0` | CPU-Blau | CPU-Typ, **Leistung (L)** |
| 19 | `#8cc4ff` | Eisblau | Kühlung, Frost |
| 20 | `#1f7a3a` | Grün dunkel | GPU-Typ Schatten |
| 21 | `#3fbf5f` | GPU-Grün | GPU-Typ, „passt“, Ausführen-Button |
| 22 | `#a8f07a` | Hellgrün | Glanz, Erfolg |
| 23 | `#b9781c` | Amber dunkel | RAM-Typ Schatten |
| 24 | `#f2b233` | RAM-Amber | RAM-Typ |
| 25 | `#5a2a9a` | Violett dunkel | I/O-Typ Schatten |
| 26 | `#a05cf0` | I/O-Violett | I/O-Typ, selten |
| 27 | `#ffd23f` | Hitze 1 | 60–75 °C, Warnung |
| 28 | `#ff8a2e` | Hitze 2 | 75–85 °C |
| 29 | `#e8432d` | Hitze 3 / Takt | ≥ 85 °C, **Takt**, „passt nicht“ |
| 30 | `#8c1c2b` | Dunkelrot | Takt-Schatten, Schaden |
| 31 | `#ff3fa4` | RGB-Magenta | RGB, legendär |
| 32 | `#2ef2ff` | RGB-Cyan | RGB, LEDs |
| 33 | `#8a7a5c` | Beige dunkel | Büro-Tower (CA1), altes Netzteil (P1): Schatten |
| 34 | `#c9b88f` | Beige | Büro-Tower, altes Netzteil: Grund |
| 35 | `#e8dcb8` | Beige hell | Büro-Tower, altes Netzteil: Licht |

### 1.3 Schlüsselfarben für Palette-Swap
Diese Bereiche werden in der Datei mit reinen Index-Farben gemalt und im Shader ersetzt:
- **Marke (3 Töne):** `#ff00ff` / `#c000c0` / `#800080` → z. B. Veridia-Grün oder Rubeon-Rot.
- **PCB (3 Töne):** `#00ff00` / `#00c000` / `#008000` → Grün (Budget) oder Schwarz/Grau (Premium).
- **RGB-Zone (1 Ton):** `#00ffff` → zyklischer Regenbogen aus den Farben 31, 32, 21, 27.

Da die KI Farben nur ungefähr trifft (und die HD-Sprites weich sind), erkennt der Shader die Schlüsselfarben **nicht exakt**, sondern per Toleranz im Farbraum bzw. per Farbton-Maske (Hue/Sättigung, z. B. Cyan-Bereich für die RGB-Zone). Die Maske hat einen weichen Übergang, damit AA-Kanten nicht ausfransen.

### 1.4 HD-Pipeline (Rohbild → Sheet)
Rohbilder (`assets/raw/`) → `tools/clean-sheet.mjs --hd` → `assets/hd/`:

```text
node tools/clean-sheet.mjs assets/raw/sheet_hw_mb_cpu_32.png --size 192x96 --cell 32x32 --hd --bg '#808080' --sheet S16
node tools/stack.mjs assets/raw/sheet_tall_a.png assets/raw/sheet_tall_b.png --out assets/work/sheet_tall_16x96_stacked.png
node tools/clean-sheet.mjs assets/work/sheet_tall_16x96_stacked.png --size 128x192 --cell 16x96 --hd --bg '#808080' --sheet S05 --name sheet_tall_16x96
```

- **Schritte:** Hintergrund entfernen (weiches Alpha, Farbe entmischt, kein Saum; `--bg auto` auch für Schleier/Raster) → Sprites per Zusammenhangskomponenten der Zelle ihres Schwerpunkts zuordnen → je Zelle ein Frame (Zelle × `--hd-scale`, Standard 4), Lanczos, **ein Maßstab für das ganze Sheet**, zentriert, nie abgeschnitten (zu große Sprites werden für ihre Zelle verkleinert). Animationsframes (Bereiche wie `x_0 … x_5` in der Tabelle) behalten Maßstab und Ankerpunkt.
- **Namen:** `--sheet S16` liest die Sprite-Namen aus der Belegungstabelle in `docs/asset-sheets.md`; ohne Option heißen die Frames `r<Zeile>c<Spalte>`.
- **Ausgaben:** `assets/hd/<name>.webp` (Alpha, nicht vormultipliziert), `assets/hd/<name>.json` (`frames` mit `frame`, `spriteSourceSize`, `sourceSize`, `contentBBox`; dazu `animations` und `meta`), Vorschauen `assets/preview/<name>_hd_checker.png` und `_hd_dark.png` (Grund `#1a1a2e`, zeigt Säume).
- **Alles auf einmal:** `node tools/build-all.mjs` baut alle MVP-Sheets (S01–S35) und Einzelbilder (E01–E10) aus `assets/raw/` neu (Konfigurationstabelle oben in der Datei: Rohdatei → Sheet-ID, Name, Größe, Zelle, Sonderbehandlung). Es entfernt dabei automatisch gerade Trennlinien an den Zellgrenzen (`tools/lines.mjs`), schreibt `assets/hd/manifest.json` (Dateien, Frames, Warnungen, Status), prüft mit `tools/check-names.mjs`, dass jeder Sprite-Name der Belegungstabellen genau einmal vorkommt, und legt Kontaktbögen in `assets/preview/overview/` ab. `--only S16,E01` baut nur Teile. Einzelbilder: `tools/single.mjs` (E01–E05 zuschneiden und proportional auf Ziel×4, E06 Overlay mit Alpha aus der Helligkeit, E07–E10 randlos ×2, S29 deckende Kacheln mit Kachel-Test).
- **Rendern:** lineare Filterung (`LinearFilter`), keine ganzzahlige Skalierung nötig. Der bisherige Pixel-Modus (Palette, `assets/clean/`) bleibt im Werkzeug erhalten (`--mode resample|native`, ohne `--hd`).

---

## 2. MVP-Assets

Prio: **P1** = für das MVP nötig, ohne Platzhalter nicht spielbar · **P2** = MVP, anfangs Platzhalter ok · **P3** = später (Abschnitt 3).
„Stk.“ = Anzahl einzelner Sprites in der Zeile (Varianten). Frames = Frames *pro* Sprite.

### 2.1 Schriften

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `font_small` | Schrift | Glyphe 5×7 (Zelle 6×9) | 1 | – | Fließtext und Tooltips: ASCII, ÄÖÜäöüß, °, ×, €, $, −, …, Pfeile ←→↑↓ (ca. 110 Glyphen) | P1 |
| `font_digits_big` | Schrift | Glyphe 8×12 (Zelle 9×13) | 1 | – | Score, L- und Takt-Boxen: 0–9 . , × + − % $ ° k M | P1 |
| `font_title` | Schrift | Glyphe 12×16 (Zelle 13×17) | 1 | – | Überschriften: A–Z, ÄÖÜ, 0–9, ! ? : - | P2 |

### 2.2 UI-Elemente

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `ui_panel_dark` | UI | 24×24, 9-Slice (8 px Ecken) | 1 | – | Standard-Panel, abgerundete Pixel-Ecken, Farben 2/3/4 | P1 |
| `ui_panel_light` | UI | 24×24, 9-Slice | 1 | – | Hervorgehobenes Panel (Bottom-Sheet, Details) | P1 |
| `ui_panel_bios` | UI | 24×24, 9-Slice | 1 | – | Retro-BIOS-Rahmen, blau/grau, Doppellinie | P2 |
| `ui_tooltip` | UI | 16×16, 9-Slice (4 px) + Zeiger 6×4 | 1 | – | Tooltip-Box mit kleinem Zeiger | P1 |
| `ui_button_gruen/_rot/_grau/_blau` | UI | 24×24, 9-Slice | 4 | 3 (normal, gedrückt, deaktiviert) | Buttons: Ausführen (grün), Neu-Prio (rot), neutral (grau), Shop/Info (blau). Gedrückt = 2 px tiefer | P1 |
| `ui_box_leistung` | UI | 56×24 | 1 | 3 (Puls beim Erhöhen) | Blaue Wertbox für L | P1 |
| `ui_box_takt` | UI | 56×24 | 1 | 3 (Puls) | Rote Wertbox für Takt | P1 |
| `ui_thermo_h_frame` | UI | 128×12 | 1 | – | Horizontales Thermometer (Hochformat) mit Markierungen bei 85/100 °C | P1 |
| `ui_thermo_h_fill` | UI | 120×6 | 1 | – | Füllung als Farbverlauf (Farben 19→27→28→29), Clip per Shader | P1 |
| `ui_thermo_v_frame` | UI | 16×96 | 1 | 2 (Warnblinken ≥ 85 °C) | Vertikales Thermometer mit Kolben (Querformat) | P1 |
| `ui_thermo_v_fill` | UI | 6×80 | 1 | – | Vertikale Füllung, Farbverlauf | P1 |
| `ui_wattbar_frame` | UI | 128×12 | 1 | – | Watt-Leiste mit Blitz-Kerbe | P1 |
| `ui_wattbar_fill` | UI | 120×6 | 1 | 3 (grün/gelb/rot) | Füllung je Last-Bereich | P1 |
| `ui_scorebar_frame` | UI | 160×8 | 1 | – | Fortschritt zum Benchmark-Ziel | P1 |
| `ui_scorebar_fill` | UI | 156×4 | 1 | – | Füllung, Ziel-Markierung am Ende | P1 |
| `ui_slot_empty_software` | UI | 48×64 | 1 | – | Leerer Software-Slot (gestrichelter Rahmen, Disketten-Silhouette) | P1 |
| `ui_slot_empty_software_mini` | UI | 36×36 | 1 | – | Leerer Software-Slot in der Hochformat-Leiste | P1 |
| `ui_slot_empty_tool` | UI | 28×28 | 1 | – | Leerer Werkzeug-Slot | P1 |
| `ui_slot_empty_lager` | UI | 40×40 | 1 | – | Leerer Lagerplatz (Karton-Umriss) | P1 |
| `ui_card_highlight` | UI | 52×68 | 1 | 4 (Puls) | Auswahl-Leuchtrahmen um Karten | P1 |
| `ui_mini_frame_software` | UI | 36×36 | 3 | 1 / Legendär 6 (Schimmer) | Rahmen für Software-Chips in der Leiste, je Seltenheit G/S/L | P1 |
| `ui_price_tag` | UI | 28×12 | 1 | – | Preisschild (Zahl per Font) | P1 |
| `ui_sold_stamp` | UI | 40×20 | 1 | – | Stempel „Verkauft“ (Form, Text per Font) | P2 |
| `ui_arrow_left/_right` | UI | 12×12 | 2 | – | BIOS-Stufenwahl ◄ ► | P1 |
| `ui_toggle` | UI | 24×12 | 1 | 2 (an/aus) | Schalter in den Einstellungen | P2 |
| `ui_slider_track` / `ui_slider_knob` | UI | 64×8 / 8×12 | 2 | – | Lautstärke-Regler | P2 |
| `ui_receipt_paper` / `ui_receipt_edge` | UI | 24×24 9-Slice / 8×4 Kachel | 2 | – | Kassenbon: Thermopapier mit Zackenrand | P2 |
| `ui_tab` | UI | 24×16, 9-Slice | 1 | 2 (aktiv/inaktiv) | Reiter (Deck-Ansicht, Katalog) | P2 |
| `ui_sheet_handle` | UI | 32×4 | 1 | – | Griff des Bottom-Sheets | P2 |

### 2.3 Icons

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `icon16_*` | Icon | 16×16 | 38 | – | leistung (Chip, blau), takt (Sinuswelle, rot), xtakt (×-Welle), hitze (Flamme), kuehlung (Schneeflocke), watt (Blitz), geld (Münze), durchlauf (▶), neuprio (↻), deck, ablage, kerne (Chip mit Kernen), handgroesse (RAM-Riegel), softwareslot (Diskette), lanes (Bus-Linien), generation (Chip mit „G“), einstellungen (Zahnrad), ton_an, ton_aus, info, zurueck, lager (Karton), werkbank (Schraubenzieher), bios (ROM-Chip), neu_wuerfeln (Würfel), oc (Tacho), warnung (!), rgb (Regenbogen), schloss, sortieren_stufe, sortieren_typ, pause, tempo (»), kompat_ok (✔ grün), kompat_warn (⚠ gelb), kompat_nein (✖ rot), verkaufen ($-Pfeil), post (Debug-LED) | P1 |
| `icon8_*` | Icon | 8×8 | 10 | – | Inline-Icons für Text: leistung, takt, hitze, kuehlung, watt, geld, kerne, lanes, durchlauf, neuprio | P1 |

### 2.4 Workload-Karten

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `card_frame_cpu/_gpu/_ram/_io` | Karte | 48×64 | 4 | – | Kartenrahmen je Typ: Farbband oben, Eckfeld für Stufe (Font) und Typ-Icon, Mittelfeld für Illustration, Fußfeld für den Namen | P1 |
| `card_typeicon16_*` | Karte | 16×16 | 4 | – | Typ-Symbole groß: CPU = Chip, GPU = Lüfter, RAM = Riegel, I/O = Stecker | P1 |
| `card_typeicon8_*` | Karte | 8×8 | 4 | – | Typ-Symbole klein für die Kartenecken | P1 |
| `card_art_cpu/_gpu/_ram/_io` | Karte | 32×24 | 4 | – | Generische Illustration je Typ (Prozessor-Die, Grafikchip mit Bildschirm, Speicherzellen, Kabel/Datenpfeile) | P1 |
| `card_back` | Karte | 48×64 | 1 | – | Kartenrücken: Platine mit Logo-Chip | P1 |
| `card_ov_uebertaktet` | Karte | 48×64 | 1 | 4 (Flammensaum) | Overlay „Übertaktet“: rote Flammen am Rand | P1 |
| `card_ov_optimiert` | Karte | 48×64 | 1 | 6 (Goldglanz läuft durch) | Overlay „Optimiert“: Goldrahmen | P1 |
| `card_ov_effizient` | Karte | 48×64 | 1 | 4 (Frost-Glitzern) | Overlay „Effizient“: Eisblau, Frostecken | P1 |
| `card_ov_instabil` | Karte | 48×64 | 1 | 4 (Glitch) | Overlay „Instabil“: Pixelversatz, Magenta/Cyan-Streifen | P1 |
| `card_ov_debuff` | Karte | 48×64 | 1 | – | Abgedunkelt mit Schloss-Symbol (Boss-gesperrt, nicht gewertet) | P1 |
| `card_shadow` | Karte | 48×64 | 1 | – | Weicher Pixel-Schatten (gedithert) | P2 |

### 2.5 Shop-, Software- und Verbrauchskarten

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `card_frame_hardware` | Karte | 48×64 | 1 | – | Hardware-Karte: Metallrahmen, Fenster 32×32 für das Teil-Icon, Edelstein-Fassung für den Tier | P1 |
| `gem_tier_0…4` | Karte | 8×8 | 5 | – | Tier-Edelstein: grau, grün, blau, violett, gold | P1 |
| `card_frame_software_g/_s/_l` | Karte | 48×64 | 3 | 1 / 1 / 6 (Regenbogen-Schimmer) | Software-Karte als Fenster im Retro-OS-Stil, Rahmenfarbe je Seltenheit | P1 |
| `card_frame_treiber` | Karte | 48×64 | 1 | – | Treiber-Update: Disketten-/CD-Optik | P1 |
| `card_frame_tool` | Karte | 48×64 | 1 | – | Werkzeug: Werkzeugkasten-Optik | P1 |
| `icon_treiber_*` | Icon | 32×32 | 10 | – | Ein Symbol je Profil (Einzeltask, Dual-Channel, Quad-Channel, Heterogen, Triple-Buffer, Pipeline, Spezialisiert, Full Stack, Quad-Core, Optimierte Pipeline). Auch für die Profil-Anzeige im Spiel | P2 |
| `icon_tool_*` | Icon | 32×32 | 7 | – | T1 Wärmeleitpaste (Spritze), T2 Lötkolben, T3 Druckluftspray, T4 Format C: (Diskette mit Blitz), T5 Kopierschutz-Knacker (Dietrich + CD), T8 OC-Kit (Tacho-Chip), T9 Wärmeleitpad (blaues Pad) | P1 |
| `icon_sw_*` | Icon | 32×32 | 15 | – | SW1 Task-Mangler, SW2 Kompilierer, SW3 Fake-Frames, SW4 RAM-Disk, SW5 FanKurve, SW6 Stresstest, SW7 Nachbrenner, SW8 Regenbogen-Sync, SW9 Pinguin-OS, SW10 Zwangs-Update, SW11 Krypto-Schürfer, SW12 Shader-Cache, SW15 Overlay-Monitor, SW16 Undervolt, SW19 Defragmentierer. Stil: Programm-Icons im Retro-Desktop-Look | P1 |
| `booster_workload/_treiber/_werkzeug/_software` | Karte | 40×56 | 4 | – | Booster: Blisterpack, Software-Box, Werkzeugkoffer, Treiber-CD-Hülle | P1 |

### 2.6 Hardware-Icons (Shop-Karte, Lager, Bauteil-Leiste)

Alle 32×32, 1 Frame. RGB-Teile haben eine RGB-Schlüsselfarbe (Zyklus per Shader). Markenfarben per Palette-Swap.

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `icon_mb_*` | Hardware-Icon | 32×32 | 5 | – | MB1 Büro-mATX (grün), MB2 B560 (schwarz, ATX), MB3 Z790 (schwarz, Kühlkörper silber), MB5 B760M (dunkelblau), MB7 B650M (schwarz-rot) | P1 |
| `icon_cpu_*` | Hardware-Icon | 32×32 | 7 | – | C1–C5 Intellion (blaues Label, steigender Glanz), C8, C9 AMX (rotes Label; X3D mit Cache-Stapel-Symbol) | P1 |
| `icon_gpu_*` | Hardware-Icon | 32×32 | 6 | – | G1 klein ohne Lüfter, G2 2 Lüfter rot, G3 2 Lüfter grün, G4 2 Lüfter grün/silber, G5 3 Lüfter rot, G6 3 Lüfter riesig mit 12-Pin-Stecker | P1 |
| `icon_ram_*` | Hardware-Icon | 32×32 | 6 | – | Je Kit 2 Riegel: R1 nackt grün, R2 rot, R3 schwarz, R4 nackt DDR5, R5 schwarz-weiß, R6 RGB | P1 |
| `icon_drive_*` | Hardware-Icon | 32×32 | 5 | – | S1 2,5″-SSD grau, S2 3,5″-HDD, S3 2,5″-SSD schwarz, S4 M.2 nackt, S5 M.2 mit Kühlkörper | P1 |
| `icon_psu_*` | Hardware-Icon | 32×32 | 4 | – | P1 beige mit Rost, P2 schwarz, P3 schwarz mit Goldsticker, P4 modular mit Platinsticker | P1 |
| `icon_cooler_*` | Hardware-Icon | 32×32 | 5 | – | K1 Boxed rund, K2 Tower, K3 Doppelturm braun, K4 AIO 240, K5 AIO 360 mit LCD | P1 |
| `icon_fan_*` | Hardware-Icon | 32×32 | 2 | – | F1 schwarz, F2 RGB-Ring | P1 |
| `icon_case_*` | Hardware-Icon | 32×32 | 3 | – | CA1 beige Büro-Tower, CA3 Mesh-Front, CA4 Glaskasten mit RGB | P1 |
| `icon_exp_*` | Hardware-Icon | 32×32 | 3 | – | E1 Netzwerkkarte mit RJ45, E3 Soundkarte mit Klinken, E4 Capture-Karte mit HDMI | P1 |

### 2.7 Mainboard & Slots (Werkbank)

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `mb_pcb_matx` | Mainboard | 160×160 | 1 | – | Leeres mATX-PCB mit Leiterbahnen und Bohrlöchern, PCB-Schlüsselfarben. Slots werden datengetrieben platziert | P1 |
| `mb_pcb_atx` | Mainboard | 160×200 | 1 | – | Leeres ATX-PCB | P1 |
| `slot_socket_lga` | Mainboard | 28×28 | 1 | – | Leerer LGA-Sockel mit Hebel und Pin-Feld | P1 |
| `slot_socket_amx` | Mainboard | 28×28 | 1 | – | Leerer AMX-Sockel (anderes Muster und Bügel) | P1 |
| `slot_dimm_ddr4` / `slot_dimm_ddr5` | Mainboard | 6×88 | 2 | – | DIMM-Slot mit Klammern; **Kerbe an unterschiedlicher Position** (sichtbarer Unterschied) | P1 |
| `slot_pcie_x16` | Mainboard | 58×6 | 1 | – | PCIe-x16-Slot mit Rastnase (Variante „x4 elektrisch“ per Label aus dem Font) | P1 |
| `slot_pcie_x1` | Mainboard | 16×6 | 1 | – | PCIe-x1-Slot | P1 |
| `slot_m2` | Mainboard | 54×8 | 1 | – | M.2-Slot mit Abstandshalter (Gen5 per Farbmarkierung) | P1 |
| `slot_sata` | Mainboard | 12×10 | 1 | – | 2er-Block SATA-Ports | P1 |
| `hdr_fan` | Mainboard | 6×4 | 1 | – | Lüfter-Header (Deko) | P2 |
| `hdr_atx24` / `hdr_eps8` | Mainboard | 8×34 / 14×6 | 2 | – | Stromanschlüsse (Deko) | P2 |
| `hs_chipset_budget` / `hs_chipset_premium` | Mainboard | 24×24 | 2 | – | Chipsatz-Kühlkörper | P1 |
| `hs_vrm_top` / `hs_vrm_side` | Mainboard | 48×12 / 12×40 | 2 | – | VRM-Kühlkörper um den Sockel | P2 |
| `io_shield` | Mainboard | 24×44 | 1 | – | I/O-Blende links oben | P2 |
| `slot_glow` | Mainboard | 8×8, 9-Slice | 1 | 3 (Puls) | Slot-Markierung, per Tint grün (passt), rot (passt nicht), weiß (gewählt) | P1 |

### 2.8 Einbau-Sprites (Teile im Board/Gehäuse)

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `cpu_ihs_intellion` / `cpu_ihs_amx` | Einbau | 24×24 | 2 | – | Heatspreader im Sockel (nur sichtbar ohne Kühler bzw. beim Einbau) | P1 |
| `cooler_boxed` | Einbau | 40×40 | 1 | 4 (Lüfter dreht) | Boxed-Kühler von vorn | P1 |
| `cooler_tower` | Einbau | 48×52 | 1 | 4 | Tower-Kühler mit Lüfter | P1 |
| `cooler_dualtower` | Einbau | 60×52 | 1 | 4 | Doppelturm, braune Lüfter | P1 |
| `aio_pump` | Einbau | 32×32 | 1 | – | AIO-Pumpe mit Schläuchen | P1 |
| `aio_pump_lcd` | Einbau | 32×32 | 1 | 4 (Display zeigt Temperatur-Grafik) | AIO-Pumpe mit LCD | P1 |
| `ram_stick_plain/_hs/_rgb` | Einbau | 6×88 | 3 | 1 / 1 / 8 (Lichtleiste) | RAM-Riegel: nackt, mit Heatspreader, mit RGB | P1 |
| `gpu_s` | Einbau | 112×14 | 1 | – | 1-Slot-Karte mit passivem Kühlkörper | P1 |
| `gpu_m` | Einbau | 176×26 | 1 | 4 (2 Lüfter) | 2-Slot-Karte, Marken-Schlüsselfarben | P1 |
| `gpu_l` | Einbau | 216×40 | 1 | 4 (3 Lüfter) | 3-Slot-Karte, verdeckt sichtbar 2 Slots | P1 |
| `exp_nic` / `exp_sound` / `exp_capture` | Einbau | 36×12 / 52×14 / 52×14 | 3 | – | Erweiterungskarten | P1 |
| `m2_ssd` / `m2_ssd_heatsink` | Einbau | 52×8 / 52×10 | 2 | – | M.2-SSD nackt und mit Kühlkörper | P1 |
| `drive_sata_ssd` / `drive_hdd` | Einbau | 32×20 / 40×28 | 2 | 1 / 2 (HDD vibriert) | Laufwerke im Laufwerksschacht | P1 |
| `psu_cheap/_standard/_premium` | Einbau | 64×40 | 3 | – | Netzteil unten im Gehäuse: beige mit Kabelsalat, schwarz, modular mit Sticker | P1 |
| `case_fan` | Einbau | 32×32 | 1 | 4 (dreht) | Gehäuselüfter, RGB-Ring als Schlüsselfarbe | P1 |
| `radiator_240` / `radiator_360` | Einbau | 64×32 / 96×32 | 2 | – | AIO-Radiatoren oben im Gehäuse (mit Lüftern, die sich drehen, über `case_fan` gelegt) | P1 |

### 2.9 Gehäuse (Innenansicht = Werkbank-Bühne)

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `case_office` | Gehäuse | 240×300 | 1 | – | CA1: beiger Innenraum, 5,25″-Schacht, 1 Lüfterplatz hinten, mATX-Bohrungen | P1 |
| `case_mesh` | Gehäuse | 260×320 | 1 | – | CA3: schwarzer Innenraum, Mesh-Front, Netzteil-Abdeckung, 4 Lüfterplätze | P1 |
| `case_glass` | Gehäuse | 260×320 | 1 | – | CA4: weißer Innenraum, viel Platz, 6 Lüfterplätze | P1 |
| `case_glass_reflex` | Gehäuse | 260×320 | 1 | – | Glas-Spiegelung als Overlay (diagonale Streifen) | P2 |

### 2.10 Benchmarks & Bosse

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `bench_office` / `bench_gaming` | Benchmark | 32×32 | 2 | – | Runde „Chips“: Office (Tabellen-Symbol, grau), Gaming (Gamepad, blau) | P1 |
| `boss_*` | Boss | 32×32 | 10 | – | B1 Krysis (Alien-Helm), B2 Prime96 (glühender Chip), B3 Kinobank (Filmrolle/Render-Kachel), B4 MemTest (RAM mit Lupe), B5 Zeitspion (Stoppuhr mit Auge), B6 Fellmark (Fell-Donut in Flammen), B7 Hitzewelle (Sonne), B8 Brownout (Glühbirne flackert), B11 Shader-Kompilierung (Sanduhr), F1 Cyberpunk 2088 (Neon-Skyline, goldener Rand) | P1 |

### 2.11 Hintergründe & Branding

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `bg_tile_pcb` | Hintergrund | 64×64 (kachelbar) | 1 | – | Spieltisch: dunkle Platine mit Leiterbahnen, gedämpft (Farben 9/10). Vignette per Shader | P1 |
| `bg_tile_esd` | Hintergrund | 64×64 (kachelbar) | 1 | – | Werkbank: ESD-Matte, Rastermuster, Farben 3/4 | P1 |
| `bg_tile_bios` | Hintergrund | 16×16 (kachelbar) | 1 | – | BIOS-Muster (blau, dezentes Raster) | P2 |
| `bg_shop_portrait` | Hintergrund | 400×900 | 1 | – | Computerladen-Theke, Regale mit Kartons; Crop-sicherer Kern 360×640 mittig | P2 |
| `bg_shop_landscape` | Hintergrund | 800×400 | 1 | – | wie oben; Crop-sicherer Kern 640×360 | P2 |
| `bg_title_portrait` | Hintergrund | 400×900 | 1 | – | Titel: Schreibtisch bei Nacht, offener PC mit RGB, Monitor | P2 |
| `bg_title_landscape` | Hintergrund | 800×400 | 1 | – | wie oben, Querformat | P2 |
| `logo_bottleneck` | Branding | 192×48 | 1 | 4 (Glanz läuft durch) | Schriftzug „BOTTLENECK“ als Pixel-Logo mit Flaschenhals-Motiv | P1 |
| `bsod_face` | Branding | 32×32 | 1 | – | „:(“ für den Game-Over-Bluescreen | P1 |

### 2.12 Effekte

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `fx_burst_leistung` | Effekt | 16×16 | 1 | 6 | Blauer Pixel-Burst bei +L | P1 |
| `fx_burst_takt` | Effekt | 16×16 | 1 | 6 | Roter Burst bei +Takt | P1 |
| `fx_xtakt_flash` | Effekt | 32×32 | 1 | 5 | Großer Blitz-Ring bei ×Takt | P1 |
| `fx_coin` | Effekt | 8×8 | 1 | 6 (dreht) | Münze (Belohnung, Capture-Karte) | P1 |
| `fx_smoke` | Effekt | 16×16 | 1 | 8 | Rauchwolke (Throttling, Not-Abschaltung) | P1 |
| `fx_spark` | Effekt | 8×8 | 1 | 4 | Funken (Bluescreen, Kurzschluss, Einbau) | P1 |
| `fx_fire` | Effekt | 16×24 | 1 | 6 | Flamme (Not-Abschaltung, 12-Pin-Stecker) | P2 |
| `fx_frost` | Effekt | 16×16 | 1 | 4 | Eiskristalle (Kühlung, Druckluftspray) | P2 |
| `fx_install_click` | Effekt | 24×24 | 1 | 5 | „Klick“-Sterne beim Einrasten eines Teils | P1 |
| `fx_post_led` | Effekt | 8×8 | 1 | 2 × 4 Farben | Debug-LEDs (CPU rot, DRAM gelb, VGA weiß, BOOT grün), an/aus | P2 |
| `fx_glitch_noise` | Effekt | 32×32 (kachelbar) | 1 | 4 | Rauschtextur für Bluescreen-/Instabil-Shader | P2 |
| `fx_lightning` | Effekt | 16×32 | 1 | 4 | Stromblitz (Brownout, Watt-Überlast) | P2 |
| `fx_confetti` | Effekt | 4×4 | 1 | 4 Farbvarianten | Konfetti-Pixel (Benchmark geschafft) | P2 |
| `fx_pack_open` | Effekt | 64×64 | 1 | 6 | Booster-Öffnen: Folie reißt, Lichtstrahl | P2 |

Kein eigenes Asset (Shader/Code): Hitzeflimmern, Bildschirm-Wackeln, CRT-Filter, RGB-Farbzyklus, Karten-Wackeln, Vignette, Abdunkeln.

### 2.13 Sonstiges

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `app_icon` | Branding | 32×32 | 1 | – | App-/Favicon (ganzzahlig auf 192 und 512 skaliert für PWA) | P2 |

### 2.14 Zusammenfassung MVP

| Kategorie | Sprites (Stk.) | davon P1 |
|---|---|---|
| Schriften | 3 | 2 |
| UI-Elemente | 37 | 28 |
| Icons (16 px + 8 px) | 48 | 48 |
| Workload-Karten | 23 | 22 |
| Shop-/Software-/Verbrauchskarten | 47 | 37 |
| Hardware-Icons | 46 | 46 |
| Mainboard & Slots | 19 | 13 |
| Einbau-Sprites | 26 | 26 |
| Gehäuse | 4 | 3 |
| Benchmarks & Bosse | 12 | 12 |
| Hintergründe & Branding | 9 | 4 |
| Effekte | 14 | 7 |
| Sonstiges | 1 | 0 |
| **Summe** | **289** | **248** |

Animationsaufwand im MVP: ca. 35 animierte Sprites, meist 2–8 Frames.

---

## 3. Spätere Assets (nach dem MVP, Prio P3)

| Name | Kategorie | Größe (px) | Stk. | Frames / Animation | Beschreibung | Prio |
|---|---|---|---|---|---|---|
| `icon_*` (Rest-Hardware) | Hardware-Icon | 32×32 | 16 | – | MB4, MB6, MB8, C6, C7, C10, R7, S6, P5, K6, F3, CA2, CA5, E2, E5, E6 | P3 |
| `mb_pcb_itx` / `mb_pcb_eatx` | Mainboard | 112×112 / 216×200 | 2 | – | ITX- und E-ATX-PCB | P3 |
| `case_itx` / `case_bigtower` | Gehäuse | 160×200 / 300×360 | 2 | – | CA2 Schuhkarton, CA5 Kühlschrank | P3 |
| `loop_reservoir` | Einbau | 24×48 | 1 | 4 (Blasen) | Custom-Loop-Ausgleichsbehälter | P3 |
| `loop_tube_*` | Einbau | 8×8 (Kachel-Set) | 6 | – | Schlauch-Kacheln (gerade, Kurven, Fittings) | P3 |
| `loop_waterblock` | Einbau | 28×28 | 1 | – | CPU-Wasserkühler | P3 |
| `m2_ssd_gen5` | Einbau | 52×12 | 1 | 4 (Mini-Lüfter) | Gen5-SSD mit aktivem Kühler | P3 |
| `exp_nic10g` / `exp_wlan` / `exp_raid` | Einbau | 52×14 / 36×12 / 64×14 | 3 | – | Weitere Erweiterungskarten | P3 |
| `sli_bridge` | Einbau | 40×8 | 1 | 4 (RGB) | Multi-GPU-Brücke (Witz-Mechanik) | P3 |
| `cable_*` | Einbau | 8×8 (Kachel-Set) | 12 | – | Kabelmanagement (gesleevt und Kabelsalat) | P3 |
| `icon_sw_*` (Rest) | Icon | 32×32 | 5 | – | SW13, SW14, SW17, SW18, SW20 | P3 |
| `icon_tool_*` (Rest) | Icon | 32×32 | 3 | – | T6 Kabelbinder, T7 BIOS-Mod, T10 Lotterie-Los | P3 |
| `boss_*` (Rest) | Boss | 32×32 | 6 | – | B9, B10, B12, B13, F2, F3 | P3 |
| `boss_portrait_*` | Boss | 64×64 | 16 | 8 (Idle) | Animierte Boss-Porträts für den Benchmark-Start | P3 |
| `card_art_*_1…10` | Karte | 32×24 | 40 | – | Eigene Illustration je Typ und Stufe (Flavor-Namen aus GDD Kap. 13) | P3 |
| `card_back_*` | Karte | 48×64 | 4 | – | Alternative Kartenrücken (Freischaltungen) | P3 |
| `card_ov_krypto` / `card_ov_cachehit` | Karte | 48×64 | 2 | 4 | Weitere Verbesserungen | P3 |
| `starter_portrait_*` | Meta | 64×64 | 4 | – | Starter-PCs (Büro, Gaming gebraucht, Workstation, Retro) | P3 |
| `icon_garantie_*` | Meta | 16×16 | 8 | – | Garantie-Stufen (Schwierigkeit) | P3 |
| `icon_achievement_*` | Meta | 24×24 | 20 | – | Erfolge | P3 |
| `icon_gutschein_*` | Meta | 32×32 | 8 | – | Laden-Gutscheine (Voucher-Äquivalent) | P3 |
| `ui_stamp_defekt` | UI | 40×20 | 1 | – | Gebrauchtmarkt-Stempel „Defekt?“ | P3 |
| `mascot_schraubi` | Figur | 48×48 | 1 | 8 (Idle) + 4 (Sprechen) | Techniker-Maskottchen für das Tutorial | P3 |
| `bg_shop_anim` | Hintergrund | 800×400 / 400×900 | 2 | 4 (blinkende LEDs, Kunde) | Animierte Shop-Hintergründe | P3 |
| `bg_boss_*` | Hintergrund | 64×64 Kachel | 6 | – | Thematische Kacheln für Boss-Benchmarks (Neon, Hitze, Matrix …) | P3 |
| `cursor_*` | UI | 16×16 | 2 | – | Desktop-Cursor normal/greifen | P3 |
| `fx_melt` | Effekt | 16×16 | 1 | 8 | Schmelzender 12-Pin-Stecker | P3 |
| `fx_leak` | Effekt | 16×16 | 1 | 6 | Wassertropfen (Custom-Loop-Leck) | P3 |
| `ui_catalog_*` | UI | diverse 9-Slices | 4 | – | Hardware-Katalog (Kompendium) | P3 |
| **Summe später** | | | **179** | | | |
