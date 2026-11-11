# BOTTLENECK – Asset-Nachbesserung

Stand: erster vollständiger HD-Durchlauf (`node tools/build-all.mjs`). Details je Sheet in `assets/hd/manifest.json`, Übersicht in `assets/preview/overview/`.

**Hauptursache:** Die Bild-KI liefert höchstens das Format **3:1** (z. B. 2172×724). Breitere Sheets werden gestaucht. Lösung: Breite Sheets **hochkant anordnen** (Frames untereinander statt nebeneinander) oder in Teilen erzeugen. Das Build-Skript ordnet die Frames danach wieder um.

## 1. Später nachbessern

Für den Prototyp nutzbar. Status „mit Mängeln“.

| Sheet | Datei | Mangel | Vorschlag |
|---|---|---|---|
| S02 | `sheet_ui_small_32x16` | Format 3:1 statt 2,67:1, Sprites leicht anders proportioniert | Format 8:3 bzw. 16:9 mit Rand verlangen |
| S04 | `sheet_ui_boxes_56x24` | Format 3:1 statt 2,33:1, Boxen ca. 29 % zu breit | Format 7:3 bzw. 16:9 mit Rand |
| S11 | `sheet_card_overlays_48x64` | Flammen von `card_ov_uebertaktet_1…3` oben abgeschnitten | Mehr Rand oben verlangen („flames stay inside the cell“) |
| S22 | `sheet_board_parts_32x44` | Format 0,78 statt 0,73 (7 %) | Nur bei Bedarf |
| S28 | `sheet_psu_radiator_96x40` | Format 3:1 statt 3,6:1, Proportionen leicht abweichend | Zeilenweise erzeugen (Netzteile / Radiatoren) |
| S29 | `sheet_bg_tiles_64` | `bg_tile_pcb` und `bg_tile_bios` nicht nahtlos | Einzeln als „seamless tileable texture“ erzeugen, ggf. im Pixel-Editor mit Offset-Filter nacharbeiten |
| S30 | `sheet_logo_192x48` | Logo ca. 1,4:1 statt 4:1 – **wird ersetzt**, siehe Abschnitt 3 | – |
| S35 | `sheet_fx_pack_open_64` | Format 3:1 statt 6:1, Lichtstrahlen in Frame 5 oben abgeschnitten | 6 Frames als 3×2-Raster (Format 3:2), mehr Rand oben |

## 2. Sofort neu: S27 (Grafikkarten im Einbau)

**✅ Erledigt (2026-11-11):** S27 aus `s27_s/m/l.png` neu gebaut (`tools/gpu.mjs`). Maße in Art-px: S 112×19, M 176×37,8, L 216×58 (dicker als spezifiziert); Sheet-Zelle 221×61 statt 216×40. Lüfterdrehung in den Frames kaum erkennbar (Vorschlag: Lüfter im Spiel per Code drehen).

**Problem:** Quelle 3:1 statt 7,2:1. Die Karten sind ca. 2,3:1 statt 5,4:1 und damit viel zu kurz für den PCIe-Slot.

**Neuer Ansatz:** 3 Bilder, eins pro Karte. Die Animationsframes stehen **untereinander**. So passt das Format in die Grenzen der KI.

| Rohdatei | Inhalt | Anordnung | Format |
|---|---|---|---|
| `assets/raw/s27_s.png` | `gpu_s` (1 Frame, 112×14) | Karte mittig, viel Rand oben/unten | 3:1 |
| `assets/raw/s27_m.png` | `gpu_m_0…3` (176×26) | 4 Frames untereinander | 16:9 |
| `assets/raw/s27_l.png` | `gpu_l_0…3` (216×40) | 4 Frames untereinander | 4:3 |

Vorher wie immer **Prompt 0** senden. Nach dem ersten guten Bild dieses als Stil-Referenz mitgeben.

### S27-S · `s27_s.png`

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: s27_s.png – ONE sprite on flat #808080 background. Image format 3:1 (for example 2172x724).
THEME: installed graphics card seen face-on from the fan side; the card lies horizontally, metal bracket at the LEFT end, gold PCIe contacts along the bottom edge.
CONTENT: "gpu_s" – single-slot low-profile card, NO fans, one long passive aluminium fin heatsink covering the board, small green PCB edge visible.
SHAPE (most important): the card is VERY long and flat. Width : height = 8 : 1. It spans about 90 % of the image width and is centered vertically, with large empty #808080 areas above and below.
Nothing else in the image.
```

### S27-M · `s27_m.png`

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: s27_m.png – 4 animation frames of ONE sprite, stacked VERTICALLY (frame 1 at the top, frame 4 at the bottom), on flat #808080 background. Image format 16:9 (for example 1920x1080).
THEME: installed graphics card seen face-on from the fan side; the card lies horizontally, metal bracket at the LEFT end, gold PCIe contacts along the bottom edge.
KEY COLORS: paint the brand-colored shroud accents ONLY in #ff00ff (light), #c000c0 (mid), #800080 (dark). No other magenta or purple.
CONTENT: "gpu_m" – dual-slot card, dark shroud with brand key color accents, 2 black fans.
ANIMATION: the fans rotate by 1/4 of the blade spacing per frame. Everything else is identical in all 4 frames: same size, same position, same outline.
SHAPE (most important): each card is long and flat, width : height = 7 : 1, spanning about 85 % of the image width. The 4 cards are equally spaced, left edges aligned exactly, with clear #808080 gaps between them.
Nothing else in the image.
```

### S27-L · `s27_l.png`

```text
Apply PROMPT 0 (MASTER STYLE PROMPT) without changes.

IMAGE: s27_l.png – 4 animation frames of ONE sprite, stacked VERTICALLY (frame 1 at the top, frame 4 at the bottom), on flat #808080 background. Image format 4:3 (for example 1536x1152).
THEME: installed graphics card seen face-on from the fan side; the card lies horizontally, metal bracket at the LEFT end, gold PCIe contacts along the bottom edge. Same style as gpu_m, but bigger and thicker.
KEY COLORS: paint the brand-colored shroud accents ONLY in #ff00ff (light), #c000c0 (mid), #800080 (dark). No other magenta or purple.
CONTENT: "gpu_l" – massive triple-slot flagship card, thick shroud with brand key color accents, 3 big black fans, a 12-pin power connector on the top edge.
ANIMATION: the fans rotate by 1/4 of the blade spacing per frame. Everything else is identical in all 4 frames: same size, same position, same outline.
SHAPE (most important): each card is long, width : height = 5.4 : 1, spanning about 90 % of the image width. The 4 cards are equally spaced, left edges aligned exactly, with clear #808080 gaps between them.
Nothing else in the image.
```

**Längenverhältnis der drei Karten im Spiel:** S 112 px, M 176 px, L 216 px breit. Das Build-Skript skaliert jede Karte auf ihre Zielbreite. Die Bilder müssen also nicht untereinander gleich groß sein, nur die Form (Breite : Höhe) muss stimmen.

## 3. Neu: Logo (ersetzt S30)

**Status: eingebaut** (`assets/hd/logo_v2.webp/.json`, Pipeline `tools/logo.mjs` via `build-all.mjs --only L01`, Ansicht `src/view/logo.ts`, Titelbildschirm). Genutzt: `logo_bottle`, `logo_neck`, PC-Frames 0–5 (0 ruhig, 1 Schraube, 2 Schweiß/gelb, 3 maximale Quetschung/rot, 4 Dampf+Funke, 5 Glanz; `logo_pc_extra` unbenutzt, nicht im Atlas). Reihenfolge: 0 → 1 → 2 → 3 → 4 → 5 → 0, dann 1,5 s Pause. Taillenbreite (Anteil an der Gehäusebreite): 0 = 92 %, 1 = 75 %, 2 = 61 %, 3 = 44 %, 4 = 75 %, 5 = 79 %. Der Frame „maximale Quetschung, rote LEDs“ ist nachgeliefert und eingebaut; nichts mehr offen.

**Idee:** Die **Front eines PC-Gehäuses** steckt zwischen den Wörtern **BOTTLE** und **NECK** und wird von beiden Seiten zusammengequetscht – der PC ist der Flaschenhals. Animiert: Die Wörter drücken, der PC wird enger, schwitzt, die LEDs flackern rot, dann federt er zurück.

**Aufbau (modular, für hohe Auflösung):** Jedes Bild wird **einzeln** erzeugt. Die Wörter sind statisch. Nur der PC hat Animationsframes. Das Spiel setzt das Logo zusammen und schiebt die Wörter im Takt der Frames leicht nach innen (nur verschieben, nie verzerren).

| Rohdatei | Inhalt | Format |
|---|---|---|
| `assets/raw/logo_bottle.png` | Wort „BOTTLE“ | 3:1 |
| `assets/raw/logo_neck.png` | Wort „NECK“ | 16:9 |
| `assets/raw/logo_pc_0.png` … `logo_pc_5.png` | PC-Front, 6 Frames | 1:1 |

**Arbeitsweise für gleichbleibende Frames:** Zuerst Prompt 0 senden, dann `logo_pc_0` erzeugen. Für jeden weiteren Frame **`logo_pc_0` als Referenzbild anhängen** (Bearbeiten/Variation, falls das Tool es kann) und nur die genannte Änderung verlangen. Gehäuse, Farben, Größe und Position müssen in allen 6 Frames gleich bleiben. Nach den Wörtern prüfen: Rechtschreibung exakt „BOTTLE“ und „NECK“.

### Logo-Wörter

```text
Apply PROMPT 0 (MASTER STYLE PROMPT). EXCEPTION for this image: it contains lettering.

IMAGE: logo_bottle.png – the word "BOTTLE" as a pixel-art game logo, on flat #808080 background. Image format 3:1 (for example 2172x724).
STYLE: big chunky blocky pixel letters, exactly 6 letters B-O-T-T-L-E, spelled correctly, all caps, letters touching or 1 px apart. Brushed steel letter faces (#6a6a88, #9b9bb4, #cfd0e0 highlight) with a thick 2-3 px #0b0b12 outline and a dark 3D extrusion to the bottom right (#2a2a44, #1a1a2e). A thin hot-orange inner edge (#ff8a2e) on the RIGHT side of the last letter "E", as if it is pressing against something hot. Small rivets/screws on some letters, a few PCB trace lines engraved into the letter faces.
LAYOUT: the word fills about 92 % of the image width, vertically centered. The right edge of the "E" is flat and vertical (it presses against the PC in the final logo).
Nothing else in the image.
```

```text
Apply PROMPT 0 (MASTER STYLE PROMPT). EXCEPTION for this image: it contains lettering.

IMAGE: logo_neck.png – the word "NECK" as a pixel-art game logo, same style as the attached "BOTTLE" image, on flat #808080 background. Image format 16:9 (for example 1920x1080).
STYLE: identical letter height, outline, steel faces, 3D extrusion and engraved traces as "BOTTLE". Exactly 4 letters N-E-C-K, spelled correctly, all caps. A thin hot-orange inner edge (#ff8a2e) on the LEFT side of the "N".
LAYOUT: the word fills about 90 % of the image width, vertically centered. The left edge of the "N" is flat and vertical (it presses against the PC in the final logo).
Nothing else in the image.
```

### Logo-PC (6 Frames)

Gemeinsamer Teil für alle Frames (in jeden Prompt kopieren):

```text
Apply PROMPT 0 (MASTER STYLE PROMPT).

IMAGE: one animation frame of the logo PC, on flat #808080 background. Image format 1:1 (for example 1254x1254).
SUBJECT: the FRONT of a PC tower case, seen straight-on (frontal, no perspective): dark grey front panel (#2a2a44 / #43435f) with a mesh grille in the lower half, a round power button with a cyan LED ring (#2ef2ff) near the top, a small row of 3 status LEDs, two USB ports, and one front fan behind the mesh with an RGB ring drawn ONLY in #00ffff.
SHAPE: the case is pinched in the middle like the neck of a bottle – an hourglass silhouette: top and bottom are full width, the middle is squeezed narrower from both sides. The case is about 2.2 times as tall as it is wide (at the top), centered in the image, filling about 85 % of the image height.
KEEP IDENTICAL IN EVERY FRAME: case design, colors, overall height, top and bottom width, position in the image. Only the details listed under FRAME change. If a reference image is attached, copy it exactly and change only those details.
```

Danach je Frame **eine** dieser Zeilen anhängen:

```text
FRAME logo_pc_0: light squeeze – the middle of the case is 80 % of the top width. Calm: power LED ring cyan, status LEDs green, fan RGB ring #00ffff.
```

```text
FRAME logo_pc_1: medium squeeze – the middle is 70 % of the top width, the side edges bend inward a bit more. One small screw pops out on the left side (a tiny screw flying away). LEDs unchanged.
```

```text
FRAME logo_pc_2: strong squeeze – the middle is 60 % of the top width. Two small sweat drops (#8cc4ff) fly off the case to the left and right. The status LEDs turn yellow (#ffd23f).
```

```text
FRAME logo_pc_3: maximum squeeze – the middle is 50 % of the top width, the front panel bulges slightly outward at top and bottom. A small puff of grey steam above the case, the status LEDs and the power LED ring flash red (#e8432d). Short motion lines on both sides pointing inward.
```

```text
FRAME logo_pc_4: release – the middle springs back to 75 % of the top width. A tiny white-yellow spark (#ffe28a) at the power button. Steam puff fading, LEDs back to cyan and green.
```

```text
FRAME logo_pc_5: rest – same as frame 0 (middle 80 %), plus a small diagonal white shine highlight (#f4f4fa) running across the front panel.
```

**Animationsablauf im Spiel:** 0 → 1 → 2 → 3 → 4 → 5 → (Pause ca. 1,5 s) → wieder 0. Die Wörter rücken bei Frame 1–3 nach innen und federn bei Frame 4 zurück.

### Logo-PC Frame 3 – verbesserter Prompt (maximale Quetschung)

Problem der ersten Runde: Mit Referenzbild übernimmt die KI auch die Silhouette, die Quetschung wächst kaum. Darum hier ausdrücklich: Details kopieren, **Silhouette ändern**. `logo_pc_0` als Referenz anhängen.

```text
Apply PROMPT 0 (MASTER STYLE PROMPT).

EDIT THE ATTACHED REFERENCE IMAGE (logo_pc_0). Output: same image format 1:1, same flat #808080 background.
COPY FROM THE REFERENCE: the case design and all details (front panel, power button, 3 status LEDs, 2 USB ports, hexagon mesh, front fan, feet), the colors, the outline style, the total height, the width of the top edge and of the bottom edge, and the position in the image.
CHANGE (most important): the case is being CRUSHED from the left and right like in a vise – a cartoon-style, exaggerated squeeze. The waist (narrowest point, at the height of the USB ports / top of the mesh) is only HALF as wide as the top edge – clearly much narrower than in the reference. Both side walls bend strongly inward in a smooth hourglass curve. The top section and the bottom section bulge slightly OUTWARD (a few pixels wider than in the reference) because the pressure pushes material up and down. The mesh and the fan ring are squeezed along with the case (the fan ring becomes a narrow vertical oval).
EFFECTS: the power button LED ring and the 3 status LEDs glow RED (#e8432d) instead of cyan/green. A small puff of grey steam rises from the top edge. Two short white motion/impact lines on each side at the waist, pointing inward. Two tiny sweat drops (#8cc4ff) flying off.
Nothing else changes. No text.
```

Ohne Referenzbild (Fallback): den gemeinsamen Teil „Logo-PC“ von oben voranstellen und statt der FRAME-Zeile den Block CHANGE + EFFECTS anhängen.
