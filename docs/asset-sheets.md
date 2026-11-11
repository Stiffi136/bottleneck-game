# BOTTLENECK – Sprite-Sheets und Bild-KI-Prompts

Bezug: `docs/assets.md` (Asset-Liste, Palette, Stilregeln) und `docs/game-design.md`. Diese Datei gliedert alle Pixel-Art-Assets in Sprite-Sheets, die sich gut von einer Bild-KI erzeugen und später in einen Atlas importieren lassen. **Erklärungen und Tabellen sind Deutsch, die Prompts sind Englisch** (Bild-KIs verstehen das am besten).

## 0. Arbeitsweise und Konventionen

1. **Reihenfolge:** erst Prompt 0 (Abschnitt 1) senden, dann pro Sheet den Sheet-Prompt. Nach dem ersten guten Sheet dieses als Stil-Referenzbild mitgeben.
2. **Raster:** jedes Sheet hat *eine* Zellengröße, *keine* Abstände, *kein* Padding. Das Padding (2 px mit Kanten-Extrusion) fügt erst der Atlas-Packer hinzu (siehe `assets.md` 1.1).
3. **Position in der Zelle:** Sprites, die kleiner als die Zelle sind, stehen **zentriert**. Der Import schneidet daher: `x = Spalte·Zellbreite + ⌊(Zellbreite − Sprite-Breite)/2⌋`, `y` entsprechend. Alle Zellen sind so gewählt, dass die Differenzen möglichst gerade sind.
4. **Animationen:** eine Zeile pro Sprite, Frames horizontal. Frames heißen im Atlas `<name>_0`, `<name>_1` … (0-basiert). Statische Sprites heißen `<name>`. Zustände ohne Animation (Button-Zustände, Tier-Edelsteine) folgen derselben Regel.
5. **Namen:** Die Tabellen führen den Asset-Namen aus `assets.md` und den konkreten Sprite-Namen. Wildcards werden so aufgelöst: Hardware-Icons mit der ID aus dem GDD (`icon_cpu_5` = C5, `icon_drive_4` = S4), Software `icon_sw_<Nr>`, Werkzeuge `icon_tool_<Nr>`, Bosse `boss_b1` … `boss_f1`, Treiber nach Profil (`icon_treiber_pipeline`).
6. **Teile ohne eigene Zeile in `assets.md`:** Der Tooltip-Zeiger, die zwei weiteren Farbzustände der Watt-Füllung und ähnliche Bestandteile eines Assets sind mit „(Teil)“ markiert und zählen nicht als eigener Sprite.
7. **Schlüsselfarben** (Marke #ff00ff, PCB #00ff00, RGB #00ffff) kommen nur dort vor, wo der Sheet-Prompt sie ausdrücklich verlangt: GPU-Einbau-Sprites (Marke), Mainboard-PCBs (PCB), RGB-Teile (RGB). Alle Icons sind **direkt mit Palettenfarben** gemalt (siehe Abschnitt 8, Auffälligkeiten).
8. **Zahlen:** „Sprites“ = Anzahl einzelner Sprites wie in der Spalte „Stk.“ von `assets.md` (Frames zählen nicht). „KI-Größe“ = empfohlene Ausgabegröße als ganzzahliges Vielfaches der Zielgröße.

---

## 1. Prompt 0 – Master-/Stil-Prompt

Einmal am Anfang der Chat-Sitzung senden **oder** vor jeden Sheet-Prompt kopieren. Der Text ist absichtlich vollständig und enthält alle Import-Regeln.

```text
PROMPT 0 – MASTER STYLE PROMPT "BOTTLENECK"

ROLE AND PROJECT
You create pixel-art game assets for "BOTTLENECK", a 2D roguelike deck-builder about building and overclocking a PC (hardware parts, CPU/GPU/RAM/IO workload cards, software "jokers", boss benchmarks). Mood: Balatro-like readability, cozy-dark workbench, funny retro PC culture of the 1990s-2010s. All art is made for a game engine and must be technically exact, not illustrative.

SPRITE SIZE RULE (MOST IMPORTANT)
- Every sheet prompt gives EXACT sprite sizes in art pixels ("EXACT SIZE WxH art px"), and where there is a factor xN also in output pixels. These sizes are binding. A sprite must be exactly that many art pixels wide and tall: not larger, not smaller, not stretched. Measure it before you answer.
- Sprite size is more important than detail: if a sprite is too small for a detail, drop the detail, never change the size. Thin and tall parts stay as thin and tall as stated (for example 6x88 art px = 48x704 output px at x8).
- Every sheet prompt ends with a "SIZE CHECK" line that repeats the key sizes. Check it against your result.

OUTPUT FORMAT (IMPORTANT)
- One PNG sprite sheet: a strict grid of equally sized cells. The sheet prompt that follows gives cell size, columns, rows, total size and the content of every cell in reading order (left to right, top to bottom).
- Final art is pixel art at 1:1 "virtual pixels". If the sheet prompt gives an upscale factor xN, draw at N times that size: every art pixel becomes a perfectly square, uniformly colored block of N x N output pixels, with the same block size everywhere in the image. No mixels (no details smaller than one art pixel, no half-size blocks, no rotated or sheared pixels).
- Cells are directly adjacent: NO gaps, NO gutters, NO borders, NO grid lines, NO cell labels, NO numbers. Nothing may cross a cell border.
- Sprites sit centered (horizontally and vertically) in their cell. If a sprite is smaller than its cell, the rest of the cell is empty. Keep at least 1 art pixel of flat #808080 background between the sprite outline and the cell edge unless the sprite fills the whole cell.
- Unused cells stay completely empty: flat #808080, nothing else.
- Animations: one row per animated sprite, frames left to right, equal size, same position and same silhouette anchor in every frame (no drifting). Only the moving parts change.

BACKGROUND
- One flat, solid, single-color background of exactly #808080 (RGB 128,128,128) over the whole image, including all empty cells. NO transparency, NO gradient, NO noise, NO texture, NO shadow, NO floor, NO vignette, NO grid lines, NO cell frames or borders. #808080 is NEVER used inside a sprite (no gray of that value anywhere in the art).

HARD PIXEL RULES
- True pixel art with hard edges only. NO anti-aliasing, NO smoothing, NO blur, NO glow or bloom, NO soft shadows, NO smooth gradients, NO film grain, NO JPEG artifacts.
- NO blended or in-between pixels: every pixel is either exactly the flat #808080 background or exactly one of the listed colors. No soft edges, no halos, no color fringes around sprites.
- Dithering only when the sheet prompt allows it, and then only as a 2x2 checkerboard pattern.

COLORS
Use ONLY these 35 colors ("BOTTLENECK-35"). No other colors, no in-between shades.
 1 #0b0b12 black (outline, deepest shadow)    17 #1f3f9a blue dark
 2 #1a1a2e night (panel background)           18 #3a7bf0 CPU blue
 3 #2a2a44 slate (panel)                      19 #8cc4ff ice blue
 4 #43435f steel dark                         20 #1f7a3a green dark
 5 #6a6a88 steel                              21 #3fbf5f GPU green
 6 #9b9bb4 aluminium                          22 #a8f07a light green
 7 #cfd0e0 light grey                         23 #b9781c amber dark
 8 #f4f4fa white                              24 #f2b233 RAM amber
 9 #0f2a1c PCB dark                           25 #5a2a9a violet dark
10 #1d4a2c PCB                                26 #a05cf0 I/O violet
11 #2e7040 trace                              27 #ffd23f heat 1 (yellow)
12 #5fa35a trace light                        28 #ff8a2e heat 2 (orange)
13 #5a3216 copper dark / wood                 29 #e8432d heat 3 / red
14 #a8642a copper                             30 #8c1c2b dark red
15 #e0a848 gold                               31 #ff3fa4 RGB magenta
16 #ffe28a gold light                         32 #2ef2ff RGB cyan
33 #8a7a5c beige shadow (old office plastic)   35 #e8dcb8 beige light
34 #c9b88f beige base
KEY COLORS (only when the sheet prompt explicitly asks for them; never otherwise; flat, never mixed with palette colors in the same area):
- Brand (3 tones): #ff00ff light, #c000c0 mid, #800080 dark
- PCB (3 tones): #00ff00 light, #00c000 mid, #008000 dark
- RGB light (1 tone): #00ffff

OUTLINE, LIGHT, MATERIALS
- 1 px outer outline in #0b0b12 around every sprite and every separate object, closed, no gaps. Inner lines use a darker tone of the material (selective outlining), not black.
- Light comes from the top left. Each material uses at most 4 tone steps taken from one palette ramp (shadow, base, light, highlight): hard cel-shading, highlights on the top-left edges, shadows on the bottom-right edges.

VIEW AND SHAPE
- Frontal, flat, orthographic. Cards, icons and UI are straight-on. No perspective, no isometric view, no 3D-render look, no cast shadows on the ground, no tilted or rotated objects (unless the sheet prompt says so).
- Chunky, readable silhouettes with slight exaggeration. Small icons must be readable at 1x on a phone: one clear motif, max 3 colors plus outline.
- Type and state are always distinguished by SHAPE as well as color (color-blind friendly).

CONTENT RULES
- NO text, letters, numbers, labels, logos, watermarks or signatures in sprites (the game draws text itself). Use abstract shapes for labels and stickers. Exception only where the sheet prompt says so (logo, bluescreen face).
- NO real brands, no real logos: invent generic designs.
- One consistent style across the whole sheet and across all sheets: same outline weight, same level of detail, same light direction, same palette use.
- Do not add anything that is not listed. Do not add borders, frames, shadows, captions or decoration around the sprites.
```

HOW TO USE
Send this text once at the start of a chat ("Remember this style guide for all following sheet requests; answer OK"), or paste it in front of every sheet prompt. After the first successful sheet, attach it as a STYLE REFERENCE image for all following requests ("same style as the attached sheet").


---

## 2. Übersicht der Sheets

| Nr | Datei | Zelle | Raster (Sp×Z) | Gesamt px | Sprites | belegt/Zellen |
|---|---|---|---|---|---|---|
| S01 | `sheet_ui_panels_24.png` | 24×24 | 4×5 | 96×120 | 8 | 16/20 |
| S02 | `sheet_ui_small_32x16.png` | 32×16 | 4×3 | 128×48 | 8 | 11/12 |
| S03 | `sheet_ui_bars_160x12.png` | 160×12 | 1×9 | 160×108 | 7 | 9/9 |
| S04 | `sheet_ui_boxes_56x24.png` | 56×24 | 3×3 | 168×72 | 4 | 8/9 |
| S05 | `sheet_tall_16x96.png` (2 Hälften S05a/S05b) | 16×96 | 8×2 | 128×192 | 7 | 15/16 |
| S06 | `sheet_ui_slots_40x40.png` | 40×40 | 6×2 | 240×80 | 6 | 11/12 |
| S07 | `sheet_icons16_werte_16.png` | 16×16 | 6×4 | 96×64 | 24 | 24/24 |
| S08 | `sheet_icons16_menue_16.png` | 16×16 | 6×3 | 96×48 | 18 | 18/18 |
| S09 | `sheet_icons8_static_8.png` | 8×8 | 5×4 | 40×32 | 19 | 19/20 |
| S10 | `sheet_card_frames_48x64.png` | 48×64 | 4×3 | 192×192 | 12 | 12/12 |
| S11 | `sheet_card_overlays_48x64.png` | 48×64 | 4×4 | 192×256 | 4 | 13/16 |
| S12 | `sheet_card_anim_52x68.png` | 52×68 | 6×3 | 312×204 | 3 | 16/18 |
| S13 | `sheet_booster_40x56.png` | 40×56 | 4×1 | 160×56 | 4 | 4/4 |
| S14 | `sheet_misc_32.png` | 32×32 | 3×2 | 96×64 | 6 | 6/6 |
| S15 | `sheet_bench_boss_32.png` | 32×32 | 6×2 | 192×64 | 12 | 12/12 |
| S16 | `sheet_hw_mb_cpu_32.png` | 32×32 | 6×3 | 192×96 | 12 | 12/18 |
| S17 | `sheet_hw_gpu_ram_32.png` | 32×32 | 6×2 | 192×64 | 12 | 12/12 |
| S18 | `sheet_hw_storage_psu_32.png` | 32×32 | 6×3 | 192×96 | 12 | 12/18 |
| S19 | `sheet_hw_cooling_case_32.png` | 32×32 | 5×2 | 160×64 | 10 | 10/10 |
| S20 | `sheet_icons32_treiber_werkzeug_32.png` | 32×32 | 6×3 | 192×96 | 17 | 17/18 |
| S21 | `sheet_icons32_software_32.png` | 32×32 | 5×3 | 160×96 | 15 | 15/15 |
| S22 | `sheet_board_parts_32x44.png` | 32×44 | 3×3 | 96×132 | 9 | 9/9 |
| S23 | `sheet_board_slots_flat_64x16.png` | 64×16 | 2×4 | 128×64 | 7 | 7/8 |
| S24 | `sheet_parts_flat_64x28.png` | 64×28 | 2×4 | 128×112 | 7 | 8/8 |
| S25 | `sheet_cooler_anim_60x52.png` | 60×52 | 4×3 | 240×156 | 3 | 12/12 |
| S26 | `sheet_aio_fan_32.png` | 32×32 | 4×3 | 128×96 | 3 | 9/12 |
| S27 | `sheet_gpu_216x40.png` | 216×40 | 4×3 | 864×120 | 3 | 9/12 |
| S28 | `sheet_psu_radiator_96x40.png` | 96×40 | 3×2 | 288×80 | 5 | 5/6 |
| S29 | `sheet_bg_tiles_64.png` | 64×64 | 3×1 | 192×64 | 3 | 3/3 |
| S30 | `sheet_logo_192x48.png` | 192×48 | 4×1 | 768×48 | 1 | 4/4 |
| S31 | `sheet_fx8_8.png` | 8×8 | 8×4 | 64×32 | 5 | 25/32 |
| S32 | `sheet_fx16_16.png` | 16×16 | 6×3 | 96×48 | 3 | 16/18 |
| S33 | `sheet_fx_tall_16x32.png` | 16×32 | 8×3 | 128×96 | 3 | 18/24 |
| S34 | `sheet_fx32_32.png` | 32×32 | 5×3 | 160×96 | 3 | 14/15 |
| S35 | `sheet_fx_pack_open_64.png` | 64×64 | 6×1 | 384×64 | 1 | 6/6 |
| | **Summe Sheets (MVP)** | | | | **276** | |
| E01 | `mb_pcb_matx.png` | Einzelbild | 1×1 | 160×160 | 1 | – |
| E02 | `mb_pcb_atx.png` | Einzelbild | 1×1 | 160×200 | 1 | – |
| E03 | `case_office.png` | Einzelbild | 1×1 | 240×300 | 1 | – |
| E04 | `case_mesh.png` | Einzelbild | 1×1 | 260×320 | 1 | – |
| E05 | `case_glass.png` | Einzelbild | 1×1 | 260×320 | 1 | – |
| E06 | `case_glass_reflex.png` | Einzelbild | 1×1 | 260×320 | 1 | – |
| E07 | `bg_shop_portrait.png` | Einzelbild | 1×1 | 400×900 | 1 | – |
| E08 | `bg_shop_landscape.png` | Einzelbild | 1×1 | 800×400 | 1 | – |
| E09 | `bg_title_portrait.png` | Einzelbild | 1×1 | 400×900 | 1 | – |
| E10 | `bg_title_landscape.png` | Einzelbild | 1×1 | 800×400 | 1 | – |
| | **Summe Einzeldateien (MVP)** | | | | **10** | |
| – | Schriften (kein KI-Sheet, Abschnitt 5) | | | | **3** | |
| | **Summe MVP** | | | | **289** | |

Insgesamt: **35 Sheets + 10 Einzeldateien + 3 Schriften** für das MVP (P1 und P2), dazu 20 Sheets und 6 Einzeldateien für P3 (Abschnitt 7).

---

## 3. MVP-Sheets (P1 und P2)

Gruppierung nach Thema und Zellengröße: **S01–S06** UI und hohe Teile · **S07–S09** kleine Icons · **S10–S14** Karten und Verbrauchsgüter · **S15** Bosse und Benchmark-Chips · **S16–S21** Hardware-, Treiber-, Werkzeug- und Software-Icons · **S22–S28** Board- und Einbauteile · **S29–S30** Hintergrund-Kacheln und Logo · **S31–S35** Effekte.

### S01 · `sheet_ui_panels_24.png` – UI: Panels und Buttons (9-Slice)

- **Zelle:** 24×24 px · **Raster:** 4 Spalten × 5 Zeilen · **Gesamt:** 96×120 px
- **Sprites:** 8 · **belegte Zellen:** 16 von 20 · **KI-Größe:** ×12 = 1152×1440 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `ui_panel_dark` | `ui_panel_dark` | 24×24 | Standard-Panel dunkel (Farben 2/3/4) |
| Z1 · S2 | `ui_panel_light` | `ui_panel_light` | 24×24 | Hervorgehobenes Panel (Bottom-Sheet, Details) |
| Z1 · S3 | `ui_panel_bios` | `ui_panel_bios` | 24×24 | Retro-BIOS-Rahmen, Doppellinie |
| Z1 · S4 | `ui_receipt_paper / ui_receipt_edge` | `ui_receipt_paper` | 24×24 | Kassenbon-Papier (Thermopapier) |
| Z2 · S1–3 | `ui_button_gruen/_rot/_grau/_blau` | `ui_button_gruen_0` … `ui_button_gruen_2` | 24×24 · 3 Fr. | Button grün „Ausführen“: normal, gedrückt (2 px tiefer), deaktiviert |
| Z2 · S4 | – | (leer) | – | – |
| Z3 · S1–3 | `ui_button_gruen/_rot/_grau/_blau` | `ui_button_rot_0` … `ui_button_rot_2` | 24×24 · 3 Fr. | Button rot „Neu-Prio“: 3 Zustände |
| Z3 · S4 | – | (leer) | – | – |
| Z4 · S1–3 | `ui_button_gruen/_rot/_grau/_blau` | `ui_button_grau_0` … `ui_button_grau_2` | 24×24 · 3 Fr. | Button grau (neutral): 3 Zustände |
| Z4 · S4 | – | (leer) | – | – |
| Z5 · S1–3 | `ui_button_gruen/_rot/_grau/_blau` | `ui_button_blau_0` … `ui_button_blau_2` | 24×24 · 3 Fr. | Button blau (Shop/Info): 3 Zustände |
| Z5 · S4 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_ui_panels_24.png
Target size: 96x120 px = 4 columns x 5 rows of 24x24 px cells, no gaps, no margins. Generate it at x12 (1152x1440 px): one art pixel = 12x12 output pixels, one cell = 288x288 output pixels.
THEME: UI 9-slice panels and buttons, retro desktop look, rounded pixel corners. 9-slice sprites: corners 8x8 px, edges and center must be plain tileable fills (no unique detail in the center).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "ui_panel_dark" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: dark panel, fill #1a1a2e, border steps #2a2a44 and #43435f, rounded pixel corners, 1px #0b0b12 outline
 - R1C2 "ui_panel_light" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: lighter highlighted panel, fill #2a2a44, border #6a6a88 and #9b9bb4, rounded corners
 - R1C3 "ui_panel_bios" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: retro BIOS frame, dark blue #1f3f9a fill, double-line border in #9b9bb4 / #cfd0e0, square corners
 - R1C4 "ui_receipt_paper" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: receipt thermal paper panel, off-white #cfd0e0 fill with #9b9bb4 shading, flat edges
 - R2C1–3 ROW OF 3 FRAMES (animation or states, left to right), "ui_button_gruen" — EXACT SIZE 24x24 art px (288x288 output px) per frame, fills the whole cell: GREEN button, 3 states left to right: normal (#3fbf5f fill, #a8f07a top highlight, #1f7a3a bottom shade), pressed (content shifted 2px down, darker), disabled (desaturated grey-green, flat)
 - R2C4 empty (flat #808080)
 - R3C1–3 ROW OF 3 FRAMES (animation or states, left to right), "ui_button_rot" — EXACT SIZE 24x24 art px (288x288 output px) per frame, fills the whole cell: RED button, 3 states: normal (#e8432d fill, light top edge, #8c1c2b bottom shade), pressed (2px down, darker), disabled (greyed)
 - R3C4 empty (flat #808080)
 - R4C1–3 ROW OF 3 FRAMES (animation or states, left to right), "ui_button_grau" — EXACT SIZE 24x24 art px (288x288 output px) per frame, fills the whole cell: GREY neutral button, 3 states: normal (#6a6a88 fill, #9b9bb4 highlight, #43435f shade), pressed (2px down), disabled (flat dark #2a2a44)
 - R4C4 empty (flat #808080)
 - R5C1–3 ROW OF 3 FRAMES (animation or states, left to right), "ui_button_blau" — EXACT SIZE 24x24 art px (288x288 output px) per frame, fills the whole cell: BLUE button, 3 states: normal (#3a7bf0 fill, #8cc4ff highlight, #1f3f9a shade), pressed (2px down), disabled (greyed blue)
 - R5C4 empty (flat #808080)

SIZE CHECK: every sprite is exactly 24x24 art px (288x288 output px) in a 24x24 cell (288x288 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S02 · `sheet_ui_small_32x16.png` – UI: Kleinteile (Tab, Toggle, Pfeile, Tooltip, Griff)

- **Zelle:** 32×16 px · **Raster:** 4 Spalten × 3 Zeilen · **Gesamt:** 128×48 px
- **Sprites:** 8 · **belegte Zellen:** 11 von 12 · **KI-Größe:** ×12 = 1536×576 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–2 | `ui_tab` | `ui_tab_0` … `ui_tab_1` | 24×16 · 2 Fr. | Reiter: aktiv, inaktiv |
| Z1 · S3–4 | `ui_toggle` | `ui_toggle_0` … `ui_toggle_1` | 24×12 · 2 Fr. | Schalter: an, aus |
| Z2 · S1 | `ui_tooltip` | `ui_tooltip` | 16×16 | Tooltip-Box (9-Slice, 4-px-Ecken) |
| Z2 · S2 | `ui_tooltip` (Teil) | `ui_tooltip_zeiger` | 6×4 | Tooltip-Zeiger (Dreieck, zeigt nach unten) |
| Z2 · S3 | `ui_arrow_left/_right` | `ui_arrow_left` | 12×12 | Pfeil ◄ (BIOS-Stufenwahl) |
| Z2 · S4 | `ui_arrow_left/_right` | `ui_arrow_right` | 12×12 | Pfeil ► |
| Z3 · S1 | `ui_receipt_paper / ui_receipt_edge` | `ui_receipt_edge` | 8×4 | Kassenbon-Zackenrand (8×4 Kachel) |
| Z3 · S2 | `ui_sheet_handle` | `ui_sheet_handle` | 32×4 | Griff des Bottom-Sheets |
| Z3 · S3 | `ui_slider_track / ui_slider_knob` | `ui_slider_knob` | 8×12 | Regler-Knauf 8×12 |
| Z3 · S4 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_ui_small_32x16.png
Target size: 128x48 px = 4 columns x 3 rows of 32x16 px cells, no gaps, no margins. Generate it at x12 (1536x576 px): one art pixel = 12x12 output pixels, one cell = 384x192 output pixels.
THEME: small UI widgets in the same retro style as the panels. Sprites are smaller than the cell: center them.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–2 ROW OF 2 FRAMES (animation or states, left to right), "ui_tab" — EXACT SIZE 24x16 art px (288x192 output px) per frame, centered in the 32x16 cell: TAB, 2 frames: active (bright #43435f, open at the bottom) and inactive (dark #2a2a44, lowered look)
 - R1C3–4 ROW OF 2 FRAMES (animation or states, left to right), "ui_toggle" — EXACT SIZE 24x12 art px (288x144 output px) per frame, centered in the 32x16 cell: TOGGLE switch, 2 frames: ON (green #3fbf5f track, knob right) and OFF (grey #43435f track, knob left)
 - R2C1 "ui_tooltip" — EXACT SIZE 16x16 art px (192x192 output px), centered in the 32x16 cell: tooltip box, near-black #1a1a2e fill, #9b9bb4 border, 4px corners
 - R2C2 "ui_tooltip_zeiger" — EXACT SIZE 6x4 art px (72x48 output px), centered in the 32x16 cell: tiny downward-pointing pointer triangle for the tooltip, 6x4 px, same colors
 - R2C3 "ui_arrow_left" — EXACT SIZE 12x12 art px (144x144 output px), centered in the 32x16 cell: left-pointing triangle arrow button, 12x12, steel with light edge
 - R2C4 "ui_arrow_right" — EXACT SIZE 12x12 art px (144x144 output px), centered in the 32x16 cell: right-pointing triangle arrow button, 12x12, same style
 - R3C1 "ui_receipt_edge" — EXACT SIZE 8x4 art px (96x48 output px), centered in the 32x16 cell: receipt zig-zag torn edge, seamless horizontal tile 8x4 px, #cfd0e0 paper color
 - R3C2 "ui_sheet_handle" — EXACT SIZE 32x4 art px (384x48 output px), centered in the 32x16 cell: bottom-sheet drag handle: a rounded horizontal bar 32x4 px in #9b9bb4
 - R3C3 "ui_slider_knob" — EXACT SIZE 8x12 art px (96x144 output px), centered in the 32x16 cell: slider knob 8x12 px, steel #9b9bb4 with highlight, vertical grip lines
 - R3C4 empty (flat #808080)

SIZE CHECK: 24x16 art px (288x192 output px): ui_tab; 24x12 art px (288x144 output px): ui_toggle; 16x16 art px (192x192 output px): ui_tooltip; 6x4 art px (72x48 output px): ui_tooltip_zeiger; 12x12 art px (144x144 output px): ui_arrow_left, ui_arrow_right; 8x4 art px (96x48 output px): ui_receipt_edge; 32x4 art px (384x48 output px): ui_sheet_handle; 8x12 art px (96x144 output px): ui_slider_knob; cell 32x16 (384x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S03 · `sheet_ui_bars_160x12.png` – UI: Balken (Thermometer, Watt, Score, Slider-Spur)

- **Zelle:** 160×12 px · **Raster:** 1 Spalten × 9 Zeilen · **Gesamt:** 160×108 px
- **Sprites:** 7 · **belegte Zellen:** 9 von 9 · **KI-Größe:** ×8 = 1280×864 px
- **Hinweis:** Ausnahme von „Frames horizontal“: Die 3 Farbzustände der Watt-Füllung stehen untereinander (sonst wäre das Blatt 480 px breit).

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `ui_thermo_h_frame` | `ui_thermo_h_frame` | 128×12 | Thermometer waagerecht, Rahmen, Marken bei 85/100 °C |
| Z2 · S1 | `ui_thermo_h_fill` | `ui_thermo_h_fill` | 120×6 | Thermometer-Füllung, Verlauf kalt→heiß |
| Z3 · S1 | `ui_wattbar_frame` | `ui_wattbar_frame` | 128×12 | Watt-Leiste, Rahmen mit Blitz-Kerbe |
| Z4 · S1 | `ui_wattbar_fill` | `ui_wattbar_fill_0` | 120×6 | Watt-Füllung grün (niedrige Last) |
| Z5 · S1 | `ui_wattbar_fill` (Teil) | `ui_wattbar_fill_1` | 120×6 | Watt-Füllung gelb (mittlere Last) |
| Z6 · S1 | `ui_wattbar_fill` (Teil) | `ui_wattbar_fill_2` | 120×6 | Watt-Füllung rot (Überlast) |
| Z7 · S1 | `ui_scorebar_frame` | `ui_scorebar_frame` | 160×8 | Score-Leiste, Rahmen (Fortschritt zum Ziel) |
| Z8 · S1 | `ui_scorebar_fill` | `ui_scorebar_fill` | 156×4 | Score-Füllung 156×4, Ziel-Markierung am Ende |
| Z9 · S1 | `ui_slider_track / ui_slider_knob` | `ui_slider_track` | 64×8 | Regler-Spur 64×8 |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_ui_bars_160x12.png
Target size: 160x108 px = 1 columns x 9 rows of 160x12 px cells, no gaps, no margins. Generate it at x8 (1280x864 px): one art pixel = 8x8 output pixels, one cell = 1280x96 output pixels.
THEME: horizontal HUD bars. One bar per row, bars centered horizontally and vertically in the 160x12 row. Frames are empty containers, fills are separate rows. Fills are drawn full length (the engine clips them).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "ui_thermo_h_frame" — EXACT SIZE 128x12 art px (1024x96 output px), centered in the 160x12 cell: horizontal thermometer frame 128x12: empty glass tube with steel end caps, tick marks at 85% and 100% positions (small red ticks), hollow inside dark #1a1a2e
 - R2C1 "ui_thermo_h_fill" — EXACT SIZE 120x6 art px (960x48 output px), centered in the 160x12 cell: thermometer fill 120x6, full length, left-to-right banded gradient: #8cc4ff, #ffd23f, #ff8a2e, #e8432d (hard bands, no smooth gradient)
 - R3C1 "ui_wattbar_frame" — EXACT SIZE 128x12 art px (1024x96 output px), centered in the 160x12 cell: power bar frame 128x12, empty dark tube with a small lightning-bolt notch icon at the left end
 - R4C1 "ui_wattbar_fill_0" — EXACT SIZE 120x6 art px (960x48 output px), centered in the 160x12 cell: power bar fill 120x6, solid green #3fbf5f with #a8f07a top line and #1f7a3a bottom line
 - R5C1 "ui_wattbar_fill_1" — EXACT SIZE 120x6 art px (960x48 output px), centered in the 160x12 cell: same fill in yellow-amber #ffd23f with light top line and #ff8a2e bottom line
 - R6C1 "ui_wattbar_fill_2" — EXACT SIZE 120x6 art px (960x48 output px), centered in the 160x12 cell: same fill in red #e8432d with light top line and #8c1c2b bottom line
 - R7C1 "ui_scorebar_frame" — EXACT SIZE 160x8 art px (1280x64 output px), centered in the 160x12 cell: score progress bar frame 160x8, thin dark tube
 - R8C1 "ui_scorebar_fill" — EXACT SIZE 156x4 art px (1248x32 output px), centered in the 160x12 cell: score fill 156x4, gold #e0a848 with #ffe28a top line; the right end has a small flag-like end marker
 - R9C1 "ui_slider_track" — EXACT SIZE 64x8 art px (512x64 output px), centered in the 160x12 cell: slider track 64x8, dark groove #1a1a2e with #43435f bevel

SIZE CHECK: 128x12 art px (1024x96 output px): ui_thermo_h_frame, ui_wattbar_frame; 120x6 art px (960x48 output px): ui_thermo_h_fill, ui_wattbar_fill_0, ui_wattbar_fill_1, ui_wattbar_fill_2; 160x8 art px (1280x64 output px): ui_scorebar_frame; 156x4 art px (1248x32 output px): ui_scorebar_fill; 64x8 art px (512x64 output px): ui_slider_track; cell 160x12 (1280x96 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S04 · `sheet_ui_boxes_56x24.png` – UI: Wertboxen L/Takt, Preisschild, Stempel

- **Zelle:** 56×24 px · **Raster:** 3 Spalten × 3 Zeilen · **Gesamt:** 168×72 px
- **Sprites:** 4 · **belegte Zellen:** 8 von 9 · **KI-Größe:** ×8 = 1344×576 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–3 | `ui_box_leistung` | `ui_box_leistung_0` … `ui_box_leistung_2` | 56×24 · 3 Fr. | Blaue Wertbox L: normal, Puls 1, Puls 2 |
| Z2 · S1–3 | `ui_box_takt` | `ui_box_takt_0` … `ui_box_takt_2` | 56×24 · 3 Fr. | Rote Wertbox Takt: normal, Puls 1, Puls 2 |
| Z3 · S1 | `ui_price_tag` | `ui_price_tag` | 28×12 | Preisschild (Zahl per Font) |
| Z3 · S2 | `ui_sold_stamp` | `ui_sold_stamp` | 40×20 | Stempel „Verkauft“ (nur Form) |
| Z3 · S3 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_ui_boxes_56x24.png
Target size: 168x72 px = 3 columns x 3 rows of 56x24 px cells, no gaps, no margins. Generate it at x8 (1344x576 px): one art pixel = 8x8 output pixels, one cell = 448x192 output pixels.
THEME: HUD value boxes: empty (the number is drawn by the engine in the middle).

CELLS in reading order (R = row, S = column in the row):
 - R1C1–3 ROW OF 3 FRAMES (animation or states, left to right), "ui_box_leistung" — EXACT SIZE 56x24 art px (448x192 output px) per frame, fills the whole cell: BLUE value box 56x24 (performance), 3 frames: normal (dark blue #1f3f9a fill, #3a7bf0 border, small chip symbol area at left), pulse 1 (brighter fill, border #8cc4ff), pulse 2 (brightest, 1px bigger glow ring inside the box)
 - R2C1–3 ROW OF 3 FRAMES (animation or states, left to right), "ui_box_takt" — EXACT SIZE 56x24 art px (448x192 output px) per frame, fills the whole cell: RED value box 56x24 (clock), 3 frames: normal (#8c1c2b fill, #e8432d border, small sine-wave symbol area at left), pulse 1 (brighter), pulse 2 (brightest, glow ring)
 - R3C1 "ui_price_tag" — EXACT SIZE 28x12 art px (224x96 output px), centered in the 56x24 cell: price tag 28x12: gold #e0a848 label with a small hole and string end at the left, empty interior
 - R3C2 "ui_sold_stamp" — EXACT SIZE 40x20 art px (320x160 output px), centered in the 56x24 cell: rubber-stamp shape 40x20: rounded rectangle with double border in #e8432d, empty interior (no text), slightly worn look through missing pixels
 - R3C3 empty (flat #808080)

SIZE CHECK: 56x24 art px (448x192 output px): ui_box_leistung, ui_box_takt; 28x12 art px (224x96 output px): ui_price_tag; 40x20 art px (320x160 output px): ui_sold_stamp; cell 56x24 (448x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S05 · `sheet_tall_16x96.png` – Hohe Teile: DIMM-Slots, RAM-Riegel, vertikales Thermometer

- **Zelle:** 16×96 px · **Raster:** 8 Spalten × 2 Zeilen · **Gesamt:** 128×192 px
- **Sprites:** 7 · **belegte Zellen:** 15 von 16 · **KI-Größe:** ×8 = 1024×1536 px (zwei Hälften zu je 1024×768 px, siehe unten)

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `slot_dimm_ddr4 / slot_dimm_ddr5` | `slot_dimm_ddr4` | 6×88 | DIMM-Slot DDR4 (Kerbe unten) |
| Z1 · S2 | `slot_dimm_ddr4 / slot_dimm_ddr5` | `slot_dimm_ddr5` | 6×88 | DIMM-Slot DDR5 (Kerbe mittig) |
| Z1 · S3 | `ram_stick_plain/_hs/_rgb` | `ram_stick_plain` | 6×88 | RAM-Riegel nackt |
| Z1 · S4 | `ram_stick_plain/_hs/_rgb` | `ram_stick_hs` | 6×88 | RAM-Riegel mit Heatspreader |
| Z1 · S5–6 | `ui_thermo_v_frame` | `ui_thermo_v_frame_0` … `ui_thermo_v_frame_1` | 16×96 · 2 Fr. | Thermometer senkrecht mit Kolben: normal, Warnblinken |
| Z1 · S7 | `ui_thermo_v_fill` | `ui_thermo_v_fill` | 6×80 | Vertikale Füllung, Verlauf |
| Z1 · S8 | – | (leer) | – | – |
| Z2 · S1–8 | `ram_stick_plain/_hs/_rgb` | `ram_stick_rgb_0` … `ram_stick_rgb_7` | 6×88 · 8 Fr. | RAM-Riegel mit RGB: Lichtleiste läuft durch (8 Frames) |

**Zwei Prompts statt einem:** Die KI hielt die Maße bei diesem hohen Sheet nicht ein. Darum wird S05 in zwei Hälften erzeugt, die einzeln gesendet werden. Ziel-Sheet (`sheet_tall_16x96.png`, 128×192 px) und Belegungstabelle bleiben unverändert.

- **S05a** = Zeile 1 (Slots, Riegel, Thermometer), **S05b** = Zeile 2 (RGB-Riegel, 8 Frames).
- Jede Hälfte ist für sich 128×96 px, bei ×8 also 1024×768 px, Zellen 16×96.
- **Zusammensetzen:** Jede Hälfte mit dem Werkzeug säubern (`--size 128x96 --cell 16x96`, siehe 6.4), danach untereinander stapeln (a oben, b unten), zum Beispiel mit `magick a.png b.png -append`. Das Ergebnis ist das 128×192-Sheet.
- **Wichtig:** Slots und Riegel sind gleich groß (**6×88**), damit sie ineinanderpassen. Bei jeder Abweichung neu erzeugen.

**Prompt S05a – Zeile 1:**

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_tall_16x96.png, PART A (row 1) (generated alone, assembled afterwards)
Target size: 128x96 px = 8 columns x 1 row of 16x96 px cells, no gaps, no margins. Generate it at x8 (1024x768 px): one art pixel = 8x8 output pixels, one cell = 128x768 output pixels. The image is LANDSCAPE 1024 wide and 768 tall, one single row of 8 tall cells.
THEME: tall thin vertical items, frontal view, upright. Items are narrower than the cell: center them horizontally. Slots and sticks are the SAME size (6x88 art px = 48x704 output px) because the sticks must fit into the slots later.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "slot_dimm_ddr4" — EXACT SIZE 6x88 art px (48x704 output px), centered in the 16x96 cell: empty DIMM slot 6x88: dark slot body #2a2a44 with latch clips top and bottom, key notch located at about 60% height from the top (DDR4)
 - R1C2 "slot_dimm_ddr5" — EXACT SIZE 6x88 art px (48x704 output px), centered in the 16x96 cell: empty DIMM slot 6x88, same as DDR4 but the key notch at about 45% height (clearly different position)
 - R1C3 "ram_stick_plain" — EXACT SIZE 6x88 art px (48x704 output px), centered in the 16x96 cell: RAM stick 6x88, bare green PCB (#1d4a2c / #2e7040), black memory chips, gold contacts at the bottom, notch
 - R1C4 "ram_stick_hs" — EXACT SIZE 6x88 art px (48x704 output px), centered in the 16x96 cell: RAM stick 6x88 with steel heat spreader (#6a6a88 / #9b9bb4) covering the chips, gold contacts at the bottom
 - R1C5–6 ROW OF 2 FRAMES (animation or states, left to right), "ui_thermo_v_frame" — EXACT SIZE 16x96 art px (128x768 output px) per frame, fills the whole cell: vertical thermometer frame 16x96 with a round bulb at the bottom, empty glass tube, tick marks; frame 2: same but frame/bulb outline flashes red #e8432d (warning)
 - R1C7 "ui_thermo_v_fill" — EXACT SIZE 6x80 art px (48x640 output px), centered in the 16x96 cell: vertical thermometer fill 6x80 full length, banded gradient bottom to top: #8cc4ff, #ffd23f, #ff8a2e, #e8432d
 - R1C8 empty (flat #808080)
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "ram_stick_rgb" — EXACT SIZE 6x88 art px (48x704 output px) per frame, centered in the 16x96 cell: RAM stick 6x88 with black heat spreader and a vertical light bar at the top edge drawn ONLY in RGB key color #00ffff; 8 frames: a bright 6px segment of the light bar moves from top to bottom, the remaining bar is dim #00ffff-free dark grey #43435f

SIZE CHECK: slot_dimm_ddr4, slot_dimm_ddr5, ram_stick_plain, ram_stick_hs are each EXACTLY 6x88 art px (48x704 output px), the same size as every RAM stick; ui_thermo_v_frame is 16x96 art px (128x768 output px) per frame and fills its cell; ui_thermo_v_fill is 6x80 art px (48x640 output px); cell 16x96 (128x768 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

**Prompt S05b – Zeile 2:**

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_tall_16x96.png, PART B (row 2) (generated alone, assembled afterwards)
Target size: 128x96 px = 8 columns x 1 row of 16x96 px cells, no gaps, no margins. Generate it at x8 (1024x768 px): one art pixel = 8x8 output pixels, one cell = 128x768 output pixels. The image is LANDSCAPE 1024 wide and 768 tall, one single row of 8 tall cells.
THEME: tall thin vertical items, frontal view, upright. Items are narrower than the cell: center them horizontally. All 8 frames are the same RAM stick, 6x88 art px (48x704 output px), the same size as the sticks and DIMM slots of part A.
KEY COLOR FOR THIS SHEET: every RGB light element (light bar, ring, glowing fan ring, lit fans) is ONE flat tone #00ffff, no shading inside it. The engine cycles it through rainbow colors. Use #00ffff for nothing else; for other cyan things use the palette cyan #2ef2ff.

CELLS in reading order (R = row, S = column in the row):
undefined

SIZE CHECK: all 8 frames are EXACTLY 6x88 art px (48x704 output px) each, centered in a 16x96 cell (128x768 output px). Same size and same position in every frame. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else.
```

### S06 · `sheet_ui_slots_40x40.png` – UI: Leere Slots und Mini-Rahmen für Software

- **Zelle:** 40×40 px · **Raster:** 6 Spalten × 2 Zeilen · **Gesamt:** 240×80 px
- **Sprites:** 6 · **belegte Zellen:** 11 von 12 · **KI-Größe:** ×6 = 1440×480 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `ui_slot_empty_software_mini` | `ui_slot_empty_software_mini` | 36×36 | Leerer Software-Slot (Leiste) |
| Z1 · S2 | `ui_slot_empty_lager` | `ui_slot_empty_lager` | 40×40 | Leerer Lagerplatz (Karton-Umriss) |
| Z1 · S3 | `ui_slot_empty_tool` | `ui_slot_empty_tool` | 28×28 | Leerer Werkzeug-Slot |
| Z1 · S4 | `ui_mini_frame_software` | `ui_mini_frame_software_g` | 36×36 | Mini-Rahmen Software gewöhnlich |
| Z1 · S5 | `ui_mini_frame_software` | `ui_mini_frame_software_s` | 36×36 | Mini-Rahmen Software selten |
| Z1 · S6 | – | (leer) | – | – |
| Z2 · S1–6 | `ui_mini_frame_software` | `ui_mini_frame_software_l_0` … `ui_mini_frame_software_l_5` | 36×36 · 6 Fr. | Mini-Rahmen Software legendär: Schimmer (6 Frames) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_ui_slots_40x40.png
Target size: 240x80 px = 6 columns x 2 rows of 40x40 px cells, no gaps, no margins. Generate it at x6 (1440x480 px): one art pixel = 6x6 output pixels, one cell = 240x240 output pixels.
THEME: empty inventory slots and small frames. Slots are hollow dark containers (inside flat #1a1a2e) with a faint silhouette hint; frames for chips are hollow in the middle (flat #808080 or flat #1a1a2e).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "ui_slot_empty_software_mini" — EXACT SIZE 36x36 art px (216x216 output px), centered in the 40x40 cell: empty software slot 36x36: dashed #43435f border, a very faint floppy-disk silhouette in #2a2a44 inside
 - R1C2 "ui_slot_empty_lager" — EXACT SIZE 40x40 art px (240x240 output px), fills the whole cell: empty storage slot 40x40: dashed border, faint cardboard-box outline in #2a2a44 inside
 - R1C3 "ui_slot_empty_tool" — EXACT SIZE 28x28 art px (168x168 output px), centered in the 40x40 cell: empty tool slot 28x28: dashed border, faint wrench outline inside
 - R1C4 "ui_mini_frame_software_g" — EXACT SIZE 36x36 art px (216x216 output px), centered in the 40x40 cell: small frame 36x36 for a software chip, COMMON rarity: plain steel frame #6a6a88 / #9b9bb4
 - R1C5 "ui_mini_frame_software_s" — EXACT SIZE 36x36 art px (216x216 output px), centered in the 40x40 cell: same frame, RARE rarity: blue #3a7bf0 / #8cc4ff frame with small corner studs
 - R1C6 empty (flat #808080)
 - R2C1–6 ROW OF 6 FRAMES (animation or states, left to right), "ui_mini_frame_software_l" — EXACT SIZE 36x36 art px (216x216 output px) per frame, centered in the 40x40 cell: same frame, LEGENDARY rarity: gold #e0a848 / #ffe28a frame; 6 frames: a diagonal shimmer of 2 bright pixels (#f4f4fa) sweeps once around the frame; the frame corners carry small pink #ff3fa4 / cyan #2ef2ff gems

SIZE CHECK: 36x36 art px (216x216 output px): ui_slot_empty_software_mini, ui_mini_frame_software_g, ui_mini_frame_software_s, ui_mini_frame_software_l; 40x40 art px (240x240 output px): ui_slot_empty_lager; 28x28 art px (168x168 output px): ui_slot_empty_tool; cell 40x40 (240x240 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S07 · `sheet_icons16_werte_16.png` – Icons 16×16 (A): Werte, Kartentypen, Status

- **Zelle:** 16×16 px · **Raster:** 6 Spalten × 4 Zeilen · **Gesamt:** 96×64 px
- **Sprites:** 24 · **belegte Zellen:** 24 von 24 · **KI-Größe:** ×16 = 1536×1024 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon16_*` | `icon16_leistung` | 16×16 | Leistung: Chip, blau |
| Z1 · S2 | `icon16_*` | `icon16_takt` | 16×16 | Takt: Sinuswelle, rot |
| Z1 · S3 | `icon16_*` | `icon16_xtakt` | 16×16 | ×Takt: ×-Welle |
| Z1 · S4 | `icon16_*` | `icon16_hitze` | 16×16 | Hitze: Flamme |
| Z1 · S5 | `icon16_*` | `icon16_kuehlung` | 16×16 | Kühlung: Schneeflocke |
| Z1 · S6 | `icon16_*` | `icon16_watt` | 16×16 | Watt: Blitz |
| Z2 · S1 | `icon16_*` | `icon16_geld` | 16×16 | Geld: Münze |
| Z2 · S2 | `icon16_*` | `icon16_durchlauf` | 16×16 | Durchlauf: ▶ |
| Z2 · S3 | `icon16_*` | `icon16_neuprio` | 16×16 | Neu-Prio: ↻ |
| Z2 · S4 | `icon16_*` | `icon16_deck` | 16×16 | Deck: Kartenstapel |
| Z2 · S5 | `icon16_*` | `icon16_ablage` | 16×16 | Ablage: Karte im Ablagefach |
| Z2 · S6 | `icon16_*` | `icon16_kerne` | 16×16 | Kerne: Chip mit Kernen |
| Z3 · S1 | `icon16_*` | `icon16_handgroesse` | 16×16 | Handgröße: RAM-Riegel |
| Z3 · S2 | `icon16_*` | `icon16_softwareslot` | 16×16 | Software-Slot: Diskette |
| Z3 · S3 | `icon16_*` | `icon16_lanes` | 16×16 | Lanes: Bus-Linien |
| Z3 · S4 | `icon16_*` | `icon16_generation` | 16×16 | Generation: Chip mit „G“ |
| Z3 · S5 | `card_typeicon16_*` | `card_typeicon16_cpu` | 16×16 | Typ CPU: Chip (blau) |
| Z3 · S6 | `card_typeicon16_*` | `card_typeicon16_gpu` | 16×16 | Typ GPU: Lüfter (grün) |
| Z4 · S1 | `card_typeicon16_*` | `card_typeicon16_ram` | 16×16 | Typ RAM: Riegel (amber) |
| Z4 · S2 | `card_typeicon16_*` | `card_typeicon16_io` | 16×16 | Typ I/O: Stecker (violett) |
| Z4 · S3 | `icon16_*` | `icon16_kompat_ok` | 16×16 | Kompat OK: ✔ grün |
| Z4 · S4 | `icon16_*` | `icon16_kompat_warn` | 16×16 | Kompat Warnung: ⚠ gelb |
| Z4 · S5 | `icon16_*` | `icon16_kompat_nein` | 16×16 | Kompat Nein: ✖ rot |
| Z4 · S6 | `icon16_*` | `icon16_warnung` | 16×16 | Warnung: ! |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_icons16_werte_16.png
Target size: 96x64 px = 6 columns x 4 rows of 16x16 px cells, no gaps, no margins. Generate it at x16 (1536x1024 px): one art pixel = 16x16 output pixels, one cell = 256x256 output pixels.
THEME: 16x16 UI icons, one clear symbol each, bold silhouette, max 3 colors + outline. Types and states always differ by SHAPE as well as by color.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon16_leistung" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: CPU chip, blue (#3a7bf0, #1f3f9a), square with pins
 - R1C2 "icon16_takt" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: sine wave line, red #e8432d on dark rounded square
 - R1C3 "icon16_xtakt" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: sine wave with a large multiplication cross (x) symbol, red/white
 - R1C4 "icon16_hitze" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: flame, #ffd23f core, #ff8a2e, #e8432d outer
 - R1C5 "icon16_kuehlung" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: snowflake, #8cc4ff / #f4f4fa
 - R1C6 "icon16_watt" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: lightning bolt, yellow #ffd23f
 - R2C1 "icon16_geld" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: coin, gold #e0a848 / #ffe28a, round with a slot-like emboss (no number)
 - R2C2 "icon16_durchlauf" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: play triangle pointing right, green #3fbf5f
 - R2C3 "icon16_neuprio" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: circular refresh arrow, red/orange
 - R2C4 "icon16_deck" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: stack of 3 cards seen from the front, offset, steel
 - R2C5 "icon16_ablage" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: discard pile: one card lying flat in a tray, grey
 - R2C6 "icon16_kerne" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: chip with a 2x2 grid of cores inside, blue
 - R3C1 "icon16_handgroesse" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: a single RAM stick horizontal, amber #f2b233
 - R3C2 "icon16_softwareslot" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: floppy disk, violet/steel
 - R3C3 "icon16_lanes" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: 3 parallel data bus lines with small arrowheads, cyan #2ef2ff
 - R3C4 "icon16_generation" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: chip symbol with a pixel-drawn letter-free "G"-like spiral emblem in the center (no real letter)
 - R3C5 "card_typeicon16_cpu" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: CPU chip with pins, blue #3a7bf0, larger and bolder than the stat icon
 - R3C6 "card_typeicon16_gpu" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: fan with 5 blades seen from the front, green #3fbf5f
 - R4C1 "card_typeicon16_ram" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: RAM stick with chips, amber #f2b233
 - R4C2 "card_typeicon16_io" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: plug / USB-style connector, violet #a05cf0
 - R4C3 "icon16_kompat_ok" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: check mark, green #3fbf5f, on round dark badge
 - R4C4 "icon16_kompat_warn" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: warning triangle, yellow #ffd23f, with exclamation shape (no letter)
 - R4C5 "icon16_kompat_nein" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: cross mark, red #e8432d, on round dark badge
 - R4C6 "icon16_warnung" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: exclamation mark in a red octagon-free rounded square, red #e8432d, white mark

SIZE CHECK: every sprite is exactly 16x16 art px (256x256 output px) in a 16x16 cell (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S08 · `sheet_icons16_menue_16.png` – Icons 16×16 (B): Menü, Werkbank, Sortierung

- **Zelle:** 16×16 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 96×48 px
- **Sprites:** 18 · **belegte Zellen:** 18 von 18 · **KI-Größe:** ×16 = 1536×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon16_*` | `icon16_einstellungen` | 16×16 | Einstellungen: Zahnrad |
| Z1 · S2 | `icon16_*` | `icon16_ton_an` | 16×16 | Ton an: Lautsprecher mit Wellen |
| Z1 · S3 | `icon16_*` | `icon16_ton_aus` | 16×16 | Ton aus: Lautsprecher durchgestrichen |
| Z1 · S4 | `icon16_*` | `icon16_info` | 16×16 | Info: i-Kreis |
| Z1 · S5 | `icon16_*` | `icon16_zurueck` | 16×16 | Zurück: Pfeil |
| Z1 · S6 | `icon16_*` | `icon16_lager` | 16×16 | Lager: Karton |
| Z2 · S1 | `icon16_*` | `icon16_werkbank` | 16×16 | Werkbank: Schraubenzieher |
| Z2 · S2 | `icon16_*` | `icon16_bios` | 16×16 | BIOS: ROM-Chip |
| Z2 · S3 | `icon16_*` | `icon16_neu_wuerfeln` | 16×16 | Neu würfeln: Würfel |
| Z2 · S4 | `icon16_*` | `icon16_oc` | 16×16 | OC: Tacho |
| Z2 · S5 | `icon16_*` | `icon16_rgb` | 16×16 | RGB: Regenbogen |
| Z2 · S6 | `icon16_*` | `icon16_schloss` | 16×16 | Schloss |
| Z3 · S1 | `icon16_*` | `icon16_sortieren_stufe` | 16×16 | Sortieren nach Stufe |
| Z3 · S2 | `icon16_*` | `icon16_sortieren_typ` | 16×16 | Sortieren nach Typ |
| Z3 · S3 | `icon16_*` | `icon16_pause` | 16×16 | Pause |
| Z3 · S4 | `icon16_*` | `icon16_tempo` | 16×16 | Tempo: » |
| Z3 · S5 | `icon16_*` | `icon16_verkaufen` | 16×16 | Verkaufen: $-Pfeil |
| Z3 · S6 | `icon16_*` | `icon16_post` | 16×16 | POST: Debug-LED |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_icons16_menue_16.png
Target size: 96x48 px = 6 columns x 3 rows of 16x16 px cells, no gaps, no margins. Generate it at x16 (1536x768 px): one art pixel = 16x16 output pixels, one cell = 256x256 output pixels.
THEME: 16x16 UI icons, one clear symbol each, bold silhouette, max 3 colors + outline.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon16_einstellungen" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: gear, steel
 - R1C2 "icon16_ton_an" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: speaker with 2 sound waves
 - R1C3 "icon16_ton_aus" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: speaker with a red diagonal cross-out
 - R1C4 "icon16_info" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: round blue badge with an "i"-shaped dot and bar (symbol, not font)
 - R1C5 "icon16_zurueck" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: curved back arrow pointing left
 - R1C6 "icon16_lager" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: cardboard box, copper #a8642a / #5a3216
 - R2C1 "icon16_werkbank" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: screwdriver, upright, red handle
 - R2C2 "icon16_bios" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: small ROM chip with a label sticker, dark blue
 - R2C3 "icon16_neu_wuerfeln" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: die with 5 pips, white, front face only
 - R2C4 "icon16_oc" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: speedometer dial with needle in the red zone
 - R2C5 "icon16_rgb" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: rainbow arc: #e8432d, #ffd23f, #3fbf5f, #2ef2ff, #ff3fa4 (drawn with plain palette colors, no key color)
 - R2C6 "icon16_schloss" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: padlock, gold/steel
 - R3C1 "icon16_sortieren_stufe" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: three horizontal bars of increasing length with a down arrow
 - R3C2 "icon16_sortieren_typ" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: four small shapes (square, circle, triangle, diamond) in a row with a down arrow
 - R3C3 "icon16_pause" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: two vertical bars
 - R3C4 "icon16_tempo" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: double chevron pointing right
 - R3C5 "icon16_verkaufen" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: coin with an arrow pointing out of it to the right (no letter)
 - R3C6 "icon16_post" — EXACT SIZE 16x16 art px (256x256 output px), fills the whole cell: a round LED lamp on a tiny circuit board, red glow center

SIZE CHECK: every sprite is exactly 16x16 art px (256x256 output px) in a 16x16 cell (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S09 · `sheet_icons8_static_8.png` – Icons 8×8: Inline-Icons, Typ-Symbole klein, Edelsteine

- **Zelle:** 8×8 px · **Raster:** 5 Spalten × 4 Zeilen · **Gesamt:** 40×32 px
- **Sprites:** 19 · **belegte Zellen:** 19 von 20 · **KI-Größe:** ×16 = 640×512 px
- **Hinweis:** Alle Edelsteine haben dieselbe Form (Raute, 8×8), nur die Farbe unterscheidet sich zusätzlich durch die Anzahl der Glanzpixel (Tier 0 = 0 … Tier 4 = 4).

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon8_*` | `icon8_leistung` | 8×8 | Leistung: Chip blau |
| Z1 · S2 | `icon8_*` | `icon8_takt` | 8×8 | Takt: Welle rot |
| Z1 · S3 | `icon8_*` | `icon8_hitze` | 8×8 | Hitze: Flamme |
| Z1 · S4 | `icon8_*` | `icon8_kuehlung` | 8×8 | Kühlung: Flocke |
| Z1 · S5 | `icon8_*` | `icon8_watt` | 8×8 | Watt: Blitz |
| Z2 · S1 | `icon8_*` | `icon8_geld` | 8×8 | Geld: Münze |
| Z2 · S2 | `icon8_*` | `icon8_kerne` | 8×8 | Kerne: Chip 2×2 |
| Z2 · S3 | `icon8_*` | `icon8_lanes` | 8×8 | Lanes: Linien |
| Z2 · S4 | `icon8_*` | `icon8_durchlauf` | 8×8 | Durchlauf ▶ |
| Z2 · S5 | `icon8_*` | `icon8_neuprio` | 8×8 | Neu-Prio ↻ |
| Z3 · S1 | `card_typeicon8_*` | `card_typeicon8_cpu` | 8×8 | Typ CPU klein |
| Z3 · S2 | `card_typeicon8_*` | `card_typeicon8_gpu` | 8×8 | Typ GPU klein |
| Z3 · S3 | `card_typeicon8_*` | `card_typeicon8_ram` | 8×8 | Typ RAM klein |
| Z3 · S4 | `card_typeicon8_*` | `card_typeicon8_io` | 8×8 | Typ I/O klein |
| Z3 · S5 | – | (leer) | – | – |
| Z4 · S1 | `gem_tier_0…4` | `gem_tier_0` | 8×8 | Edelstein Tier 0 grau |
| Z4 · S2 | `gem_tier_0…4` | `gem_tier_1` | 8×8 | Edelstein Tier 1 grün |
| Z4 · S3 | `gem_tier_0…4` | `gem_tier_2` | 8×8 | Edelstein Tier 2 blau |
| Z4 · S4 | `gem_tier_0…4` | `gem_tier_3` | 8×8 | Edelstein Tier 3 violett |
| Z4 · S5 | `gem_tier_0…4` | `gem_tier_4` | 8×8 | Edelstein Tier 4 gold |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_icons8_static_8.png
Target size: 40x32 px = 5 columns x 4 rows of 8x8 px cells, no gaps, no margins. Generate it at x16 (640x512 px): one art pixel = 16x16 output pixels, one cell = 128x128 output pixels.
THEME: tiny 8x8 icons. Extreme simplification: 1 clear shape, 2-3 colors, outline mandatory. They must be readable at 1x.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon8_leistung" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: blue chip
 - R1C2 "icon8_takt" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: red wave
 - R1C3 "icon8_hitze" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: orange flame
 - R1C4 "icon8_kuehlung" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: ice-blue snowflake
 - R1C5 "icon8_watt" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: yellow bolt
 - R2C1 "icon8_geld" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: gold coin
 - R2C2 "icon8_kerne" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: chip with 4 dots
 - R2C3 "icon8_lanes" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: 3 cyan lines
 - R2C4 "icon8_durchlauf" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: green play triangle
 - R2C5 "icon8_neuprio" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: circular arrow, red
 - R3C1 "card_typeicon8_cpu" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: chip, blue (type symbol for card corner)
 - R3C2 "card_typeicon8_gpu" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: fan/propeller, green
 - R3C3 "card_typeicon8_ram" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: RAM stick, amber
 - R3C4 "card_typeicon8_io" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: plug, violet
 - R3C5 empty (flat #808080)
 - R4C1 "gem_tier_0" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: gem, grey (#6a6a88 / #9b9bb4 / #cfd0e0)
 - R4C2 "gem_tier_1" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: gem, green (#1f7a3a / #3fbf5f / #a8f07a)
 - R4C3 "gem_tier_2" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: gem, blue (#1f3f9a / #3a7bf0 / #8cc4ff)
 - R4C4 "gem_tier_3" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: gem, violet (#5a2a9a / #a05cf0 / #cfd0e0)
 - R4C5 "gem_tier_4" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: gem, gold (#b9781c / #e0a848 / #ffe28a)

SIZE CHECK: every sprite is exactly 8x8 art px (128x128 output px) in a 8x8 cell (128x128 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S10 · `sheet_card_frames_48x64.png` – Karten: Rahmen (Workload, Hardware, Software G/S, Treiber, Werkzeug), Rücken, Schatten

- **Zelle:** 48×64 px · **Raster:** 4 Spalten × 3 Zeilen · **Gesamt:** 192×192 px
- **Sprites:** 12 · **belegte Zellen:** 12 von 12 · **KI-Größe:** ×8 = 1536×1536 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_frame_cpu/_gpu/_ram/_io` | `card_frame_cpu` | 48×64 | Rahmen CPU (blaues Farbband) |
| Z1 · S2 | `card_frame_cpu/_gpu/_ram/_io` | `card_frame_gpu` | 48×64 | Rahmen GPU (grünes Band) |
| Z1 · S3 | `card_frame_cpu/_gpu/_ram/_io` | `card_frame_ram` | 48×64 | Rahmen RAM (ambra Band) |
| Z1 · S4 | `card_frame_cpu/_gpu/_ram/_io` | `card_frame_io` | 48×64 | Rahmen I/O (violettes Band) |
| Z2 · S1 | `card_frame_hardware` | `card_frame_hardware` | 48×64 | Hardware-Karte: Metallrahmen, Fenster 32×32, Edelstein-Fassung |
| Z2 · S2 | `card_frame_treiber` | `card_frame_treiber` | 48×64 | Treiber-Karte: Disketten-/CD-Optik |
| Z2 · S3 | `card_frame_tool` | `card_frame_tool` | 48×64 | Werkzeug-Karte: Werkzeugkasten-Optik |
| Z2 · S4 | `card_back` | `card_back` | 48×64 | Kartenrücken: Platine mit Logo-Chip |
| Z3 · S1 | `card_frame_software_g/_s/_l` | `card_frame_software_g` | 48×64 | Software-Karte gewöhnlich: Retro-OS-Fenster, grau |
| Z3 · S2 | `card_frame_software_g/_s/_l` | `card_frame_software_s` | 48×64 | Software-Karte selten: blau |
| Z3 · S3 | `card_shadow` | `card_shadow` | 48×64 | Weicher Pixel-Schatten (gedithert) |
| Z3 · S4 | `ui_slot_empty_software` | `ui_slot_empty_software` | 48×64 | Leerer Software-Slot (48×64) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_card_frames_48x64.png
Target size: 192x192 px = 4 columns x 3 rows of 48x64 px cells, no gaps, no margins. Generate it at x8 (1536x1536 px): one art pixel = 8x8 output pixels, one cell = 384x512 output pixels.
THEME: trading-card frames, frontal, 48x64, rounded pixel corners, 1px #0b0b12 outline. Frames are EMPTY templates (the engine adds art, level number, name text). Card layout (fixed, 48x64 px): header band y0-12; level field x3-14,y2-11 (EMPTY, number is drawn by the engine); type-icon field x33-44,y2-11 (EMPTY); illustration window x8-39,y15-38 (32x24, flat fill #1a1a2e); name field x4-43,y46-59 (EMPTY, flat #1a1a2e). Never draw text, numbers or icons in these fields.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_frame_cpu" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: CPU card frame: blue header band (#1f3f9a, #3a7bf0), dark slate body #2a2a44, steel inner borders
 - R1C2 "card_frame_gpu" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: GPU card frame: same layout, green header band (#1f7a3a, #3fbf5f)
 - R1C3 "card_frame_ram" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: RAM card frame: same layout, amber header band (#b9781c, #f2b233)
 - R1C4 "card_frame_io" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: I/O card frame: same layout, violet header band (#5a2a9a, #a05cf0)
 - R2C1 "card_frame_hardware" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: hardware card frame: brushed-metal border (#6a6a88, #9b9bb4, #cfd0e0), dark window 32x32 at x8-39,y10-41 (flat #1a1a2e), an EMPTY 8x8 gem socket in the top-right corner, empty name plate at the bottom y48-60
 - R2C2 "card_frame_treiber" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: driver card frame: shaped like a CD jewel case / floppy: light grey plastic border #9b9bb4, label area at the top, shutter notch
 - R2C3 "card_frame_tool" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: tool card frame: red toolbox look (#e8432d / #8c1c2b) with a steel carry handle at the top and rivets, empty art window
 - R2C4 "card_back" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: card back: green PCB pattern #1d4a2c with #2e7040 traces, a central square chip with a bold generic emblem (no text), steel border
 - R3C1 "card_frame_software_g" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: software card as retro OS window: title bar with 3 small window buttons (no text), steel-grey frame #6a6a88 (COMMON rarity), empty content area
 - R3C2 "card_frame_software_s" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: same window frame, RARE rarity: blue frame #3a7bf0 / #1f3f9a with light title bar
 - R3C3 "card_shadow" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: card drop shadow shape 48x64: ONLY #0b0b12 pixels in a checkerboard dither pattern, dense at the center and sparser toward the edges, rounded rectangle silhouette (the only sprite where dithering is allowed here)
 - R3C4 "ui_slot_empty_software" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: empty software slot 48x64: dashed #43435f border, faint floppy-disk silhouette in #2a2a44, interior flat #1a1a2e

SIZE CHECK: every sprite is exactly 48x64 art px (384x512 output px) in a 48x64 cell (384x512 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S11 · `sheet_card_overlays_48x64.png` – Karten: Verbesserungs-Overlays (Übertaktet, Effizient, Instabil, Debuff)

- **Zelle:** 48×64 px · **Raster:** 4 Spalten × 4 Zeilen · **Gesamt:** 192×256 px
- **Sprites:** 4 · **belegte Zellen:** 13 von 16 · **KI-Größe:** ×6 = 1152×1536 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–4 | `card_ov_uebertaktet` | `card_ov_uebertaktet_0` … `card_ov_uebertaktet_3` | 48×64 · 4 Fr. | Übertaktet: rote Flammen am Rand (4 Frames) |
| Z2 · S1–4 | `card_ov_effizient` | `card_ov_effizient_0` … `card_ov_effizient_3` | 48×64 · 4 Fr. | Effizient: Eisblau, Frostecken, Glitzern (4 Frames) |
| Z3 · S1–4 | `card_ov_instabil` | `card_ov_instabil_0` … `card_ov_instabil_3` | 48×64 · 4 Fr. | Instabil: Pixelversatz, Magenta/Cyan-Streifen (4 Frames) |
| Z4 · S1 | `card_ov_debuff` | `card_ov_debuff` | 48×64 | Debuff: abgedunkelt mit Schloss (Boss-gesperrt) |
| Z4 · S2–4 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_card_overlays_48x64.png
Target size: 192x256 px = 4 columns x 4 rows of 48x64 px cells, no gaps, no margins. Generate it at x6 (1152x1536 px): one art pixel = 6x6 output pixels, one cell = 288x384 output pixels.
THEME: card overlay effects, drawn ON TOP of a card: ONLY the border/edge effect is drawn, the INTERIOR (everything inside about 5px from the edge) is plain flat #808080 background. 4 frames per row for animations.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–4 ROW OF 4 FRAMES (animation or states, left to right), "card_ov_uebertaktet" — EXACT SIZE 48x64 art px (288x384 output px) per frame, fills the whole cell: OVERCLOCKED: flames licking along the card edge, colors #ffd23f, #ff8a2e, #e8432d, #8c1c2b; flames mostly at the top and sides; 4 frames with flame tips flickering to different heights
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "card_ov_effizient" — EXACT SIZE 48x64 art px (288x384 output px) per frame, fills the whole cell: EFFICIENT: ice-blue frost frame (#8cc4ff, #f4f4fa) with frost crystals in the 4 corners; 4 frames where 2-3 sparkle pixels appear at different positions
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "card_ov_instabil" — EXACT SIZE 48x64 art px (288x384 output px) per frame, fills the whole cell: UNSTABLE: glitch effect at the edge: horizontally displaced edge segments, thin magenta #ff3fa4 and cyan #2ef2ff stripes; each of the 4 frames has the glitch segments in different positions
 - R4C1 "card_ov_debuff" — EXACT SIZE 48x64 art px (288x384 output px), fills the whole cell: LOCKED: a dark checkerboard-dither overlay in #0b0b12 over the whole 48x64 area (50% density dither, NOT a blend) and a padlock symbol (gold/steel) in the center
 - R4C2–4 empty (flat #808080)

SIZE CHECK: every sprite is exactly 48x64 art px (288x384 output px) in a 48x64 cell (288x384 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S12 · `sheet_card_anim_52x68.png` – Karten: 6-Frame-Animationen (Optimiert, Software legendär) und Auswahlrahmen

- **Zelle:** 52×68 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 312×204 px
- **Sprites:** 3 · **belegte Zellen:** 16 von 18 · **KI-Größe:** ×4 = 1248×816 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–6 | `card_ov_optimiert` | `card_ov_optimiert_0` … `card_ov_optimiert_5` | 48×64 · 6 Fr. | Optimiert: Goldrahmen, Glanz läuft durch (6 Frames) |
| Z2 · S1–6 | `card_frame_software_g/_s/_l` | `card_frame_software_l_0` … `card_frame_software_l_5` | 48×64 · 6 Fr. | Software-Karte legendär: Regenbogen-Schimmer (6 Frames) |
| Z3 · S1–4 | `ui_card_highlight` | `ui_card_highlight_0` … `ui_card_highlight_3` | 52×68 · 4 Fr. | Auswahl-Leuchtrahmen, Puls (4 Frames) |
| Z3 · S5–6 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_card_anim_52x68.png
Target size: 312x204 px = 6 columns x 3 rows of 52x68 px cells, no gaps, no margins. Generate it at x4 (1248x816 px): one art pixel = 4x4 output pixels, one cell = 208x272 output pixels.
THEME: animated card sprites. Frames left to right. Same silhouette in every frame.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–6 ROW OF 6 FRAMES (animation or states, left to right), "card_ov_optimiert" — EXACT SIZE 48x64 art px (192x256 output px) per frame, centered in the 52x68 cell: OPTIMIZED overlay 48x64: gold frame border (#b9781c, #e0a848, #ffe28a); INTERIOR plain flat #808080; 6 frames: a bright #ffe28a / #f4f4fa glint travels clockwise around the border
 - R2C1–6 ROW OF 6 FRAMES (animation or states, left to right), "card_frame_software_l" — EXACT SIZE 48x64 art px (192x256 output px) per frame, centered in the 52x68 cell: LEGENDARY software card, retro OS window frame (title bar with 3 window buttons, no text), gold frame #e0a848; 6 frames: rainbow shimmer (#ff3fa4, #ffd23f, #3fbf5f, #2ef2ff, #a05cf0) sweeps diagonally across the frame
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "ui_card_highlight" — EXACT SIZE 52x68 art px (208x272 output px) per frame, fills the whole cell: selection glow frame 52x68: bright 2px rounded rectangle ring in #f4f4fa and #8cc4ff around an empty interior; 4 frames pulse: ring thickness / brightness 1-2-3-2; interior plain flat #808080
 - R3C5–6 empty (flat #808080)

SIZE CHECK: 48x64 art px (192x256 output px): card_ov_optimiert, card_frame_software_l; 52x68 art px (208x272 output px): ui_card_highlight; cell 52x68 (208x272 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S13 · `sheet_booster_40x56.png` – Booster-Packs

- **Zelle:** 40×56 px · **Raster:** 4 Spalten × 1 Zeilen · **Gesamt:** 160×56 px
- **Sprites:** 4 · **belegte Zellen:** 4 von 4 · **KI-Größe:** ×8 = 1280×448 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `booster_workload/_treiber/_werkzeug/_software` | `booster_workload` | 40×56 | Booster Workload: Blisterpack |
| Z1 · S2 | `booster_workload/_treiber/_werkzeug/_software` | `booster_treiber` | 40×56 | Booster Treiber: CD-Hülle |
| Z1 · S3 | `booster_workload/_treiber/_werkzeug/_software` | `booster_werkzeug` | 40×56 | Booster Werkzeug: Werkzeugkoffer |
| Z1 · S4 | `booster_workload/_treiber/_werkzeug/_software` | `booster_software` | 40×56 | Booster Software: Software-Box |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_booster_40x56.png
Target size: 160x56 px = 4 columns x 1 rows of 40x56 px cells, no gaps, no margins. Generate it at x8 (1280x448 px): one art pixel = 8x8 output pixels, one cell = 320x448 output pixels.
THEME: booster pack items, frontal, 40x56, each a distinct silhouette. No text, abstract emblem on the front.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "booster_workload" — EXACT SIZE 40x56 art px (320x448 output px), fills the whole cell: blister pack: foil package, blue/violet crimped top and bottom edges, a bold emblem showing cards
 - R1C2 "booster_treiber" — EXACT SIZE 40x56 art px (320x448 output px), fills the whole cell: CD jewel case, grey plastic, a silver disc visible through the front
 - R1C3 "booster_werkzeug" — EXACT SIZE 40x56 art px (320x448 output px), fills the whole cell: small red toolbox/case with a steel handle and two latches
 - R1C4 "booster_software" — EXACT SIZE 40x56 art px (320x448 output px), fills the whole cell: retro PC software box, blue/white box art with a window icon, slight 3D box look, front only

SIZE CHECK: every sprite is exactly 40x56 art px (320x448 output px) in a 40x56 cell (320x448 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S14 · `sheet_misc_32.png` – Karten-Art, Bluescreen-Gesicht, App-Icon

- **Zelle:** 32×32 px · **Raster:** 3 Spalten × 2 Zeilen · **Gesamt:** 96×64 px
- **Sprites:** 6 · **belegte Zellen:** 6 von 6 · **KI-Größe:** ×16 = 1536×1024 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_art_cpu/_gpu/_ram/_io` | `card_art_cpu` | 32×24 | Karten-Art CPU: Prozessor-Die |
| Z1 · S2 | `card_art_cpu/_gpu/_ram/_io` | `card_art_gpu` | 32×24 | Karten-Art GPU: Grafikchip + Bildschirm |
| Z1 · S3 | `card_art_cpu/_gpu/_ram/_io` | `card_art_ram` | 32×24 | Karten-Art RAM: Speicherzellen |
| Z2 · S1 | `card_art_cpu/_gpu/_ram/_io` | `card_art_io` | 32×24 | Karten-Art I/O: Kabel + Datenpfeile |
| Z2 · S2 | `bsod_face` | `bsod_face` | 32×32 | Bluescreen-Gesicht „:(“ |
| Z2 · S3 | `app_icon` | `app_icon` | 32×32 | App-Icon / Favicon |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_misc_32.png
Target size: 96x64 px = 3 columns x 2 rows of 32x32 px cells, no gaps, no margins. Generate it at x16 (1536x1024 px): one art pixel = 16x16 output pixels, one cell = 512x512 output pixels.
THEME: misc 32x32 sprites. Card art images are 32x24 (centered vertically in the cell: 4px empty above and below).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_art_cpu" — EXACT SIZE 32x24 art px (512x384 output px), centered in the 32x32 cell: processor die: square silicon die with a grid of cores, blue (#1f3f9a, #3a7bf0, #8cc4ff) on dark
 - R1C2 "card_art_gpu" — EXACT SIZE 32x24 art px (512x384 output px), centered in the 32x32 cell: graphics chip next to a small monitor showing a green landscape, green palette (#1f7a3a, #3fbf5f, #a8f07a)
 - R1C3 "card_art_ram" — EXACT SIZE 32x24 art px (512x384 output px), centered in the 32x32 cell: grid of memory cells with some lit, amber (#b9781c, #f2b233, #ffe28a)
 - R2C1 "card_art_io" — EXACT SIZE 32x24 art px (512x384 output px), centered in the 32x32 cell: a cable plug with data arrows flowing in and out, violet (#5a2a9a, #a05cf0, #cfd0e0)
 - R2C2 "bsod_face" — EXACT SIZE 32x32 art px (512x512 output px), fills the whole cell: sad face emoticon ":(" built from pixels, white #f4f4fa on flat #1f3f9a blue background square 32x32 (the ONLY sprite with an opaque colored background; text-like symbol allowed)
 - R2C3 "app_icon" — EXACT SIZE 32x32 art px (512x512 output px), fills the whole cell: app icon: a PC chip with a bottleneck (hourglass-narrow) silhouette, readable at 32x32, bold shapes, dark rounded-square background #1a1a2e, blue chip, red hot spot

SIZE CHECK: 32x24 art px (512x384 output px): card_art_cpu, card_art_gpu, card_art_ram, card_art_io; 32x32 art px (512x512 output px): bsod_face, app_icon; cell 32x32 (512x512 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S15 · `sheet_bench_boss_32.png` – Benchmark-Chips und Bosse (MVP)

- **Zelle:** 32×32 px · **Raster:** 6 Spalten × 2 Zeilen · **Gesamt:** 192×64 px
- **Sprites:** 12 · **belegte Zellen:** 12 von 12 · **KI-Größe:** ×8 = 1536×512 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `bench_office / bench_gaming` | `bench_office` | 32×32 | Office-Benchmark: Tabellen-Symbol, grau |
| Z1 · S2 | `bench_office / bench_gaming` | `bench_gaming` | 32×32 | Gaming-Benchmark: Gamepad, blau |
| Z1 · S3 | `boss_*` | `boss_b1` | 32×32 | B1 Krysis: Alien-Helm |
| Z1 · S4 | `boss_*` | `boss_b2` | 32×32 | B2 Prime96: glühender Chip |
| Z1 · S5 | `boss_*` | `boss_b3` | 32×32 | B3 Kinobank: Filmrolle / Render-Kachel |
| Z1 · S6 | `boss_*` | `boss_b4` | 32×32 | B4 MemTest: RAM mit Lupe |
| Z2 · S1 | `boss_*` | `boss_b5` | 32×32 | B5 Zeitspion: Stoppuhr mit Auge |
| Z2 · S2 | `boss_*` | `boss_b6` | 32×32 | B6 Fellmark: Fell-Donut in Flammen |
| Z2 · S3 | `boss_*` | `boss_b7` | 32×32 | B7 Hitzewelle: Sonne |
| Z2 · S4 | `boss_*` | `boss_b8` | 32×32 | B8 Brownout: flackernde Glühbirne |
| Z2 · S5 | `boss_*` | `boss_b11` | 32×32 | B11 Shader-Kompilierung: Sanduhr |
| Z2 · S6 | `boss_*` | `boss_f1` | 32×32 | F1 Cyberpunk 2088: Neon-Skyline, goldener Rand |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_bench_boss_32.png
Target size: 192x64 px = 6 columns x 2 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1536x512 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: round "chips" (poker-chip-like round tokens) for benchmark rounds and bosses: each a circular token ~30px with a symbol; bosses have a menacing, funny face/symbol, F1 (finale) has a golden border.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "bench_office" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: grey round chip token with a spreadsheet grid symbol
 - R1C2 "bench_gaming" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: blue round chip token with a gamepad symbol
 - R1C3 "boss_b1" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: alien helmet with big dark visor, green glow
 - R1C4 "boss_b2" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: glowing red-hot CPU chip with heat shimmer
 - R1C5 "boss_b3" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: film reel combined with a render-tile checker square
 - R1C6 "boss_b4" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: RAM stick under a magnifying glass
 - R2C1 "boss_b5" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: stopwatch with a single eye in the dial
 - R2C2 "boss_b6" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: furry donut (torus with fur texture) engulfed in flames
 - R2C3 "boss_b7" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: angry sun with rays, heat colors #ffd23f / #ff8a2e / #e8432d
 - R2C4 "boss_b8" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: light bulb, flickering (dim half, spark lines)
 - R2C5 "boss_b11" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: hourglass with colorful shader-gradient sand
 - R2C6 "boss_f1" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: neon city skyline (magenta #ff3fa4 and cyan #2ef2ff) inside a round token with a thick GOLD border (#e0a848, #ffe28a) marking the finale

SIZE CHECK: every sprite is exactly 32x32 art px (256x256 output px) in a 32x32 cell (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S16 · `sheet_hw_mb_cpu_32.png` – Hardware-Icons: Mainboards und CPUs

- **Zelle:** 32×32 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 192×96 px
- **Sprites:** 12 · **belegte Zellen:** 12 von 18 · **KI-Größe:** ×8 = 1536×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_mb_*` | `icon_mb_1` | 32×32 | MB1 Büro-mATX, grün |
| Z1 · S2 | `icon_mb_*` | `icon_mb_2` | 32×32 | MB2 B560, schwarz, ATX |
| Z1 · S3 | `icon_mb_*` | `icon_mb_3` | 32×32 | MB3 Z790, schwarz, Kühlkörper silber |
| Z1 · S4 | `icon_mb_*` | `icon_mb_5` | 32×32 | MB5 B760M, dunkelblau |
| Z1 · S5 | `icon_mb_*` | `icon_mb_7` | 32×32 | MB7 B650M, schwarz-rot |
| Z1 · S6 | – | (leer) | – | – |
| Z2 · S1 | `icon_cpu_*` | `icon_cpu_1` | 32×32 | C1 Intellion, schlicht, blaues Label |
| Z2 · S2 | `icon_cpu_*` | `icon_cpu_2` | 32×32 | C2 Intellion, blaues Label, Glanz 1 |
| Z2 · S3 | `icon_cpu_*` | `icon_cpu_3` | 32×32 | C3 Intellion, Glanz 2 |
| Z2 · S4 | `icon_cpu_*` | `icon_cpu_4` | 32×32 | C4 Intellion, Glanz 3 |
| Z2 · S5 | `icon_cpu_*` | `icon_cpu_5` | 32×32 | C5 Intellion, höchster Glanz |
| Z2 · S6 | `icon_cpu_*` | `icon_cpu_8` | 32×32 | C8 AMX, rotes Label |
| Z3 · S1 | `icon_cpu_*` | `icon_cpu_9` | 32×32 | C9 AMX X3D: rotes Label + Cache-Stapel |
| Z3 · S2–6 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_hw_mb_cpu_32.png
Target size: 192x96 px = 6 columns x 3 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1536x768 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: hardware shop icons 32x32. Each is a stylised part, centered, filling about 28px. Mainboards seen face-on (top-down view of the board). CPUs are shown as the package seen from the top. Brand colors are painted directly with palette colors (no key colors).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_mb_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small square office board, green PCB (#1d4a2c, #2e7040), no heatsinks, 2 short DIMM slots, 1 PCIe slot, tiny socket
 - R1C2 "icon_mb_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black ATX gaming board, tall, black PCB (#1a1a2e, #2a2a44) with small steel chipset heatsink, 4 DIMM slots
 - R1C3 "icon_mb_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black ATX premium board with large silver heatsinks (#9b9bb4 / #cfd0e0) around the socket and chipset
 - R1C4 "icon_mb_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small square mATX board with dark blue PCB (#1f3f9a / #1a1a2e), steel chipset heatsink
 - R1C5 "icon_mb_7" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small mATX board, black PCB with red accents (#e8432d heatsink trim)
 - R1C6 empty (flat #808080)
 - R2C1 "icon_cpu_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: budget CPU: square package, matte steel heat spreader without shine, small blue label (#3a7bf0), tiny pin hint on the sides
 - R2C2 "icon_cpu_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU: steel spreader with 1 highlight pixel row, blue label
 - R2C3 "icon_cpu_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU: spreader with stronger highlight, larger blue label
 - R2C4 "icon_cpu_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU: bright polished spreader, bold blue label and light #8cc4ff edge
 - R2C5 "icon_cpu_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: top-tier CPU: mirror-bright spreader with a star sparkle, blue label with #8cc4ff, gold pins
 - R2C6 "icon_cpu_8" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU, a red label (#e8432d / #8c1c2b) on the spreader, notched corner
 - R3C1 "icon_cpu_9" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU with red label and a small symbol of 3 stacked layers (cache stack) on top
 - R3C2–6 empty (flat #808080)

SIZE CHECK: every icon is about 28x28 art px (224x224 output px), centered in its 32x32 cell (256x256 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### Nachbesserung · `icon_cpu_9` (Einzel-Prompt zu S16)

Nach dem Säubern wurde der Cache-Stapel von `icon_cpu_9` zu einem Klecks. Dieser Prompt erzeugt nur diesen einen Sprite neu (eigene Datei, danach auf Zelle Z3 · S1 von S16 setzen). Säubern z. B. mit `--size 32x32 --cell 32x32`.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SINGLE SPRITE REDO: icon_cpu_9
Target size: 32x32 px = 1 cell of 32x32 px (a single image, no grid). Generate it at x8 (256x256 px): one art pixel = 8x8 output pixels.
THEME: hardware shop icon, CPU package seen from the top, same look as icon_cpu_8 (same spreader, same notched corner, same red label (#e8432d / #8c1c2b)), but with an extra cache stack symbol.

 - R1C1 "icon_cpu_9" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU like icon_cpu_8 with a red label, plus a clearly readable stack of EXACTLY 3 flat diamonds (rhombi) drawn on the spreader, one above the other. Each diamond: 1 px outline (#0b0b12), filled with at most 2 tones (for example #6a6a88 and #cfd0e0, or #e0a848 and #ffe28a), flat, no gradient. 1 px of spreader color between neighboring diamonds so they never merge. Each diamond is about 8 art px wide and 4 art px tall (output: 64x32 px). The stack is about 8x14 art px in total. The 3 diamonds must stay separate and countable at 1x. No blob, no extra detail.

SIZE CHECK: whole sprite about 28x28 art px (224x224 output px) in a 32x32 cell (256x256 output px); 3 diamonds, each about 8x4 art px (64x32 output px), 1 px outline, 1 px gap. Sprite size beats detail: draw fewer details rather than a different size.

The image contains exactly this sprite, nothing else. Everything outside the sprite is the flat #808080 background.
```

### S17 · `sheet_hw_gpu_ram_32.png` – Hardware-Icons: Grafikkarten und RAM-Kits

- **Zelle:** 32×32 px · **Raster:** 6 Spalten × 2 Zeilen · **Gesamt:** 192×64 px
- **Sprites:** 12 · **belegte Zellen:** 12 von 12 · **KI-Größe:** ×8 = 1536×512 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_gpu_*` | `icon_gpu_1` | 32×32 | G1 klein, ohne Lüfter |
| Z1 · S2 | `icon_gpu_*` | `icon_gpu_2` | 32×32 | G2 2 Lüfter, rot |
| Z1 · S3 | `icon_gpu_*` | `icon_gpu_3` | 32×32 | G3 2 Lüfter, grün |
| Z1 · S4 | `icon_gpu_*` | `icon_gpu_4` | 32×32 | G4 2 Lüfter, grün/silber |
| Z1 · S5 | `icon_gpu_*` | `icon_gpu_5` | 32×32 | G5 3 Lüfter, rot |
| Z1 · S6 | `icon_gpu_*` | `icon_gpu_6` | 32×32 | G6 3 Lüfter riesig, 12-Pin-Stecker |
| Z2 · S1 | `icon_ram_*` | `icon_ram_1` | 32×32 | R1 nackt, grün |
| Z2 · S2 | `icon_ram_*` | `icon_ram_2` | 32×32 | R2 rot |
| Z2 · S3 | `icon_ram_*` | `icon_ram_3` | 32×32 | R3 schwarz |
| Z2 · S4 | `icon_ram_*` | `icon_ram_4` | 32×32 | R4 nackt DDR5 |
| Z2 · S5 | `icon_ram_*` | `icon_ram_5` | 32×32 | R5 schwarz-weiß |
| Z2 · S6 | `icon_ram_*` | `icon_ram_6` | 32×32 | R6 RGB |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_hw_gpu_ram_32.png
Target size: 192x64 px = 6 columns x 2 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1536x512 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: hardware shop icons 32x32, centered. GPUs: horizontal card seen from the fan side (fans visible), size grows with tier. RAM: a kit of 2 sticks standing upright side by side.
KEY COLOR FOR THIS SHEET: every RGB light element (light bar, ring, glowing fan ring, lit fans) is ONE flat tone #00ffff, no shading inside it. The engine cycles it through rainbow colors. Use #00ffff for nothing else; for other cyan things use the palette cyan #2ef2ff.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_gpu_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small short card, no fan, a passive aluminium heatsink with fins, metal bracket at the left
 - R1C2 "icon_gpu_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: dual-fan card, red shroud (#e8432d / #8c1c2b), two black fans
 - R1C3 "icon_gpu_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: dual-fan card, green shroud (#3fbf5f / #1f7a3a), two black fans
 - R1C4 "icon_gpu_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: dual-fan card, silver shroud with green accents, two fans
 - R1C5 "icon_gpu_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: long triple-fan card, red shroud, three fans
 - R1C6 "icon_gpu_6" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: huge thick triple-fan card (fills ~30x22), black/silver, a visible 12-pin power connector at the top edge, a hint of orange glow
 - R2C1 "icon_ram_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 bare green RAM sticks, black chips, gold contacts
 - R2C2 "icon_ram_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 sticks with red heat spreaders (#e8432d)
 - R2C3 "icon_ram_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 sticks with black heat spreaders (#2a2a44 / #43435f)
 - R2C4 "icon_ram_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 bare green sticks, different notch position than R1, small extra chip near the notch (DDR5 look)
 - R2C5 "icon_ram_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 sticks, black and white two-tone heat spreaders
 - R2C6 "icon_ram_6" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 black sticks with a light bar in RGB key color #00ffff on top of each

SIZE CHECK: every icon is about 28x28 art px (224x224 output px), centered in its 32x32 cell (256x256 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S18 · `sheet_hw_storage_psu_32.png` – Hardware-Icons: Laufwerke, Netzteile, Erweiterungskarten

- **Zelle:** 32×32 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 192×96 px
- **Sprites:** 12 · **belegte Zellen:** 12 von 18 · **KI-Größe:** ×8 = 1536×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_drive_*` | `icon_drive_1` | 32×32 | S1 2,5″-SSD grau |
| Z1 · S2 | `icon_drive_*` | `icon_drive_2` | 32×32 | S2 3,5″-HDD |
| Z1 · S3 | `icon_drive_*` | `icon_drive_3` | 32×32 | S3 2,5″-SSD schwarz |
| Z1 · S4 | `icon_drive_*` | `icon_drive_4` | 32×32 | S4 M.2 nackt |
| Z1 · S5 | `icon_drive_*` | `icon_drive_5` | 32×32 | S5 M.2 mit Kühlkörper |
| Z1 · S6 | – | (leer) | – | – |
| Z2 · S1 | `icon_psu_*` | `icon_psu_1` | 32×32 | P1 beige mit Rost |
| Z2 · S2 | `icon_psu_*` | `icon_psu_2` | 32×32 | P2 schwarz |
| Z2 · S3 | `icon_psu_*` | `icon_psu_3` | 32×32 | P3 schwarz mit Goldsticker |
| Z2 · S4 | `icon_psu_*` | `icon_psu_4` | 32×32 | P4 modular, Platinsticker |
| Z2 · S5–6 | – | (leer) | – | – |
| Z3 · S1 | `icon_exp_*` | `icon_exp_1` | 32×32 | E1 Netzwerkkarte, RJ45 |
| Z3 · S2 | `icon_exp_*` | `icon_exp_3` | 32×32 | E3 Soundkarte, Klinken |
| Z3 · S3 | `icon_exp_*` | `icon_exp_4` | 32×32 | E4 Capture-Karte, HDMI |
| Z3 · S4–6 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_hw_storage_psu_32.png
Target size: 192x96 px = 6 columns x 3 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1536x768 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: hardware shop icons 32x32, centered, frontal/top-down views, stylised.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_drive_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: thin grey 2.5-inch SSD case, flat rectangle with label area, SATA connector at one end
 - R1C2 "icon_drive_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: bigger silver 3.5-inch hard drive, metal top plate with screws, a visible platter hint
 - R1C3 "icon_drive_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2.5-inch SSD, black case, accent stripe
 - R1C4 "icon_drive_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: bare M.2 stick: long thin green PCB with black chips, gold contacts, notch
 - R1C5 "icon_drive_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: M.2 stick with a silver heatsink with fins on top
 - R1C6 empty (flat #808080)
 - R2C1 "icon_psu_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: beige PSU box (beige tones #8a7a5c shadow, #c9b88f base, #e8dcb8 light), rust spots in #a8642a / #5a3216, fan grille, a few tangled cables hint
 - R2C2 "icon_psu_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black PSU box with fan grille, plain
 - R2C3 "icon_psu_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black PSU with a gold badge sticker (#e0a848), fan grille
 - R2C4 "icon_psu_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black modular PSU with a row of cable sockets on one side and a platinum/white-silver badge sticker
 - R2C5–6 empty (flat #808080)
 - R3C1 "icon_exp_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: expansion card: small green PCB with a metal bracket, an RJ45 network port, gold edge contacts
 - R3C2 "icon_exp_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: expansion card: dark PCB with 3 round audio jacks (green, blue, light grey) in the bracket
 - R3C3 "icon_exp_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: expansion card: black PCB with an HDMI port (flat trapezoid port) and a red record LED
 - R3C4–6 empty (flat #808080)

SIZE CHECK: every icon is about 28x28 art px (224x224 output px), centered in its 32x32 cell (256x256 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S19 · `sheet_hw_cooling_case_32.png` – Hardware-Icons: Kühler, Lüfter, Gehäuse

- **Zelle:** 32×32 px · **Raster:** 5 Spalten × 2 Zeilen · **Gesamt:** 160×64 px
- **Sprites:** 10 · **belegte Zellen:** 10 von 10 · **KI-Größe:** ×8 = 1280×512 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_cooler_*` | `icon_cooler_1` | 32×32 | K1 Boxed, rund |
| Z1 · S2 | `icon_cooler_*` | `icon_cooler_2` | 32×32 | K2 Tower |
| Z1 · S3 | `icon_cooler_*` | `icon_cooler_3` | 32×32 | K3 Doppelturm braun |
| Z1 · S4 | `icon_cooler_*` | `icon_cooler_4` | 32×32 | K4 AIO 240 |
| Z1 · S5 | `icon_cooler_*` | `icon_cooler_5` | 32×32 | K5 AIO 360 mit LCD |
| Z2 · S1 | `icon_fan_*` | `icon_fan_1` | 32×32 | F1 Lüfter schwarz |
| Z2 · S2 | `icon_fan_*` | `icon_fan_2` | 32×32 | F2 Lüfter mit RGB-Ring |
| Z2 · S3 | `icon_case_*` | `icon_case_1` | 32×32 | CA1 beiger Büro-Tower |
| Z2 · S4 | `icon_case_*` | `icon_case_3` | 32×32 | CA3 Mesh-Front |
| Z2 · S5 | `icon_case_*` | `icon_case_4` | 32×32 | CA4 Glaskasten mit RGB |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_hw_cooling_case_32.png
Target size: 160x64 px = 5 columns x 2 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1280x512 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: hardware shop icons 32x32, centered, frontal views, stylised.
KEY COLOR FOR THIS SHEET: every RGB light element (light bar, ring, glowing fan ring, lit fans) is ONE flat tone #00ffff, no shading inside it. The engine cycles it through rainbow colors. Use #00ffff for nothing else; for other cyan things use the palette cyan #2ef2ff.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_cooler_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: stock round CPU cooler: black round fan in the center with an aluminium fin ring
 - R1C2 "icon_cooler_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: single tower cooler: aluminium fin block with copper heat pipes and one fan
 - R1C3 "icon_cooler_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: big dual-tower cooler: two fin blocks, brown fans (#a8642a / #5a3216)
 - R1C4 "icon_cooler_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: AIO water cooler: a 240 radiator with 2 fans (fans in a row) and a pump block with 2 tubes
 - R1C5 "icon_cooler_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: AIO: 360 radiator with 3 fans and a pump head with a small LCD screen in palette cyan #2ef2ff
 - R2C1 "icon_fan_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black 120mm case fan, front view: square frame, 7 blades
 - R2C2 "icon_fan_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black fan with a ring of light in RGB key color #00ffff around the hub
 - R2C3 "icon_case_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: beige office tower case front (beige tones #8a7a5c shadow, #c9b88f base, #e8dcb8 light): 5.25-inch drive bays, power button, grille
 - R2C4 "icon_case_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: black tower with a mesh front panel (fine dot pattern)
 - R2C5 "icon_case_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: tower with a glass side panel showing lit fans in RGB key color #00ffff, white interior

SIZE CHECK: every icon is about 28x28 art px (224x224 output px), centered in its 32x32 cell (256x256 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S20 · `sheet_icons32_treiber_werkzeug_32.png` – Icons 32×32: Treiber-Profile und Werkzeuge

- **Zelle:** 32×32 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 192×96 px
- **Sprites:** 17 · **belegte Zellen:** 17 von 18 · **KI-Größe:** ×8 = 1536×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_treiber_*` | `icon_treiber_einzeltask` | 32×32 | Einzeltask |
| Z1 · S2 | `icon_treiber_*` | `icon_treiber_dualchannel` | 32×32 | Dual-Channel |
| Z1 · S3 | `icon_treiber_*` | `icon_treiber_quadchannel` | 32×32 | Quad-Channel |
| Z1 · S4 | `icon_treiber_*` | `icon_treiber_heterogen` | 32×32 | Heterogen |
| Z1 · S5 | `icon_treiber_*` | `icon_treiber_triplebuffer` | 32×32 | Triple-Buffer |
| Z1 · S6 | `icon_treiber_*` | `icon_treiber_pipeline` | 32×32 | Pipeline |
| Z2 · S1 | `icon_treiber_*` | `icon_treiber_spezialisiert` | 32×32 | Spezialisiert |
| Z2 · S2 | `icon_treiber_*` | `icon_treiber_fullstack` | 32×32 | Full Stack |
| Z2 · S3 | `icon_treiber_*` | `icon_treiber_quadcore` | 32×32 | Quad-Core |
| Z2 · S4 | `icon_treiber_*` | `icon_treiber_optpipeline` | 32×32 | Optimierte Pipeline |
| Z2 · S5 | `icon_tool_*` | `icon_tool_1` | 32×32 | T1 Wärmeleitpaste (Spritze) |
| Z2 · S6 | `icon_tool_*` | `icon_tool_2` | 32×32 | T2 Lötkolben |
| Z3 · S1 | `icon_tool_*` | `icon_tool_3` | 32×32 | T3 Druckluftspray |
| Z3 · S2 | `icon_tool_*` | `icon_tool_4` | 32×32 | T4 Format C: (Diskette mit Blitz) |
| Z3 · S3 | `icon_tool_*` | `icon_tool_5` | 32×32 | T5 Kopierschutz-Knacker (Dietrich + CD) |
| Z3 · S4 | `icon_tool_*` | `icon_tool_8` | 32×32 | T8 OC-Kit (Tacho-Chip) |
| Z3 · S5 | `icon_tool_*` | `icon_tool_9` | 32×32 | T9 Wärmeleitpad (blaues Pad) |
| Z3 · S6 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_icons32_treiber_werkzeug_32.png
Target size: 192x96 px = 6 columns x 3 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1536x768 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: item icons 32x32. Driver icons: a pictogram on a small CD / floppy disk. Tool icons: a single tool object. Bold readable shapes.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_treiber_einzeltask" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: one single block with an arrow
 - R1C2 "icon_treiber_dualchannel" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: two parallel RAM sticks
 - R1C3 "icon_treiber_quadchannel" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: four parallel RAM sticks
 - R1C4 "icon_treiber_heterogen" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: mixed shapes: circle, square, triangle
 - R1C5 "icon_treiber_triplebuffer" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: three stacked frames/layers
 - R1C6 "icon_treiber_pipeline" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: chain of 3 chevron arrows
 - R2C1 "icon_treiber_spezialisiert" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: target / crosshair on a single symbol
 - R2C2 "icon_treiber_fullstack" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: stack of 4 layers in the 4 type colors (blue, green, amber, violet)
 - R2C3 "icon_treiber_quadcore" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: chip with 4 core squares
 - R2C4 "icon_treiber_optpipeline" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: chain of 3 chevrons with a golden sparkle
 - R2C5 "icon_tool_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: syringe of thermal paste with a silver blob
 - R2C6 "icon_tool_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: soldering iron with a glowing tip and a small smoke wisp
 - R3C1 "icon_tool_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: compressed-air spray can with nozzle, blue can, ice-blue puff
 - R3C2 "icon_tool_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: floppy disk with a red lightning bolt (no text)
 - R3C3 "icon_tool_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a lock pick crossing a CD
 - R3C4 "icon_tool_8" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: chip with a small speedometer dial
 - R3C5 "icon_tool_9" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: thin blue thermal pad square, ice-blue #8cc4ff with highlights, slightly peeling corner
 - R3C6 empty (flat #808080)

SIZE CHECK: every icon is about 28x28 art px (224x224 output px), centered in its 32x32 cell (256x256 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S21 · `sheet_icons32_software_32.png` – Icons 32×32: Software (MVP)

- **Zelle:** 32×32 px · **Raster:** 5 Spalten × 3 Zeilen · **Gesamt:** 160×96 px
- **Sprites:** 15 · **belegte Zellen:** 15 von 15 · **KI-Größe:** ×8 = 1280×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_sw_*` | `icon_sw_1` | 32×32 | SW1 Task-Mangler |
| Z1 · S2 | `icon_sw_*` | `icon_sw_2` | 32×32 | SW2 Kompilierer |
| Z1 · S3 | `icon_sw_*` | `icon_sw_3` | 32×32 | SW3 Fake-Frames |
| Z1 · S4 | `icon_sw_*` | `icon_sw_4` | 32×32 | SW4 RAM-Disk |
| Z1 · S5 | `icon_sw_*` | `icon_sw_5` | 32×32 | SW5 FanKurve |
| Z2 · S1 | `icon_sw_*` | `icon_sw_6` | 32×32 | SW6 Stresstest |
| Z2 · S2 | `icon_sw_*` | `icon_sw_7` | 32×32 | SW7 Nachbrenner |
| Z2 · S3 | `icon_sw_*` | `icon_sw_8` | 32×32 | SW8 Regenbogen-Sync |
| Z2 · S4 | `icon_sw_*` | `icon_sw_9` | 32×32 | SW9 Pinguin-OS |
| Z2 · S5 | `icon_sw_*` | `icon_sw_10` | 32×32 | SW10 Zwangs-Update |
| Z3 · S1 | `icon_sw_*` | `icon_sw_11` | 32×32 | SW11 Krypto-Schürfer |
| Z3 · S2 | `icon_sw_*` | `icon_sw_12` | 32×32 | SW12 Shader-Cache |
| Z3 · S3 | `icon_sw_*` | `icon_sw_15` | 32×32 | SW15 Overlay-Monitor |
| Z3 · S4 | `icon_sw_*` | `icon_sw_16` | 32×32 | SW16 Undervolt-Skript |
| Z3 · S5 | `icon_sw_*` | `icon_sw_19` | 32×32 | SW19 Defragmentierer |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_icons32_software_32.png
Target size: 160x96 px = 5 columns x 3 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1280x768 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: retro desktop program icons from the 1990s/2000s: bold, colorful, each shown as an icon on a small tile or window; funny. No text.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_sw_1" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: jammed gears chewing a small window
 - R1C2 "icon_sw_2" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: code bracket shapes < > with a hammer/gear
 - R1C3 "icon_sw_3" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a monitor with 3 ghosted duplicate picture frames
 - R1C4 "icon_sw_4" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: RAM stick shaped like a disk
 - R1C5 "icon_sw_5" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a fan with a rising graph curve
 - R2C1 "icon_sw_6" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a CPU chip lifting a heavy weight, with sweat drop and flame
 - R2C2 "icon_sw_7" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a rocket with a big exhaust flame, chip body
 - R2C3 "icon_sw_8" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a keyboard with a rainbow light wave (plain palette colors)
 - R2C4 "icon_sw_9" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: cute penguin
 - R2C5 "icon_sw_10" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: window with a huge download arrow and a restart circle, angry look
 - R3C1 "icon_sw_11" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: pickaxe striking a gold coin
 - R3C2 "icon_sw_12" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: a cube with colorful gradient faces inside a storage box
 - R3C3 "icon_sw_15" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small monitor with a graph and thermometer overlay
 - R3C4 "icon_sw_16" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: lightning bolt with a big down arrow, ice-blue
 - R3C5 "icon_sw_19" — EXACT SIZE about 28x28 art px (224x224 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: scattered blocks being sorted into a neat stripe

SIZE CHECK: every icon is about 28x28 art px (224x224 output px), centered in its 32x32 cell (256x256 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S22 · `sheet_board_parts_32x44.png` – Board-Teile: Sockel, Chipsatz-Kühler, Heatspreader, Stromanschluss, VRM, I/O-Blende

- **Zelle:** 32×44 px · **Raster:** 3 Spalten × 3 Zeilen · **Gesamt:** 96×132 px
- **Sprites:** 9 · **belegte Zellen:** 9 von 9 · **KI-Größe:** ×10 = 960×1320 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `slot_socket_lga` | `slot_socket_lga` | 28×28 | Leerer LGA-Sockel mit Hebel und Pin-Feld |
| Z1 · S2 | `slot_socket_amx` | `slot_socket_amx` | 28×28 | Leerer AMX-Sockel (anderes Muster/Bügel) |
| Z1 · S3 | `hs_chipset_budget / hs_chipset_premium` | `hs_chipset_budget` | 24×24 | Chipsatz-Kühlkörper Budget |
| Z2 · S1 | `hs_chipset_budget / hs_chipset_premium` | `hs_chipset_premium` | 24×24 | Chipsatz-Kühlkörper Premium |
| Z2 · S2 | `cpu_ihs_intellion / cpu_ihs_amx` | `cpu_ihs_intellion` | 24×24 | CPU-Heatspreader Intellion im Sockel |
| Z2 · S3 | `cpu_ihs_intellion / cpu_ihs_amx` | `cpu_ihs_amx` | 24×24 | CPU-Heatspreader AMX im Sockel |
| Z3 · S1 | `hdr_atx24 / hdr_eps8` | `hdr_atx24` | 8×34 | 24-Pin-Stromanschluss (Deko) |
| Z3 · S2 | `hs_vrm_top / hs_vrm_side` | `hs_vrm_side` | 12×40 | VRM-Kühlkörper seitlich |
| Z3 · S3 | `io_shield` | `io_shield` | 24×44 | I/O-Blende links oben |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_board_parts_32x44.png
Target size: 96x132 px = 3 columns x 3 rows of 32x44 px cells, no gaps, no margins. Generate it at x10 (960x1320 px): one art pixel = 10x10 output pixels, one cell = 320x440 output pixels.
THEME: parts seen from the front/top on a motherboard (schematic top-down board view). Sprites are smaller than the cell: center them, keep the exact pixel sizes given. Parts are drawn without any board around them.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "slot_socket_lga" — EXACT SIZE 28x28 art px (280x280 output px), centered in the 32x44 cell: empty CPU socket 28x28: square steel frame, a field of gold contact dots in the middle, a load lever on the side
 - R1C2 "slot_socket_amx" — EXACT SIZE 28x28 art px (280x280 output px), centered in the 32x44 cell: empty CPU socket 28x28: different design: a different dot pattern (hexagon-like arrangement) and a wire bail instead of the lever
 - R1C3 "hs_chipset_budget" — EXACT SIZE 24x24 art px (240x240 output px), centered in the 32x44 cell: chipset heatsink 24x24: small plain aluminium block with a few grooves
 - R2C1 "hs_chipset_premium" — EXACT SIZE 24x24 art px (240x240 output px), centered in the 32x44 cell: chipset heatsink 24x24: black/steel armored block with fin ridges and a gold accent line
 - R2C2 "cpu_ihs_intellion" — EXACT SIZE 24x24 art px (240x240 output px), centered in the 32x44 cell: CPU heat spreader seen from the top, 24x24, installed look: steel square with rounded notch corner, blue label
 - R2C3 "cpu_ihs_amx" — EXACT SIZE 24x24 art px (240x240 output px), centered in the 32x44 cell: CPU heat spreader 24x24 with the typical flat-top "octopus" cutouts on the sides, red label
 - R3C1 "hdr_atx24" — EXACT SIZE 8x34 art px (80x340 output px), centered in the 32x44 cell: 24-pin power connector 8x34: white-grey plastic block with 2 columns of dark pin holes and a latch
 - R3C2 "hs_vrm_side" — EXACT SIZE 12x40 art px (120x400 output px), centered in the 32x44 cell: VRM heatsink 12x40, vertical: steel fin block with ridges
 - R3C3 "io_shield" — EXACT SIZE 24x44 art px (240x440 output px), centered in the 32x44 cell: rear I/O shield 24x44: metal plate with cutouts and port blocks (USB, audio jacks, network) in abstract shapes

SIZE CHECK: 28x28 art px (280x280 output px): slot_socket_lga, slot_socket_amx; 24x24 art px (240x240 output px): hs_chipset_budget, hs_chipset_premium, cpu_ihs_intellion, cpu_ihs_amx; 8x34 art px (80x340 output px): hdr_atx24; 12x40 art px (120x400 output px): hs_vrm_side; 24x44 art px (240x440 output px): io_shield; cell 32x44 (320x440 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S23 · `sheet_board_slots_flat_64x16.png` – Board-Slots flach (PCIe, M.2, SATA, Header, VRM oben)

- **Zelle:** 64×16 px · **Raster:** 2 Spalten × 4 Zeilen · **Gesamt:** 128×64 px
- **Sprites:** 7 · **belegte Zellen:** 7 von 8 · **KI-Größe:** ×12 = 1536×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `slot_pcie_x16` | `slot_pcie_x16` | 58×6 | PCIe-x16-Slot mit Rastnase |
| Z1 · S2 | `slot_pcie_x1` | `slot_pcie_x1` | 16×6 | PCIe-x1-Slot |
| Z2 · S1 | `slot_m2` | `slot_m2` | 54×8 | M.2-Slot mit Abstandshalter |
| Z2 · S2 | `slot_sata` | `slot_sata` | 12×10 | 2er-Block SATA-Ports |
| Z3 · S1 | `hdr_fan` | `hdr_fan` | 6×4 | Lüfter-Header (Deko) |
| Z3 · S2 | `hdr_atx24 / hdr_eps8` | `hdr_eps8` | 14×6 | 8-Pin-EPS-Anschluss (Deko) |
| Z4 · S1 | `hs_vrm_top / hs_vrm_side` | `hs_vrm_top` | 48×12 | VRM-Kühlkörper oben |
| Z4 · S2 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_board_slots_flat_64x16.png
Target size: 128x64 px = 2 columns x 4 rows of 64x16 px cells, no gaps, no margins. Generate it at x12 (1536x768 px): one art pixel = 12x12 output pixels, one cell = 768x192 output pixels.
THEME: flat horizontal board components, top-down schematic. Each is smaller than the cell: center them with the exact sizes.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "slot_pcie_x16" — EXACT SIZE 58x6 art px (696x72 output px), centered in the 64x16 cell: PCIe x16 slot 58x6: long dark slot with a latch at one end and a gap (notch)
 - R1C2 "slot_pcie_x1" — EXACT SIZE 16x6 art px (192x72 output px), centered in the 64x16 cell: PCIe x1 slot 16x6: short slot
 - R2C1 "slot_m2" — EXACT SIZE 54x8 art px (648x96 output px), centered in the 64x16 cell: M.2 slot 54x8: a dark connector at the left end and a small standoff screw at the right end
 - R2C2 "slot_sata" — EXACT SIZE 12x10 art px (144x120 output px), centered in the 64x16 cell: SATA ports 12x10: block of 2 L-shaped ports
 - R3C1 "hdr_fan" — EXACT SIZE 6x4 art px (72x48 output px), centered in the 64x16 cell: fan header 6x4: tiny 4-pin connector
 - R3C2 "hdr_eps8" — EXACT SIZE 14x6 art px (168x72 output px), centered in the 64x16 cell: 8-pin power connector 14x6: block with 2 rows of 4 pin holes
 - R4C1 "hs_vrm_top" — EXACT SIZE 48x12 art px (576x144 output px), centered in the 64x16 cell: VRM heatsink 48x12, horizontal: steel fin block with ridges
 - R4C2 empty (flat #808080)

SIZE CHECK: 58x6 art px (696x72 output px): slot_pcie_x16; 16x6 art px (192x72 output px): slot_pcie_x1; 54x8 art px (648x96 output px): slot_m2; 12x10 art px (144x120 output px): slot_sata; 6x4 art px (72x48 output px): hdr_fan; 14x6 art px (168x72 output px): hdr_eps8; 48x12 art px (576x144 output px): hs_vrm_top; cell 64x16 (768x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S24 · `sheet_parts_flat_64x28.png` – Einbau flach: M.2-SSDs, Erweiterungskarten, SATA-SSD, HDD

- **Zelle:** 64×28 px · **Raster:** 2 Spalten × 4 Zeilen · **Gesamt:** 128×112 px
- **Sprites:** 7 · **belegte Zellen:** 8 von 8 · **KI-Größe:** ×12 = 1536×1344 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `m2_ssd / m2_ssd_heatsink` | `m2_ssd` | 52×8 | M.2-SSD nackt |
| Z1 · S2 | `m2_ssd / m2_ssd_heatsink` | `m2_ssd_heatsink` | 52×10 | M.2-SSD mit Kühlkörper |
| Z2 · S1 | `exp_nic / exp_sound / exp_capture` | `exp_nic` | 36×12 | Netzwerkkarte (Einbau) |
| Z2 · S2 | `exp_nic / exp_sound / exp_capture` | `exp_sound` | 52×14 | Soundkarte (Einbau) |
| Z3 · S1 | `exp_nic / exp_sound / exp_capture` | `exp_capture` | 52×14 | Capture-Karte (Einbau) |
| Z3 · S2 | `drive_sata_ssd / drive_hdd` | `drive_sata_ssd` | 32×20 | SATA-SSD im Schacht |
| Z4 · S1–2 | `drive_sata_ssd / drive_hdd` | `drive_hdd_0` … `drive_hdd_1` | 40×28 · 2 Fr. | HDD im Schacht: 2 Frames (vibriert) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_parts_flat_64x28.png
Target size: 128x112 px = 2 columns x 4 rows of 64x28 px cells, no gaps, no margins. Generate it at x12 (1536x1344 px): one art pixel = 12x12 output pixels, one cell = 768x336 output pixels.
THEME: installed parts seen from the front/top, schematic. Sprites are smaller than the cell: center them with exact sizes.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "m2_ssd" — EXACT SIZE 52x8 art px (624x96 output px), centered in the 64x28 cell: bare M.2 SSD 52x8: thin green PCB, black chips, gold contacts at the left
 - R1C2 "m2_ssd_heatsink" — EXACT SIZE 52x10 art px (624x120 output px), centered in the 64x28 cell: M.2 SSD 52x10 with a silver heatsink plate with ridges on top
 - R2C1 "exp_nic" — EXACT SIZE 36x12 art px (432x144 output px), centered in the 64x28 cell: NIC card, seen from the side: 36x12, green PCB, metal bracket with an RJ45 port at the left, gold contacts at the bottom
 - R2C2 "exp_sound" — EXACT SIZE 52x14 art px (624x168 output px), centered in the 64x28 cell: sound card side view 52x14: dark PCB with big chips and 3 audio jacks in the bracket
 - R3C1 "exp_capture" — EXACT SIZE 52x14 art px (624x168 output px), centered in the 64x28 cell: capture card side view 52x14: black PCB with a heatsink and an HDMI port in the bracket
 - R3C2 "drive_sata_ssd" — EXACT SIZE 32x20 art px (384x240 output px), centered in the 64x28 cell: 2.5-inch SATA SSD in a drive bay 32x20: grey case with SATA connector
 - R4C1–2 ROW OF 2 FRAMES (animation or states, left to right), "drive_hdd" — EXACT SIZE 40x28 art px (480x336 output px) per frame, centered in the 64x28 cell: 3.5-inch HDD in a bay 40x28, silver top plate with screws; frame 2 is identical but shifted 1px (vibration)

SIZE CHECK: 52x8 art px (624x96 output px): m2_ssd; 52x10 art px (624x120 output px): m2_ssd_heatsink; 36x12 art px (432x144 output px): exp_nic; 52x14 art px (624x168 output px): exp_sound, exp_capture; 32x20 art px (384x240 output px): drive_sata_ssd; 40x28 art px (480x336 output px): drive_hdd; cell 64x28 (768x336 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S25 · `sheet_cooler_anim_60x52.png` – Einbau: CPU-Kühler (Lüfter dreht)

- **Zelle:** 60×52 px · **Raster:** 4 Spalten × 3 Zeilen · **Gesamt:** 240×156 px
- **Sprites:** 3 · **belegte Zellen:** 12 von 12 · **KI-Größe:** ×6 = 1440×936 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–4 | `cooler_boxed` | `cooler_boxed_0` … `cooler_boxed_3` | 40×40 · 4 Fr. | Boxed-Kühler von vorn: Lüfter dreht |
| Z2 · S1–4 | `cooler_tower` | `cooler_tower_0` … `cooler_tower_3` | 48×52 · 4 Fr. | Tower-Kühler mit Lüfter: Lüfter dreht |
| Z3 · S1–4 | `cooler_dualtower` | `cooler_dualtower_0` … `cooler_dualtower_3` | 60×52 · 4 Fr. | Doppelturm mit braunen Lüftern: dreht |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_cooler_anim_60x52.png
Target size: 240x156 px = 4 columns x 3 rows of 60x52 px cells, no gaps, no margins. Generate it at x6 (1440x936 px): one art pixel = 6x6 output pixels, one cell = 360x312 output pixels.
THEME: installed CPU coolers seen from the front, with a spinning fan. 4 frames per row, fan blades rotate by 1/4 of the blade spacing per frame (looping), everything else identical.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–4 ROW OF 4 FRAMES (animation or states, left to right), "cooler_boxed" — EXACT SIZE 40x40 art px (240x240 output px) per frame, centered in the 60x52 cell: stock cooler 40x40: round black fan in an aluminium fin ring, 4 frames
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "cooler_tower" — EXACT SIZE 48x52 art px (288x312 output px) per frame, centered in the 60x52 cell: tower cooler 48x52: fin block with copper heat pipes, a square fan in front, 4 frames
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "cooler_dualtower" — EXACT SIZE 60x52 art px (360x312 output px) per frame, fills the whole cell: dual tower cooler 60x52: two fin blocks, brown fans (#a8642a / #5a3216), 4 frames

SIZE CHECK: 40x40 art px (240x240 output px): cooler_boxed; 48x52 art px (288x312 output px): cooler_tower; 60x52 art px (360x312 output px): cooler_dualtower; cell 60x52 (360x312 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S26 · `sheet_aio_fan_32.png` – Einbau 32×32: AIO-Pumpen und Gehäuselüfter

- **Zelle:** 32×32 px · **Raster:** 4 Spalten × 3 Zeilen · **Gesamt:** 128×96 px
- **Sprites:** 3 · **belegte Zellen:** 9 von 12 · **KI-Größe:** ×12 = 1536×1152 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `aio_pump` | `aio_pump` | 32×32 | AIO-Pumpe mit Schläuchen |
| Z1 · S2–4 | – | (leer) | – | – |
| Z2 · S1–4 | `aio_pump_lcd` | `aio_pump_lcd_0` … `aio_pump_lcd_3` | 32×32 · 4 Fr. | AIO-Pumpe mit LCD: Display zeigt Temperatur-Grafik |
| Z3 · S1–4 | `case_fan` | `case_fan_0` … `case_fan_3` | 32×32 · 4 Fr. | Gehäuselüfter: dreht, RGB-Ring (Schlüsselfarbe) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_aio_fan_32.png
Target size: 128x96 px = 4 columns x 3 rows of 32x32 px cells, no gaps, no margins. Generate it at x12 (1536x1152 px): one art pixel = 12x12 output pixels, one cell = 384x384 output pixels.
THEME: installed parts 32x32, front view; animated rows have 4 frames.
KEY COLOR FOR THIS SHEET: every RGB light element (light bar, ring, glowing fan ring, lit fans) is ONE flat tone #00ffff, no shading inside it. The engine cycles it through rainbow colors. Use #00ffff for nothing else; for other cyan things use the palette cyan #2ef2ff.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "aio_pump" — EXACT SIZE 32x32 art px (384x384 output px), fills the whole cell: AIO pump head seen from the front: round black block with a steel cap and 2 tubes leaving at the sides
 - R1C2–4 empty (flat #808080)
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "aio_pump_lcd" — EXACT SIZE 32x32 art px (384x384 output px) per frame, fills the whole cell: same pump head with a small LCD circle on top (palette cyan #2ef2ff, white); 4 frames: the LCD shows a temperature graph line that changes (rises) each frame; the LCD shows no key color
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "case_fan" — EXACT SIZE 32x32 art px (384x384 output px) per frame, fills the whole cell: 120mm case fan 32x32 front view, black frame, 7 blades rotating by 1/4 blade spacing per frame, a ring around the hub drawn in RGB key color #00ffff

SIZE CHECK: every sprite is exactly 32x32 art px (384x384 output px) in a 32x32 cell (384x384 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S27 · `sheet_gpu_216x40.png` – Einbau: Grafikkarten (S/M/L, Lüfter drehen)

- **Zelle:** 216×40 px · **Raster:** 4 Spalten × 3 Zeilen · **Gesamt:** 864×120 px
- **Sprites:** 3 · **belegte Zellen:** 9 von 12 · **KI-Größe:** zeilen-/zellenweise, je Zelle ×6

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `gpu_s` | `gpu_s` | 112×14 | 1-Slot-Karte, passiver Kühlkörper |
| Z1 · S2–4 | – | (leer) | – | – |
| Z2 · S1–4 | `gpu_m` | `gpu_m_0` … `gpu_m_3` | 176×26 · 4 Fr. | 2-Slot-Karte mit 2 Lüftern (dreht) |
| Z3 · S1–4 | `gpu_l` | `gpu_l_0` … `gpu_l_3` | 216×40 · 4 Fr. | 3-Slot-Karte mit 3 Lüftern (dreht) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_gpu_216x40.png
Target size: 864x120 px = 4 columns x 3 rows of 216x40 px cells, no gaps, no margins. This sheet is too large for one generation: generate ONE ROW (or one cell) per image at x6 (one cell = 1296x240 output pixels, one row = 5184x240) and assemble the rows afterwards. For every request repeat: "same style as the previous rows".
THEME: installed graphics cards seen face-on from the fan side (the cards sit horizontally in the PCIe slot, bracket at the left). Larger cards are thicker. Brand parts (shroud accents) painted in BRAND KEY colors. Fans spin: 1/4 blade spacing rotation per frame.
KEY COLORS FOR THIS SHEET: paint every brand-colored part (shroud / accent) ONLY in the brand key tones #ff00ff (light), #c000c0 (mid), #800080 (dark). The engine swaps them to the brand color. Use no other magenta/purple in this sheet.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "gpu_s" — EXACT SIZE 112x14 art px (672x84 output px), centered in the 216x40 cell: single-slot card 112x14: no fans, a long passive aluminium fin heatsink, metal bracket at the left
 - R1C2–4 empty (flat #808080)
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "gpu_m" — EXACT SIZE 176x26 art px (1056x156 output px) per frame, centered in the 216x40 cell: dual-slot card 176x26: shroud with BRAND KEY colors, 2 black fans, 4 frames
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "gpu_l" — EXACT SIZE 216x40 art px (1296x240 output px) per frame, fills the whole cell: triple-slot card 216x40: thick shroud with BRAND KEY colors, 3 big black fans, 4 frames; the card covers 2 slots visually

SIZE CHECK: 112x14 art px (672x84 output px): gpu_s; 176x26 art px (1056x156 output px): gpu_m; 216x40 art px (1296x240 output px): gpu_l; cell 216x40 (1296x240 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S28 · `sheet_psu_radiator_96x40.png` – Einbau: Netzteile und Radiatoren

- **Zelle:** 96×40 px · **Raster:** 3 Spalten × 2 Zeilen · **Gesamt:** 288×80 px
- **Sprites:** 5 · **belegte Zellen:** 5 von 6 · **KI-Größe:** ×5 = 1440×400 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `psu_cheap/_standard/_premium` | `psu_cheap` | 64×40 | Netzteil billig: beige mit Kabelsalat |
| Z1 · S2 | `psu_cheap/_standard/_premium` | `psu_standard` | 64×40 | Netzteil Standard: schwarz |
| Z1 · S3 | `psu_cheap/_standard/_premium` | `psu_premium` | 64×40 | Netzteil Premium: modular mit Sticker |
| Z2 · S1 | `radiator_240 / radiator_360` | `radiator_240` | 64×32 | Radiator 240 (mit Lüftern) |
| Z2 · S2 | `radiator_240 / radiator_360` | `radiator_360` | 96×32 | Radiator 360 (mit Lüftern) |
| Z2 · S3 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_psu_radiator_96x40.png
Target size: 288x80 px = 3 columns x 2 rows of 96x40 px cells, no gaps, no margins. Generate it at x5 (1440x400 px): one art pixel = 5x5 output pixels, one cell = 480x200 output pixels.
THEME: installed parts seen from the front. PSUs sit at the bottom of the case. Sprites are smaller than the cell: center them.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "psu_cheap" — EXACT SIZE 64x40 art px (320x200 output px), centered in the 96x40 cell: cheap PSU 64x40: beige box (beige tones #8a7a5c shadow, #c9b88f base, #e8dcb8 light), dirty look, a tangle of cables spilling out
 - R1C2 "psu_standard" — EXACT SIZE 64x40 art px (320x200 output px), centered in the 96x40 cell: standard PSU 64x40: black box, fan grille, a neat cable bundle
 - R1C3 "psu_premium" — EXACT SIZE 64x40 art px (320x200 output px), centered in the 96x40 cell: premium modular PSU 64x40: black with a row of modular cable sockets and a gold/platinum sticker
 - R2C1 "radiator_240" — EXACT SIZE 64x32 art px (320x160 output px), centered in the 96x40 cell: 240 radiator 64x32 with 2 fans in a row, fins visible, 2 tube ports
 - R2C2 "radiator_360" — EXACT SIZE 96x32 art px (480x160 output px), centered in the 96x40 cell: 360 radiator 96x32 with 3 fans in a row, 2 tube ports
 - R2C3 empty (flat #808080)

SIZE CHECK: 64x40 art px (320x200 output px): psu_cheap, psu_standard, psu_premium; 64x32 art px (320x160 output px): radiator_240; 96x32 art px (480x160 output px): radiator_360; cell 96x40 (480x200 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S29 · `sheet_bg_tiles_64.png` – Hintergrund-Kacheln (kachelbar)

- **Zelle:** 64×64 px · **Raster:** 3 Spalten × 1 Zeilen · **Gesamt:** 192×64 px
- **Sprites:** 3 · **belegte Zellen:** 3 von 3 · **KI-Größe:** ×8 = 1536×512 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `bg_tile_pcb` | `bg_tile_pcb` | 64×64 | Spieltisch: dunkle Platine, gedämpft (Farben 9/10) |
| Z1 · S2 | `bg_tile_esd` | `bg_tile_esd` | 64×64 | Werkbank: ESD-Matte, Rastermuster (Farben 3/4) |
| Z1 · S3 | `bg_tile_bios` | `bg_tile_bios` | 16×16 | BIOS-Muster blau, dezentes Raster (16×16) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_bg_tiles_64.png
Target size: 192x64 px = 3 columns x 1 rows of 64x64 px cells, no gaps, no margins. Generate it at x8 (1536x512 px): one art pixel = 8x8 output pixels, one cell = 512x512 output pixels.
THEME: seamlessly tileable background tiles (left edge matches right edge, top matches bottom). Dithering is allowed here: checkerboard only.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "bg_tile_pcb" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: dark muted circuit board: base #0f2a1c, traces #1d4a2c, rare via dots; very low contrast, tileable
 - R1C2 "bg_tile_esd" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: ESD workbench mat: grid pattern with #2a2a44 and #43435f, low contrast, tileable
 - R1C3 "bg_tile_bios" — EXACT SIZE 16x16 art px (128x128 output px), centered in the 64x64 cell: BIOS background: dark blue #1f3f9a with a subtle grid; ONLY 16x16 px tile centered in the 64x64 cell, rest empty

SIZE CHECK: 64x64 art px (512x512 output px): bg_tile_pcb, bg_tile_esd; 16x16 art px (128x128 output px): bg_tile_bios; cell 64x64 (512x512 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S30 · `sheet_logo_192x48.png` – Logo (4 Frames Glanz)

- **Zelle:** 192×48 px · **Raster:** 4 Spalten × 1 Zeilen · **Gesamt:** 768×48 px
- **Sprites:** 1 · **belegte Zellen:** 4 von 4 · **KI-Größe:** zeilen-/zellenweise, je Zelle ×8

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–4 | `logo_bottleneck` | `logo_bottleneck_0` … `logo_bottleneck_3` | 192×48 · 4 Fr. | Schriftzug mit Flaschenhals-Motiv; Glanz läuft durch (4 Frames) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_logo_192x48.png
Target size: 768x48 px = 4 columns x 1 rows of 192x48 px cells, no gaps, no margins. This sheet is too large for one generation: generate ONE ROW (or one cell) per image at x8 (one cell = 1536x384 output pixels, one row = 6144x384) and assemble the rows afterwards. For every request repeat: "same style as the previous rows".
THEME: the game logo. TEXT IS ALLOWED HERE. Word "BOTTLENECK" in chunky pixel letters, with a bottleneck (funnel/bottle neck) motif, e.g. the letters flowing into a narrow neck. Colors: steel + hot orange/red accent; gold highlight.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–4 ROW OF 4 FRAMES (animation or states, left to right), "logo_bottleneck" — EXACT SIZE 192x48 art px (1536x384 output px) per frame, fills the whole cell: Frame 1: finished logo, no shine. Frames 2-4: the identical logo; a diagonal white-gold glint of 3px width moves from left to right across the letters (#f4f4fa/#ffe28a), exactly the same pixels otherwise

SIZE CHECK: every sprite is exactly 192x48 art px (1536x384 output px) in a 192x48 cell (1536x384 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S31 · `sheet_fx8_8.png` – Effekte 8×8: Münze, POST-LEDs, Funken, Konfetti, Slot-Glow

- **Zelle:** 8×8 px · **Raster:** 8 Spalten × 4 Zeilen · **Gesamt:** 64×32 px
- **Sprites:** 5 · **belegte Zellen:** 25 von 32 · **KI-Größe:** ×16 = 1024×512 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–6 | `fx_coin` | `fx_coin_0` … `fx_coin_5` | 8×8 · 6 Fr. | Münze dreht sich (6 Frames) |
| Z1 · S7–8 | – | (leer) | – | – |
| Z2 · S1–8 | `fx_post_led` | `fx_post_led_0` … `fx_post_led_7` | 8×8 · 8 Fr. | Debug-LEDs: je Farbe aus/an (CPU rot, DRAM gelb, VGA weiß, BOOT grün) |
| Z3 · S1–4 | `fx_spark` | `fx_spark_0` … `fx_spark_3` | 8×8 · 4 Fr. | Funken (4 Frames) |
| Z3 · S5–8 | `fx_confetti` | `fx_confetti_0` … `fx_confetti_3` | 4×4 · 4 Fr. | Konfetti: 4 Farbvarianten (4×4) |
| Z4 · S1–3 | `slot_glow` | `slot_glow_0` … `slot_glow_2` | 8×8 · 3 Fr. | Slot-Markierung, 9-Slice, Puls (3 Frames) |
| Z4 · S4–8 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_fx8_8.png
Target size: 64x32 px = 8 columns x 4 rows of 8x8 px cells, no gaps, no margins. Generate it at x16 (1024x512 px): one art pixel = 16x16 output pixels, one cell = 128x128 output pixels.
THEME: tiny effect sprites 8x8 (confetti 4x4 centered in the cell). Bright saturated palette colors, hard pixels.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–6 ROW OF 6 FRAMES (animation or states, left to right), "fx_coin" — EXACT SIZE 8x8 art px (128x128 output px) per frame, fills the whole cell: spinning coin: frame 1 full round face, frames 2-3 narrowing to the edge, frame 4 a thin edge line, frames 5-6 widening again; gold #e0a848 / #ffe28a
 - R1C7–8 empty (flat #808080)
 - R2C1–8 ROW OF 8 FRAMES (animation or states, left to right), "fx_post_led" — EXACT SIZE 8x8 art px (128x128 output px) per frame, fills the whole cell: 4 LEDs, each 2 frames (off, on) in this order: CPU red (off dark #8c1c2b, on #e8432d with bright center), DRAM yellow (off #b9781c, on #ffd23f), VGA white (off #6a6a88, on #f4f4fa), BOOT green (off #1f7a3a, on #a8f07a)
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "fx_spark" — EXACT SIZE 8x8 art px (128x128 output px) per frame, fills the whole cell: electric sparks: small star burst of yellow #ffd23f and white, growing then fading over 4 frames
 - R3C5–8 ROW OF 4 FRAMES (animation or states, left to right), "fx_confetti" — EXACT SIZE 4x4 art px (64x64 output px) per frame, centered in the 8x8 cell: confetti piece 4x4 in 4 colors: #ff3fa4, #2ef2ff, #ffd23f, #3fbf5f (one color per cell), single square/rectangular piece
 - R4C1–3 ROW OF 3 FRAMES (animation or states, left to right), "slot_glow" — EXACT SIZE 8x8 art px (128x128 output px) per frame, fills the whole cell: slot marker 8x8 9-slice (3px corners), drawn in WHITE/light grey only (#f4f4fa, #cfd0e0) because the engine tints it; a hollow rounded ring; 3 frames pulse the ring thickness 1-2-1px
 - R4C4–8 empty (flat #808080)

SIZE CHECK: 8x8 art px (128x128 output px): fx_coin, fx_post_led, fx_spark, slot_glow; 4x4 art px (64x64 output px): fx_confetti; cell 8x8 (128x128 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S32 · `sheet_fx16_16.png` – Effekte 16×16: Bursts und Frost

- **Zelle:** 16×16 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 96×48 px
- **Sprites:** 3 · **belegte Zellen:** 16 von 18 · **KI-Größe:** ×16 = 1536×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–6 | `fx_burst_leistung` | `fx_burst_leistung_0` … `fx_burst_leistung_5` | 16×16 · 6 Fr. | Blauer Pixel-Burst bei +L (6 Frames) |
| Z2 · S1–6 | `fx_burst_takt` | `fx_burst_takt_0` … `fx_burst_takt_5` | 16×16 · 6 Fr. | Roter Pixel-Burst bei +Takt (6 Frames) |
| Z3 · S1–4 | `fx_frost` | `fx_frost_0` … `fx_frost_3` | 16×16 · 4 Fr. | Eiskristalle (4 Frames) |
| Z3 · S5–6 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_fx16_16.png
Target size: 96x48 px = 6 columns x 3 rows of 16x16 px cells, no gaps, no margins. Generate it at x16 (1536x768 px): one art pixel = 16x16 output pixels, one cell = 256x256 output pixels.
THEME: 16x16 effect animations, bright saturated, hard pixels, burst grows from the center then dissolves into scattered pixels.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–6 ROW OF 6 FRAMES (animation or states, left to right), "fx_burst_leistung" — EXACT SIZE 16x16 art px (256x256 output px) per frame, fills the whole cell: blue pixel burst (#3a7bf0, #8cc4ff, #f4f4fa): tiny star -> expanding ring of pixels -> scattered pixels fading, 6 frames
 - R2C1–6 ROW OF 6 FRAMES (animation or states, left to right), "fx_burst_takt" — EXACT SIZE 16x16 art px (256x256 output px) per frame, fills the whole cell: red pixel burst (#e8432d, #ff8a2e, #ffd23f): same animation shape as the blue burst, 6 frames
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "fx_frost" — EXACT SIZE 16x16 art px (256x256 output px) per frame, fills the whole cell: ice crystals: 3-4 small snowflake/crystal shapes in #8cc4ff and #f4f4fa appear and twinkle, 4 frames
 - R3C5–6 empty (flat #808080)

SIZE CHECK: every sprite is exactly 16x16 art px (256x256 output px) in a 16x16 cell (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S33 · `sheet_fx_tall_16x32.png` – Effekte hoch: Rauch, Feuer, Stromblitz

- **Zelle:** 16×32 px · **Raster:** 8 Spalten × 3 Zeilen · **Gesamt:** 128×96 px
- **Sprites:** 3 · **belegte Zellen:** 18 von 24 · **KI-Größe:** ×12 = 1536×1152 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–8 | `fx_smoke` | `fx_smoke_0` … `fx_smoke_7` | 16×16 · 8 Fr. | Rauchwolke (8 Frames) |
| Z2 · S1–6 | `fx_fire` | `fx_fire_0` … `fx_fire_5` | 16×24 · 6 Fr. | Flamme (6 Frames) |
| Z2 · S7–8 | – | (leer) | – | – |
| Z3 · S1–4 | `fx_lightning` | `fx_lightning_0` … `fx_lightning_3` | 16×32 · 4 Fr. | Stromblitz (4 Frames) |
| Z3 · S5–8 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_fx_tall_16x32.png
Target size: 128x96 px = 8 columns x 3 rows of 16x32 px cells, no gaps, no margins. Generate it at x12 (1536x1152 px): one art pixel = 12x12 output pixels, one cell = 192x384 output pixels.
THEME: tall effect animations. Sprites smaller than the cell (smoke 16x16, fire 16x24) are centered vertically in the 16x32 cell.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "fx_smoke" — EXACT SIZE 16x16 art px (192x192 output px) per frame, centered in the 16x32 cell: smoke puff 16x16: grey puffs #6a6a88, #9b9bb4, #cfd0e0 rising and spreading, hard cloud shapes, fading at the end, 8 frames
 - R2C1–6 ROW OF 6 FRAMES (animation or states, left to right), "fx_fire" — EXACT SIZE 16x24 art px (192x288 output px) per frame, centered in the 16x32 cell: fire 16x24: flame with core #ffd23f, #ff8a2e, #e8432d, outer #8c1c2b; tip flickers, 6 frames
 - R2C7–8 empty (flat #808080)
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "fx_lightning" — EXACT SIZE 16x32 art px (192x384 output px) per frame, fills the whole cell: lightning bolt 16x32: jagged vertical bolt in #f4f4fa with #2ef2ff / #ffd23f glow edges; a different jag path each of the 4 frames
 - R3C5–8 empty (flat #808080)

SIZE CHECK: 16x16 art px (192x192 output px): fx_smoke; 16x24 art px (192x288 output px): fx_fire; 16x32 art px (192x384 output px): fx_lightning; cell 16x32 (192x384 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S34 · `sheet_fx32_32.png` – Effekte 32×32: ×Takt-Blitz, Einrast-Klick, Rauschtextur

- **Zelle:** 32×32 px · **Raster:** 5 Spalten × 3 Zeilen · **Gesamt:** 160×96 px
- **Sprites:** 3 · **belegte Zellen:** 14 von 15 · **KI-Größe:** ×8 = 1280×768 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–5 | `fx_xtakt_flash` | `fx_xtakt_flash_0` … `fx_xtakt_flash_4` | 32×32 · 5 Fr. | Großer Blitz-Ring bei ×Takt (5 Frames) |
| Z2 · S1–5 | `fx_install_click` | `fx_install_click_0` … `fx_install_click_4` | 24×24 · 5 Fr. | „Klick“-Sterne beim Einrasten (5 Frames) |
| Z3 · S1–4 | `fx_glitch_noise` | `fx_glitch_noise_0` … `fx_glitch_noise_3` | 32×32 · 4 Fr. | Rauschtextur, kachelbar (4 Frames) |
| Z3 · S5 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_fx32_32.png
Target size: 160x96 px = 5 columns x 3 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1280x768 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: 32x32 effect animations. Bright saturated, hard pixels.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–5 ROW OF 5 FRAMES (animation or states, left to right), "fx_xtakt_flash" — EXACT SIZE 32x32 art px (256x256 output px) per frame, fills the whole cell: big lightning ring: a ring of red #e8432d / yellow #ffd23f bolts expanding from the center outward, 5 frames growing and then dissolving
 - R2C1–5 ROW OF 5 FRAMES (animation or states, left to right), "fx_install_click" — EXACT SIZE 24x24 art px (192x192 output px) per frame, centered in the 32x32 cell: click stars 24x24: small 4-point stars in #f4f4fa / #ffd23f bursting outward from the center and fading, 5 frames
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "fx_glitch_noise" — EXACT SIZE 32x32 art px (256x256 output px) per frame, fills the whole cell: tileable noise texture 32x32: random pixels in #0b0b12, #2a2a44, #6a6a88, #f4f4fa with horizontal streak bands, seamless at all edges; every frame a different random pattern, fully opaque
 - R3C5 empty (flat #808080)

SIZE CHECK: 32x32 art px (256x256 output px): fx_xtakt_flash, fx_glitch_noise; 24x24 art px (192x192 output px): fx_install_click; cell 32x32 (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### S35 · `sheet_fx_pack_open_64.png` – Effekt: Booster öffnen

- **Zelle:** 64×64 px · **Raster:** 6 Spalten × 1 Zeilen · **Gesamt:** 384×64 px
- **Sprites:** 1 · **belegte Zellen:** 6 von 6 · **KI-Größe:** ×4 = 1536×256 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–6 | `fx_pack_open` | `fx_pack_open_0` … `fx_pack_open_5` | 64×64 · 6 Fr. | Folie reißt, Lichtstrahl (6 Frames) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_fx_pack_open_64.png
Target size: 384x64 px = 6 columns x 1 rows of 64x64 px cells, no gaps, no margins. Generate it at x4 (1536x256 px): one art pixel = 4x4 output pixels, one cell = 256x256 output pixels.
THEME: booster opening animation, 6 frames in one row.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–6 ROW OF 6 FRAMES (animation or states, left to right), "fx_pack_open" — EXACT SIZE 64x64 art px (256x256 output px) per frame, fills the whole cell: a foil pack in the center of the cell: frame 1 intact pack (grey-blue foil), frame 2 a tear at the top, frame 3 the foil opens, frame 4 a beam of light (#ffe28a and #f4f4fa) shoots upward, frame 5 the beam is strongest with sparkles, frame 6 the foil pieces fall away and the beam fades

SIZE CHECK: every sprite is exactly 64x64 art px (256x256 output px) in a 64x64 cell (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

---

## 4. MVP-Einzeldateien (große Bilder)

Diese Bilder sind zu groß oder zu einzigartig für ein Raster. Jedes ist eine eigene PNG-Datei. Die Prompts verweisen wie die Sheet-Prompts auf Prompt 0.

### E01 · `mb_pcb_matx.png` – Leeres mATX-Mainboard-PCB

- **Größe:** 160×160 px (Einzelbild) · **KI-Größe:** ×8 = 1280×1280 px
- **Asset:** `mb_pcb_matx` · PCB-Schlüsselfarben, Leiterbahnen, Bohrlöcher; keine Slots/Teile (werden datengetrieben platziert).

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: mb_pcb_matx.png
Target size: 160x160 px (a single image, no grid). Generate it at x8 (1280x1280 px): one art pixel = 8x8 output pixels.
KEY COLORS FOR THIS IMAGE: paint the whole board surface ONLY in the PCB key tones #00ff00 (light), #00c000 (mid), #008000 (dark). The engine swaps them (green budget board or black premium board). Do not use the palette greens on the board.
Empty micro-ATX motherboard PCB, seen face-on, 160x160 px, square. Only the bare board: PCB key colors #00ff00 (light), #00c000 (mid), #008000 (dark) for the entire board surface; copper-colored traces drawn as thin lines in the dark key tone with a few light key highlights; 6 mounting holes (round, outline #0b0b12, steel ring #9b9bb4) near the corners and edges; a few vias and empty solder pads. NO sockets, NO slots, NO components, NO text (they are placed by the engine). Keep a flat open area for the CPU socket at the upper-center-left. Outer edge: 1px #0b0b12 outline, board corners cut square.
```

### E02 · `mb_pcb_atx.png` – Leeres ATX-Mainboard-PCB

- **Größe:** 160×200 px (Einzelbild) · **KI-Größe:** ×6 = 960×1200 px
- **Asset:** `mb_pcb_atx` · Wie mATX, aber 160×200.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: mb_pcb_atx.png
Target size: 160x200 px (a single image, no grid). Generate it at x6 (960x1200 px): one art pixel = 6x6 output pixels.
KEY COLORS FOR THIS IMAGE: paint the whole board surface ONLY in the PCB key tones #00ff00 (light), #00c000 (mid), #008000 (dark). The engine swaps them (green budget board or black premium board). Do not use the palette greens on the board.
Empty ATX motherboard PCB, same style as the micro-ATX board (use the same pattern language), 160x200 px (portrait). PCB key colors #00ff00 / #00c000 / #008000 only; traces, vias, 9 mounting holes; NO sockets, slots, components or text.
```

### E03 · `case_office.png` – Gehäuse CA1: Büro-Tower (Innenansicht)

- **Größe:** 240×300 px (Einzelbild) · **KI-Größe:** ×5 = 1200×1500 px
- **Asset:** `case_office` · Beiger Innenraum, 5,25″-Schacht, 1 Lüfterplatz hinten, mATX-Bohrungen.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: case_office.png
Target size: 240x300 px (a single image, no grid). Generate it at x5 (1200x1500 px): one art pixel = 5x5 output pixels.
Inside view of an old beige office PC tower case (the side panel is removed), 240x300 px portrait, frontal. Beige walls in the palette beige tones (#8a7a5c shadow, #c9b88f base, #e8dcb8 light; #6a6a88 only for small metal parts), a 5.25-inch drive bay cage at the top right, an empty PSU shelf at the bottom, ONE empty round fan mount on the rear wall, a motherboard tray with 9 standoff screw holes for a micro-ATX board (empty, no board), cable cutouts. NO components inside. Dither shading allowed.
```

### E04 · `case_mesh.png` – Gehäuse CA3: Mesh-Midi (Innenansicht)

- **Größe:** 260×320 px (Einzelbild) · **KI-Größe:** ×4 = 1040×1280 px
- **Asset:** `case_mesh` · Schwarzer Innenraum, Mesh-Front, Netzteil-Abdeckung, 4 Lüfterplätze.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: case_mesh.png
Target size: 260x320 px (a single image, no grid). Generate it at x4 (1040x1280 px): one art pixel = 4x4 output pixels.
Inside view of a modern black mid-tower case with the side panel removed, 260x320 px, frontal. Black interior (#1a1a2e, #2a2a44, #43435f), a mesh front visible at the left edge as a dot pattern, a PSU shroud covering the lower part, 4 EMPTY fan mounts (3 front, 1 rear) as round cutouts with screw holes, a motherboard tray with standoff holes (ATX), cable routing holes with rubber grommets. NO components inside.
```

### E05 · `case_glass.png` – Gehäuse CA4: Glas-Aquarium (Innenansicht)

- **Größe:** 260×320 px (Einzelbild) · **KI-Größe:** ×4 = 1040×1280 px
- **Asset:** `case_glass` · Weißer Innenraum, viel Platz, 6 Lüfterplätze.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: case_glass.png
Target size: 260x320 px (a single image, no grid). Generate it at x4 (1040x1280 px): one art pixel = 4x4 output pixels.
Inside view of a white show-case style PC case, 260x320 px, frontal. White/very light grey interior (#f4f4fa, #cfd0e0, #9b9bb4), spacious, a motherboard tray with standoff holes (ATX), 6 EMPTY fan mounts (3 top, 3 front) with screw holes, a PSU shroud at the bottom, a glass-edge frame suggestion (thin frame lines, no reflection). NO components inside.
```

### E06 · `case_glass_reflex.png` – Glas-Spiegelung (Overlay)

- **Größe:** 260×320 px (Einzelbild) · **KI-Größe:** ×4 = 1040×1280 px
- **Asset:** `case_glass_reflex` · Nur diagonale Streifen als Overlay über dem Gehäuse.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: case_glass_reflex.png
Target size: 260x320 px (a single image, no grid). Generate it at x4 (1040x1280 px): one art pixel = 4x4 output pixels.
Glass reflection overlay for 260x320 px: ONLY a few diagonal bright stripes in #f4f4fa (2 wide, 1 narrow), running from lower-left to upper-right at 45 degrees (pixel-stepped), everything else plain flat #808080 background. The overlay engine applies 50% opacity later; the file has no blended pixels.
```

### E07 · `bg_shop_portrait.png` – Shop-Hintergrund Hochformat

- **Größe:** 400×900 px (Einzelbild) · **KI-Größe:** so groß wie möglich, danach herunterskalieren (siehe 6.3)
- **Asset:** `bg_shop_portrait` · Computerladen-Theke, Regale mit Kartons; Crop-sicherer Kern 360×640 mittig.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: bg_shop_portrait.png
Target size: 400x900 px (a single image, no grid). Generate it as large as your tool allows with the same aspect ratio (400:900); the image is downscaled to 400x900 afterwards (see section 6, large areas).
Background scene, computer shop interior, 400x900 px portrait. Wooden counter (#5a3216, #a8642a) in the lower third, shelves with cardboard boxes (#a8642a, #5a3216) and PC parts on the walls, a hanging sign shape (no text), tiled floor in dithered #2a2a44/#43435f, ceiling lamp light as dithered gradient. IMPORTANT: all essential motifs inside the central 360x640 area; the outer margin is only filler. Leave the central area (the shop shelf positions) calm and low in contrast so UI is readable. No characters, no text. Dithering allowed (checkerboard).
```

### E08 · `bg_shop_landscape.png` – Shop-Hintergrund Querformat

- **Größe:** 800×400 px (Einzelbild) · **KI-Größe:** so groß wie möglich, danach herunterskalieren (siehe 6.3)
- **Asset:** `bg_shop_landscape` · Wie Hochformat; Crop-sicherer Kern 640×360.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: bg_shop_landscape.png
Target size: 800x400 px (a single image, no grid). Generate it as large as your tool allows with the same aspect ratio (800:400); the image is downscaled to 800x400 afterwards (see section 6, large areas).
Same shop scene as the portrait version, composed for 800x400 px landscape; all essential motifs inside the central 640x360 area. Same palette, same objects (counter at the bottom, shelves left and right).
```

### E09 · `bg_title_portrait.png` – Titel-Hintergrund Hochformat

- **Größe:** 400×900 px (Einzelbild) · **KI-Größe:** so groß wie möglich, danach herunterskalieren (siehe 6.3)
- **Asset:** `bg_title_portrait` · Schreibtisch bei Nacht, offener PC mit RGB, Monitor.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: bg_title_portrait.png
Target size: 400x900 px (a single image, no grid). Generate it as large as your tool allows with the same aspect ratio (400:900); the image is downscaled to 400x900 afterwards (see section 6, large areas).
Title screen background, 400x900 px portrait: a desk at night, an open PC case with glowing RGB parts (magenta #ff3fa4 and cyan #2ef2ff glow, dithered), a monitor showing a dim blue screen, cables, a coffee mug, a dark room (#0b0b12, #1a1a2e). Keep the upper third calm (logo goes there). Pixel-art, dithering allowed, no text.
```

### E10 · `bg_title_landscape.png` – Titel-Hintergrund Querformat

- **Größe:** 800×400 px (Einzelbild) · **KI-Größe:** so groß wie möglich, danach herunterskalieren (siehe 6.3)
- **Asset:** `bg_title_landscape` · Wie Hochformat, Querformat.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: bg_title_landscape.png
Target size: 800x400 px (a single image, no grid). Generate it as large as your tool allows with the same aspect ratio (800:400); the image is downscaled to 800x400 afterwards (see section 6, large areas).
Same title scene as portrait, composed for 800x400 px landscape (open PC at the right, monitor at the left, free space in the upper center for the logo).
```

---

## 5. Schriften (kein KI-Prompt)

**Eine Bild-KI ist für Schriften nicht sinnvoll.** Gründe: (1) Die drei Fonts brauchen ca. 110 + 18 + 45 Glyphen mit exakt gleicher Größe, Grundlinie und Strichstärke – KIs halten das über mehr als ein paar Zeichen nicht ein. (2) Glyphen müssen auf ein festes Raster passen (5×7 in 6×9, 8×12 in 9×13, 12×16 in 13×17), das KIs nicht pixelgenau treffen. (3) KIs erfinden oder verwechseln Zeichen (Umlaute, ß, Pfeile, ×, −). (4) Mit freien Pixel-Fonts spart man Aufwand und bekommt Kerning und Zeichensatz geschenkt.

**Empfehlung:** freie Pixel-Fonts verwenden und in eine Bitmap-Font-Textur (PNG + Metrik, z. B. BMFont-Format) rastern, ohne Anti-Aliasing, ganzzahlig, in der exakten Pixelgröße.

| Asset | Anforderung | Vorschlag | Lizenz (vor Einbindung prüfen) |
|---|---|---|---|
| `font_small` | Glyphe 5×7, Zelle 6×9, ca. 110 Glyphen inkl. ÄÖÜäöüß °×€$−…←→↑↓ | **monogram** (datagoblin): Bitmap-Font, Latin-Erweiterungen; **Glyphmaße und das Vorhandensein von ×, €, −, … und Pfeilen prüfen**, fehlende Zeichen im Pixel-Editor ergänzen | CC0 (Public Domain, keine Namensnennung nötig) |
| `font_digits_big` | Glyphe 8×12, Zelle 9×13, 0–9 . , × + − % $ ° k M | nur ca. 20 Zeichen: **selbst zeichnen** (1–2 Stunden in einem Pixel-Editor), alternativ eine 4×6-Ziffernschrift (z. B. aus **Silkscreen**-Art) ×2 skalieren und nachzeichnen | eigene Arbeit bzw. OFL |
| `font_title` | Glyphe 12×16, Zelle 13×17, A–Z ÄÖÜ 0–9 ! ? : - | **Silkscreen** (Jason Kottke; Großbuchstaben-Pixelfont) oder ein 6×8-Pixelfont, **ganzzahlig ×2** skaliert, dann Kanten nachputzen | SIL Open Font License 1.1 (Verwendung in Spielen erlaubt, Font-Datei nicht einzeln verkaufen, Lizenztext beilegen) |

Weitere freie Kandidaten (alle vor der Nutzung auf Lizenz und Zeichensatz prüfen): **Pixelify Sans**, **Tiny5**, **Press Start 2P**, **VT323** (alle OFL, Google Fonts); **Cozette** (MIT, 6×13); **Unscii**. Werkzeuge zum Rastern: **BMFont** (AngelCode, kostenlos), **Hiero** (libGDX, kostenlos), **fontbm** (Open Source, CLI); Pixel-Editor: **Pixelorama**, **LibreSprite** oder **GIMP** (alle frei). Wichtig: in der Zielgröße ohne Glättung rastern und die Zeichensatz-Abdeckung gegen die Liste in `assets.md` 2.1 testen. Die Lizenztexte (OFL/MIT) gehören in die Credits des Spiels.

---

## 6. Nachbearbeitung

Bild-KIs halten Pixelraster, Palette und Zellgrenzen **fast nie** exakt ein. Plane die Nachbearbeitung fest ein.

### 6.1 Vor der Erzeugung
- **Größer erzeugen als Zielgröße, als ganzzahliges Vielfaches** (Faktor siehe „KI-Größe“). Das gibt der KI genug Auflösung für saubere Kanten.
- **Raster-Vorlage mitgeben:** Eine PNG mit den Zellgrenzen (feine Linien in #6a6a88) hilft, wenn das Tool ein Referenz-/Image-to-Image-Bild akzeptiert. Mit ImageMagick z. B.: `magick -size 1152x1440 xc:none -fill none -stroke '#6a6a88' -draw 'line 288,0 288,1440' …` (eine Linie je Zellgrenze) oder in einem Pixel-Editor mit Raster-Overlay. Die Linien müssen **danach** wieder weg.
- **Zu große Sheets** (Spalte „KI-Größe“ sagt „zeilenweise“) und Sheets mit schlechtem Raster: pro Zeile oder pro Sprite erzeugen und danach zusammensetzen. Bei Animationen: Frame 1 von der KI, Folge-Frames als Variation derselben Figur oder von Hand im Editor.
- Jeder Sheet-Prompt mit demselben Seed/Stil-Referenzbild beginnen (Stilkonsistenz).

### 6.2 Pipeline pro Sheet (empfohlene Reihenfolge)
1. **Hintergrund entfernen:** Bei Transparenz-Ausgabe prüfen, dass keine halbtransparenten Ränder bleiben. Sonst Hintergrundfarbe (#808080) per Zauberstab/Flood-Fill von den Rändern aus entfernen, **Toleranz klein halten**, danach Löcher in Sprites (Ringe, Schläuche) manuell prüfen.
2. **Auf Pixelgrid bringen:** Ist die Ausgabe exakt ein Vielfaches (alle Blöcke gleich groß), reicht Nearest-Neighbor-Verkleinerung (ImageMagick: `-filter point -resize 12.5%`; Aseprite/LibreSprite: Sprite → Sprite Size, Methode „Nearest neighbor“). Sind die Blöcke **uneben**, was bei KI der Normalfall ist, nimmt man ein Werkzeug, das das Raster erkennt: **proper-pixel-art** (Python, Open Source, wandelt verrauschte KI-Pixel-Art in echte Pixel-Art um) oder **unfake.js**; Pixelorama/GIMP bieten „Pixelate“-Filter, die weniger zuverlässig sind. Diese Tools besser **pro Zeile oder pro Sprite** als pro Gesamtsheet anwenden.
3. **Auf die Palette quantisieren:** Palette als `bottleneck35.hex` (eine Hex-Zahl je Zeile, die 35 Werte aus Prompt 0 plus die 7 Schlüsselfarben getrennt) bzw. als `palette.png` (35×1 px) anlegen. ImageMagick: `magick in.png +dither -remap palette.png out.png`; Pixelorama/LibreSprite/GIMP: „Palette importieren“ → „Zu Palette konvertieren“ **ohne Dithering**. Schlüsselfarben-Sheets mit der um die jeweiligen Schlüsselfarben erweiterten Palette quantisieren.
4. **Zellraster prüfen und zuschneiden:** Auf Gesamtgröße (siehe Tabelle) bringen, Zellgrenzen als Raster einblenden, Versatz korrigieren. Jedes Sprite muss zentriert in seiner Zelle sitzen. Dann mit `aseprite --batch`/LibreSprite („Slice“), ImageMagick (`-crop WxH`) oder free-tex-packer zuschneiden.
5. **Kontur prüfen:** 1 px #0b0b12, geschlossen. Einzelne verwaiste Pixel („Stäube“) entfernen, doppelte Konturen glätten.
6. **Halbtransparenz prüfen:** Alpha nur 0 oder 255 (ImageMagick: `-channel A -threshold 50% +channel`).
7. **Atlas bauen:** Pro Bereich ein Atlas (UI, Karten, Hardware, Effekte, Hintergründe) mit **free-tex-packer** oder **TexturePacker (Free)**, 2 px Padding mit Extrusion, JSON-Hash, Atlasgröße ≤ 2048×2048, Frames nach den Namen aus Abschnitt 0.
8. **Sichtprüfung im Spiel-Maßstab:** ×1 und ×3 ansehen. Icons müssen bei 1× lesbar sein.

### 6.3 Besonderheiten
- **Große Flächen** (Hintergründe 400×900 / 800×400, Gehäuse, PCBs): Die KI erreicht die Zielgröße meist nicht ganzzahlig. Vorgehen: so groß wie möglich erzeugen → mit „Area/Box“-Filter auf die Zielgröße verkleinern → Palette quantisieren (hier **darf** Bayer-/Schachbrett-Dithering gewählt werden: ImageMagick `-ordered-dither o2x2`) → Kanten und Motive von Hand nachziehen. Für Pixel-Art-Strenge das Ergebnis lieber als **Vorlage zum Nachzeichnen** nutzen.
- **Schlüsselfarben:** Nach dem Quantisieren prüfen, dass die Marken-/PCB-/RGB-Bereiche **nur** aus den drei (bzw. einer) Schlüsselfarben bestehen und nirgends Mischpixel (z. B. #d800d8) vorkommen. Notfalls per „Farbe ersetzen“ auf die nächste Schlüsselfarbe zwingen.
- **9-Slice-Sprites:** Mitte und Kanten müssen kachelbar sein. Mit der Kachelvorschau testen (Ecken 8 px bzw. 4 px).
- **Animationen:** Frames im Editor übereinanderlegen (Onion Skin), Ankerpunkt und Silhouette angleichen, dann auf 8–12 fps (Loops) bzw. 15–20 fps (Effekte) testen.
- **Typische KI-Fehler:** Text/Buchstaben in Sprites (löschen), Schatten unter Objekten (löschen), Verlauf statt harter Stufen (quantisieren und von Hand nacharbeiten), falsche Anzahl Sprites pro Zeile (Zeile neu erzeugen), perspektivische Ansichten (neu erzeugen).
- **Freie Werkzeuge:** **LibreSprite** (freier Aseprite-Fork), **Pixelorama**, **GIMP**, **Krita**, **Piskel** (Browser), **ImageMagick**, **proper-pixel-art**, **free-tex-packer**. (Aseprite selbst ist kostenpflichtig, der Quelltext aber einsehbar.)

### 6.4 Werkzeug: `tools/clean-sheet.mjs` (Schritte 1–3 und 6 automatisch)

Einmalig: `cd tools && npm install` (nur `pngjs`). Rohbilder liegen in `assets/raw/`, Ergebnisse in `assets/clean/`, Vorschauen in `assets/preview/`.

```text
node tools/clean-sheet.mjs assets/raw/sheet_hw_mb_cpu_32.png --size 192x96 --cell 32x32 --grid --expect 5,6,1
node tools/clean-sheet.mjs assets/raw/sheet_tall_a.png --size 128x96 --cell 16x96 --grid --keys
node tools/clean-sheet.mjs assets/raw/sheet_tall_b.png --size 128x96 --cell 16x96 --grid --keys --remap 2ef2ff=00ffff@1
# danach untereinander stapeln: magick assets/clean/sheet_tall_a.png assets/clean/sheet_tall_b.png -append sheet_tall_16x96.png
```

- **Pflicht:** `--size` (Zielgröße aus der Sheet-Tabelle), `--cell`. **Wichtig:** `--bg auto` (Standard: erkennt Rand-, Alpha- und fast weißen Hintergrund) oder `--bg #808080` (flache Hintergrundfarbe aus Prompt 0), `--keys` (Schlüsselfarben erlauben), `--remap SRC=DST@Zeile` (z. B. KI-Cyan #2ef2ff in der RGB-Zeile zu #00ffff), `--expect 5,6,1` (erwartete belegte Zellen je Zeile), `--grid` (Zellraster in der Vorschau). Alle Optionen: `node tools/clean-sheet.mjs --help`.
- **Ablauf:** Hintergrund per Flood-Fill vom Rand entfernen (Rasterlinien und Schleier verschwinden, eingeschlossene Flächen in Sprites bleiben) → Halo-Saum abtragen → bei ganzzahligem Faktor Zielraster mit Modus-Abstimmung im Kern jedes Quellblocks (`resample`), bei nicht ganzzahligem Faktor Art-Pixel-Raster je Sprite erkennen und 1:1 abtasten (`native`, zentriert nach Abschnitt 0 Nr. 3) → Rundung auf BOTTLENECK-35 in OKLab, Kontur-Pixel (#0b0b12) zählen doppelt → nur Alpha 0/255.
- **Ausgaben:** `assets/clean/<name>.png` (Zielgröße), `assets/preview/<name>_x4.png` (4×, Nearest-Neighbor, Schachbrett, optional Zellraster), `assets/clean/<name>.report.json` und der gleiche Bericht in der Konsole: genutzte Farben, belegte/leere Zellen, Sprite-Boxen, Sprites an/über Zellgrenzen, nicht zentrierte Sprites, Konturlücken, erkannte Art-Pixel-Größe der Quelle (nur Warnung).
- **Danach prüfen:** Vorschau ansehen, WARNUNGEN lesen, Konturlücken und Schlüsselfarben (`--keys`) von Hand nacharbeiten. Wiederholen mit `--core`, `--outline-weight` oder `--mode resample|native`, wenn Details fehlen.

---

## 7. P3-Assets („später“)

Kurzfassung. Die Sheets sind wie die MVP-Sheets aufgebaut (dieselbe Master-Prompt-Regel). Prompts sind optional, aber hier bereits vorbereitet, damit sie später ohne Planung nutzbar sind.

### 7.1 Übersicht P3

| Nr | Datei | Zelle | Raster (Sp×Z) | Gesamt px | Sprites |
|---|---|---|---|---|---|
| P01 | `sheet_p3_hw_icons_32.png` | 32×32 | 4×4 | 128×128 | 16 |
| P02 | `sheet_p3_icons32_misc_32.png` | 32×32 | 4×4 | 128×128 | 16 |
| P03 | `sheet_p3_boss_32.png` | 32×32 | 6×1 | 192×32 | 6 |
| P04 | `sheet_p3_boss_portraits_a_64.png` | 64×64 | 8×4 | 512×256 | 4 |
| P05 | `sheet_p3_boss_portraits_b_64.png` | 64×64 | 8×4 | 512×256 | 4 |
| P06 | `sheet_p3_boss_portraits_c_64.png` | 64×64 | 8×4 | 512×256 | 4 |
| P07 | `sheet_p3_boss_portraits_d_64.png` | 64×64 | 8×4 | 512×256 | 4 |
| P08 | `sheet_p3_card_art_cpu_32x24.png` | 32×24 | 5×2 | 160×48 | 10 |
| P09 | `sheet_p3_card_art_gpu_32x24.png` | 32×24 | 5×2 | 160×48 | 10 |
| P10 | `sheet_p3_card_art_ram_32x24.png` | 32×24 | 5×2 | 160×48 | 10 |
| P11 | `sheet_p3_card_art_io_32x24.png` | 32×24 | 5×2 | 160×48 | 10 |
| P12 | `sheet_p3_card_backs_ov_48x64.png` | 48×64 | 4×3 | 192×192 | 6 |
| P13 | `sheet_p3_starter_64.png` | 64×64 | 4×1 | 256×64 | 4 |
| P14 | `sheet_p3_mascot_48.png` | 48×48 | 8×2 | 384×96 | 1 |
| P15 | `sheet_p3_icons16_cursor_fx_16.png` | 16×16 | 8×4 | 128×64 | 12 |
| P16 | `sheet_p3_achievements_24.png` | 24×24 | 5×4 | 120×96 | 20 |
| P17 | `sheet_p3_ui_40x24.png` | 40×24 | 5×1 | 200×24 | 5 |
| P18 | `sheet_p3_bg_boss_tiles_64.png` | 64×64 | 3×2 | 192×128 | 6 |
| P19 | `sheet_p3_loop_cable_tiles_8.png` | 8×8 | 6×3 | 48×24 | 18 |
| P20 | `sheet_p3_parts_64x48.png` | 64×48 | 4×4 | 256×192 | 7 |
| P21 | `mb_pcb_itx.png` | Einzelbild | 1×1 | 112×112 | 1 |
| P22 | `mb_pcb_eatx.png` | Einzelbild | 1×1 | 216×200 | 1 |
| P23 | `case_itx.png` | Einzelbild | 1×1 | 160×200 | 1 |
| P24 | `case_bigtower.png` | Einzelbild | 1×1 | 300×360 | 1 |
| P25 | `bg_shop_anim_landscape_0-3.png` | Einzelbild | 1×1 | 800×400 | 1 |
| P26 | `bg_shop_anim_portrait_0-3.png` | Einzelbild | 1×1 | 400×900 | 1 |
| | **Summe P3** | | | | **179** |

### 7.2 P3-Sheets

#### P01 · `sheet_p3_hw_icons_32.png` – Hardware-Icons (Rest)

- **Zelle:** 32×32 px · **Raster:** 4 Spalten × 4 Zeilen · **Gesamt:** 128×128 px
- **Sprites:** 16 · **belegte Zellen:** 16 von 16 · **KI-Größe:** ×12 = 1536×1536 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_*` | `icon_mb_4` | 32×32 | MB4 ITX-Board (Z790-I) |
| Z1 · S2 | `icon_*` | `icon_mb_6` | 32×32 | MB6 AMX B550 „Stahllegende“ |
| Z1 · S3 | `icon_*` | `icon_mb_8` | 32×32 | MB8 AMX X670E E-ATX |
| Z1 · S4 | `icon_*` | `icon_cpu_6` | 32×32 | C6 AMX Zenit 3 (Einsteiger) |
| Z2 · S1 | `icon_*` | `icon_cpu_7` | 32×32 | C7 AMX Zenit 7 5800X3D |
| Z2 · S2 | `icon_*` | `icon_cpu_10` | 32×32 | C10 AMX Zenit 9 7950X |
| Z2 · S3 | `icon_*` | `icon_ram_7` | 32×32 | R7 DDR5-7200 Platin-Kit |
| Z2 · S4 | `icon_*` | `icon_drive_6` | 32×32 | S6 M.2 Gen5 |
| Z3 · S1 | `icon_*` | `icon_psu_5` | 32×32 | P5 1600-W-Titan |
| Z3 · S2 | `icon_*` | `icon_cooler_6` | 32×32 | K6 Custom-Loop „Aquarium“ |
| Z3 · S3 | `icon_*` | `icon_fan_3` | 32×32 | F3 Industrielüfter |
| Z3 · S4 | `icon_*` | `icon_case_2` | 32×32 | CA2 Schuhkarton ITX |
| Z4 · S1 | `icon_*` | `icon_case_5` | 32×32 | CA5 Big Tower „Kühlschrank“ |
| Z4 · S2 | `icon_*` | `icon_exp_2` | 32×32 | E2 10G-Netzwerkkarte |
| Z4 · S3 | `icon_*` | `icon_exp_5` | 32×32 | E5 WLAN-Karte |
| Z4 · S4 | `icon_*` | `icon_exp_6` | 32×32 | E6 RAID-Controller |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_hw_icons_32.png
Target size: 128x128 px = 4 columns x 4 rows of 32x32 px cells, no gaps, no margins. Generate it at x12 (1536x1536 px): one art pixel = 12x12 output pixels, one cell = 384x384 output pixels.
THEME: hardware shop icons 32x32, same rules as the MVP hardware icons (stylised, centered, ~28px).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_mb_4" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: tiny square mini-ITX board, black PCB, 1 PCIe slot, 2 DIMMs, a big heatsink
 - R1C2 "icon_mb_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: ATX board with a steel-grey armor plate over the VRM, red accents
 - R1C3 "icon_mb_8" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: huge E-ATX black board, giant heatsinks with gold trim, 4 DIMMs
 - R1C4 "icon_cpu_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: budget CPU with red label, plain spreader
 - R2C1 "icon_cpu_7" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: CPU with red label and a cache-stack symbol
 - R2C2 "icon_cpu_10" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: big CPU with red label, gold pins, workstation look
 - R2C3 "icon_ram_7" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: 2 sticks with platinum white-silver heat spreaders, gold trim
 - R2C4 "icon_drive_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: M.2 stick with a tall heatsink and a tiny active fan
 - R3C1 "icon_psu_5" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: huge black PSU with a dark titanium sticker and many modular sockets
 - R3C2 "icon_cooler_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: custom water loop: reservoir, tubes, CPU block, blue coolant
 - R3C3 "icon_fan_3" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: thick industrial fan, steel frame with yellow warning stripes, 5 chunky blades
 - R3C4 "icon_case_2" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small shoebox-like horizontal ITX case
 - R4C1 "icon_case_5" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: giant tower case the size of a fridge, with a tiny door handle shape
 - R4C2 "icon_exp_2" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: NIC card with a heatsink and an RJ45 port
 - R4C3 "icon_exp_5" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: card with two antennas
 - R4C4 "icon_exp_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: card with a big heatsink and multiple SATA connectors

SIZE CHECK: every icon is about 28x28 art px (336x336 output px), centered in its 32x32 cell (384x384 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P02 · `sheet_p3_icons32_misc_32.png` – Icons 32×32: Software (Rest), Werkzeuge (Rest), Gutscheine

- **Zelle:** 32×32 px · **Raster:** 4 Spalten × 4 Zeilen · **Gesamt:** 128×128 px
- **Sprites:** 16 · **belegte Zellen:** 16 von 16 · **KI-Größe:** ×12 = 1536×1536 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_sw_* (Rest)` | `icon_sw_13` | 32×32 | SW13 Treiber-Fuchs |
| Z1 · S2 | `icon_sw_* (Rest)` | `icon_sw_14` | 32×32 | SW14 Antivirus Plus Pro |
| Z1 · S3 | `icon_sw_* (Rest)` | `icon_sw_17` | 32×32 | SW17 Benchmark-Cheat.exe |
| Z1 · S4 | `icon_sw_* (Rest)` | `icon_sw_18` | 32×32 | SW18 KI-Upscaler |
| Z2 · S1 | `icon_sw_* (Rest)` | `icon_sw_20` | 32×32 | SW20 Dual-Boot |
| Z2 · S2 | `icon_tool_* (Rest)` | `icon_tool_6` | 32×32 | T6 Kabelbinder |
| Z2 · S3 | `icon_tool_* (Rest)` | `icon_tool_7` | 32×32 | T7 BIOS-Mod |
| Z2 · S4 | `icon_tool_* (Rest)` | `icon_tool_10` | 32×32 | T10 Silizium-Lotterie-Los |
| Z3 · S1 | `icon_gutschein_*` | `icon_gutschein_1` | 32×32 | Gutschein 1 |
| Z3 · S2 | `icon_gutschein_*` | `icon_gutschein_2` | 32×32 | Gutschein 2 |
| Z3 · S3 | `icon_gutschein_*` | `icon_gutschein_3` | 32×32 | Gutschein 3 |
| Z3 · S4 | `icon_gutschein_*` | `icon_gutschein_4` | 32×32 | Gutschein 4 |
| Z4 · S1 | `icon_gutschein_*` | `icon_gutschein_5` | 32×32 | Gutschein 5 |
| Z4 · S2 | `icon_gutschein_*` | `icon_gutschein_6` | 32×32 | Gutschein 6 |
| Z4 · S3 | `icon_gutschein_*` | `icon_gutschein_7` | 32×32 | Gutschein 7 |
| Z4 · S4 | `icon_gutschein_*` | `icon_gutschein_8` | 32×32 | Gutschein 8 |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_icons32_misc_32.png
Target size: 128x128 px = 4 columns x 4 rows of 32x32 px cells, no gaps, no margins. Generate it at x12 (1536x1536 px): one art pixel = 12x12 output pixels, one cell = 384x384 output pixels.
THEME: item icons 32x32. Software: retro desktop program icons. Tools: single tool objects. Vouchers: coupon tickets, each with a different pictogram (no text).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_sw_13" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: fox head holding a wrench
 - R1C2 "icon_sw_14" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: shield with a check mark and a crossed-out bug
 - R1C3 "icon_sw_17" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: sneaky grinning gamepad with a crown
 - R1C4 "icon_sw_18" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: small blurry image growing into a sharp big image, with sparkles
 - R2C1 "icon_sw_20" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: window split in two halves with two different OS emblems
 - R2C2 "icon_tool_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: zip tie around a cable bundle
 - R2C3 "icon_tool_7" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: ROM chip with a wrench
 - R2C4 "icon_tool_10" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: scratch-off lottery ticket with a chip pictogram
 - R3C1 "icon_gutschein_1" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon ticket with a shopping cart
 - R3C2 "icon_gutschein_2" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a price tag
 - R3C3 "icon_gutschein_3" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a chip
 - R3C4 "icon_gutschein_4" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a fan
 - R4C1 "icon_gutschein_5" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a floppy disk
 - R4C2 "icon_gutschein_6" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a screwdriver
 - R4C3 "icon_gutschein_7" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a star
 - R4C4 "icon_gutschein_8" — EXACT SIZE about 28x28 art px (336x336 output px), centered in the 32x32 cell with a 2 px margin of #808080 on every side: coupon with a die

SIZE CHECK: every icon is about 28x28 art px (336x336 output px), centered in its 32x32 cell (384x384 output px) with a 2 px margin of #808080 on every side. Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P03 · `sheet_p3_boss_32.png` – Boss-Chips (Rest)

- **Zelle:** 32×32 px · **Raster:** 6 Spalten × 1 Zeilen · **Gesamt:** 192×32 px
- **Sprites:** 6 · **belegte Zellen:** 6 von 6 · **KI-Größe:** ×8 = 1536×256 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `boss_* (Rest)` | `boss_b9` | 32×32 | B9 Zwangs-Update |
| Z1 · S2 | `boss_* (Rest)` | `boss_b10` | 32×32 | B10 Lösegeld.exe |
| Z1 · S3 | `boss_* (Rest)` | `boss_b12` | 32×32 | B12 Ping 999 |
| Z1 · S4 | `boss_* (Rest)` | `boss_b13` | 32×32 | B13 Treiber-Rollback |
| Z1 · S5 | `boss_* (Rest)` | `boss_f2` | 32×32 | F2 Folding@Zuhause (Finale) |
| Z1 · S6 | `boss_* (Rest)` | `boss_f3` | 32×32 | F3 Y2K38 (Finale) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_boss_32.png
Target size: 192x32 px = 6 columns x 1 rows of 32x32 px cells, no gaps, no margins. Generate it at x8 (1536x256 px): one art pixel = 8x8 output pixels, one cell = 256x256 output pixels.
THEME: round boss "chips" (poker-chip-like tokens ~30px) with a symbol, same style as the MVP boss sheet. Finales (F2, F3) have a golden border.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "boss_b9" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: window with a huge down arrow and a restart circle
 - R1C2 "boss_b10" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: padlock on a screen with a small skull icon
 - R1C3 "boss_b12" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: signal bars in red and a snail
 - R1C4 "boss_b13" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: rewind arrow around a disk
 - R1C5 "boss_f2" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: folded protein spiral with a marathon finish flag, gold border
 - R1C6 "boss_f3" — EXACT SIZE 32x32 art px (256x256 output px), fills the whole cell: glitching calendar/clock with 32 binary digits, gold border

SIZE CHECK: every sprite is exactly 32x32 art px (256x256 output px) in a 32x32 cell (256x256 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P04 · `sheet_p3_boss_portraits_a_64.png` – Boss-Porträts A (B1–B4)

- **Zelle:** 64×64 px · **Raster:** 8 Spalten × 4 Zeilen · **Gesamt:** 512×256 px
- **Sprites:** 4 · **belegte Zellen:** 32 von 32 · **KI-Größe:** zeilen-/zellenweise, je Zelle ×16

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–8 | `boss_portrait_*` | `boss_portrait_b1_0` … `boss_portrait_b1_7` | 64×64 · 8 Fr. | B1 Krysis (8 Frames Idle) |
| Z2 · S1–8 | `boss_portrait_*` | `boss_portrait_b2_0` … `boss_portrait_b2_7` | 64×64 · 8 Fr. | B2 Prime96 (8 Frames Idle) |
| Z3 · S1–8 | `boss_portrait_*` | `boss_portrait_b3_0` … `boss_portrait_b3_7` | 64×64 · 8 Fr. | B3 Kinobank (8 Frames Idle) |
| Z4 · S1–8 | `boss_portrait_*` | `boss_portrait_b4_0` … `boss_portrait_b4_7` | 64×64 · 8 Fr. | B4 MemTest (8 Frames Idle) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_boss_portraits_a_64.png
Target size: 512x256 px = 8 columns x 4 rows of 64x64 px cells, no gaps, no margins. This sheet is too large for one generation: generate ONE ROW (or one cell) per image at x16 (one cell = 1024x1024 output pixels, one row = 8192x1024) and assemble the rows afterwards. For every request repeat: "same style as the previous rows".
THEME: animated boss portraits, 8-frame idle loops, one boss per row.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b1" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B1: alien helmet boss with glowing visor. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R2C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b2" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B2: glowing red-hot chip boss with angry eyes. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R3C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b3" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B3: film-reel boss with a render-tile checker face. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R4C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b4" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B4: RAM stick boss peering through a magnifying glass. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).

SIZE CHECK: every sprite is exactly 64x64 art px (1024x1024 output px) in a 64x64 cell (1024x1024 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P05 · `sheet_p3_boss_portraits_b_64.png` – Boss-Porträts B (B5–B8)

- **Zelle:** 64×64 px · **Raster:** 8 Spalten × 4 Zeilen · **Gesamt:** 512×256 px
- **Sprites:** 4 · **belegte Zellen:** 32 von 32 · **KI-Größe:** zeilen-/zellenweise, je Zelle ×16

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–8 | `boss_portrait_*` | `boss_portrait_b5_0` … `boss_portrait_b5_7` | 64×64 · 8 Fr. | B5 Zeitspion (8 Frames Idle) |
| Z2 · S1–8 | `boss_portrait_*` | `boss_portrait_b6_0` … `boss_portrait_b6_7` | 64×64 · 8 Fr. | B6 Fellmark (8 Frames Idle) |
| Z3 · S1–8 | `boss_portrait_*` | `boss_portrait_b7_0` … `boss_portrait_b7_7` | 64×64 · 8 Fr. | B7 Hitzewelle (8 Frames Idle) |
| Z4 · S1–8 | `boss_portrait_*` | `boss_portrait_b8_0` … `boss_portrait_b8_7` | 64×64 · 8 Fr. | B8 Brownout (8 Frames Idle) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_boss_portraits_b_64.png
Target size: 512x256 px = 8 columns x 4 rows of 64x64 px cells, no gaps, no margins. This sheet is too large for one generation: generate ONE ROW (or one cell) per image at x16 (one cell = 1024x1024 output pixels, one row = 8192x1024) and assemble the rows afterwards. For every request repeat: "same style as the previous rows".
THEME: animated boss portraits, 8-frame idle loops, one boss per row.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b5" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B5: stopwatch boss with a single moving eye. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R2C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b6" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B6: furry burning donut boss. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R3C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b7" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B7: angry sun boss with heat shimmer. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R4C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b8" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B8: flickering light bulb boss. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).

SIZE CHECK: every sprite is exactly 64x64 art px (1024x1024 output px) in a 64x64 cell (1024x1024 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P06 · `sheet_p3_boss_portraits_c_64.png` – Boss-Porträts C (B9–B12)

- **Zelle:** 64×64 px · **Raster:** 8 Spalten × 4 Zeilen · **Gesamt:** 512×256 px
- **Sprites:** 4 · **belegte Zellen:** 32 von 32 · **KI-Größe:** zeilen-/zellenweise, je Zelle ×16

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–8 | `boss_portrait_*` | `boss_portrait_b9_0` … `boss_portrait_b9_7` | 64×64 · 8 Fr. | B9 Zwangs-Update (8 Frames Idle) |
| Z2 · S1–8 | `boss_portrait_*` | `boss_portrait_b10_0` … `boss_portrait_b10_7` | 64×64 · 8 Fr. | B10 Lösegeld.exe (8 Frames Idle) |
| Z3 · S1–8 | `boss_portrait_*` | `boss_portrait_b11_0` … `boss_portrait_b11_7` | 64×64 · 8 Fr. | B11 Shader-Kompilierung (8 Frames Idle) |
| Z4 · S1–8 | `boss_portrait_*` | `boss_portrait_b12_0` … `boss_portrait_b12_7` | 64×64 · 8 Fr. | B12 Ping 999 (8 Frames Idle) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_boss_portraits_c_64.png
Target size: 512x256 px = 8 columns x 4 rows of 64x64 px cells, no gaps, no margins. This sheet is too large for one generation: generate ONE ROW (or one cell) per image at x16 (one cell = 1024x1024 output pixels, one row = 8192x1024) and assemble the rows afterwards. For every request repeat: "same style as the previous rows".
THEME: animated boss portraits, 8-frame idle loops, one boss per row.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b9" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B9: pushy update window boss with a giant download arrow. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R2C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b10" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B10: ransomware boss: a padlock-skull on a screen. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R3C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b11" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B11: hourglass boss with colorful sand. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R4C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b12" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B12: laggy boss: red signal bars and a snail. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).

SIZE CHECK: every sprite is exactly 64x64 art px (1024x1024 output px) in a 64x64 cell (1024x1024 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P07 · `sheet_p3_boss_portraits_d_64.png` – Boss-Porträts D (B13, F1–F3)

- **Zelle:** 64×64 px · **Raster:** 8 Spalten × 4 Zeilen · **Gesamt:** 512×256 px
- **Sprites:** 4 · **belegte Zellen:** 32 von 32 · **KI-Größe:** zeilen-/zellenweise, je Zelle ×16

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–8 | `boss_portrait_*` | `boss_portrait_b13_0` … `boss_portrait_b13_7` | 64×64 · 8 Fr. | B13 Treiber-Rollback (8 Frames Idle) |
| Z2 · S1–8 | `boss_portrait_*` | `boss_portrait_f1_0` … `boss_portrait_f1_7` | 64×64 · 8 Fr. | F1 Cyberpunk 2088 (8 Frames Idle) |
| Z3 · S1–8 | `boss_portrait_*` | `boss_portrait_f2_0` … `boss_portrait_f2_7` | 64×64 · 8 Fr. | F2 Folding@Zuhause (8 Frames Idle) |
| Z4 · S1–8 | `boss_portrait_*` | `boss_portrait_f3_0` … `boss_portrait_f3_7` | 64×64 · 8 Fr. | F3 Y2K38 (8 Frames Idle) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_boss_portraits_d_64.png
Target size: 512x256 px = 8 columns x 4 rows of 64x64 px cells, no gaps, no margins. This sheet is too large for one generation: generate ONE ROW (or one cell) per image at x16 (one cell = 1024x1024 output pixels, one row = 8192x1024) and assemble the rows afterwards. For every request repeat: "same style as the previous rows".
THEME: animated boss portraits, 8-frame idle loops, one boss per row. Finale bosses get a gold frame accent.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_b13" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT B13: boss with a rewind arrow around a disk. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R2C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_f1" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT F1: neon skyline boss, magenta/cyan. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R3C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_f2" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT F2: folding protein spiral marathon boss. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).
 - R4C1–8 ROW OF 8 FRAMES (animation or states, left to right), "boss_portrait_f3" — EXACT SIZE 64x64 art px (1024x1024 output px) per frame, fills the whole cell: BOSS PORTRAIT F3: glitching calendar-clock boss with binary digits. Half-body portrait facing the viewer, 64x64, 8-frame idle loop (breathing / blinking / flickering, small movements only, same silhouette and anchor).

SIZE CHECK: every sprite is exactly 64x64 art px (1024x1024 output px) in a 64x64 cell (1024x1024 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P08 · `sheet_p3_card_art_cpu_32x24.png` – Karten-Art CPU, Stufe 1–10

- **Zelle:** 32×24 px · **Raster:** 5 Spalten × 2 Zeilen · **Gesamt:** 160×48 px
- **Sprites:** 10 · **belegte Zellen:** 10 von 10 · **KI-Größe:** ×8 = 1280×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_art_*_1…10` | `card_art_cpu_1` | 32×24 | Stufe 1 Taschenrechner |
| Z1 · S2 | `card_art_*_1…10` | `card_art_cpu_2` | 32×24 | Stufe 2 Tabellenkalkulation |
| Z1 · S3 | `card_art_*_1…10` | `card_art_cpu_3` | 32×24 | Stufe 3 Archiv entpacken |
| Z1 · S4 | `card_art_*_1…10` | `card_art_cpu_4` | 32×24 | Stufe 4 80 Browser-Tabs |
| Z1 · S5 | `card_art_*_1…10` | `card_art_cpu_5` | 32×24 | Stufe 5 Code kompilieren |
| Z2 · S1 | `card_art_*_1…10` | `card_art_cpu_6` | 32×24 | Stufe 6 Physik-Simulation |
| Z2 · S2 | `card_art_*_1…10` | `card_art_cpu_7` | 32×24 | Stufe 7 KI-Gegner |
| Z2 · S3 | `card_art_*_1…10` | `card_art_cpu_8` | 32×24 | Stufe 8 Video-Encoding |
| Z2 · S4 | `card_art_*_1…10` | `card_art_cpu_9` | 32×24 | Stufe 9 Shader kompilieren |
| Z2 · S5 | `card_art_*_1…10` | `card_art_cpu_10` | 32×24 | Stufe 10 Wettermodell |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_card_art_cpu_32x24.png
Target size: 160x48 px = 5 columns x 2 rows of 32x24 px cells, no gaps, no margins. Generate it at x8 (1280x384 px): one art pixel = 8x8 output pixels, one cell = 256x192 output pixels.
THEME: card illustrations 32x24 for CPU workload cards, blue palette family (#1f3f9a, #3a7bf0, #8cc4ff) on a dark background, one scene per cell, readable at 1x.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_art_cpu_1" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: pocket calculator
 - R1C2 "card_art_cpu_2" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: spreadsheet grid with a chart
 - R1C3 "card_art_cpu_3" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: zip archive box opening
 - R1C4 "card_art_cpu_4" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a browser window with a crowd of many tiny tabs
 - R1C5 "card_art_cpu_5" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: code lines turning into a gear block
 - R2C1 "card_art_cpu_6" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: bouncing balls with trajectory lines
 - R2C2 "card_art_cpu_7" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: robot head with a chess piece
 - R2C3 "card_art_cpu_8" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: film strip squeezed into a small box
 - R2C4 "card_art_cpu_9" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a cube turning into colorful gradient shapes
 - R2C5 "card_art_cpu_10" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: globe with swirling cloud and storm

SIZE CHECK: every sprite is exactly 32x24 art px (256x192 output px) in a 32x24 cell (256x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P09 · `sheet_p3_card_art_gpu_32x24.png` – Karten-Art GPU, Stufe 1–10

- **Zelle:** 32×24 px · **Raster:** 5 Spalten × 2 Zeilen · **Gesamt:** 160×48 px
- **Sprites:** 10 · **belegte Zellen:** 10 von 10 · **KI-Größe:** ×8 = 1280×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_art_*_1…10` | `card_art_gpu_1` | 32×24 | Stufe 1 Desktop zeichnen |
| Z1 · S2 | `card_art_*_1…10` | `card_art_gpu_2` | 32×24 | Stufe 2 Videoplayer |
| Z1 · S3 | `card_art_*_1…10` | `card_art_gpu_3` | 32×24 | Stufe 3 Indie-Spiel |
| Z1 · S4 | `card_art_*_1…10` | `card_art_gpu_4` | 32×24 | Stufe 4 2D-Partikel |
| Z1 · S5 | `card_art_*_1…10` | `card_art_gpu_5` | 32×24 | Stufe 5 Schatten |
| Z2 · S1 | `card_art_*_1…10` | `card_art_gpu_6` | 32×24 | Stufe 6 Texturen |
| Z2 · S2 | `card_art_*_1…10` | `card_art_gpu_7` | 32×24 | Stufe 7 Kantenglättung |
| Z2 · S3 | `card_art_*_1…10` | `card_art_gpu_8` | 32×24 | Stufe 8 Raytracing |
| Z2 · S4 | `card_art_*_1…10` | `card_art_gpu_9` | 32×24 | Stufe 9 Pfadverfolgung |
| Z2 · S5 | `card_art_*_1…10` | `card_art_gpu_10` | 32×24 | Stufe 10 8K-Rendering |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_card_art_gpu_32x24.png
Target size: 160x48 px = 5 columns x 2 rows of 32x24 px cells, no gaps, no margins. Generate it at x8 (1280x384 px): one art pixel = 8x8 output pixels, one cell = 256x192 output pixels.
THEME: card illustrations 32x24 for GPU workload cards, green palette family (#1f7a3a, #3fbf5f, #a8f07a), one scene per cell.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_art_gpu_1" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: desktop with window icons
 - R1C2 "card_art_gpu_2" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: video player with a play button
 - R1C3 "card_art_gpu_3" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: chunky pixel-art game character
 - R1C4 "card_art_gpu_4" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: burst of colorful particles
 - R1C5 "card_art_gpu_5" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a cube casting a hard shadow
 - R2C1 "card_art_gpu_6" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a textured brick wall sample
 - R2C2 "card_art_gpu_7" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a jagged diagonal line next to a smooth line
 - R2C3 "card_art_gpu_8" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a glossy sphere with light rays
 - R2C4 "card_art_gpu_9" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a scene with multiple light bounces and glow
 - R2C5 "card_art_gpu_10" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: an ultra-detailed landscape in a monitor frame

SIZE CHECK: every sprite is exactly 32x24 art px (256x192 output px) in a 32x24 cell (256x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P10 · `sheet_p3_card_art_ram_32x24.png` – Karten-Art RAM, Stufe 1–10

- **Zelle:** 32×24 px · **Raster:** 5 Spalten × 2 Zeilen · **Gesamt:** 160×48 px
- **Sprites:** 10 · **belegte Zellen:** 10 von 10 · **KI-Größe:** ×8 = 1280×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_art_*_1…10` | `card_art_ram_1` | 32×24 | Stufe 1 Notizblock |
| Z1 · S2 | `card_art_*_1…10` | `card_art_ram_2` | 32×24 | Stufe 2 Cache-Abruf |
| Z1 · S3 | `card_art_*_1…10` | `card_art_ram_3` | 32×24 | Stufe 3 Browser-Cache |
| Z1 · S4 | `card_art_*_1…10` | `card_art_ram_4` | 32×24 | Stufe 4 Texturpool |
| Z1 · S5 | `card_art_*_1…10` | `card_art_ram_5` | 32×24 | Stufe 5 Datenbank-Index |
| Z2 · S1 | `card_art_*_1…10` | `card_art_ram_6` | 32×24 | Stufe 6 VM starten |
| Z2 · S2 | `card_art_*_1…10` | `card_art_ram_7` | 32×24 | Stufe 7 Level laden |
| Z2 · S3 | `card_art_*_1…10` | `card_art_ram_8` | 32×24 | Stufe 8 Riesentabelle |
| Z2 · S4 | `card_art_*_1…10` | `card_art_ram_9` | 32×24 | Stufe 9 RAM-Disk |
| Z2 · S5 | `card_art_*_1…10` | `card_art_ram_10` | 32×24 | Stufe 10 Speicherleck |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_card_art_ram_32x24.png
Target size: 160x48 px = 5 columns x 2 rows of 32x24 px cells, no gaps, no margins. Generate it at x8 (1280x384 px): one art pixel = 8x8 output pixels, one cell = 256x192 output pixels.
THEME: card illustrations 32x24 for RAM workload cards, amber palette family (#b9781c, #f2b233, #ffe28a), one scene per cell.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_art_ram_1" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: notepad
 - R1C2 "card_art_ram_2" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: small memory box with a quick arrow
 - R1C3 "card_art_ram_3" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: browser window with a stored box
 - R1C4 "card_art_ram_4" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: pool of small texture swatches
 - R1C5 "card_art_ram_5" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: database cylinder with an index tab
 - R2C1 "card_art_ram_6" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a computer inside a computer
 - R2C2 "card_art_ram_7" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a loading bar with a mini level
 - R2C3 "card_art_ram_8" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a huge spreadsheet grid going off the edge
 - R2C4 "card_art_ram_9" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a RAM stick shaped like a disk
 - R2C5 "card_art_ram_10" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a RAM stick dripping memory blocks

SIZE CHECK: every sprite is exactly 32x24 art px (256x192 output px) in a 32x24 cell (256x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P11 · `sheet_p3_card_art_io_32x24.png` – Karten-Art I/O, Stufe 1–10

- **Zelle:** 32×24 px · **Raster:** 5 Spalten × 2 Zeilen · **Gesamt:** 160×48 px
- **Sprites:** 10 · **belegte Zellen:** 10 von 10 · **KI-Größe:** ×8 = 1280×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_art_*_1…10` | `card_art_io_1` | 32×24 | Stufe 1 Tastendruck |
| Z1 · S2 | `card_art_*_1…10` | `card_art_io_2` | 32×24 | Stufe 2 Mausklick |
| Z1 · S3 | `card_art_*_1…10` | `card_art_io_3` | 32×24 | Stufe 3 USB-Stick |
| Z1 · S4 | `card_art_*_1…10` | `card_art_io_4` | 32×24 | Stufe 4 Spielstand speichern |
| Z1 · S5 | `card_art_*_1…10` | `card_art_io_5` | 32×24 | Stufe 5 Patch laden |
| Z2 · S1 | `card_art_*_1…10` | `card_art_io_6` | 32×24 | Stufe 6 Voice-Chat |
| Z2 · S2 | `card_art_*_1…10` | `card_art_io_7` | 32×24 | Stufe 7 Download |
| Z2 · S3 | `card_art_*_1…10` | `card_art_io_8` | 32×24 | Stufe 8 Streaming |
| Z2 · S4 | `card_art_*_1…10` | `card_art_io_9` | 32×24 | Stufe 9 Backup |
| Z2 · S5 | `card_art_*_1…10` | `card_art_io_10` | 32×24 | Stufe 10 Day-One-Patch (150 GB) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_card_art_io_32x24.png
Target size: 160x48 px = 5 columns x 2 rows of 32x24 px cells, no gaps, no margins. Generate it at x8 (1280x384 px): one art pixel = 8x8 output pixels, one cell = 256x192 output pixels.
THEME: card illustrations 32x24 for I/O workload cards, violet palette family (#5a2a9a, #a05cf0, #cfd0e0), one scene per cell.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_art_io_1" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a keyboard key being pressed
 - R1C2 "card_art_io_2" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a mouse with a click burst
 - R1C3 "card_art_io_3" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a USB stick
 - R1C4 "card_art_io_4" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a floppy disk with a controller
 - R1C5 "card_art_io_5" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a bandage-patch with a download arrow
 - R2C1 "card_art_io_6" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: headset with a speech bubble
 - R2C2 "card_art_io_7" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a cloud with a big down arrow
 - R2C3 "card_art_io_8" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a wave of film frames flowing out of a pipe
 - R2C4 "card_art_io_9" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a cylinder with a circular arrow
 - R2C5 "card_art_io_10" — EXACT SIZE 32x24 art px (256x192 output px), fills the whole cell: a gigantic heavy box crushing a download bar

SIZE CHECK: every sprite is exactly 32x24 art px (256x192 output px) in a 32x24 cell (256x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P12 · `sheet_p3_card_backs_ov_48x64.png` – Alternative Kartenrücken, Overlays Krypto/Cache-Hit

- **Zelle:** 48×64 px · **Raster:** 4 Spalten × 3 Zeilen · **Gesamt:** 192×192 px
- **Sprites:** 6 · **belegte Zellen:** 12 von 12 · **KI-Größe:** ×8 = 1536×1536 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `card_back_*` | `card_back_1` | 48×64 | Rücken 1 |
| Z1 · S2 | `card_back_*` | `card_back_2` | 48×64 | Rücken 2 |
| Z1 · S3 | `card_back_*` | `card_back_3` | 48×64 | Rücken 3 |
| Z1 · S4 | `card_back_*` | `card_back_4` | 48×64 | Rücken 4 |
| Z2 · S1–4 | `card_ov_krypto / card_ov_cachehit` | `card_ov_krypto_0` … `card_ov_krypto_3` | 48×64 · 4 Fr. | Krypto: Münzfunkeln (4 Frames) |
| Z3 · S1–4 | `card_ov_krypto / card_ov_cachehit` | `card_ov_cachehit_0` … `card_ov_cachehit_3` | 48×64 · 4 Fr. | Cache-Hit: Doppelrahmen (4 Frames) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_card_backs_ov_48x64.png
Target size: 192x192 px = 4 columns x 3 rows of 48x64 px cells, no gaps, no margins. Generate it at x8 (1536x1536 px): one art pixel = 8x8 output pixels, one cell = 384x512 output pixels.
THEME: card backs and overlays, 48x64. Overlays: only the border effect is drawn, the interior is plain flat #808080.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "card_back_1" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: alternative card back: gold PCB with a golden chip emblem
 - R1C2 "card_back_2" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: alternative card back: black PCB with magenta/cyan neon traces
 - R1C3 "card_back_3" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: alternative card back: blueprint blue with white schematic lines
 - R1C4 "card_back_4" — EXACT SIZE 48x64 art px (384x512 output px), fills the whole cell: alternative card back: retro beige (#c9b88f with #8a7a5c shade and #e8dcb8 light) with a rainbow stripe and a pixel logo shape
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "card_ov_krypto" — EXACT SIZE 48x64 art px (384x512 output px) per frame, fills the whole cell: CRYPTO overlay: gold coin glints along the edge and 2 tiny coins in the corners, 4 frames
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "card_ov_cachehit" — EXACT SIZE 48x64 art px (384x512 output px) per frame, fills the whole cell: CACHE-HIT overlay: a double cyan #2ef2ff / white frame with a double-card silhouette (two overlapping cards, no letters), 4 frames pulsing

SIZE CHECK: every sprite is exactly 48x64 art px (384x512 output px) in a 48x64 cell (384x512 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P13 · `sheet_p3_starter_64.png` – Starter-PC-Porträts

- **Zelle:** 64×64 px · **Raster:** 4 Spalten × 1 Zeilen · **Gesamt:** 256×64 px
- **Sprites:** 4 · **belegte Zellen:** 4 von 4 · **KI-Größe:** ×6 = 1536×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `starter_portrait_*` | `starter_portrait_buero` | 64×64 | Büro-PC |
| Z1 · S2 | `starter_portrait_*` | `starter_portrait_gaming` | 64×64 | Gebrauchter Gaming-PC |
| Z1 · S3 | `starter_portrait_*` | `starter_portrait_workstation` | 64×64 | Workstation |
| Z1 · S4 | `starter_portrait_*` | `starter_portrait_retro` | 64×64 | Retro-Kiste |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_starter_64.png
Target size: 256x64 px = 4 columns x 1 rows of 64x64 px cells, no gaps, no margins. Generate it at x6 (1536x384 px): one art pixel = 6x6 output pixels, one cell = 384x384 output pixels.
THEME: 4 starter PC portraits, each a stylised PC setup, 64x64.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "starter_portrait_buero" — EXACT SIZE 64x64 art px (384x384 output px), fills the whole cell: beige office PC tower (beige tones #8a7a5c / #c9b88f / #e8dcb8) with a CRT-free flat monitor
 - R1C2 "starter_portrait_gaming" — EXACT SIZE 64x64 art px (384x384 output px), fills the whole cell: a used gaming PC with a cracked glass panel and one lit fan
 - R1C3 "starter_portrait_workstation" — EXACT SIZE 64x64 art px (384x384 output px), fills the whole cell: boxy workstation tower with a big HDD and no GPU
 - R1C4 "starter_portrait_retro" — EXACT SIZE 64x64 art px (384x384 output px), fills the whole cell: retro PC with a penguin sticker

SIZE CHECK: every sprite is exactly 64x64 art px (384x384 output px) in a 64x64 cell (384x384 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P14 · `sheet_p3_mascot_48.png` – Maskottchen „Schraubi“

- **Zelle:** 48×48 px · **Raster:** 8 Spalten × 2 Zeilen · **Gesamt:** 384×96 px
- **Sprites:** 1 · **belegte Zellen:** 12 von 16 · **KI-Größe:** ×4 = 1536×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–8 | `mascot_schraubi` | `mascot_schraubi_idle_0` … `mascot_schraubi_idle_7` | 48×48 · 8 Fr. | Idle (8 Frames) |
| Z2 · S1–4 | `mascot_schraubi` (Teil) | `mascot_schraubi_talk_0` … `mascot_schraubi_talk_3` | 48×48 · 4 Fr. | Sprechen (4 Frames) |
| Z2 · S5–8 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_mascot_48.png
Target size: 384x96 px = 8 columns x 2 rows of 48x48 px cells, no gaps, no margins. Generate it at x4 (1536x384 px): one art pixel = 4x4 output pixels, one cell = 192x192 output pixels.
THEME: mascot "Schraubi": a friendly technician character (a screw-headed little helper with a toolbelt), 48x48. Same character and proportions in every frame.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–8 ROW OF 8 FRAMES (animation or states, left to right), "mascot_schraubi_idle" — EXACT SIZE 48x48 art px (192x192 output px) per frame, fills the whole cell: IDLE loop: breathing, blinking, a small wrench twirl
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "mascot_schraubi_talk" — EXACT SIZE 48x48 art px (192x192 output px) per frame, fills the whole cell: TALKING loop: mouth open/closed with small gestures
 - R2C5–8 empty (flat #808080)

SIZE CHECK: every sprite is exactly 48x48 art px (192x192 output px) in a 48x48 cell (192x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P15 · `sheet_p3_icons16_cursor_fx_16.png` – Garantie-Icons, Cursor, Schmelzen, Leck

- **Zelle:** 16×16 px · **Raster:** 8 Spalten × 4 Zeilen · **Gesamt:** 128×64 px
- **Sprites:** 12 · **belegte Zellen:** 24 von 32 · **KI-Größe:** ×12 = 1536×768 px
- **Hinweis:** Die 8 Garantie-Stufen bekommen eine steigende Zahl von Zierpunkten am Schild (1 … 8 Pixel-Punkte), damit sie ohne Text unterscheidbar sind.

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_garantie_*` | `icon_garantie_1` | 16×16 | Garantie 1 |
| Z1 · S2 | `icon_garantie_*` | `icon_garantie_2` | 16×16 | Garantie 2 |
| Z1 · S3 | `icon_garantie_*` | `icon_garantie_3` | 16×16 | Garantie 3 |
| Z1 · S4 | `icon_garantie_*` | `icon_garantie_4` | 16×16 | Garantie 4 |
| Z1 · S5 | `icon_garantie_*` | `icon_garantie_5` | 16×16 | Garantie 5 |
| Z1 · S6 | `icon_garantie_*` | `icon_garantie_6` | 16×16 | Garantie 6 |
| Z1 · S7 | `icon_garantie_*` | `icon_garantie_7` | 16×16 | Garantie 7 |
| Z1 · S8 | `icon_garantie_*` | `icon_garantie_8` | 16×16 | Garantie 8 |
| Z2 · S1 | `cursor_*` | `cursor_normal` | 16×16 | Cursor normal |
| Z2 · S2 | `cursor_*` | `cursor_grab` | 16×16 | Cursor greifen |
| Z2 · S3–8 | – | (leer) | – | – |
| Z3 · S1–8 | `fx_melt` | `fx_melt_0` … `fx_melt_7` | 16×16 · 8 Fr. | Schmelzender 12-Pin-Stecker (8 Frames) |
| Z4 · S1–6 | `fx_leak` | `fx_leak_0` … `fx_leak_5` | 16×16 · 6 Fr. | Wassertropfen (6 Frames) |
| Z4 · S7–8 | – | (leer) | – | – |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_icons16_cursor_fx_16.png
Target size: 128x64 px = 8 columns x 4 rows of 16x16 px cells, no gaps, no margins. Generate it at x12 (1536x768 px): one art pixel = 12x12 output pixels, one cell = 192x192 output pixels.
THEME: 16x16 icons and effects.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_garantie_1" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield badge, level 1 (bronze) with 1 dot
 - R1C2 "icon_garantie_2" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 2, 2 dots
 - R1C3 "icon_garantie_3" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 3, 3 dots
 - R1C4 "icon_garantie_4" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 4, 4 dots
 - R1C5 "icon_garantie_5" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 5, 5 dots
 - R1C6 "icon_garantie_6" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 6, 6 dots
 - R1C7 "icon_garantie_7" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 7, 7 dots
 - R1C8 "icon_garantie_8" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: warranty shield, level 8, 8 dots, gold, with a small crown
 - R2C1 "cursor_normal" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: retro desktop arrow cursor, white with black outline
 - R2C2 "cursor_grab" — EXACT SIZE 16x16 art px (192x192 output px), fills the whole cell: retro pixel hand cursor, closed grabbing hand
 - R2C3–8 empty (flat #808080)
 - R3C1–8 ROW OF 8 FRAMES (animation or states, left to right), "fx_melt" — EXACT SIZE 16x16 art px (192x192 output px) per frame, fills the whole cell: 12-pin power connector melting: starts intact, glows orange, droops and drips, 8 frames
 - R4C1–6 ROW OF 6 FRAMES (animation or states, left to right), "fx_leak" — EXACT SIZE 16x16 art px (192x192 output px) per frame, fills the whole cell: water drop forming, falling and splashing in ice-blue #8cc4ff / #f4f4fa, 6 frames
 - R4C7–8 empty (flat #808080)

SIZE CHECK: every sprite is exactly 16x16 art px (192x192 output px) in a 16x16 cell (192x192 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P16 · `sheet_p3_achievements_24.png` – Erfolgs-Icons

- **Zelle:** 24×24 px · **Raster:** 5 Spalten × 4 Zeilen · **Gesamt:** 120×96 px
- **Sprites:** 20 · **belegte Zellen:** 20 von 20 · **KI-Größe:** ×12 = 1440×1152 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `icon_achievement_*` | `icon_achievement_01` | 24×24 | Chip (CPU) |
| Z1 · S2 | `icon_achievement_*` | `icon_achievement_02` | 24×24 | Lüfter (GPU) |
| Z1 · S3 | `icon_achievement_*` | `icon_achievement_03` | 24×24 | RAM-Riegel |
| Z1 · S4 | `icon_achievement_*` | `icon_achievement_04` | 24×24 | Stecker (I/O) |
| Z1 · S5 | `icon_achievement_*` | `icon_achievement_05` | 24×24 | Flamme |
| Z2 · S1 | `icon_achievement_*` | `icon_achievement_06` | 24×24 | Schneeflocke |
| Z2 · S2 | `icon_achievement_*` | `icon_achievement_07` | 24×24 | Münze |
| Z2 · S3 | `icon_achievement_*` | `icon_achievement_08` | 24×24 | Krone |
| Z2 · S4 | `icon_achievement_*` | `icon_achievement_09` | 24×24 | Totenkopf |
| Z2 · S5 | `icon_achievement_*` | `icon_achievement_10` | 24×24 | Blitz |
| Z3 · S1 | `icon_achievement_*` | `icon_achievement_11` | 24×24 | Schraubenschlüssel |
| Z3 · S2 | `icon_achievement_*` | `icon_achievement_12` | 24×24 | Diskette |
| Z3 · S3 | `icon_achievement_*` | `icon_achievement_13` | 24×24 | Regenbogen |
| Z3 · S4 | `icon_achievement_*` | `icon_achievement_14` | 24×24 | Pinguin |
| Z3 · S5 | `icon_achievement_*` | `icon_achievement_15` | 24×24 | Würfel |
| Z4 · S1 | `icon_achievement_*` | `icon_achievement_16` | 24×24 | Pokal |
| Z4 · S2 | `icon_achievement_*` | `icon_achievement_17` | 24×24 | Rakete |
| Z4 · S3 | `icon_achievement_*` | `icon_achievement_18` | 24×24 | Uhr |
| Z4 · S4 | `icon_achievement_*` | `icon_achievement_19` | 24×24 | Zahnrad |
| Z4 · S5 | `icon_achievement_*` | `icon_achievement_20` | 24×24 | Stern |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_achievements_24.png
Target size: 120x96 px = 5 columns x 4 rows of 24x24 px cells, no gaps, no margins. Generate it at x12 (1440x1152 px): one art pixel = 12x12 output pixels, one cell = 288x288 output pixels.
THEME: achievement badges 24x24: a round medal with one pictogram. Pictograms (proposal, the GDD does not list names): see cells.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "icon_achievement_01" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: chip
 - R1C2 "icon_achievement_02" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: fan
 - R1C3 "icon_achievement_03" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: RAM
 - R1C4 "icon_achievement_04" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: plug
 - R1C5 "icon_achievement_05" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: flame
 - R2C1 "icon_achievement_06" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: snowflake
 - R2C2 "icon_achievement_07" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: coin
 - R2C3 "icon_achievement_08" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: crown
 - R2C4 "icon_achievement_09" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: skull
 - R2C5 "icon_achievement_10" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: bolt
 - R3C1 "icon_achievement_11" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: wrench
 - R3C2 "icon_achievement_12" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: floppy
 - R3C3 "icon_achievement_13" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: rainbow
 - R3C4 "icon_achievement_14" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: penguin
 - R3C5 "icon_achievement_15" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: die
 - R4C1 "icon_achievement_16" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: trophy
 - R4C2 "icon_achievement_17" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: rocket
 - R4C3 "icon_achievement_18" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: clock
 - R4C4 "icon_achievement_19" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: gear
 - R4C5 "icon_achievement_20" — EXACT SIZE 24x24 art px (288x288 output px), fills the whole cell: star

SIZE CHECK: every sprite is exactly 24x24 art px (288x288 output px) in a 24x24 cell (288x288 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P17 · `sheet_p3_ui_40x24.png` – UI (später): Stempel „Defekt?“, Katalog-Elemente

- **Zelle:** 40×24 px · **Raster:** 5 Spalten × 1 Zeilen · **Gesamt:** 200×24 px
- **Sprites:** 5 · **belegte Zellen:** 5 von 5 · **KI-Größe:** ×6 = 1200×144 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `ui_stamp_defekt` | `ui_stamp_defekt` | 40×20 | Gebrauchtmarkt-Stempel „Defekt?“ (nur Form) |
| Z1 · S2 | `ui_catalog_*` | `ui_catalog_panel` | 24×24 | Katalog: Panel (9-Slice) |
| Z1 · S3 | `ui_catalog_*` | `ui_catalog_entry` | 24×24 | Katalog: Eintrag (9-Slice) |
| Z1 · S4 | `ui_catalog_*` | `ui_catalog_tab` | 24×24 | Katalog: Reiter (9-Slice) |
| Z1 · S5 | `ui_catalog_*` | `ui_catalog_header` | 24×24 | Katalog: Kopfleiste (9-Slice) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_ui_40x24.png
Target size: 200x24 px = 5 columns x 1 rows of 40x24 px cells, no gaps, no margins. Generate it at x6 (1200x144 px): one art pixel = 6x6 output pixels, one cell = 240x144 output pixels.
THEME: UI parts. The catalog 9-slices have no fixed size in assets.md ("diverse"); here assumed 24x24 each.

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "ui_stamp_defekt" — EXACT SIZE 40x20 art px (240x120 output px), centered in the 40x24 cell: rubber-stamp shape 40x20: red double-border rounded rectangle with a crack line, empty interior
 - R1C2 "ui_catalog_panel" — EXACT SIZE 24x24 art px (144x144 output px), centered in the 40x24 cell: catalog panel 9-slice, paper-like #cfd0e0 with steel border
 - R1C3 "ui_catalog_entry" — EXACT SIZE 24x24 art px (144x144 output px), centered in the 40x24 cell: catalog entry row 9-slice, darker panel with a small slot
 - R1C4 "ui_catalog_tab" — EXACT SIZE 24x24 art px (144x144 output px), centered in the 40x24 cell: catalog tab 9-slice
 - R1C5 "ui_catalog_header" — EXACT SIZE 24x24 art px (144x144 output px), centered in the 40x24 cell: catalog header bar 9-slice with a gold accent

SIZE CHECK: 40x20 art px (240x120 output px): ui_stamp_defekt; 24x24 art px (144x144 output px): ui_catalog_panel, ui_catalog_entry, ui_catalog_tab, ui_catalog_header; cell 40x24 (240x144 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P18 · `sheet_p3_bg_boss_tiles_64.png` – Boss-Hintergrundkacheln

- **Zelle:** 64×64 px · **Raster:** 3 Spalten × 2 Zeilen · **Gesamt:** 192×128 px
- **Sprites:** 6 · **belegte Zellen:** 6 von 6 · **KI-Größe:** ×8 = 1536×1024 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `bg_boss_*` | `bg_boss_neon` | 64×64 | Neon |
| Z1 · S2 | `bg_boss_*` | `bg_boss_hitze` | 64×64 | Hitze |
| Z1 · S3 | `bg_boss_*` | `bg_boss_matrix` | 64×64 | Matrix |
| Z2 · S1 | `bg_boss_*` | `bg_boss_eis` | 64×64 | Eis |
| Z2 · S2 | `bg_boss_*` | `bg_boss_blueprint` | 64×64 | Blueprint |
| Z2 · S3 | `bg_boss_*` | `bg_boss_glitch` | 64×64 | Glitch |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_bg_boss_tiles_64.png
Target size: 192x128 px = 3 columns x 2 rows of 64x64 px cells, no gaps, no margins. Generate it at x8 (1536x1024 px): one art pixel = 8x8 output pixels, one cell = 512x512 output pixels.
THEME: seamless tileable background tiles for boss benchmarks, dark and low contrast, dithering allowed. Themes are a proposal (assets.md: "Neon, Hitze, Matrix …").

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "bg_boss_neon" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: dark purple with magenta/cyan neon lines
 - R1C2 "bg_boss_hitze" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: dark red with glowing heat cracks
 - R1C3 "bg_boss_matrix" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: dark green with falling code dots
 - R2C1 "bg_boss_eis" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: dark blue with frost crystals
 - R2C2 "bg_boss_blueprint" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: dark blue grid with white schematic lines
 - R2C3 "bg_boss_glitch" — EXACT SIZE 64x64 art px (512x512 output px), fills the whole cell: black with magenta/cyan displaced stripes

SIZE CHECK: every sprite is exactly 64x64 art px (512x512 output px) in a 64x64 cell (512x512 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P19 · `sheet_p3_loop_cable_tiles_8.png` – Schlauch- und Kabel-Kacheln

- **Zelle:** 8×8 px · **Raster:** 6 Spalten × 3 Zeilen · **Gesamt:** 48×24 px
- **Sprites:** 18 · **belegte Zellen:** 18 von 18 · **KI-Größe:** ×16 = 768×384 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1 | `loop_tube_*` | `loop_tube_h` | 8×8 | Schlauch waagerecht |
| Z1 · S2 | `loop_tube_*` | `loop_tube_v` | 8×8 | Schlauch senkrecht |
| Z1 · S3 | `loop_tube_*` | `loop_tube_curve_a` | 8×8 | Kurve A |
| Z1 · S4 | `loop_tube_*` | `loop_tube_curve_b` | 8×8 | Kurve B |
| Z1 · S5 | `loop_tube_*` | `loop_tube_fitting_h` | 8×8 | Fitting waagerecht |
| Z1 · S6 | `loop_tube_*` | `loop_tube_fitting_v` | 8×8 | Fitting senkrecht |
| Z2 · S1 | `cable_*` | `cable_sleeved_h` | 8×8 | Kabel gesleevt waagerecht |
| Z2 · S2 | `cable_*` | `cable_sleeved_v` | 8×8 | Kabel gesleevt senkrecht |
| Z2 · S3 | `cable_*` | `cable_sleeved_curve_a` | 8×8 | Kabel gesleevt Kurve A |
| Z2 · S4 | `cable_*` | `cable_sleeved_curve_b` | 8×8 | Kabel gesleevt Kurve B |
| Z2 · S5 | `cable_*` | `cable_sleeved_end` | 8×8 | Kabel gesleevt Ende |
| Z2 · S6 | `cable_*` | `cable_sleeved_plug` | 8×8 | Kabel gesleevt Stecker |
| Z3 · S1 | `cable_*` | `cable_mess_1` | 8×8 | Kabelsalat 1 |
| Z3 · S2 | `cable_*` | `cable_mess_2` | 8×8 | Kabelsalat 2 |
| Z3 · S3 | `cable_*` | `cable_mess_3` | 8×8 | Kabelsalat 3 |
| Z3 · S4 | `cable_*` | `cable_mess_4` | 8×8 | Kabelsalat 4 |
| Z3 · S5 | `cable_*` | `cable_mess_5` | 8×8 | Kabelsalat 5 |
| Z3 · S6 | `cable_*` | `cable_mess_6` | 8×8 | Kabelsalat 6 |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_loop_cable_tiles_8.png
Target size: 48x24 px = 6 columns x 3 rows of 8x8 px cells, no gaps, no margins. Generate it at x16 (768x384 px): one art pixel = 16x16 output pixels, one cell = 128x128 output pixels.
THEME: 8x8 tile sets that connect seamlessly: tubes (ice-blue coolant in a clear tube, steel fittings) and cables (sleeved cables in copper/black, tangled cable mess).

CELLS in reading order (R = row, S = column in the row):
 - R1C1 "loop_tube_h" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: straight horizontal tube
 - R1C2 "loop_tube_v" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: straight vertical tube
 - R1C3 "loop_tube_curve_a" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: curve connecting right and down
 - R1C4 "loop_tube_curve_b" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: curve connecting left and down
 - R1C5 "loop_tube_fitting_h" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: steel fitting, horizontal
 - R1C6 "loop_tube_fitting_v" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: steel fitting, vertical
 - R2C1 "cable_sleeved_h" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: sleeved cable horizontal
 - R2C2 "cable_sleeved_v" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: sleeved cable vertical
 - R2C3 "cable_sleeved_curve_a" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: sleeved cable curve right/down
 - R2C4 "cable_sleeved_curve_b" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: sleeved cable curve left/down
 - R2C5 "cable_sleeved_end" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: sleeved cable end with a connector
 - R2C6 "cable_sleeved_plug" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: cable plug connector
 - R3C1 "cable_mess_1" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: tangled cable mess, variant 1
 - R3C2 "cable_mess_2" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: tangled cable mess, variant 2
 - R3C3 "cable_mess_3" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: tangled cable mess, variant 3
 - R3C4 "cable_mess_4" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: tangled cable mess, variant 4
 - R3C5 "cable_mess_5" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: tangled cable mess, variant 5
 - R3C6 "cable_mess_6" — EXACT SIZE 8x8 art px (128x128 output px), fills the whole cell: tangled cable mess, variant 6

SIZE CHECK: every sprite is exactly 8x8 art px (128x128 output px) in a 8x8 cell (128x128 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

#### P20 · `sheet_p3_parts_64x48.png` – Einbau (später): Ausgleichsbehälter, SLI-Brücke, Gen5-SSD, Wasserblock, Karten

- **Zelle:** 64×48 px · **Raster:** 4 Spalten × 4 Zeilen · **Gesamt:** 256×192 px
- **Sprites:** 7 · **belegte Zellen:** 16 von 16 · **KI-Größe:** ×6 = 1536×1152 px

| Zelle | Asset (`assets.md`) | Sprite-Name | Sprite px | Inhalt |
|---|---|---|---|---|
| Z1 · S1–4 | `loop_reservoir` | `loop_reservoir_0` … `loop_reservoir_3` | 24×48 · 4 Fr. | Ausgleichsbehälter: Blasen (4 Frames) |
| Z2 · S1–4 | `sli_bridge` | `sli_bridge_0` … `sli_bridge_3` | 40×8 · 4 Fr. | SLI-Brücke: RGB (4 Frames) |
| Z3 · S1–4 | `m2_ssd_gen5` | `m2_ssd_gen5_0` … `m2_ssd_gen5_3` | 52×12 · 4 Fr. | Gen5-SSD mit Mini-Lüfter (4 Frames) |
| Z4 · S1 | `loop_waterblock` | `loop_waterblock` | 28×28 | CPU-Wasserkühler |
| Z4 · S2 | `exp_nic10g / exp_wlan / exp_raid` | `exp_nic10g` | 52×14 | 10G-Netzwerkkarte (Einbau) |
| Z4 · S3 | `exp_nic10g / exp_wlan / exp_raid` | `exp_wlan` | 36×12 | WLAN-Karte (Einbau) |
| Z4 · S4 | `exp_nic10g / exp_wlan / exp_raid` | `exp_raid` | 64×14 | RAID-Controller (Einbau) |

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

SHEET: sheet_p3_parts_64x48.png
Target size: 256x192 px = 4 columns x 4 rows of 64x48 px cells, no gaps, no margins. Generate it at x6 (1536x1152 px): one art pixel = 6x6 output pixels, one cell = 384x288 output pixels.
THEME: installed parts seen from the front, schematic. Sprites are smaller than the cell: center them with exact sizes. The SLI bridge RGB uses key color #00ffff.
KEY COLOR FOR THIS SHEET: every RGB light element (light bar, ring, glowing fan ring, lit fans) is ONE flat tone #00ffff, no shading inside it. The engine cycles it through rainbow colors. Use #00ffff for nothing else; for other cyan things use the palette cyan #2ef2ff.

CELLS in reading order (R = row, S = column in the row):
 - R1C1–4 ROW OF 4 FRAMES (animation or states, left to right), "loop_reservoir" — EXACT SIZE 24x48 art px (144x288 output px) per frame, centered in the 64x48 cell: coolant reservoir 24x48: clear tube with ice-blue coolant and bubbles rising, 4 frames
 - R2C1–4 ROW OF 4 FRAMES (animation or states, left to right), "sli_bridge" — EXACT SIZE 40x8 art px (240x48 output px) per frame, centered in the 64x48 cell: multi-GPU bridge 40x8: black bar with a light strip in RGB key color #00ffff, 4 frames of a moving bright segment
 - R3C1–4 ROW OF 4 FRAMES (animation or states, left to right), "m2_ssd_gen5" — EXACT SIZE 52x12 art px (312x72 output px) per frame, centered in the 64x48 cell: M.2 Gen5 SSD 52x12 with a small active fan on the heatsink, 4 frames of the spinning fan
 - R4C1 "loop_waterblock" — EXACT SIZE 28x28 art px (168x168 output px), centered in the 64x48 cell: CPU water block 28x28: copper/steel square with 2 tube ports
 - R4C2 "exp_nic10g" — EXACT SIZE 52x14 art px (312x84 output px), centered in the 64x48 cell: 10G NIC side view 52x14 with a heatsink and RJ45 bracket
 - R4C3 "exp_wlan" — EXACT SIZE 36x12 art px (216x72 output px), centered in the 64x48 cell: WLAN card side view 36x12 with 2 antenna stubs
 - R4C4 "exp_raid" — EXACT SIZE 64x14 art px (384x84 output px), centered in the 64x48 cell: RAID card side view 64x14 with a big heatsink and SATA connectors

SIZE CHECK: 24x48 art px (144x288 output px): loop_reservoir; 40x8 art px (240x48 output px): sli_bridge; 52x12 art px (312x72 output px): m2_ssd_gen5; 28x28 art px (168x168 output px): loop_waterblock; 52x14 art px (312x84 output px): exp_nic10g; 36x12 art px (216x72 output px): exp_wlan; 64x14 art px (384x84 output px): exp_raid; cell 64x48 (384x288 output px). Sprite size beats detail: draw fewer details rather than a different size.

Every cell must contain exactly what is listed, nothing else. Cells marked empty stay completely filled with the flat #808080 background.
```

### 7.3 P3-Einzeldateien

#### P21 · `mb_pcb_itx.png` – Leeres ITX-PCB

- **Größe:** 112×112 px (Einzelbild) · **KI-Größe:** ×12 = 1344×1344 px
- **Asset:** `mb_pcb_itx` · Wie mATX, 112×112.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: mb_pcb_itx.png
Target size: 112x112 px (a single image, no grid). Generate it at x12 (1344x1344 px): one art pixel = 12x12 output pixels.
KEY COLORS FOR THIS IMAGE: paint the whole board surface ONLY in the PCB key tones #00ff00 (light), #00c000 (mid), #008000 (dark). The engine swaps them (green budget board or black premium board). Do not use the palette greens on the board.
Empty mini-ITX motherboard PCB, same style as the micro-ATX board, 112x112 px, 4 mounting holes. PCB key colors #00ff00 / #00c000 / #008000 only; no components.
```

#### P22 · `mb_pcb_eatx.png` – Leeres E-ATX-PCB

- **Größe:** 216×200 px (Einzelbild) · **KI-Größe:** ×6 = 1296×1200 px
- **Asset:** `mb_pcb_eatx` · Wie ATX, 216×200.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: mb_pcb_eatx.png
Target size: 216x200 px (a single image, no grid). Generate it at x6 (1296x1200 px): one art pixel = 6x6 output pixels.
KEY COLORS FOR THIS IMAGE: paint the whole board surface ONLY in the PCB key tones #00ff00 (light), #00c000 (mid), #008000 (dark). The engine swaps them (green budget board or black premium board). Do not use the palette greens on the board.
Empty E-ATX motherboard PCB, same style, 216x200 px, 12 mounting holes. PCB key colors only; no components.
```

#### P23 · `case_itx.png` – Gehäuse CA2: Schuhkarton (Innenansicht)

- **Größe:** 160×200 px (Einzelbild) · **KI-Größe:** ×6 = 960×1200 px
- **Asset:** `case_itx` · Kompakt, ITX.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: case_itx.png
Target size: 160x200 px (a single image, no grid). Generate it at x6 (960x1200 px): one art pixel = 6x6 output pixels.
Inside view of a compact shoebox-style ITX case, 160x200 px, cramped interior, dark grey, a tiny motherboard tray, 2 EMPTY fan mounts, no components inside.
```

#### P24 · `case_bigtower.png` – Gehäuse CA5: Kühlschrank-Big-Tower (Innenansicht)

- **Größe:** 300×360 px (Einzelbild) · **KI-Größe:** ×4 = 1200×1440 px
- **Asset:** `case_bigtower` · Riesig, E-ATX, 2×360-Radiator-Platz.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: case_bigtower.png
Target size: 300x360 px (a single image, no grid). Generate it at x4 (1200x1440 px): one art pixel = 4x4 output pixels.
Inside view of a gigantic big-tower case, 300x360 px, black and steel, room for an E-ATX board, 6 EMPTY fan mounts, space for two 360 radiators at the top, no components inside.
```

#### P25 · `bg_shop_anim_landscape_0-3.png` – Animierter Shop-Hintergrund Querformat (4 Einzelbilder)

- **Größe:** 800×400 px (Einzelbild) · **KI-Größe:** so groß wie möglich, danach herunterskalieren (siehe 6.3)
- **Asset:** `bg_shop_anim_landscape` · Frame 0 = `bg_shop_landscape`; Frames 1–3 nur Änderungen (blinkende LEDs, Kunde). Als 4 PNGs ablegen.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: bg_shop_anim_landscape_0-3.png
Target size: 800x400 px (a single image, no grid). Generate it as large as your tool allows with the same aspect ratio (800:400); the image is downscaled to 800x400 afterwards (see section 6, large areas).
Variation of the finished shop landscape background: take bg_shop_landscape as the reference and change ONLY a few details per frame: blinking LEDs on the shelves and a customer silhouette walking by. Provide frames 1-3 as separate images with the same size 800x400.
```

#### P26 · `bg_shop_anim_portrait_0-3.png` – Animierter Shop-Hintergrund Hochformat (4 Einzelbilder)

- **Größe:** 400×900 px (Einzelbild) · **KI-Größe:** so groß wie möglich, danach herunterskalieren (siehe 6.3)
- **Asset:** `bg_shop_anim_portrait` · Wie oben, 400×900.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: bg_shop_anim_portrait_0-3.png
Target size: 400x900 px (a single image, no grid). Generate it as large as your tool allows with the same aspect ratio (400:900); the image is downscaled to 400x900 afterwards (see section 6, large areas).
Same as the landscape animation but for the portrait shop background 400x900.
```

---

## 8. Auffälligkeiten und Annahmen

- **Beige (erledigt):** Büro-Gehäuse (CA1), Netzteil P1 und der Büro-Starter-PC nutzen jetzt die drei Beige-Töne 33–35 der Palette BOTTLENECK-35 (`#8a7a5c` Schatten, `#c9b88f` Grund, `#e8dcb8` Licht). Abstand in OKLab zu den Nachbarn: 0,07–0,08 (Kupfer, Gold, Hellgrau), also unterscheidbar, aber nah genug, um sich ins Gesamtbild einzufügen.
- **Schlüsselfarben nur dort, wo sie nötig sind:** `assets.md` nennt Marken-Swap, aber die Hardware-Icons haben feste Farben pro Bauteil. Annahme: Icons sind **direkt** gemalt (CPU-Label blau/rot, GPU-Blenden rot/grün), Schlüsselfarben nur in `gpu_m`/`gpu_l` (Marke), `mb_pcb_*` (PCB) und RGB-Teilen (RGB). Wenn auch die Icons per Shader getönt werden sollen, müssen die Prompts von S18–S21 angepasst werden.
- **Kartenlayout:** Die Feldkoordinaten der Kartenrahmen (Stufenfeld, Typfeld, Fenster, Namensfeld) in S10 sind ein Vorschlag und müssen in der Implementierung als Konstanten übernommen werden.
- **Watt-Füllung:** Die drei Farbzustände stehen **untereinander** (S03), nicht horizontal, weil das Sheet sonst 480 px breit würde.
- **Sehr große Sprites** (`gpu_l` 216×40, Gehäuse, Hintergründe) lassen sich nicht in ein Raster mit KI-Faktor ≥ ×4 packen. Sie sind einzeln bzw. zeilenweise zu erzeugen.
- **Sehr kleine Sprites** (8×8, 16×16, 4×4 Konfetti) sind für eine KI schwierig. Bei schlechten Ergebnissen lieber von Hand zeichnen oder die KI nur als Ideengeber nutzen.
- **P3-Annahmen:** Maße der `ui_catalog_*`-9-Slices (24×24), Motive der 20 Erfolgs-Icons, der 6 Boss-Kacheln und der 8 Gutscheine sind Vorschläge; `assets.md` und GDD nennen sie nicht.
- **Animationen aus KI:** Folge-Frames (Lüfter, Glanz, Flammen) werden von KIs selten konsistent. Frame 1 erzeugen lassen, die übrigen Frames aus Frame 1 von Hand ableiten (Drehung der Lüfter, Glanz-Sweep).
