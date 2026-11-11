# BOTTLENECK – Assets v0.2 (Liste, Sheets, Bild-KI-Prompts)

Bezug: `docs/game-design-v0.2.md` (IDs), `docs/assets.md` (Stil, Palette, Abschnitt 1 gilt unverändert), `docs/asset-sheets.md` (Format, **Prompt 0 gilt weiter**), `docs/asset-nachbesserung.md` (Erfahrungen mit der Bild-KI).
Erklärungen und Tabellen sind Deutsch, Prompts sind Englisch.

**Entscheidungen (GDD v0.2, 0.3):** Der Auftraggeber erzeugt die Assets selbst mit der Bild-KI (E9). Intellion-GPUs sind freigegeben (E6, Marken-Swap Blau). Durch die Regel „Kein Pech“ (E3) ändern sich nur Bedeutungen und zwei Animationen (`fx_melt` ist jetzt eine Warnanzeige ohne Zerstörung, `fx_leak` zeigt eine überfällige Wartung; die Sterne zeigen den sichtbaren Zustand). Die Zahl der Sprites und Sheets bleibt gleich.

---

## 0. Grundlagen

### 0.1 Was gleich bleibt
- Stil „HD-Pixel-Look“, Palette BOTTLENECK-35, Licht von oben links, 1 px Kontur `#0b0b12`, kein Text in Sprites (`assets.md` 1.1–1.3).
- Pipeline `tools/clean-sheet.mjs --hd` bzw. `tools/build-all.mjs`, Hintergrund flach `#808080` (`assets.md` 1.4).
- Prompt 0 aus `asset-sheets.md` Abschnitt 1 wird vor jedem Prompt gesendet bzw. einmal pro Sitzung.

### 0.2 Lehren aus v0.1 (umgesetzt in allen v0.2-Prompts)
1. **Bildformat höchstens 3:1** (quer oder hoch). Jedes Sheet nennt sein Format; breite Inhalte stehen **untereinander** oder sind **Einzelbilder**.
2. **Formen statt Pixelmaße:** Prompts geben Raster, Bildformat, Seitenverhältnis jedes Sprites und Anteil an der Zelle an. Die exakte Pixelgröße setzt das Import-Werkzeug (Spalte „Ziel px“ in den Tabellen).
3. **Animationen: ein Frame pro Bild.** Frame 0 wird normal erzeugt. Jeder weitere Frame ist eine **Bearbeitung mit Frame 0 als Referenzbild** („copy everything, change only …“). Wo möglich animiert der Code (Lüfter drehen, RGB-Zyklus), dann reicht 1 Frame.
4. **Schlüsselfarben nur, wo nötig:** in v0.2 nur das RGB-Cyan `#00ffff` (LED-Streifen, RGB-Overlay, RGB-Controller). Icons sind direkt in Palettenfarben gemalt (wie v0.1, `asset-sheets.md` Abschnitt 8).
5. **Rand lassen:** Effekte, die über den Sprite-Rand ragen könnten (Funken, Dampf, Sterne), bleiben ausdrücklich innerhalb der Zelle.
6. Nach dem ersten guten Sheet dieses als **Stil-Referenz** mitgeben; für Icons zusätzlich ein v0.1-Sheet derselben Art (z. B. S16 für Hardware-Icons).

### 0.3 Prioritäten und Quellen
- **P1** = für den Muss-Umfang v0.2 · **P2** = Soll · **P3** = Kann (siehe GDD v0.2 Kapitel 9).
- **Quelle:** **Neu** = neuer Entwurf · **Motiv aus Pxx** = Motiv aus dem P3-Plan in `asset-sheets.md` übernommen, Prompt hier neu nach v0.2-Regeln · **Prompt Pxx** = bestehender P3-Prompt wird unverändert genutzt · **Wiederverwendung** = fertiges Asset, keine neue Grafik.

---

## 1. Wiederverwendung (keine neue Grafik)

| Neuer Inhalt | Genutztes Asset | Hinweis |
|---|---|---|
| MB9 A620M, MB10 Z790 Gipfel | `mb_pcb_matx`, `mb_pcb_atx`, Slots aus S22/S23 | PCB-Swap (schwarz), Slots datengetrieben (MB10: 2 DIMM) |
| C11–C15 im Sockel | `cpu_ihs_amx`, `cpu_ihs_intellion` | – |
| G7 RTZ 5080, G8 RZ 9070 XT | `gpu_l` | Marken-Swap Grün bzw. Rot |
| G9 Ark B580, G10 GTX 1080 Ti | `gpu_m` | G9 braucht neuen Swap-Ton **Blau** (nur Shader-Code), G10 Grün |
| R8, R9 | `ram_stick_hs`, `ram_stick_rgb` | – |
| S7 NAS-HDD, S8 Optan | `drive_hdd`, `m2_ssd` | – |
| P6 Titan, P7 Feuerwerk | `psu_premium`, `psu_standard` | – |
| K8 Peltier-AIO | `aio_pump`, `radiator_360` | – |
| Software, Werkzeuge, Treiber, Beta-Treiber | `card_frame_software_g/_s/_l`, `card_frame_tool`, `card_frame_treiber` | Beta-Treiber: Badge `icon16_beta` darüber |
| Peripherie, Bundles im Laden | `card_frame_hardware`, `gem_tier_*` | Bundle: zusätzlich `ui_bundle_ribbon` |
| Gehaltene Karten leuchten | `ui_card_highlight` | Tint Amber (RAM) |
| B18/B19: Karten ohne Wirkung | `card_ov_debuff` | – |
| BTL-Münze fliegt | `fx_coin` | Tint/Farbton per Shader |
| P7 brennt durch, Flüssigmetall-Kurzschluss | `fx_spark`, `fx_smoke`, `fx_fire` | – |
| LN2, Klimakammer | `fx_frost` | – |
| B14 Energiekrise | `fx_lightning` | – |
| Sieg-Bildschirm | `fx_confetti` | – |
| Gebrauchtmarkt, Wallet, Vertrags-Chip | `ui_panel_dark/_light`, `ui_price_tag`, `ui_sold_stamp` | Pinnwand-Panel neu (V11) |
| Synergie-Tags Hitze, OC, RGB, GPU, RAM, I/O | `icon16_hitze`, `icon16_oc`, `icon16_rgb`, `card_typeicon16_gpu/_ram/_io` | neue Tags in V08 |
| GDD-v0.1-Hardware (Soll/Kann) | **Prompt P01** (16 Icons, unverändert), **P21–P24** (ITX/E-ATX-PCB, Gehäuse, nur Kann) | Loop-Teile und SLI-Brücke aus P20 sind jetzt in V13 |
| SW13/14/17/18/20, T6/7/10, Gutscheine V1–V8 | **Prompt P02** (unverändert) | Zuordnung siehe 2.6 |
| B9, B10, B12, B13, F2, F3 | **V20** (Motiv aus P03; P03 hat Format 6:1 und wird ersetzt) | – |
| Erfolge (Kann) | **Prompt P16** (unverändert) | – |

---

## 2. Neue Assets

Maße in virtuellen Pixeln (wie `assets.md`). „Stk.“ = einzelne Sprites. „Sheet“ = Abschnitt 4.

### 2.1 Hardware-Icons (Laden, Lager, Bauteil-Leiste)

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `icon_mb_9`, `icon_cpu_11`, `icon_cpu_12`, `icon_cpu_14`, `icon_gpu_7`, `icon_gpu_8`, `icon_ram_8`, `icon_drive_7`, `icon_psu_6` | Hardware-Icon | 32×32 | 9 | – | MB9 A620M, C11 APU, C12 9800X3D, C14 T-CPU, G7 RTZ 5080, G8 RZ 9070 XT, R8 2×48 GB, S7 NAS-HDD, P6 Titan | P1 | V01 |
| `icon_mb_10`, `icon_cpu_13`, `icon_cpu_15`, `icon_gpu_9`, `icon_gpu_10`, `icon_ram_9`, `icon_drive_8` | Hardware-Icon | 32×32 | 7 | – | MB10 Gipfel, C13 K3, C15 K9-XS, G9 Ark, G10 Ex-Miner, R9 RGB-DDR4, S8 Optan | P2 | V01 |
| `icon_fan_4`, `icon_exp_7` | Hardware-Icon | 32×32 | 2 | – | F4 LED-Streifen, E7 Lichtorgel | P1 | V02 |
| `icon_psu_7`, `icon_cooler_7`, `icon_cooler_8`, `icon_case_6`, `icon_exp_8`, `icon_exp_9` | Hardware-Icon | 32×32 | 6 | – | P7 Feuerwerk, K7 Passiv, K8 Peltier, CA6 Prüfstand, E8 ASIC, E9 POST-Karte | P2 | V02 |
| `icon_cooler_9` | Hardware-Icon | 32×32 | 1 | – | K9 LN2-Pott | P3 | V02 |
| `icon_per_1` … `icon_per_6` | Peripherie-Icon | 32×32 | 6 | – | X1 Balkonkraftwerk, X2 USV, X3 Monitor, X4 Gaming-Stuhl, X5 Klimaanlage, X6 Mikrofon | P2 | V02 |
| `icon_bundle_kit` | Laden-Icon | 32×32 | 1 | – | Aufrüst-Kit: Karton mit Board und CPU | P1 | V02 |

### 2.2 Einbau-Sprites (Werkbank)

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `exp_rgb` | Einbau | 36×12 | 1 | – | E7: x1-Karte mit LED-Leiste (RGB-Schlüsselfarbe) | P1 | V12 |
| `exp_asic` | Einbau | 52×14 | 1 | – | E8: x1-Karte mit Kühlkörper und Mini-Lüfter (Drehung per Code) | P2 | V12 |
| `exp_postcard` | Einbau | 36×12 | 1 | – | E9: Debug-Karte mit Siebensegment-Feld (ohne lesbare Ziffern) | P2 | V12 |
| `exp_nic10g`, `exp_wlan`, `exp_raid` | Einbau | 52×14 / 36×12 / 64×14 | 3 | – | GDD-Teile E2, E5, E6 | P2 | V12 (Motiv aus P20) |
| `m2_ssd_gen5` | Einbau | 52×12 | 1 | 1 (Lüfter per Code) | GDD-Teil S6 | P2 | V12 (Motiv aus P20) |
| `led_strip` | Einbau | 96×4 | 1 | – | F4: LED-Streifen, RGB-Schlüsselfarbe, im Gehäuse oben bzw. an der Front | P1 | V15 |
| `cooler_passive` | Einbau | 52×52 | 1 | – | K7: großer Lamellenblock ohne Lüfter | P2 | V13 |
| `cooler_ln2pot` | Einbau | 28×52 | 1 | 4 (Dampf) | K9: Kupferzylinder mit Reif und Stickstoff-Dampf | P3 | V13 + Edits |
| `case_bench` | Gehäuse | 260×320 | 1 | – | CA6: offener Prüfstand (Blech-Tablett, Abstandshalter, keine Wände) | P2 | V14 |

### 2.3 Software-Icons

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `icon_sw_21`, `_22`, `_24`, `_27`, `_28`, `_30`, `_32` | Icon | 32×32 | 7 | – | ThrottleStop, Hitzerekord, Rekordjagd, Energiesparplan, Race-to-Idle, Disco-Modus, Pathtracing-Overdrive | P1 | V03 |
| `icon_sw_23`, `_25`, `_26`, `_29`, `_31` | Icon | 32×32 | 5 | – | Abwärme-Heizung, Zenit-Meister, Extrem-Tuning, Ökostrom, RGB-App-Zoo | P2 | V03 |
| `icon_sw_33`, `_34`, `_35`, `_36`, `_38`, `_40`, `_42` | Icon | 32×32 | 7 | – | Fidelity-Upscaler, Prefetcher, Auslagerungsdatei, Debloater, Jumbo-Frames, Mooresches Gesetz, Fanboy.exe | P1 | V04 |
| `icon_sw_37`, `_39`, `_41`, `_43`, `_44` | Icon | 32×32 | 5 | – | Telemetrie, Cloud-Abo, Sleeper-Build, Preisvergleich, Steuer-Software | P2 | V04 |

### 2.4 Werkzeuge, Treiber, Gutscheine, Laden-Icons

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `icon_tool_11`, `_12`, `_15`, `_17` | Icon | 32×32 | 4 | – | Firmware-Flash, Recycling-Tonne, Multimeter, Spiegel-Cache | P1 | V05 |
| `icon_tool_13`, `_14`, `_16`, `_18`, `_19`, `_20` | Icon | 32×32 | 6 | – | Flüssigmetall, Delid, RGB-Kabelsatz, Binning-Station, Heißluftfön, LED-Klebeband | P2 | V05 |
| `icon_treiber_pentacore`, `icon_treiber_cluster` | Icon | 32×32 | 2 | – | Geheim-Profile | P2 | V05 |
| `icon_gutschein_9`, `icon_gutschein_10` | Icon | 32×32 | 2 | – | V9 Händler-Kontakt, V10 Lagerhalle (Stil wie P02) | P2 | V05 |
| `icon_gebrauchtmarkt` | Icon | 32×32 | 1 | – | Reiter-Symbol Gebrauchtmarkt | P1 | V05 |
| `icon_wallet` | Icon | 32×32 | 1 | – | Krypto-Wallet | P2 | V05 |

### 2.5 Bosse und Sponsoren

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `boss_b16`, `boss_b17`, `boss_b18` | Boss | 32×32 | 3 | – | Klimakammer, Büro-Modus, Speicherdruck | P1 | V06 |
| `boss_b14`, `boss_b15`, `boss_b19`, `boss_b20`, `boss_f4` | Boss | 32×32 | 5 | – | Energiekrise, Silent-PC-Test, Always-Online-DRM, Höchstleistung, Weltrekord-Run (Finale, Goldrand) | P2 | V06 |
| `sponsor_1` … `sponsor_6` | Sponsor | 32×32 | 6 | – | NXZT Lichtschau, Veridia-Partner, Team Rot, Bluescreen Booster, Grünwatt, HWBotz | P1 | V07 |
| `sponsor_7` … `sponsor_10` | Sponsor | 32×32 | 4 | – | Zuckel, Kingstorm, Beige-Magazin, Wolkig | P2 | V07 |

### 2.6 Zuordnung der P02-Gutschein-Icons (Wiederverwendung)

| P02-Icon | Motiv | v0.2-Gutschein |
|---|---|---|
| `icon_gutschein_1` | Einkaufswagen | V2 Restposten-Regal |
| `icon_gutschein_2` | Preisschild | V1 Kundenkarte |
| `icon_gutschein_3` | Chip | V7 Silizium-Händler |
| `icon_gutschein_4` | Lüfter | V8 Kühlprofi |
| `icon_gutschein_5` | Diskette | V5 Software-Abo |
| `icon_gutschein_6` | Schraubenzieher | V4 Werkzeugkasten XL |
| `icon_gutschein_7` | Stern | V6 Sponsor-Agentur |
| `icon_gutschein_8` | Würfel | V3 Würfel-Abo |

### 2.7 Kleine Icons

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `icon16_stern_voll`, `icon16_stern_leer` | Icon | 16×16 | 2 | – | Zustands-Sterne im Gebrauchtmarkt (sichtbarer Zustand, 0–3 Sterne) | P1 | V08 |
| `icon16_zustand_ok`, `_spuren`, `_defekt` | Icon | 16×16 | 3 | – | Zustand Gebrauchtteil: Haken / Kratzer / Riss (Form + Farbe) | P1 | V08 |
| `icon16_rueckgabe`, `icon16_vertrag` | Icon | 16×16 | 2 | – | Rückgabe (Karton mit Pfeil zurück), Vertrag (Papier mit Siegel) | P1 | V08 |
| `icon16_tag_team_rot`, `_blau`, `_gruen` | Icon | 16×16 | 3 | – | Team-Embleme: rotes Dreieck, blaues Quadrat, grüner Kreis | P1 | V08 |
| `icon8_stern` | Icon | 8×8 | 1 | – | Stern inline | P1 | V08 |
| `icon16_garantie`, `icon16_btl`, `icon16_kurs_hoch`, `icon16_kurs_runter`, `icon16_mining`, `icon16_gutschein`, `icon16_peripherie`, `icon16_beta`, `icon16_auktion`, `icon16_tag_eco`, `icon16_tag_minimal` | Icon | 16×16 | 11 | – | Garantie, BTL-Münze, Kurs ↑/↓, Spitzhacke, Coupon, Monitor, Beta-Kolben, Hammer, Blatt, Schere | P2 | V08 |
| `icon8_btl` | Icon | 8×8 | 1 | – | BTL inline | P2 | V08 |

### 2.8 Karten

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `card_frame_sponsor` | Karte | 48×64 | 1 | – | Vertragskarte: Papier mit Wachssiegel, Fenster für das Emblem | P1 | V09 |
| `card_frame_used` | Karte | 48×64 | 1 | – | Gebraucht-Variante des Hardware-Rahmens: zerkratzt, Klebeband-Ecke | P1 | V09 |
| `card_frame_gutschein` | Karte | 48×64 | 1 | – | Coupon-Karte mit Perforation | P2 | V09 |
| `card_ov_goldensample` | Karte | 48×64 | 1 | 4 (Funkeln) | Golden Sample: schillernder Wafer-Rand, Sternfunkeln | P1 | V10 f0–f3 |
| `card_ov_cachehit` | Karte | 48×64 | 1 | 4 (Puls) | Cache-Hit: doppelter Cyan-Rahmen | P1 | V10 f0–f3 (Motiv aus P12) |
| `card_ov_krypto` | Karte | 48×64 | 1 | 4 (Münzglanz) | Krypto: Münzen am Rand | P1 | V10 f0–f3 (Motiv aus P12) |
| `card_ov_rgb` | Karte | 48×64 | 1 | 1 (Zyklus per Shader) | RGB-beleuchtet: Lichtleiste am Rand in `#00ffff` | P2 | V10 f0 |
| `card_ov_heiss` | Karte | 48×64 | 1 | 4 (Hitzewellen) | Heißläufer: Glut und Hitzeflimmern-Linien (keine Flammen, Abgrenzung zu „Übertaktet“) | P2 | V10 f0–f3 |

### 2.9 UI und Sonstiges

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `ui_panel_cork` | UI | 24×24, 9-Slice (8 px Ecken) | 1 | – | Pinnwand (Kork mit Holzrahmen) für den Gebrauchtmarkt | P1 | V11 |
| `ui_note_paper` | UI | 24×24, 9-Slice | 1 | – | Kleinanzeigen-Zettel mit Pin in der linken oberen Ecke | P1 | V11 |
| `ui_price_tag_used` | UI | 28×12 | 1 | – | Papier-Preisschild mit Loch und ausgefranstem Rand | P1 | V11 |
| `ui_price_tag_sale` | UI | 28×12 | 1 | – | Rotes Angebots-Preisschild mit Zackenrand | P1 | V11 |
| `ui_bundle_ribbon` | UI | 48×12 | 1 | – | Band mit gefalteten Enden („Kit“, Text per Font) | P1 | V11 |
| `ui_stamp_defekt` | UI | 40×20 | 1 | – | Stempel „Defekt“ auf Bastlerware (Form, Text per Font) | P1 | V11 (Motiv aus P17) |
| `ui_slot_empty_peripherie` | UI | 40×40 | 1 | – | Leerer Peripherie-Platz (gestrichelter Schreibtisch mit Monitor-Umriss) | P2 | V11 |
| `trophy_weltrekord` | Branding | 64×64 | 1 | 1 (Glanz per Code) | Pokal für den Sieg-Bildschirm | P2 | V16 |

### 2.10 Assets für die übernommenen v0.1-Features

Bezug: GDD v0.2 Kapitel 11. Neue Sprites hier stammen alle aus Motiven des P3-Plans; die Prompts sind nach den v0.2-Regeln neu geschrieben.

| Name | Kategorie | Größe (px) | Stk. | Frames | Beschreibung | Prio | Sheet |
|---|---|---|---|---|---|---|---|
| `loop_reservoir`, `loop_waterblock` | Einbau | 24×48 / 28×28 | 2 | 1 (Blasen per Code) | K6 Custom-Loop | P2 | V13 (Motiv P20) |
| `sli_bridge` | Einbau | 40×8 | 1 | 1 (RGB-Shader) | Multi-GPU | P3 | V13 (Motiv P20) |
| `card_back_1` … `card_back_4` | Karte | 48×64 | 4 | – | Gold (Weltrekord), Neon (ST2), Blaupause (ST3), Beige (ST4) | P2 | V17 (Motiv P12) |
| `starter_portrait_buero`, `_gaming`, `_workstation`, `_retro` | Meta | 64×64 | 4 | – | Starter-PCs ST1–ST4 | P2 | V18 (Motiv P13) |
| `icon_garantie_1` … `icon_garantie_8` | Icon | 16×16 | 8 | – | Garantie-Stufen G1–G8 | P2 | V19 (Motiv P15) |
| `fx_melt` | Effekt | 16×16 | 1 | 4 (statt 8), Loop | überhitzter 12-Pin-Adapter: Glühen pulsiert (Warnung ab 85 °C, keine Zerstörung) | P2 | V19 + Edits (Motiv P15) |
| `fx_leak` | Effekt | 16×16 | 1 | 4 (statt 6), Loop | Tropfen am Custom-Loop, solange die Wartung überfällig ist | P2 | V19 + Edits (Motiv P15) |
| `boss_b9`, `boss_b10`, `boss_b12`, `boss_b13` | Boss | 32×32 | 4 | – | GDD-Bosse | P2 | V20 (Motiv P03) |
| `boss_f2`, `boss_f3` | Boss | 32×32 | 2 | – | Finale Gen 16 / Gen 20 | P3 | V20 (Motiv P03) |
| `ui_catalog_panel`, `_entry`, `_tab`, `_header` | UI | 24×24, 9-Slice | 4 | – | Hardware-Katalog | P3 | V21 (Motiv P17) |

### 2.11 Prüfung der P3-Pläne (`asset-sheets.md` Abschnitt 7)

Kriterien: Bildformat ≤ 3:1, Hintergrund flach `#808080`, Animationsframes einzeln, Schlüsselfarben nur wo nötig, passend zum heutigen HD-Pixel-Stil.

| P-Sheet | Inhalt | Format | Befund | Entscheidung |
|---|---|---|---|---|
| P01 | Hardware-Icons (16) | 1:1 | passt (statisch, `#808080`, Palette) | **unverändert nutzen** (S/K-Teile) |
| P02 | Software-, Werkzeug-, Gutschein-Icons (16) | 1:1 | passt | **unverändert nutzen** |
| P03 | Boss-Chips (6) | **6:1** | zu breit | **ersetzt durch V20** (3 × 2) |
| P04–P07 | Boss-Porträts, je 8 Frames horizontal | 2:1, aber Zeilen 8:1 | Frames horizontal, 8 Frames, Zeilen zu breit | **verschoben**; für später: 1 statisches Porträt je Boss, 2 × 2 je Bild (1:1), Idle per Code |
| P08–P11 | Karten-Art je Stufe (40) | **3,33:1** | zu breit | **verschoben**; für später: 4 × 3 Raster (Format 16:9) mit 10 belegten Zellen |
| P12 | Kartenrücken + Overlays Krypto/Cache-Hit | 1:1, Overlays 4 Frames horizontal | Frames horizontal | **ersetzt**: Rücken → V17, Overlays → V10 (Einzelframes) |
| P13 | Starter-Porträts | **4:1** | zu breit | **ersetzt durch V18** (2 × 2) |
| P14 | Maskottchen, 8 + 4 Frames | 4:1 | zu breit, viele Frames | **verschoben** (Tutorial) |
| P15 | Garantie-Icons, Cursor, Schmelze, Leck | 2:1, Effekte 8/6 Frames horizontal | Frames horizontal; Garantie-Stufen nur über 1–8 Punkte (bei 16 px kaum lesbar) | **ersetzt durch V19**: Stufen über Farbe (Bronze/Silber/Gold) + 1–3 Winkel, Effekte 4 Frames als Edits; Cursor verworfen |
| P16 | Erfolgs-Icons (20) | 5:4 | passt | **unverändert nutzen** (Kann) |
| P17 | Stempel + Katalog-9-Slices | **8,3:1** | zu breit | **ersetzt**: Stempel → V11, Katalog → V21 (2 × 2) |
| P18 | Boss-Hintergrundkacheln | 3:2 | Kacheln im Sheet werden nicht nahtlos (wie S29) | **verschoben**; für später: je Kachel ein Einzelbild „seamless tileable“ |
| P19 | Schlauch- und Kabel-Kacheln (8 px) | 2:1 | 8-px-Kacheln gelingen der KI schlecht | **verworfen** (Code-Linien) |
| P20 | Loop-Teile, SLI-Brücke, Gen5-SSD, Karten | 4:3, Frames horizontal | Frames horizontal, dünne Teile nebeneinander | **ersetzt**: V12 (Karten, SSD) und V13 (Loop, Brücke), je 1 Frame |
| P21–P24 | ITX-/E-ATX-PCB, ITX-Gehäuse, Big Tower | 1:1 bis 5:6 | passt; Einzelbilder | **unverändert nutzen** (Kann); zusätzlich E02 bzw. E04 als Referenz anhängen, damit Blickwinkel und Maßstab stimmen |
| P25/P26 | animierter Laden-Hintergrund (4 Einzelbilder) | 2:1 / 4:9 | passt formal | **verschoben** (Kosmetik) |

### 2.12 Zusammenfassung

| Kategorie | Sprites | P1 | P2 | P3 |
|---|---|---|---|---|
| Hardware-, Peripherie-, Laden-Icons | 32 | 12 | 19 | 1 |
| Einbau-Sprites und Gehäuse | 14 | 2 | 10 | 2 |
| Software-Icons | 24 | 14 | 10 | 0 |
| Werkzeug-/Treiber-/Gutschein-/Laden-Icons | 16 | 5 | 11 | 0 |
| Bosse | 14 | 3 | 9 | 2 |
| Sponsoren | 10 | 6 | 4 | 0 |
| Kleine Icons (16 px + 8 px, inkl. Garantie) | 31 | 11 | 20 | 0 |
| Karten (Rahmen, Overlays, Rücken) | 12 | 5 | 7 | 0 |
| UI und Sonstiges (inkl. Katalog) | 12 | 6 | 2 | 4 |
| Effekte | 2 | 0 | 2 | 0 |
| Meta (Starter-Porträts) | 4 | 0 | 4 | 0 |
| **Summe neu in v0.2-Sheets** | **171** | **64** | **98** | **9** |

- Davon **38 Sprites mit Motiv aus dem P3-Plan** (7 für neue v0.2-Inhalte: `card_ov_cachehit`, `card_ov_krypto`, `ui_stamp_defekt`, `exp_nic10g`, `exp_wlan`, `exp_raid`, `m2_ssd_gen5`; 31 für übernommene v0.1-Features, Tabelle 2.10), **133 neu entworfen**.
- Zusätzlich unverändert nutzbare P3-Prompts: **P01** (16 Icons), **P02** (16 Icons), **P16** (20 Erfolge, Kann), **P21–P24** (Kann). Ersetzt: P03, P12, P13, P15, P17, P20. Verschoben/verworfen: siehe 2.11.
- Animationsaufwand: 4 Overlays × 3 Folge-Frames (3 Bearbeitungen eines Sheets), 2 Effekte × 3 Folge-Frames (3 Bearbeitungen von V19), 3 Edits für `cooler_ln2pot` (Kann). Alles andere ist statisch oder wird per Code animiert.

---

## 3. Sheet-Übersicht

| Nr | Datei (`assets/raw/`) | Inhalt | Raster (Sp×Z) | Zelle (Ziel px) | Bildformat | Sprites | belegt | Prio |
|---|---|---|---|---|---|---|---|---|
| V01 | `v01_hw_icons_a.png` | Hardware-Icons A | 4×4 | 32×32 | 1:1 | 16 | 16/16 | P1/P2 |
| V02 | `v02_hw_icons_b.png` | Hardware-Icons B, Peripherie, Kit | 4×4 | 32×32 | 1:1 | 16 | 16/16 | P1/P2/P3 |
| V03 | `v03_software_a.png` | Software SW21–SW32 | 4×3 | 32×32 | 4:3 | 12 | 12/12 | P1/P2 |
| V04 | `v04_software_b.png` | Software SW33–SW44 | 4×3 | 32×32 | 4:3 | 12 | 12/12 | P1/P2 |
| V05 | `v05_tools_misc.png` | Werkzeuge, Treiber, Gutscheine, Laden | 4×4 | 32×32 | 1:1 | 16 | 16/16 | P1/P2 |
| V06 | `v06_boss.png` | Bosse B14–B20, F4 | 4×2 | 32×32 | 2:1 | 8 | 8/8 | P1/P2 |
| V07 | `v07_sponsor.png` | Sponsor-Embleme | 5×2 | 32×32 | 5:2 | 10 | 10/10 | P1/P2 |
| V08 | `v08_icons16.png` | Kleine Icons | 6×4 | 16×16 | 3:2 | 23 | 23/24 | P1/P2 |
| V09 | `v09_card_frames.png` | Kartenrahmen | 3×1 | 48×64 | 9:4 | 3 | 3/3 | P1/P2 |
| V10 | `v10_card_ov_f0.png` … `_f3.png` | Overlays, je Bild 1 Frame | 3×2 | 48×64 | 9:8 | 5 | 5/6 | P1/P2 |
| V11 | `v11_ui.png` | UI-Teile | 4×2 | 48×40 | 12:5 | 7 | 7/8 | P1/P2 |
| V12 | `v12_parts_flat.png` | Einbau: Karten, Gen5-SSD | 2×4 | 72×20 | 9:5 | 7 | 7/8 | P1/P2 |
| V13 | `v13_coolers.png` (+ `v13_ln2_f1…f3.png`) | Passivkühler, LN2-Pott, Loop-Teile, SLI-Brücke | 3×2 | 60×52 | 45:26 | 5 | 5/6 | P2/P3 |
| V14 | `v14_case_bench.png` | Einzelbild Prüfstand | 1×1 | 260×320 | 13:16 | 1 | – | P2 |
| V15 | `v15_led_strip.png` | Einzelbild LED-Streifen | 1×1 | 96×4 | 3:1 | 1 | – | P1 |
| V16 | `v16_trophy.png` | Einzelbild Pokal | 1×1 | 64×64 | 1:1 | 1 | – | P2 |
| V17 | `v17_card_backs.png` | Kartenrücken (Motiv P12) | 2×2 | 48×64 | 3:4 | 4 | 4/4 | P2 |
| V18 | `v18_starter.png` | Starter-Porträts (Motiv P13) | 2×2 | 64×64 | 1:1 | 4 | 4/4 | P2 |
| V19 | `v19_icons16_meta_f0.png` (+ `_f1…f3`) | Garantie-Icons, Schmelze, Leck (Motiv P15) | 5×2 | 16×16 | 5:2 | 10 | 10/10 | P2 |
| V20 | `v20_boss_gdd.png` | Boss-Chips B9/B10/B12/B13/F2/F3 (Motiv P03) | 3×2 | 32×32 | 3:2 | 6 | 6/6 | P2/P3 |
| V21 | `v21_catalog.png` | Katalog-9-Slices (Motiv P17) | 2×2 | 24×24 | 1:1 | 4 | 4/4 | P3 |
| | **Summe** | **21 Aufträge, 30 Bilder** (V10 4×, V19 4×, V13 1 + 3 Edits Kann) | | | | **171** | | |

**Reihenfolge-Empfehlung:** V01 → V03 → V04 → V08 → V11 → V09 → V10 → V12 → V15 → V05 → V06 → V07 → Soll-Sheets (V20, V18, V17, V19, V13, V14, V16, V02-Rest) → Kann (V21, LN2-Edits). Stil-Referenzen: V01/V02 mit S16, V03/V04 mit S21, V05 mit S20, V06/V20 mit S15, V08/V19 mit S07, V09/V10/V17 mit S10/S11, V12 mit S24, V13 mit S25, V14 mit E04, V18 mit S19, V21 mit S01.

---

## 4. Prompts

### 4.0 Zusatz zu Prompt 0 (für alle v0.2-Aufträge)

Nach Prompt 0 einmal pro Sitzung senden **oder** vor jeden v0.2-Prompt kopieren. Er ersetzt nur die Größenregel von Prompt 0; alle anderen Regeln (Palette, Kontur, Licht, kein Text, Hintergrund `#808080`) gelten weiter.

```text
PROMPT 0 – v0.2 ADDENDUM (applies to every request marked "v0.2")

1. SIZES AS SHAPES: v0.2 requests do NOT give exact art-pixel sizes. They give the image format (never wider or taller than 3:1), the grid (columns x rows of equal, invisible cells) and, for every sprite, its shape (width : height) and how much of its cell it fills. Follow these proportions exactly. The import tool scales everything to the final pixel size afterwards. This replaces the "SPRITE SIZE RULE" and the "SIZE CHECK" of PROMPT 0 for v0.2 requests.
2. PIXEL LOOK: keep the crisp pixel-art look of the reference sheets: chunky, uniform pixel blocks, 1 px dark outline (#0b0b12), 4 tone steps per material, light from the top left.
3. GRID: cells are invisible – no lines, no borders, no labels. Every sprite stays completely inside its own cell with a clear gap of flat #808080 to the cell edge. Effects (sparks, steam, stars, glints) also stay inside the cell.
4. ONE FRAME PER IMAGE: a v0.2 request shows only one animation frame. Further frames are requested as edits of the first image (attached as reference): copy everything, change only what the request says.
5. BACKGROUND: one flat #808080 everywhere outside the sprites. #808080 is never used inside a sprite.
6. KEY COLORS: only where the request says so (in v0.2 only the RGB light key #00ffff). Icons use normal palette colors.
7. NO TEXT, NO REAL LOGOS: abstract shapes instead of letters and numbers; invented emblems that do not resemble real company logos.
```

### 4.1 Gemeinsamer Icon-Block

Alle 32×32-Icon-Sheets (V01–V07) nutzen diesen Block; er steht in jedem Prompt schon drin.

```text
EACH ICON: one clear motif, centered in its square cell, filling about 85 % of the cell (an even #808080 margin on all four sides). Readable at small size on a phone: chunky silhouette, max. 3 main colors plus outline.
```

---

### V01 · `v01_hw_icons_a.png` – Hardware-Icons A

- **Raster:** 4 × 4 · **Zelle:** 32×32 · **Bildformat:** 1:1 (z. B. 1536×1536) · **Referenz:** S16/S17-Sheet

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `icon_mb_9` | MB9 A620M: schlichtes mATX-Board, 2 DIMM, 1 PCIe x16, kleiner Chipsatz-Kühler | P1 |
| R1C2 | `icon_mb_10` | MB10 Gipfel: ATX-OC-Board, wuchtige Kühlkörper mit Goldkante, nur 2 DIMM, 2 OC-Taster | P2 |
| R1C3 | `icon_cpu_11` | C11 APU: CPU mit rotem Label und Monitor-Piktogramm | P1 |
| R1C4 | `icon_cpu_12` | C12 9800X3D: CPU mit rotem Label, Cache-Stapel, Goldglanz | P1 |
| R2C1 | `icon_cpu_13` | C13 K3: kleine CPU, schlichtes blaues Label | P2 |
| R2C2 | `icon_cpu_14` | C14 T-CPU: CPU mit blauem Label und grünem Blatt | P1 |
| R2C3 | `icon_cpu_15` | C15 K9-XS: CPU mit blauem Label, Goldrahmen, goldener Stern, Hitzestriche | P2 |
| R2C4 | `icon_gpu_7` | G7 RTZ 5080: 3 Lüfter, schwarz mit grünen Akzenten, 12-Pin oben | P1 |
| R3C1 | `icon_gpu_8` | G8 RZ 9070 XT: 3 Lüfter, dunkelgrau mit roten Akzenten | P1 |
| R3C2 | `icon_gpu_9` | G9 Ark B580: 2 Lüfter, weiß-silbern mit blauen Akzenten | P2 |
| R3C3 | `icon_gpu_10` | G10 Ex-Miner: alte 2-Lüfter-Karte, verschrammt, Klebeband, Staub | P2 |
| R3C4 | `icon_ram_8` | R8 2×48 GB: 2 Riegel, schwarz-silbern, dicht mit Chips | P1 |
| R4C1 | `icon_ram_9` | R9 RGB-DDR4: 2 schwarze Riegel mit Regenbogen-Lichtleiste | P2 |
| R4C2 | `icon_drive_7` | S7 NAS-HDD: dicke 3,5″-HDD mit rotem Etikettfeld | P1 |
| R4C3 | `icon_drive_8` | S8 Optan: M.2-Riegel mit dunkelblauem Etikett und Blitz | P2 |
| R4C4 | `icon_psu_6` | P6 Titan: schwarzes modulares Netzteil, silbern-weißer Sticker, Blatt | P1 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v01_hw_icons_a.png – hardware shop icons in a grid of 4 columns x 4 rows of equal square cells, on flat #808080. Image format 1:1 (for example 1536x1536).
STYLE: same style as the attached hardware icon sheet. Stylised PC parts, front view, direct palette colors (no key colors).
EACH ICON: one clear motif, centered in its square cell, filling about 85 % of the cell (an even #808080 margin on all four sides). Readable at small size on a phone: chunky silhouette, max. 3 main colors plus outline.

CELLS in reading order (R = row, C = column):
 - R1C1 "icon_mb_9": budget micro-ATX motherboard, matte black PCB, few components, only 2 RAM slots, one long PCIe slot, a small plain chipset heatsink, thin red accent line. Square silhouette.
 - R1C2 "icon_mb_10": premium overclocking ATX motherboard, black PCB, massive silver-black heatsinks with gold trim, only 2 RAM slots, two tiny square buttons (red and blue) at one edge. Square silhouette, looks expensive.
 - R1C3 "icon_cpu_11": square CPU, steel heat spreader, red label area, a small monitor pictogram engraved on it (built-in graphics).
 - R1C4 "icon_cpu_12": square CPU, red label area, a tall stack of 3 thin layers drawn on top (3D cache), golden highlight edge, premium look.
 - R2C1 "icon_cpu_13": small square budget CPU, plain steel spreader, small blue label area, no extras.
 - R2C2 "icon_cpu_14": square CPU, blue label area, a green leaf pictogram on it (energy saving).
 - R2C3 "icon_cpu_15": square flagship CPU, blue label area with a gold frame, a small golden star in one corner, three short orange heat strokes rising from the top edge.
 - R2C4 "icon_gpu_7": large graphics card seen from the fan side, black shroud with green accents, three fans, a small power connector on the top edge. Wide shape (about 2 : 1), centered.
 - R3C1 "icon_gpu_8": large graphics card, dark grey shroud with red accents, three fans. Wide shape (about 2 : 1), centered.
 - R3C2 "icon_gpu_9": compact graphics card, white-silver shroud with blue accents, two fans. Wide shape (about 1.8 : 1), centered.
 - R3C3 "icon_gpu_10": old used graphics card, black and silver shroud, two fans, scratches, a strip of tape on one corner, a grey dust patch. Wide shape (about 1.8 : 1), centered.
 - R3C4 "icon_ram_8": two tall RAM sticks side by side, black-silver heat spreaders, very dense rows of small chip rectangles visible at the bottom edge.
 - R4C1 "icon_ram_9": two tall RAM sticks, black heat spreaders, a light bar on top painted as a rainbow band (palette colors magenta, yellow, green, cyan).
 - R4C2 "icon_drive_7": thick 3.5-inch hard disk drive, top view, silver lid with screws, a red label area (no text).
 - R4C3 "icon_drive_8": M.2 SSD stick, dark blue label area with a small white lightning bolt, gold contacts on the left. Long thin shape (about 3.5 : 1), centered.
 - R4C4 "icon_psu_6": black modular power supply, front view with modular sockets, a silver-white sticker area with a small green leaf.

SHAPE CHECK: 16 icons, 4 per row, all inside their own cell with #808080 margin; GPUs and the M.2 stick are wide, everything else is roughly square.
Every cell contains exactly what is listed, nothing else.
```

### V02 · `v02_hw_icons_b.png` – Hardware-Icons B, Peripherie, Kit

- **Raster:** 4 × 4 · **Zelle:** 32×32 · **Bildformat:** 1:1 · **Referenz:** S18/S19-Sheet oder V01

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `icon_psu_7` | P7 Feuerwerk: billiges Netzteil, greller Sticker, Brandfleck | P2 |
| R1C2 | `icon_cooler_7` | K7 Passivkühler: hoher Lamellenblock ohne Lüfter | P2 |
| R1C3 | `icon_cooler_8` | K8 Peltier: Pumpenblock mit Kälteplatte, Reifkante, 2 Schläuche | P2 |
| R1C4 | `icon_cooler_9` | K9 LN2-Pott: Kupferzylinder mit Reif und Dampf | P3 |
| R2C1 | `icon_fan_4` | F4 LED-Streifen: aufgerollter Streifen mit Regenbogen-LEDs | P1 |
| R2C2 | `icon_case_6` | CA6 Prüfstand: offenes Blech-Tablett mit Abstandshaltern | P2 |
| R2C3 | `icon_exp_7` | E7 Lichtorgel: kleine x1-Karte mit bunten LED-Anschlüssen | P1 |
| R2C4 | `icon_exp_8` | E8 ASIC: x1-Karte mit Kühlkörper, Mini-Lüfter, Münz-Piktogramm | P2 |
| R3C1 | `icon_exp_9` | E9 POST-Karte: x1-Karte mit Siebensegment-Feld (keine Ziffern) | P2 |
| R3C2 | `icon_per_1` | X1 Balkonkraftwerk: 2 Solarmodule auf Ständer, Sonne | P2 |
| R3C3 | `icon_per_2` | X2 USV: schwarzer Kasten, Batteriesymbol, Einschaltknopf | P2 |
| R3C4 | `icon_per_3` | X3 Monitor: schmaler Rahmen, Speed-Linien auf dem Bild | P2 |
| R4C1 | `icon_per_4` | X4 Gaming-Stuhl: schwarz mit Regenbogenstreifen | P2 |
| R4C2 | `icon_per_5` | X5 Klimaanlage: mobiles Gerät mit Schlauch, eisblaue Lamellen | P2 |
| R4C3 | `icon_per_6` | X6 Mikrofon: Podcast-Mikrofon am Schwenkarm | P2 |
| R4C4 | `icon_bundle_kit` | Aufrüst-Kit: offener Karton mit Board und CPU, Schleife | P1 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v02_hw_icons_b.png – shop icons in a grid of 4 columns x 4 rows of equal square cells, on flat #808080. Image format 1:1 (for example 1536x1536).
STYLE: same style as the attached hardware icon sheet. Front view, direct palette colors (no key colors).
EACH ICON: one clear motif, centered in its square cell, filling about 85 % of the cell (an even #808080 margin on all four sides). Readable at small size on a phone: chunky silhouette, max. 3 main colors plus outline.

CELLS in reading order:
 - R1C1 "icon_psu_7": cheap black power supply, front view with a fan grille, a loud red-yellow starburst sticker (no text), a small black scorch mark at one corner.
 - R1C2 "icon_cooler_7": passive CPU cooler: a tall block of many thin aluminium fins with copper heat pipes at the bottom, NO fan. Upright shape (about 3 : 4).
 - R1C3 "icon_cooler_8": square pump block sitting on a thick layered plate (copper, then white ceramic tile, then ice-blue frosted edge), two black tubes leaving the top.
 - R1C4 "icon_cooler_9": liquid-nitrogen pot: tall copper cylinder with white frost at the bottom and two small white vapor puffs above it (puffs stay inside the cell). Upright shape (about 1 : 2).
 - R2C1 "icon_fan_4": LED strip rolled into a loose coil, black strip with small square LEDs in rainbow palette colors (magenta, yellow, green, cyan).
 - R2C2 "icon_case_6": open-air test bench: a flat steel tray on four small feet, brass standoffs, a short vertical bracket bar at the left end, no walls.
 - R2C3 "icon_exp_7": small expansion card with gold contacts at the bottom, a row of tiny connector headers, each with a differently colored rainbow LED.
 - R2C4 "icon_exp_8": small expansion card with a tall black heatsink and a tiny fan, a gold coin pictogram on the heatsink.
 - R3C1 "icon_exp_9": small expansion card with a black display window showing two abstract seven-segment shapes in red (not readable digits) and 4 tiny LEDs.
 - R3C2 "icon_per_1": two small blue solar panels on a slanted stand, a small yellow sun in the top corner.
 - R3C3 "icon_per_2": compact black uninterruptible power supply box, a battery pictogram and a round power button on the front.
 - R3C4 "icon_per_3": gaming monitor on a stand, very thin bezel, the screen shows three horizontal speed lines.
 - R4C1 "icon_per_4": gaming chair, side-front view, black with a rainbow stripe down the backrest.
 - R4C2 "icon_per_5": portable air conditioner, white-grey box with ice-blue vent slats and a thick hose.
 - R4C3 "icon_per_6": podcast microphone on a boom arm with a round pop filter.
 - R4C4 "icon_bundle_kit": open brown cardboard box, a motherboard edge and a CPU peek out of it, a red ribbon around the box.

SHAPE CHECK: 16 icons, 4 per row, all inside their own cell with #808080 margin.
Every cell contains exactly what is listed, nothing else.
```

### V03 · `v03_software_a.png` – Software SW21–SW32

- **Raster:** 4 × 3 · **Zelle:** 32×32 · **Bildformat:** 4:3 (z. B. 1536×1152) · **Referenz:** S21-Sheet

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `icon_sw_21` | ThrottleStop: Thermometer mit hochgeschobenem Begrenzer-Balken | P1 |
| R1C2 | `icon_sw_22` | Hitzerekord: Pokal mit Flamme | P1 |
| R1C3 | `icon_sw_23` | Abwärme-Heizung: Heizkörper mit Wärmewellen und Münze | P2 |
| R1C4 | `icon_sw_24` | Rekordjagd: Tacho am Anschlag mit kleinem Pokal | P1 |
| R2C1 | `icon_sw_25` | Zenit-Meister: rote CPU mit Schraubenschlüssel und Pfeil nach oben | P2 |
| R2C2 | `icon_sw_26` | Extrem-Tuning: blaue CPU mit Schiebereglern | P2 |
| R2C3 | `icon_sw_27` | Energiesparplan: Batterie mit grünem Blatt | P1 |
| R2C4 | `icon_sw_28` | Race-to-Idle: Sprinter-Silhouette rennt zu einer Mondsichel | P1 |
| R3C1 | `icon_sw_29` | Ökostrom: Stecker mit grünem Blatt | P2 |
| R3C2 | `icon_sw_30` | Disco-Modus: Discokugel mit Regenbogenstrahlen | P1 |
| R3C3 | `icon_sw_31` | RGB-App-Zoo: drei überlappende Fenster in Regenbogenfarben | P2 |
| R3C4 | `icon_sw_32` | Pathtracing-Overdrive: Lichtstrahlen prallen an einer Kugel ab, Goldfunkeln (legendär) | P1 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v03_software_a.png – software program icons in a grid of 4 columns x 3 rows of equal square cells, on flat #808080. Image format 4:3 (for example 1536x1152).
STYLE: same style as the attached software icon sheet: retro desktop program icons (1990s OS look), bold and simple.
EACH ICON: one clear motif, centered in its square cell, filling about 85 % of the cell (an even #808080 margin on all four sides). Readable at small size on a phone: chunky silhouette, max. 3 main colors plus outline.

CELLS in reading order:
 - R1C1 "icon_sw_21": a vertical thermometer, red liquid near the top, a thick steel stopper bar clamped onto the tube near the very top (a raised limiter).
 - R1C2 "icon_sw_22": a golden trophy cup with an orange-red flame burning inside the cup.
 - R1C3 "icon_sw_23": a white wall radiator with three warm orange wavy lines rising from it and a small gold coin in front.
 - R1C4 "icon_sw_24": a round speedometer gauge, needle at the far right in the red zone, a tiny gold trophy below the gauge.
 - R2C1 "icon_sw_25": a CPU with a red label area, a steel wrench lying across it, a green up arrow.
 - R2C2 "icon_sw_26": a CPU with a blue label area, three small vertical sliders drawn next to it at different heights.
 - R2C3 "icon_sw_27": a battery standing upright, green charge bars, a green leaf on its side.
 - R2C4 "icon_sw_28": a dark running stick figure sprinting toward a pale yellow crescent moon (sleep).
 - R3C1 "icon_sw_29": a power plug with its cable, a green leaf growing from the cable.
 - R3C2 "icon_sw_30": a mirror disco ball with short rainbow light rays (magenta, yellow, green, cyan) around it (rays stay inside the cell).
 - R3C3 "icon_sw_31": three small overlapping program windows, each window frame in a different rainbow color.
 - R3C4 "icon_sw_32": a glossy grey sphere, three bright light rays bouncing off it at angles, small gold sparkles (legendary item).

SHAPE CHECK: 12 icons, 4 per row, all inside their own cell with #808080 margin.
Every cell contains exactly what is listed, nothing else.
```

### V04 · `v04_software_b.png` – Software SW33–SW44

- **Raster:** 4 × 3 · **Zelle:** 32×32 · **Bildformat:** 4:3 · **Referenz:** S21-Sheet oder V03

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `icon_sw_33` | Fidelity-Upscaler: kleines Pixelquadrat wächst zu großem scharfem Quadrat, rote Pfeile | P1 |
| R1C2 | `icon_sw_34` | Prefetcher: Hand hält eine Karte, RAM-Riegel mit Pfeil | P1 |
| R1C3 | `icon_sw_35` | Auslagerungsdatei: RAM-Riegel und Festplatte mit Pfeilen | P1 |
| R1C4 | `icon_sw_36` | Debloater: Besen fegt kleine Blöcke weg | P1 |
| R2C1 | `icon_sw_37` | Telemetrie: Auge über einem Balkendiagramm | P2 |
| R2C2 | `icon_sw_38` | Jumbo-Frames: großes Paket auf einem Netzwerkkabel | P1 |
| R2C3 | `icon_sw_39` | Cloud-Abo: Wolke mit Gamepad, Münze mit Kreispfeil | P2 |
| R2C4 | `icon_sw_40` | Mooresches Gesetz: Chip mit steiler Wachstumskurve, Gold (legendär) | P1 |
| R3C1 | `icon_sw_41` | Sleeper-Build: beiger Tower mit geschlossenen Augen, Flamme hinten | P2 |
| R3C2 | `icon_sw_42` | Fanboy.exe: Schaumstoff-Hand, halb rot, halb blau | P1 |
| R3C3 | `icon_sw_43` | Preisvergleich: Lupe über Preisschild | P2 |
| R3C4 | `icon_sw_44` | Steuer-Software: Taschenrechner mit Sparschwein | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v04_software_b.png – software program icons in a grid of 4 columns x 3 rows of equal square cells, on flat #808080. Image format 4:3 (for example 1536x1152).
STYLE: same style as the attached software icon sheet: retro desktop program icons (1990s OS look), bold and simple.
EACH ICON: one clear motif, centered in its square cell, filling about 85 % of the cell (an even #808080 margin on all four sides). Readable at small size on a phone: chunky silhouette, max. 3 main colors plus outline.

CELLS in reading order:
 - R1C1 "icon_sw_33": a small blocky blurry square at the bottom left growing into a big sharp square at the top right, two red diagonal arrows between them.
 - R1C2 "icon_sw_34": a hand silhouette holding one playing card upright, an amber RAM stick behind it with a small arrow pointing into the hand.
 - R1C3 "icon_sw_35": an amber RAM stick on the left and a grey hard disk on the right, two arrows between them (one each way).
 - R1C4 "icon_sw_36": a brown broom sweeping a few small grey blocks away to the right.
 - R2C1 "icon_sw_37": a bar chart with three bars, a stylised watching eye floating above it.
 - R2C2 "icon_sw_38": a big brown parcel box sitting on a thick violet network cable with a plug.
 - R2C3 "icon_sw_39": a white cloud with a small gamepad inside, a gold coin with a circular repeat arrow at the lower right.
 - R2C4 "icon_sw_40": a golden chip with a steep rising curve drawn across it (exponential growth), small gold sparkles (legendary item).
 - R3C1 "icon_sw_41": an old beige office PC tower (beige palette tones) with two closed sleepy eyes on the front, a small orange flame peeking out at the back (hidden power).
 - R3C2 "icon_sw_42": a foam finger hand (pointing up), left half red, right half blue.
 - R3C3 "icon_sw_43": a magnifying glass over a paper price tag.
 - R3C4 "icon_sw_44": a grey pocket calculator next to a pink piggy bank.

SHAPE CHECK: 12 icons, 4 per row, all inside their own cell with #808080 margin.
Every cell contains exactly what is listed, nothing else.
```

### V05 · `v05_tools_misc.png` – Werkzeuge, Treiber, Gutscheine, Laden

- **Raster:** 4 × 4 · **Zelle:** 32×32 · **Bildformat:** 1:1 · **Referenz:** S20-Sheet; für die Gutscheine zusätzlich das P02-Ergebnis

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `icon_tool_11` | Firmware-Flash: ROM-Chip mit Pfeil nach oben und Blitz | P1 |
| R1C2 | `icon_tool_12` | Recycling-Tonne: grüne Tonne mit Kreispfeilen | P1 |
| R1C3 | `icon_tool_13` | Flüssigmetall: kleine Spritze mit silbernem Tropfen | P2 |
| R1C4 | `icon_tool_14` | Delid-Werkzeug: Schraubstock-Werkzeug, CPU-Deckel angehoben | P2 |
| R2C1 | `icon_tool_15` | Multimeter: gelbes Messgerät mit Messspitzen | P1 |
| R2C2 | `icon_tool_16` | RGB-Kabelsatz: Kabelbündel mit Regenbogen-Sleeves | P2 |
| R2C3 | `icon_tool_17` | Spiegel-Cache: zwei gleiche Chips gespiegelt, Doppelpfeil | P1 |
| R2C4 | `icon_tool_18` | Binning-Station: goldener Chip unter Lupe, Stern | P2 |
| R3C1 | `icon_tool_19` | Heißluftfön: Heißluftpistole mit orangen Wellen | P2 |
| R3C2 | `icon_tool_20` | LED-Klebeband: Rolle mit Regenbogen-LEDs | P2 |
| R3C3 | `icon_treiber_pentacore` | Penta-Core: 5 gleiche Chips im Fünfeck | P2 |
| R3C4 | `icon_treiber_cluster` | Homogener Cluster: 5 gleiche Karten als Block | P2 |
| R4C1 | `icon_gutschein_9` | Gutschein Händler-Kontakt: Coupon mit Handschlag | P2 |
| R4C2 | `icon_gutschein_10` | Gutschein Lagerhalle: Coupon mit Regal und Kartons | P2 |
| R4C3 | `icon_gebrauchtmarkt` | Gebrauchtmarkt: Karton mit Klebeband und Papier-Anhänger | P1 |
| R4C4 | `icon_wallet` | Wallet: Geldbörse mit BTL-Münze (Flaschenhals-Symbol) | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v05_tools_misc.png – item icons in a grid of 4 columns x 4 rows of equal square cells, on flat #808080. Image format 1:1 (for example 1536x1536).
STYLE: same style as the attached tool/driver icon sheet. Tools are single objects. Driver icons are abstract symbols. Coupons look exactly like the attached coupon icons (ticket with notched edges and a pictogram).
EACH ICON: one clear motif, centered in its square cell, filling about 85 % of the cell (an even #808080 margin on all four sides). Readable at small size on a phone: chunky silhouette, max. 3 main colors plus outline.

CELLS in reading order:
 - R1C1 "icon_tool_11": a black ROM chip with silver legs, a green up arrow and a small yellow lightning bolt above it.
 - R1C2 "icon_tool_12": a green recycling bin with three white circular arrows on its front.
 - R1C3 "icon_tool_13": a small syringe filled with shiny silver liquid metal, one silver drop at the tip.
 - R1C4 "icon_tool_14": a small red plastic vise tool holding a CPU, the steel lid of the CPU lifted up a little.
 - R2C1 "icon_tool_15": a yellow handheld multimeter with a dark display (no digits) and two probes, one red, one black.
 - R2C2 "icon_tool_16": a bundle of three sleeved cables, sleeves in rainbow palette colors, plugs at the ends.
 - R2C3 "icon_tool_17": two identical small chips side by side, mirrored, a double-headed cyan arrow between them.
 - R2C4 "icon_tool_18": a golden chip under a magnifying glass, a small white four-point star sparkle.
 - R3C1 "icon_tool_19": a heat gun (hot air gun) seen from the side, orange-yellow hot air waves leaving the nozzle (waves stay inside the cell).
 - R3C2 "icon_tool_20": a roll of tape with a row of small rainbow-colored LEDs on the unrolled part.
 - R3C3 "icon_treiber_pentacore": five identical small chips arranged in a pentagon, connected by thin gold lines.
 - R3C4 "icon_treiber_cluster": five identical small playing cards stacked edge to edge into one solid block, a cyan outline around the block.
 - R4C1 "icon_gutschein_9": coupon ticket with notched edges, pictogram: two hands shaking.
 - R4C2 "icon_gutschein_10": coupon ticket with notched edges, pictogram: a shelf with brown boxes.
 - R4C3 "icon_gebrauchtmarkt": a brown cardboard box with a strip of tape across it and a small white paper tag hanging on a string.
 - R4C4 "icon_wallet": a dark brown wallet, a gold coin in front of it; the coin shows a simple bottle silhouette with a narrow neck.

SHAPE CHECK: 16 icons, 4 per row, all inside their own cell with #808080 margin.
Every cell contains exactly what is listed, nothing else.
```

### V06 · `v06_boss.png` – Bosse B14–B20, Finale F4

- **Raster:** 4 × 2 · **Zelle:** 32×32 · **Bildformat:** 2:1 (z. B. 2048×1024) · **Referenz:** S15-Sheet

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `boss_b14` | Energiekrise: Strommast mit rotem Pfeil nach unten | P2 |
| R1C2 | `boss_b15` | Silent-PC-Test: Lüfter mit durchgestrichenem Lautsprecher | P2 |
| R1C3 | `boss_b16` | Klimakammer: Thermometer in einem bereiften Glaskasten | P1 |
| R1C4 | `boss_b17` | Büro-Modus: Krawatte vor durchgestrichenem Regenbogen | P1 |
| R2C1 | `boss_b18` | Speicherdruck: RAM-Riegel in einem Schraubstock | P1 |
| R2C2 | `boss_b19` | Always-Online-DRM: Vorhängeschloss mit WLAN-Wellen | P2 |
| R2C3 | `boss_b20` | Höchstleistung: Stecker mit roter Rakete | P2 |
| R2C4 | `boss_f4` | Weltrekord-Run: Lorbeerkranz, Pokal, Stoppuhr, Goldrand | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v06_boss.png – round boss tokens in a grid of 4 columns x 2 rows of equal square cells, on flat #808080. Image format 2:1 (for example 2048x1024).
STYLE: exactly like the attached boss sheet: each boss is a round poker-chip-like token with a thick rim and one symbol in the middle. Normal bosses have a steel rim, the finale has a golden rim.
EACH TOKEN: a perfect circle filling about 92 % of its square cell, centered, with a thin even #808080 margin.

CELLS in reading order:
 - R1C1 "boss_b14": a power line pylon, a thick red arrow pointing down next to it.
 - R1C2 "boss_b15": a black PC fan, next to it a small loudspeaker crossed out with a red diagonal bar.
 - R1C3 "boss_b16": a thermometer standing inside a small glass box with white frost on the glass corners, ice-blue tint.
 - R1C4 "boss_b17": a dark office necktie in front of a small rainbow arc that is crossed out with a red diagonal bar.
 - R2C1 "boss_b18": an amber RAM stick squeezed in a steel vise, small strain lines at the sides.
 - R2C2 "boss_b19": a golden padlock with three curved wifi waves above it.
 - R2C3 "boss_b20": a power plug, a small red rocket flying up next to it with an orange exhaust.
 - R2C4 "boss_f4": GOLDEN RIM. A green laurel wreath around a small gold trophy, a tiny stopwatch at the bottom.

SHAPE CHECK: 8 round tokens, 4 per row, all the same size, each inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

### V07 · `v07_sponsor.png` – Sponsor-Embleme

- **Raster:** 5 × 2 · **Zelle:** 32×32 · **Bildformat:** 5:2 (z. B. 2160×864) · **Referenz:** V05 oder S20

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `sponsor_1` | NXZT Lichtschau: weißes Rund-Quadrat mit Regenbogenring | P1 |
| R1C2 | `sponsor_2` | Veridia-Partner: grüner Wirbel-Schild | P1 |
| R1C3 | `sponsor_3` | Team Rot: rote Winkel-Flagge | P1 |
| R1C4 | `sponsor_4` | Bluescreen Booster: blaue Energydrink-Dose mit Blitz | P1 |
| R1C5 | `sponsor_5` | Grünwatt: grüner Blitz in einem Blatt | P1 |
| R2C1 | `sponsor_6` | HWBotz: Roboterkopf mit Tacho | P1 |
| R2C2 | `sponsor_7` | Zuckel: violette Sprechblase mit Play-Dreieck | P2 |
| R2C3 | `sponsor_8` | Kingstorm: amberfarbener RAM-Riegel mit Krone | P2 |
| R2C4 | `sponsor_9` | Beige-Magazin: beiges Magazin mit Pixel-Computer | P2 |
| R2C5 | `sponsor_10` | Wolkig: blaue Wolke mit Netzwerkknoten | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v07_sponsor.png – invented sponsor emblems in a grid of 5 columns x 2 rows of equal square cells, on flat #808080. Image format 5:2 (for example 2160x864).
STYLE: badge-like emblems, bold shapes, flat palette colors, 1 px dark outline. Invented designs only: they must NOT resemble any real company logo. No letters, no numbers.
EACH EMBLEM: centered in its square cell, filling about 85 % of the cell, with an even #808080 margin.

CELLS in reading order:
 - R1C1 "sponsor_1": white rounded square badge with a thick rainbow ring (magenta, yellow, green, cyan) in the middle.
 - R1C2 "sponsor_2": green shield badge with an abstract spiral swirl in lighter green.
 - R1C3 "sponsor_3": red pennant flag with two white chevrons pointing right.
 - R1C4 "sponsor_4": blue energy drink can, a white lightning bolt on it, two small water drops on the can.
 - R1C5 "sponsor_5": a green leaf with a yellow lightning bolt cut into its middle.
 - R2C1 "sponsor_6": a friendly square robot head, its face is a small speedometer gauge.
 - R2C2 "sponsor_7": a violet speech bubble with a white play triangle inside.
 - R2C3 "sponsor_8": an amber RAM stick lying flat with a small gold crown on top.
 - R2C4 "sponsor_9": a beige magazine cover (beige palette tones) with a tiny pixel computer picture on it, no text.
 - R2C5 "sponsor_10": a light blue cloud with three dark blue network dots connected by lines inside it.

SHAPE CHECK: 10 emblems, 5 per row, all inside their own cell with #808080 margin.
Every cell contains exactly what is listed, nothing else.
```

### V08 · `v08_icons16.png` – Kleine Icons (16 px und 8 px)

- **Raster:** 6 × 4 · **Zelle:** 16×16 · **Bildformat:** 3:2 (z. B. 1536×1024) · **Referenz:** S07-Sheet
- Hinweis: Kleine Icons gelingen der KI schlecht (`asset-sheets.md` 8). Bei Bedarf von Hand nachzeichnen; die Motive sind dafür bewusst einfach.

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `icon16_stern_voll` | goldener Stern | P1 |
| R1C2 | `icon16_stern_leer` | Stern-Umriss, grau | P1 |
| R1C3 | `icon16_zustand_ok` | Karton mit grünem Haken | P1 |
| R1C4 | `icon16_zustand_spuren` | Karton mit gelben Kratzern | P1 |
| R1C5 | `icon16_zustand_defekt` | Karton mit rotem Riss | P1 |
| R1C6 | `icon16_rueckgabe` | Karton mit Pfeil zurück | P1 |
| R2C1 | `icon16_garantie` | Schild mit Haken | P2 |
| R2C2 | `icon16_btl` | Münze mit Flaschen-Silhouette | P2 |
| R2C3 | `icon16_kurs_hoch` | grüner Zickzack-Pfeil nach oben | P2 |
| R2C4 | `icon16_kurs_runter` | roter Zickzack-Pfeil nach unten | P2 |
| R2C5 | `icon16_mining` | Spitzhacke | P2 |
| R2C6 | `icon16_vertrag` | Papier mit rotem Siegel | P1 |
| R3C1 | `icon16_gutschein` | Coupon mit Kerben | P2 |
| R3C2 | `icon16_peripherie` | Monitor mit Tastatur | P2 |
| R3C3 | `icon16_beta` | Glaskolben mit Blasen | P2 |
| R3C4 | `icon16_auktion` | Auktionshammer | P2 |
| R3C5 | `icon16_tag_eco` | grünes Blatt | P2 |
| R3C6 | `icon16_tag_minimal` | Schere | P2 |
| R4C1 | `icon16_tag_team_rot` | rotes Dreieck-Emblem | P1 |
| R4C2 | `icon16_tag_team_blau` | blaues Quadrat-Emblem | P1 |
| R4C3 | `icon16_tag_team_gruen` | grünes Kreis-Emblem | P1 |
| R4C4 | `icon8_btl` | Münze, halbe Größe | P2 |
| R4C5 | `icon8_stern` | Stern, halbe Größe | P1 |
| R4C6 | – | leer | – |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v08_icons16.png – tiny UI icons in a grid of 6 columns x 4 rows of equal square cells, on flat #808080. Image format 3:2 (for example 1536x1024).
STYLE: same style as the attached 16 px icon sheet: extremely simple, one bold motif, thick outline, max. 2 colors plus outline. Must stay readable when shrunk to 16x16 pixels.
EACH ICON: centered in its cell, filling about 85 % of the cell. EXCEPTION: R4C4 and R4C5 are small icons that fill only about 45 % of their cell (half size), centered.

CELLS in reading order:
 - R1C1 "icon16_stern_voll": solid gold five-point star.
 - R1C2 "icon16_stern_leer": five-point star, only a thick grey outline, empty inside (flat #808080 is NOT allowed inside; fill the inside with dark slate #2a2a44).
 - R1C3 "icon16_zustand_ok": small brown box with a big green check mark on it.
 - R1C4 "icon16_zustand_spuren": small brown box with three short yellow scratch lines on it.
 - R1C5 "icon16_zustand_defekt": small brown box split by a jagged red crack.
 - R1C6 "icon16_rueckgabe": small brown box with a thick curved arrow pointing back to the left.
 - R2C1 "icon16_garantie": steel shield with a green check mark.
 - R2C2 "icon16_btl": gold coin showing a simple bottle silhouette with a narrow neck.
 - R2C3 "icon16_kurs_hoch": green zigzag line ending in an arrow pointing up-right.
 - R2C4 "icon16_kurs_runter": red zigzag line ending in an arrow pointing down-right.
 - R2C5 "icon16_mining": pickaxe, steel head, brown handle, diagonal.
 - R2C6 "icon16_vertrag": white paper sheet with a round red wax seal at the bottom.
 - R3C1 "icon16_gutschein": small coupon ticket with notched edges, teal color.
 - R3C2 "icon16_peripherie": small monitor with a flat keyboard in front.
 - R3C3 "icon16_beta": round glass flask with green liquid and two bubbles.
 - R3C4 "icon16_auktion": wooden auction gavel.
 - R3C5 "icon16_tag_eco": green leaf.
 - R3C6 "icon16_tag_minimal": open scissors, steel blades.
 - R4C1 "icon16_tag_team_rot": solid red triangle pointing up with a lighter red inner triangle.
 - R4C2 "icon16_tag_team_blau": solid blue square with a lighter blue inner square.
 - R4C3 "icon16_tag_team_gruen": solid green circle with a lighter green inner circle.
 - R4C4 "icon8_btl": HALF SIZE gold coin with a tiny bottle silhouette.
 - R4C5 "icon8_stern": HALF SIZE solid gold star.
 - R4C6 empty (flat #808080).

SHAPE CHECK: 23 icons plus 1 empty cell; R4C4 and R4C5 are clearly half the size of the others.
Every cell contains exactly what is listed, nothing else.
```

### V09 · `v09_card_frames.png` – Kartenrahmen

- **Raster:** 3 × 1 · **Zelle:** 48×64 · **Bildformat:** 9:4 (z. B. 2160×960) · **Referenz:** S10-Sheet (Pflicht: gleiche Feld-Aufteilung wie `card_frame_hardware`, damit `src/view/cardAnchors.ts` die Felder messen kann)

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `card_frame_sponsor` | Vertragskarte: cremefarbenes Papier, Wachssiegel, Fenster für Emblem | P1 |
| R1C2 | `card_frame_used` | Hardware-Rahmen „gebraucht“: Kratzer, Delle, Klebeband-Ecke | P1 |
| R1C3 | `card_frame_gutschein` | Coupon-Karte mit Perforation und Kerben | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v09_card_frames.png – three empty card frames side by side in a grid of 3 columns x 1 row of equal upright cells (cell shape 3 : 4), on flat #808080. Image format 9:4 (for example 2160x960).
STYLE AND LAYOUT: exactly like the hardware card frame in the attached card sheet. Every card is an upright rectangle with shape 3 : 4, filling about 92 % of its cell, centered. Keep the SAME field layout as the attached hardware card: a small dark corner field at the top left, a large dark square window in the middle (for the item picture), a small round gem setting near the top right, a dark name plate across the bottom. All fields are empty and dark (#1a1a2e), no text.

CELLS in reading order:
 - R1C1 "card_frame_sponsor": CONTRACT card. The frame is cream-white paper (#f4f4fa, #cfd0e0) with a thin gold border line, a round red wax seal with a ribbon overlapping the lower right corner of the frame (not covering the windows), a short dark signature line above the name plate.
 - R1C2 "card_frame_used": USED hardware card. Same metal frame as the attached hardware card, but worn: several light scratch lines, a small dent in the right edge, a piece of beige tape across the top left corner (not covering the corner field), slightly darker, dull metal.
 - R1C3 "card_frame_gutschein": COUPON card. Teal-green ticket frame (#3fbf5f, #1f7a3a with #a8f07a highlight) with half-circle notches in the middle of the left and right edges and a dotted perforation line across the card just above the name plate.

SHAPE CHECK: 3 upright cards with shape 3 : 4, same size, same field positions, each inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

### V10 · `v10_card_ov_f0.png` … `v10_card_ov_f3.png` – Verbesserungs-Overlays (4 Bilder)

- **Raster:** 3 × 2 · **Zelle:** 48×64 · **Bildformat:** 9:8 (z. B. 1440×1280) · **Referenz:** S11-Sheet (Overlay-Stil)
- **Ablauf:** Zuerst `f0` mit dem vollen Prompt. Danach `f1`, `f2`, `f3` jeweils als Bearbeitung mit `f0` als Referenzbild. `card_ov_rgb` hat nur einen Frame (Zyklus per Shader); er bleibt in f1–f3 gleich und wird nur aus f0 genommen.
- **Pipeline:** Die vier Bilder werden wie Frames gestapelt (`tools/stack.mjs`) und ergeben `card_ov_<name>_0…3`.

| Zelle | Sprite-Name | Inhalt | Frames | Prio | Quelle |
|---|---|---|---|---|---|
| R1C1 | `card_ov_goldensample` | schillernder Wafer-Rand (Gold, Weiß, Eisblau), Sternfunkeln in den Ecken | 4 | P1 | Neu |
| R1C2 | `card_ov_cachehit` | doppelter Rahmen Cyan/Weiß, Doppelkarten-Silhouette in einer Ecke | 4 | P1 | Motiv aus P12 |
| R1C3 | `card_ov_krypto` | Goldmünzen-Glanz am Rand, 2 kleine Münzen in den Ecken | 4 | P1 | Motiv aus P12 |
| R2C1 | `card_ov_rgb` | Lichtleiste rund um den Rand in `#00ffff` | 1 | P2 | Neu |
| R2C2 | `card_ov_heiss` | Glut am unteren Rand, Hitzewellen-Linien an den Seiten, Glutpunkte | 4 | P2 | Neu |
| R2C3 | – | leer | – | – | – |

**Frame 0:**

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v10_card_ov_f0.png – card overlay effects, frame 1 of 4, in a grid of 3 columns x 2 rows of equal upright cells (cell shape 3 : 4), on flat #808080. Image format 9:8 (for example 1440x1280).
OVERLAY RULE: like the attached overlay sheet, each overlay is drawn ON TOP of a card later. Each overlay is an upright rectangle with shape 3 : 4, filling about 92 % of its cell, centered. ONLY the border band is drawn (about 1/10 of the card width thick). The whole interior stays flat #808080. Nothing sticks out of the cell.
KEY COLOR (only in R2C1): the light strip is ONE flat tone #00ffff, no shading inside it. Do not use #00ffff anywhere else; for other cyan use #2ef2ff.

CELLS in reading order:
 - R1C1 "card_ov_goldensample": GOLDEN SAMPLE. A shiny border that looks like a polished silicon wafer: pale gold (#ffe28a, #e0a848) with thin iridescent bands of white (#f4f4fa) and ice blue (#8cc4ff). In each of the 4 corners a small four-point star; the top right star is bigger and white.
 - R1C2 "card_ov_cachehit": CACHE-HIT. A double frame: outer line cyan #2ef2ff, inner line white, a small gap between them. In the top left corner a tiny silhouette of two overlapping cards (no letters).
 - R1C3 "card_ov_krypto": CRYPTO. A thin gold border with 4 small gold glints along it, and one tiny gold coin in the top left and the bottom right corner.
 - R2C1 "card_ov_rgb": RGB. A rounded light strip running all around the border, painted only in the key color #00ffff, with a thin dark #0b0b12 edge on both sides of the strip.
 - R2C2 "card_ov_heiss": HOT RUNNER. A glowing ember band along the bottom edge (#e8432d, #ff8a2e, #ffd23f), thin wavy heat-haze lines rising along the left and right edges (orange and pale yellow), 3 small ember dots. NO flame tongues (flames belong to a different overlay).
 - R2C3 empty (flat #808080).

SHAPE CHECK: 5 overlays with shape 3 : 4, same size, interiors flat #808080, each inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

**Frames 1–3** – fertig ausgeschrieben, je ein Bild; immer `v10_card_ov_f0.png` als Referenzbild anhängen:

**Frame 1** (`v10_card_ov_f1.png`, `v10_card_ov_f0.png` als Referenz anhängen):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v10_card_ov_f0). Output: same image format 9:8, same grid of 3 x 2 cells, same flat #808080 background.
COPY EXACTLY: size, position and outline of every overlay, all colors, the empty interiors, the empty cell R2C3. R2C1 (RGB strip) stays completely unchanged.
CHANGE ONLY what this FRAME line says:
FRAME 2 of 4: R1C1 the big white star moves to the top LEFT corner, the other corners get small stars. R1C2 the outer cyan line becomes 1 pixel thicker (pulse). R1C3 the 4 glints move a quarter of the way clockwise along the border. R2C2 the heat-haze lines shift up by about 1/8 of the card height, one ember dot moves up.
```

**Frame 2** (`v10_card_ov_f2.png`, `v10_card_ov_f0.png` als Referenz anhängen):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v10_card_ov_f0). Output: same image format 9:8, same grid of 3 x 2 cells, same flat #808080 background.
COPY EXACTLY: size, position and outline of every overlay, all colors, the empty interiors, the empty cell R2C3. R2C1 (RGB strip) stays completely unchanged.
CHANGE ONLY what this FRAME line says:
FRAME 3 of 4: R1C1 the big white star moves to the bottom LEFT corner. R1C2 the outer cyan line is 2 pixels thicker and the inner white line brighter (peak of the pulse). R1C3 the glints move another quarter clockwise. R2C2 the heat-haze lines shift up by another 1/8, the ember band glows brighter (more yellow).
```

**Frame 3** (`v10_card_ov_f3.png`, `v10_card_ov_f0.png` als Referenz anhängen):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v10_card_ov_f0). Output: same image format 9:8, same grid of 3 x 2 cells, same flat #808080 background.
COPY EXACTLY: size, position and outline of every overlay, all colors, the empty interiors, the empty cell R2C3. R2C1 (RGB strip) stays completely unchanged.
CHANGE ONLY what this FRAME line says:
FRAME 4 of 4: R1C1 the big white star moves to the bottom RIGHT corner. R1C2 the outer cyan line is 1 pixel thicker than in the reference (pulse going back). R1C3 the glints move another quarter clockwise. R2C2 the heat-haze lines shift up by another 1/8, two ember dots near the top fade out.
```

### V11 · `v11_ui.png` – UI-Teile

- **Raster:** 4 × 2 · **Zelle:** 48×40 · **Bildformat:** 12:5 (z. B. 2160×900) · **Referenz:** S01- und S04-Sheet

| Zelle | Sprite-Name | Ziel px | Form im Prompt | Prio | Quelle |
|---|---|---|---|---|---|
| R1C1 | `ui_panel_cork` | 24×24 (9-Slice) | Quadrat, ½ Zellbreite | P1 | Neu |
| R1C2 | `ui_note_paper` | 24×24 (9-Slice) | Quadrat, ½ Zellbreite | P1 | Neu |
| R1C3 | `ui_price_tag_used` | 28×12 | 7 : 3 | P1 | Neu |
| R1C4 | `ui_price_tag_sale` | 28×12 | 7 : 3 | P1 | Neu |
| R2C1 | `ui_bundle_ribbon` | 48×12 | 4 : 1, volle Zellbreite | P1 | Neu |
| R2C2 | `ui_slot_empty_peripherie` | 40×40 | Quadrat, fast volle Zellhöhe | P2 | Neu |
| R2C3 | `ui_stamp_defekt` | 40×20 | 2 : 1 | P1 | Motiv aus P17 |
| R2C4 | – | – | leer | – | – |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v11_ui.png – UI parts in a grid of 4 columns x 2 rows of equal cells (cell shape 6 : 5, slightly wider than tall), on flat #808080. Image format 12:5 (for example 2160x900).
STYLE: same style as the attached UI panel sheet. Flat, frontal, clean. No text.
9-SLICE RULE (R1C1, R1C2): these are square tiles that the engine stretches. The four corners hold the decoration; the edges are evenly repeating; the center is a plain even surface without any single object in it.

CELLS in reading order:
 - R1C1 "ui_panel_cork": square 9-slice tile, about half the cell width, centered. Cork board surface (light brown #a8642a with #e0a848 and #5a3216 speckles, small even pattern) inside a dark wooden frame with rounded pixel corners.
 - R1C2 "ui_note_paper": square 9-slice tile, about half the cell width, centered. A white paper note (#f4f4fa, #cfd0e0 shadow) with a slightly torn bottom edge pattern that repeats evenly, and a small red push pin in the TOP LEFT corner only.
 - R1C3 "ui_price_tag_used": a small paper price tag, shape 7 : 3, about 60 % of the cell width, centered. Off-white paper, frayed right edge, a punched hole with a short string loop at the left. Empty face, no numbers.
 - R1C4 "ui_price_tag_sale": a small sale price tag, shape 7 : 3, about 60 % of the cell width, centered. Bright red (#e8432d) with a white inner border and a zigzag right edge, a punched hole at the left. Empty face.
 - R2C1 "ui_bundle_ribbon": a horizontal ribbon banner, shape 4 : 1, about 95 % of the cell width, centered. Red ribbon (#e8432d, #8c1c2b) with gold edges (#e0a848) and folded swallow-tail ends at both sides. Empty middle for text.
 - R2C2 "ui_slot_empty_peripherie": an empty slot marker, square, about 85 % of the cell height, centered. A dashed light-grey outline of a small desk with a monitor silhouette on it, on a dark slate (#2a2a44) rounded square.
 - R2C3 "ui_stamp_defekt": a rubber stamp shape, 2 : 1, about 80 % of the cell width, centered. Red double-line rounded rectangle with a jagged crack line through the right part, empty interior for text.
 - R2C4 empty (flat #808080).

SHAPE CHECK: 7 parts plus 1 empty cell; the two 9-slice tiles are squares, the price tags are 7 : 3, the ribbon 4 : 1, the stamp 2 : 1, the slot is square.
Every cell contains exactly what is listed, nothing else.
```

### V12 · `v12_parts_flat.png` – Einbau: Erweiterungskarten und Gen5-SSD

- **Raster:** 2 × 4 · **Zelle:** 72×20 · **Bildformat:** 9:5 (z. B. 1800×1000) · **Referenz:** S24-Sheet (gleiche Seitenansicht: Blende links, Kontakte unten)
- Lange flache Teile stehen untereinander (Lehre aus S27).

| Zelle | Sprite-Name | Ziel px | Form | Prio | Quelle |
|---|---|---|---|---|---|
| R1C1 | `exp_rgb` | 36×12 | 3 : 1, ½ Zellbreite | P1 | Neu |
| R1C2 | `exp_asic` | 52×14 | 3,7 : 1, ¾ Zellbreite | P2 | Neu |
| R2C1 | `exp_postcard` | 36×12 | 3 : 1, ½ Zellbreite | P2 | Neu |
| R2C2 | `exp_nic10g` | 52×14 | 3,7 : 1, ¾ Zellbreite | P2 | Motiv aus P20 |
| R3C1 | `exp_wlan` | 36×12 | 3 : 1, ½ Zellbreite | P2 | Motiv aus P20 |
| R3C2 | `exp_raid` | 64×14 | 4,6 : 1, 9/10 Zellbreite | P2 | Motiv aus P20 |
| R4C1 | `m2_ssd_gen5` | 52×12 | 4,3 : 1, ¾ Zellbreite | P2 | Motiv aus P20 |
| R4C2 | – | – | leer | – | – |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v12_parts_flat.png – installed expansion cards seen from the side, in a grid of 2 columns x 4 rows of equal wide cells (cell shape 18 : 5), on flat #808080. Image format 9:5 (for example 1800x1000).
STYLE: exactly like the attached installed-parts sheet: schematic side view, the card lies horizontally, metal bracket at the LEFT end, gold contacts along the BOTTOM edge. Every part is vertically centered and LEFT-aligned in its cell with a small #808080 margin, so the brackets line up.
KEY COLOR (only in R1C1): the LED strip on the card is ONE flat tone #00ffff, no shading inside it.

CELLS in reading order (shape = width : height of the part; share = part width / cell width):
 - R1C1 "exp_rgb": shape 3 : 1, share 1/2. Small black PCB, a row of 6 tiny white connector headers on top, a thin LED strip along the top edge in key color #00ffff, plain bracket.
 - R1C2 "exp_asic": shape 3.7 : 1, share 3/4. Dark green PCB almost fully covered by a black finned heatsink with one small round fan in the middle (fan blades simple, the engine spins it), plain bracket with vent slots.
 - R2C1 "exp_postcard": shape 3 : 1, share 1/2. Small red PCB with a black display window showing two abstract red seven-segment shapes (not readable digits) and 4 tiny LEDs (red, yellow, white, green), plain bracket.
 - R2C2 "exp_nic10g": shape 3.7 : 1, share 3/4. Blue PCB with a silver heatsink, bracket with two network ports.
 - R3C1 "exp_wlan": shape 3 : 1, share 1/2. Small green PCB with a metal shield can, bracket with two short black antenna stubs.
 - R3C2 "exp_raid": shape 4.6 : 1, share 9/10. Long black PCB with a big silver heatsink and a row of 4 small SATA connectors along the top edge, plain bracket.
 - R4C1 "m2_ssd_gen5": shape 4.3 : 1, share 3/4. M.2 SSD with a tall black heatsink and a tiny round fan on top, gold contacts at the LEFT end (no bracket).
 - R4C2 empty (flat #808080).

SHAPE CHECK: 7 long flat parts, left-aligned, each inside its own cell; the RAID card is the longest, exp_rgb, exp_postcard and exp_wlan are half as long as the cell.
Every cell contains exactly what is listed, nothing else.
```

### V13 · `v13_coolers.png` – Einbau: Kühler, Custom-Loop-Teile, SLI-Brücke

- **Raster:** 3 × 2 · **Zelle:** 60×52 · **Bildformat:** 45:26 (ca. 1,73:1, z. B. 2160×1248) · **Referenz:** S25-Sheet (Kühler von vorn, gleicher Maßstab wie `cooler_dualtower`)
- Übernimmt die Motive `loop_reservoir`, `loop_waterblock` und `sli_bridge` aus **P20** (dort 4 Frames je Zeile horizontal → hier 1 Frame; Blasen macht der Code, das Lauflicht der RGB-Shader). P20 wird damit nicht mehr gebraucht.

| Zelle | Sprite-Name | Ziel px | Form | Prio | Quelle |
|---|---|---|---|---|---|
| R1C1 | `cooler_passive` | 52×52 | 1 : 1 | P2 | Neu |
| R1C2 | `cooler_ln2pot_0` | 28×52 | 1 : 1,9 | P3 | Neu |
| R1C3 | `loop_reservoir` | 24×48 | 1 : 2 | P2 | Motiv aus P20 |
| R2C1 | `loop_waterblock` | 28×28 | 1 : 1 | P2 | Motiv aus P20 |
| R2C2 | `sli_bridge` | 40×8 | 5 : 1 | P3 | Motiv aus P20 |
| R2C3 | – | – | leer | – | – |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v13_coolers.png – installed cooling parts seen from the front, in a grid of 3 columns x 2 rows of equal cells (cell shape 15 : 13), on flat #808080. Image format 45:26 (for example 2160x1248).
STYLE: exactly like the attached CPU cooler sheet (front view, same scale as the dual-tower cooler). Every part is horizontally centered in its cell with a clear #808080 margin. The two coolers in row 1 stand on the bottom of their cell area like they sit on the CPU socket.
KEY COLOR (only in R2C2): the light strip of the bridge is ONE flat tone #00ffff, no shading inside it. Do not use #00ffff anywhere else.

CELLS in reading order (shape = width : height; share = part width / cell width):
 - R1C1 "cooler_passive": shape 1 : 1, share about 87 %. A huge passive heatsink: a wide block of many thin vertical aluminium fins (#9b9bb4, #6a6a88, #cfd0e0 highlights), six copper heat pipes curving up from a small base plate at the bottom. NO fan.
 - R1C2 "cooler_ln2pot_0": shape 1 : 1.9 (tall and narrow), share about 47 %. A tall copper cylinder (#a8642a, #5a3216, #e0a848) on a square base plate, a black foam insulation ring at the bottom, white frost (#f4f4fa, #8cc4ff) on the lower half, two small white vapor puffs just above the open top (puffs stay inside the cell).
 - R1C3 "loop_reservoir": shape 1 : 2 (tall), share about 40 %, vertically centered. A clear acrylic tube reservoir with steel caps at top and bottom, filled with ice-blue coolant (#8cc4ff, #3a7bf0 shade, #f4f4fa highlight), three small bubbles, one fitting on each cap.
 - R2C1 "loop_waterblock": shape 1 : 1, share about 47 %, vertically centered. A square CPU water block: copper base, clear top with ice-blue coolant channels, two silver fittings on the top edge.
 - R2C2 "sli_bridge": shape 5 : 1 (long and flat), share about 67 %, vertically centered. A black multi-GPU bridge bar with a connector block at each end and a light strip along the middle in key color #00ffff.
 - R2C3 empty (flat #808080).

SHAPE CHECK: passive cooler square, LN2 pot tall, reservoir tall (1 : 2), water block square, bridge long and flat (5 : 1); every part inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

**LN2-Frames 1–3** (Kann) – fertig ausgeschrieben, je ein Bild; immer `v13_coolers.png` als Referenzbild anhängen. Genutzt wird aus diesen Bildern nur R1C2 (`cooler_ln2pot_1…3`).

**Frame 1** (`v13_coolers_f1.png`):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v13_coolers). Output: same image format, same grid, same flat #808080 background.
COPY EXACTLY all parts in all cells: size, position, outline, colors, frost.
CHANGE ONLY the two vapor puffs above the copper cylinder in R1C2: FRAME 2 of 4: the puffs rise by about 1/12 of the cylinder height. The puffs stay inside the cell.
```

**Frame 2** (`v13_coolers_f2.png`):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v13_coolers). Output: same image format, same grid, same flat #808080 background.
COPY EXACTLY all parts in all cells: size, position, outline, colors, frost.
CHANGE ONLY the two vapor puffs above the copper cylinder in R1C2: FRAME 3 of 4: the puffs rise further and the left one gets smaller. The puffs stay inside the cell.
```

**Frame 3** (`v13_coolers_f3.png`):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v13_coolers). Output: same image format, same grid, same flat #808080 background.
COPY EXACTLY all parts in all cells: size, position, outline, colors, frost.
CHANGE ONLY the two vapor puffs above the copper cylinder in R1C2: FRAME 4 of 4: a new small puff appears at the top edge of the cylinder, the old ones are almost gone. The puffs stay inside the cell.
```

### V14 · `v14_case_bench.png` – Gehäuse CA6: offener Prüfstand (Einzelbild)

- **Ziel:** 260×320 · **Bildformat:** 13:16 (z. B. 1040×1280) · **Referenz:** E04 `case_mesh` (gleicher Blickwinkel und Maßstab)
- Hinweis Werkbank: `CASE_LAYOUT` (Code) muss danach für den Prüfstand vermessen werden (Blenden, Lüfterplätze, Netzteil).

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

IMAGE (v0.2): v14_case_bench.png – one single sprite, no grid, on flat #808080. Image format 13:16 (for example 1040x1280).
SUBJECT: an open-air PC test bench seen straight from the front, with the SAME viewpoint and scale as the attached closed case interior (the motherboard area must have the same size and position as in the reference).
DETAILS: a flat dark steel tray (#2a2a44, #43435f, #6a6a88 edges) with brass standoffs for an ATX motherboard (no board mounted), a vertical bracket bar with 7 empty expansion slot covers at the LEFT side of the tray, two empty round fan mounts at the top edge, a flat empty power-supply shelf at the bottom, four short feet. NO side walls, NO front panel, NO glass: everything outside the tray and its bars is flat #808080 background.
SHAPE: the tray fills about 90 % of the image height and about 85 % of the width, centered.
No components inside, nothing else in the image.
```

### V15 · `v15_led_strip.png` – LED-Streifen (Einzelbild)

- **Ziel:** 96×4 · **Bildformat:** 3:1 (z. B. 2172×724)

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

IMAGE (v0.2): v15_led_strip.png – ONE sprite on flat #808080. Image format 3:1 (for example 2172x724).
KEY COLOR: every LED and the diffuser line are ONE flat tone #00ffff, no shading inside it. The engine cycles it through rainbow colors. Use #00ffff for nothing else.
CONTENT: "led_strip" – a self-adhesive LED strip seen from the front: a black flexible strip with a row of evenly spaced small square LEDs in key color #00ffff, a thin #00ffff diffuser line along the middle, a tiny white 3-pin plug at the LEFT end.
SHAPE (most important): VERY long and thin. Width : height = 24 : 1. It spans about 92 % of the image width and is centered vertically, with large empty #808080 areas above and below.
Nothing else in the image.
```

### V16 · `v16_trophy.png` – Pokal „Weltrekord“ (Einzelbild)

- **Ziel:** 64×64 · **Bildformat:** 1:1 (z. B. 1254×1254) · Glanz per Code

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

IMAGE (v0.2): v16_trophy.png – ONE sprite on flat #808080. Image format 1:1 (for example 1254x1254).
CONTENT: "trophy_weltrekord" – a big golden trophy cup (#e0a848, #ffe28a, #b9781c, #5a3216 shadow) on a dark steel base, a CPU chip emblem on the front of the cup (square with small pins), a green laurel wreath around the lower half of the cup, two small handles. No text, no numbers.
SHAPE: the trophy is about 4 : 5 (slightly taller than wide), fills about 85 % of the image height, centered.
Nothing else in the image.
```

### V17 · `v17_card_backs.png` – Alternative Kartenrücken (Motiv aus P12)

- **Raster:** 2 × 2 · **Zelle:** 48×64 · **Bildformat:** 3:4 (z. B. 1152×1536) · **Referenz:** S10-Sheet (`card_back`: gleiche Größe, gleiche Ecken)
- Anpassung gegenüber P12: nur die Rücken (Overlays sind in V10), Raster 2 × 2 statt Zeilen mit Frames, keine Schlüsselfarben (Neon direkt in Palettenfarben).

| Zelle | Sprite-Name | Inhalt | Zuordnung | Prio |
|---|---|---|---|---|
| R1C1 | `card_back_1` | goldene Platine mit goldenem Chip-Emblem | erster Weltrekord | P2 |
| R1C2 | `card_back_2` | schwarze Platine mit Neon-Leiterbahnen (Magenta/Cyan) | ST2 Gaming-PC | P2 |
| R2C1 | `card_back_3` | Blaupause mit weißen Schaltplan-Linien | ST3 Workstation | P2 |
| R2C2 | `card_back_4` | Retro-Beige mit Regenbogenstreifen und Pixel-Emblem | ST4 Retro-Kiste | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v17_card_backs.png – four card backs in a grid of 2 columns x 2 rows of equal upright cells (cell shape 3 : 4), on flat #808080. Image format 3:4 (for example 1152x1536).
STYLE AND SHAPE: exactly like the card back in the attached card sheet: upright rectangle with shape 3 : 4, same rounded pixel corners, same thick border, filling about 92 % of its cell, centered. A symmetric pattern with one emblem in the middle. No text, no letters. No key colors.

CELLS in reading order:
 - R1C1 "card_back_1": gold circuit board (#e0a848, #b9781c, #ffe28a traces) with a golden chip emblem in the center, small diamond sparkle in two corners.
 - R1C2 "card_back_2": black circuit board (#0b0b12, #1a1a2e) with glowing neon traces in palette magenta #ff3fa4 and palette cyan #2ef2ff, a dark chip emblem in the center.
 - R2C1 "card_back_3": blueprint blue (#1f3f9a, #3a7bf0) with thin white schematic lines and a white outlined chip emblem in the center.
 - R2C2 "card_back_4": retro beige plastic (#c9b88f, #8a7a5c shade, #e8dcb8 light) with a diagonal rainbow stripe across the middle and a small square pixel emblem in the center.

SHAPE CHECK: 4 identical card shapes (3 : 4), each inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

### V18 · `v18_starter.png` – Starter-PC-Porträts (Motiv aus P13)

- **Raster:** 2 × 2 · **Zelle:** 64×64 · **Bildformat:** 1:1 (z. B. 1536×1536) · **Referenz:** S19-Sheet (Gehäuse-Icons) und E03 `case_office`
- Anpassung gegenüber P13: Raster 2 × 2 statt 4 × 1 (4:1 war zu breit); Motive an die Starter-Builds aus GDD v0.2 11.3 angepasst.

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `starter_portrait_buero` | ST1: beiger Büro-Tower mit kleinem Flachbildschirm | P2 |
| R1C2 | `starter_portrait_gaming` | ST2: schwarzer Mesh-Tower, gesprungene Glasseite, ein leuchtender Lüfter, alte Grafikkarte sichtbar | P2 |
| R2C1 | `starter_portrait_workstation` | ST3: kantiger grauer Tower mit vielen Laufwerksschlitten, keine Grafikkarte | P2 |
| R2C2 | `starter_portrait_retro` | ST4: schwarzer Mesh-Tower mit Pinguin-Aufkleber, rote Akzente (AMX) | P2 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v18_starter.png – four starter PC portraits in a grid of 2 columns x 2 rows of equal square cells, on flat #808080. Image format 1:1 (for example 1536x1536).
STYLE: same style as the attached case icons, but bigger and more detailed: each portrait is a small PC setup seen from the front (slight three-quarter view of the tower allowed, no perspective floor), filling about 85 % of its cell, centered. No text, no real logos.

CELLS in reading order:
 - R1C1 "starter_portrait_buero": old beige office PC tower (#c9b88f, #8a7a5c, #e8dcb8) with a floppy drive slot, next to it a small flat monitor showing a blue desktop.
 - R1C2 "starter_portrait_gaming": black mesh-front tower with a cracked glass side panel (white crack lines), one glowing fan ring inside, an old two-fan graphics card visible through the glass.
 - R2C1 "starter_portrait_workstation": boxy grey workstation tower with a column of many drive bay sleds on the front, a carry handle on top, no graphics card visible.
 - R2C2 "starter_portrait_retro": black mesh-front tower with thin red accents and a small cute penguin sticker on the front.

SHAPE CHECK: 4 portraits, each inside its own square cell with #808080 margin.
Every cell contains exactly what is listed, nothing else.
```

### V19 · `v19_icons16_meta_f0.png` (+ `_f1` … `_f3`) – Garantie-Icons, Schmelze, Leck (Motiv aus P15)

- **Raster:** 5 × 2 · **Zelle:** 16×16 · **Bildformat:** 5:2 (z. B. 2160×864) · **Referenz:** S07-Sheet
- Anpassung gegenüber P15: Garantie-Stufen über **Farbe + Winkel** statt 1–8 Punkte (bei 16 px lesbar); die Effekte haben 4 statt 8/6 Frames und stehen als Frame 0 im Sheet, Frames 1–3 sind Bearbeitungen; Cursor verworfen.

| Zelle | Sprite-Name | Inhalt | Frames | Prio |
|---|---|---|---|---|
| R1C1–R1C5 | `icon_garantie_1` … `_5` | Schild: Bronze mit 1/2/3 Winkeln, Silber mit 1/2 Winkeln | 1 | P2 |
| R2C1–R2C3 | `icon_garantie_6` … `_8` | Silber mit 3 Winkeln, Gold mit 1 Winkel, Gold mit Krone | 1 | P2 |
| R2C4 | `fx_melt_0` | intakter 12-Pin-Stecker, leicht orange Kante | 4 | P2 |
| R2C5 | `fx_leak_0` | Tropfen bildet sich an einer Schlauchkante | 4 | P2 |

**Frame 0:**

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v19_icons16_meta_f0.png – tiny icons and effect frames in a grid of 5 columns x 2 rows of equal square cells, on flat #808080. Image format 5:2 (for example 2160x864).
STYLE: same style as the attached 16 px icon sheet: extremely simple, bold, thick outline, readable when shrunk to 16x16 pixels. Each sprite is centered and fills about 85 % of its cell.
WARRANTY SHIELDS (cells 1–8): all eight have exactly the same shield shape and size. The level is shown ONLY by the shield color and by the number of chevrons (V-shaped stripes) on the shield.

CELLS in reading order:
 - R1C1 "icon_garantie_1": bronze shield (#a8642a, #5a3216, #e0a848 light) with 1 chevron.
 - R1C2 "icon_garantie_2": bronze shield with 2 chevrons.
 - R1C3 "icon_garantie_3": bronze shield with 3 chevrons.
 - R1C4 "icon_garantie_4": silver shield (#9b9bb4, #6a6a88, #cfd0e0 light) with 1 chevron.
 - R1C5 "icon_garantie_5": silver shield with 2 chevrons.
 - R2C1 "icon_garantie_6": silver shield with 3 chevrons.
 - R2C2 "icon_garantie_7": gold shield (#e0a848, #b9781c, #ffe28a light) with 1 chevron.
 - R2C3 "icon_garantie_8": gold shield with a small gold crown on top of the shield and no chevron.
 - R2C4 "fx_melt_0": EFFECT FRAME 1 of 4 (warning glow loop, the connector never melts): a black rectangular 12-pin power connector seen from the side, intact, its tip edge glowing slightly orange (#ff8a2e).
 - R2C5 "fx_leak_0": EFFECT FRAME 1 of 4: the end of a clear tube fitting at the top, a small ice-blue water drop (#8cc4ff, #f4f4fa highlight) forming at its lower edge.

SHAPE CHECK: 8 identical shield shapes that differ only in color and chevrons, plus 2 effect frames; everything inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

**Frames 1–3** – fertig ausgeschrieben, je ein Bild; immer `v19_icons16_meta_f0.png` als Referenzbild anhängen:

**Frame 1** (`v19_icons16_meta_f1.png`, `v19_icons16_meta_f0.png` als Referenz anhängen):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v19_icons16_meta_f0). Output: same image format 5:2, same grid of 5 x 2 cells, same flat #808080 background.
COPY EXACTLY: all 8 shields (R1C1–R2C3) unchanged; the connector and the tube fitting keep their size and position.
CHANGE ONLY what this FRAME line says:
FRAME 2 of 4: R2C4 the connector stays intact and unchanged in shape; its tip glow becomes brighter orange (#ff8a2e with a #ffd23f center). R2C5 the drop is bigger and hangs from the fitting.
```

**Frame 2** (`v19_icons16_meta_f2.png`, `v19_icons16_meta_f0.png` als Referenz anhängen):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v19_icons16_meta_f0). Output: same image format 5:2, same grid of 5 x 2 cells, same flat #808080 background.
COPY EXACTLY: all 8 shields (R1C1–R2C3) unchanged; the connector and the tube fitting keep their size and position.
CHANGE ONLY what this FRAME line says:
FRAME 3 of 4: R2C4 the connector stays intact; the glow is brightest (yellow center #ffd23f) and two tiny wavy heat lines rise above the tip (inside the cell). R2C5 the drop has detached and is falling, halfway down the cell.
```

**Frame 3** (`v19_icons16_meta_f3.png`, `v19_icons16_meta_f0.png` als Referenz anhängen):

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

EDIT THE ATTACHED REFERENCE IMAGE (v19_icons16_meta_f0). Output: same image format 5:2, same grid of 5 x 2 cells, same flat #808080 background.
COPY EXACTLY: all 8 shields (R1C1–R2C3) unchanged; the connector and the tube fitting keep their size and position.
CHANGE ONLY what this FRAME line says:
FRAME 4 of 4: R2C4 the connector stays intact; the glow fades back to a soft orange edge, the heat lines are gone. R2C5 the drop hits the bottom of the cell and splashes into 3 tiny droplets.
```

Hinweis: `fx_melt` behält den Sprite-Namen aus dem P3-Plan, zeigt aber nur noch ein pulsierendes Glühen als Warnung (Loop 0 → 1 → 2 → 3 → 0). Der Stecker schmilzt nicht (Regel „Kein Pech“).

### V20 · `v20_boss_gdd.png` – Boss-Chips aus dem GDD v0.1 (Motiv aus P03)

- **Raster:** 3 × 2 · **Zelle:** 32×32 · **Bildformat:** 3:2 (z. B. 1536×1024) · **Referenz:** S15-Sheet bzw. V06
- Anpassung gegenüber P03: Raster 3 × 2 statt 6 × 1 (6:1 war zu breit).

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `boss_b9` | Zwangs-Update: Fenster mit großem Pfeil nach unten und Neustart-Kreis | P2 |
| R1C2 | `boss_b10` | Lösegeld.exe: Vorhängeschloss auf Bildschirm, kleiner Totenkopf | P2 |
| R1C3 | `boss_b12` | Ping 999: rote Signalbalken und eine Schnecke | P2 |
| R2C1 | `boss_b13` | Treiber-Rollback: Rücklauf-Pfeil um eine CD | P2 |
| R2C2 | `boss_f2` | Folding@Zuhause: Protein-Spirale mit Zielflagge, Goldrand | P3 |
| R2C3 | `boss_f3` | Y2K38: glitchende Uhr mit Binärmuster, Goldrand | P3 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v20_boss_gdd.png – round boss tokens in a grid of 3 columns x 2 rows of equal square cells, on flat #808080. Image format 3:2 (for example 1536x1024).
STYLE: exactly like the attached boss sheet: each boss is a round poker-chip-like token with a thick rim and one symbol in the middle. R1C1–R2C1 have a steel rim, the two finales (R2C2, R2C3) have a golden rim.
EACH TOKEN: a perfect circle filling about 92 % of its square cell, centered, with a thin even #808080 margin. No text, no digits.

CELLS in reading order:
 - R1C1 "boss_b9": a small program window with a huge down arrow and a circular restart arrow.
 - R1C2 "boss_b10": a padlock on a small screen with a tiny skull icon.
 - R1C3 "boss_b12": three signal bars in red, the highest bar missing, and a small snail.
 - R2C1 "boss_b13": a silver CD with a thick curved rewind arrow around it.
 - R2C2 "boss_f2": GOLDEN RIM. A twisted protein ribbon spiral and a small checkered finish flag.
 - R2C3 "boss_f3": GOLDEN RIM. A round clock face breaking apart into glitch stripes, with a pattern of small square on/off blocks (binary look, no digits).

SHAPE CHECK: 6 round tokens of the same size, each inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

### V21 · `v21_catalog.png` – Katalog-UI (Motiv aus P17, Kann)

- **Raster:** 2 × 2 · **Zelle:** 24×24 (9-Slice) · **Bildformat:** 1:1 (z. B. 1536×1536) · **Referenz:** S01-Sheet
- Anpassung gegenüber P17: Stempel in V11, Katalog-Teile im Raster 2 × 2 statt 5 × 1 (8,3:1 war zu breit).

| Zelle | Sprite-Name | Inhalt | Prio |
|---|---|---|---|
| R1C1 | `ui_catalog_panel` | Papier-Panel mit Stahlrahmen | P3 |
| R1C2 | `ui_catalog_entry` | dunklere Eintragszeile mit kleiner Mulde | P3 |
| R2C1 | `ui_catalog_tab` | Reiter | P3 |
| R2C2 | `ui_catalog_header` | Kopfleiste mit Goldakzent | P3 |

```text
Apply PROMPT 0 and the v0.2 ADDENDUM.

SHEET (v0.2): v21_catalog.png – four 9-slice UI tiles in a grid of 2 columns x 2 rows of equal square cells, on flat #808080. Image format 1:1 (for example 1536x1536).
STYLE: same style as the attached UI panel sheet. Each tile is a square filling about 90 % of its cell, centered.
9-SLICE RULE: the four corners hold the decoration; the edges repeat evenly; the center is a plain even surface without any single object.

CELLS in reading order:
 - R1C1 "ui_catalog_panel": light paper surface (#cfd0e0, #f4f4fa) with a steel frame (#6a6a88, #43435f) and rounded pixel corners.
 - R1C2 "ui_catalog_entry": darker slate row panel (#2a2a44) with a thin steel border and a small recessed square slot in the left corner area.
 - R2C1 "ui_catalog_tab": a tab shape with rounded top corners and a flat open bottom, slate with a steel border.
 - R2C2 "ui_catalog_header": a header bar tile, dark slate with a thin gold accent line (#e0a848) along the bottom edge.

SHAPE CHECK: 4 square tiles, each inside its own cell.
Every cell contains exactly what is listed, nothing else.
```

---

## 5. Hinweise für Import und Pipeline

- **Konfiguration `tools/build-all.mjs`:** neue Zeilen V01–V16 (Rohdatei → Sheet-ID, Name `sheet_v2_*`, Zielgröße = Raster × Zelle, Zelle). Beispiel V01: `--size 128x128 --cell 32x32`. V08: `--size 96x64 --cell 16x16`. V12: `--size 144x80 --cell 72x20`.
- **Namen:** `tools/clean-sheet.mjs --sheet`, `tools/hd.mjs`, `tools/manifest.mjs` und `tools/check-names.mjs` lesen die Sprite-Namen heute **nur aus `docs/asset-sheets.md`** (geprüft). Für V01–V21 muss die Werkzeug-Konfiguration also entweder zusätzlich `docs/assets-v0.2.md` lesen (die Zellen-Tabellen hier nutzen dasselbe Schema `R<z>C<s>` + Sprite-Name) oder die Namen als Liste in `build-all.mjs` bekommen. Das ist eine Werkzeug-Änderung und nicht Teil dieses Dokuments.
- **Frames aus Einzelbildern:** V10 f0–f3 mit `tools/stack.mjs` stapeln und als ein Sheet mit 4 Frames je Overlay bauen (`card_ov_<name>_0…3`); `card_ov_rgb` nur aus f0. Gleiches für V19 (`fx_melt_0…3`, `fx_leak_0…3`; Garantie-Icons nur aus f0) und `cooler_ln2pot_0…3`.
- **Einzelbilder:** V14 wie E03–E05 (`tools/single.mjs`, proportional auf Ziel × 4), V15/V16 zuschneiden und proportional skalieren.
- **Seitenverhältnis prüfen:** `contentBBox` je Sprite gegen die Spalte „Ziel px“/„Form“ halten; Abweichung > 5 % → neu erzeugen oder nachbessern (wie `asset-nachbesserung.md`).
- **Shader:** neuer Marken-Swap-Ton **Blau** für Intellion Ark (`gpu_m`), sonst keine neuen Shader-Modi. RGB-Cyan in `led_strip`, `exp_rgb`, `card_ov_rgb` nutzt den bestehenden RGB-Zyklus.
