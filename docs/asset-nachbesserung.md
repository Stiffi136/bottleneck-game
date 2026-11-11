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
| S30 | `sheet_logo_192x48` | Logo ca. 1,4:1 statt 4:1 (Ziel 16:1 für 4 Frames) | 4 Frames untereinander anordnen (Format 1:1), Logo 4:1 |
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
