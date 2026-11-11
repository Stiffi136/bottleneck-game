# BOTTLENECK – Implementierungsnotizen

Abweichungen vom GDD (`docs/game-design.md`) und Annahmen der Umsetzung. Das GDD selbst bleibt unverändert.

## 1. Technik

- **Rendering:** three.js mit `OrthographicCamera` (1 Einheit = 1 virtueller Pixel, Ursprung oben links, y nach unten). Alle Sprites laufen durch einen eigenen Sprite-Batch (`src/render/scene.ts`): eine dynamische `BufferGeometry`, bis zu 8 Texturen pro Draw-Call, Painter-Reihenfolge. Typisch 3–8 Draw-Calls pro Frame.
- **Shader:** Ein Fragment-Shader für alle Sprites mit Modi: normal, Marken-Swap (Magenta-Farbton-Maske → Veridia-Grün/Rubeon-Rot), PCB-Swap (Grün-Maske → Board-Farbe), RGB-Zyklus (Cyan-Maske → Regenbogen), Kreis-Maske (drehende Lüfter), Graustufen. Erkennung per Farbton/Sättigung mit weichem Übergang (`smoothstep`), nicht exakt.
- **Texturen:** `assets/hd/*.webp` + JSON werden per `import.meta.glob` direkt aus `assets/hd/` importiert (nur gelesen, Vite kopiert sie mit Hash nach `dist/assets`). Lineare Filterung, Mipmaps, vormultipliziertes Alpha beim Upload (keine dunklen Säume).
- **Echte Sprite-Maße:** Alle Sprites werden über `contentBBox` beschnitten bzw. eingepasst (`Sprite.fit`). Die Werkbank (`src/view/pcView.ts`) setzt Teile nach diesen Maßen: GPU-Kontaktleiste am Slot, Kühler auf dem Sockel, RAM in den DIMM-Slots usw.
- **S27 (GPUs):** Es wird nur Frame 0 genutzt. Die Lüfter drehen per Code: Ein kreisförmig maskierter Ausschnitt desselben Sprites (der Lüfter) rotiert über dem Original. Das gleiche Verfahren dreht die Lüfter der CPU-Kühler, Gehäuselüfter und Radiatoren.
- **GPU-Einbau:** Die Sprites haben die Kontakte unten. Damit die Karte nach GDD „aufgeklappt“ nach unten hängt und die Slots darunter sichtbar verdeckt (K10), wird sie vertikal gespiegelt.
- **Text – Entscheidung:** Hybrid.
  - Text in der Spielwelt (Kartenstufe, Kartennamen, fliegende Zahlen, L/Takt-Boxen, Score-Slam) ist eine **Bitmap-Schrift im Sprite-Batch**. Der Glyphen-Atlas wird zur Laufzeit aus den Webfonts erzeugt (`src/render/font.ts`, mit Mipmaps). Vorteil: bewegt, skaliert und wackelt mit den Sprites, scharf bei jeder Skalierung, Umlaute inklusive, nichts ist in Sprites eingebacken.
  - Menü- und Fließtext (Buttons, Tooltips, Bottom-Sheets, Listen, Einstellungen, Kassenbon, BIOS, Bluescreen) ist ein **DOM/CSS-Overlay** im selben virtuellen Koordinatensystem (`#ui`, skaliert mit `transform: scale(s)`). Vorteil: Zeilenumbruch, Scrollen, Eingaben, Barrierefreiheit und lange Übersetzungen ohne eigenen Layout-Code. Buttons/Panels nutzen die Atlas-9-Slices als `border-image`.
  - Regel: Unter undurchsichtigen DOM-Elementen liegt kein three.js-Inhalt; Panels hinter Sprites werden deshalb als 9-Slice in three.js gezeichnet.
- **Schriften:** `monogram` ist nicht als Paket verfügbar. Ersatz (alle SIL OFL 1.1, über `@fontsource`): **Pixelify Sans** (Fließtext), **Silkscreen** (Titel, Ziffern), **VT323** (BIOS, Bluescreen, Kassenbon). Umlaute und ß sind enthalten. Credits stehen in den Einstellungen.
  - **Ziffern-Schrift:** In Pixelify Sans sehen „8“, „5“ und „B“ wie „S“/„8“ aus. Darum kommen Ziffern, Zahlzeichen und „B“ aus **Jersey 15** (OFL): eigene Familie „BN Digits“ (registriert in `src/render/font.ts` per `FontFace`, `unicode-range`, `size-adjust 125 %`), steht vor Pixelify Sans in `--font-body` und `FONT_FAMILY.body`.
- **Viewport:** Hochformat, wenn Breite/Höhe < 1,05. Faktor `s = min(W/360, H/640)` bzw. `min(W/640, H/360)`; die virtuelle Fläche wird auf max. 400×900 bzw. 720×400 begrenzt, der Rest ist Letterbox mit Hintergrund. Safe-Area-Insets werden berücksichtigt. Umschalten bei `resize`/`orientationchange`.
- **Speichern:** Der komplette `RunState` (JSON) liegt nach jeder Aktion in `localStorage` (`bottleneck.run.v1`). Einstellungen und Bestenliste (Top 5, höchste Gen) separat. Spielzustand ist deterministisch (mulberry32, Zustand im Run gespeichert).
- **Autoplay-Selbsttest:** `?autoplay=4` oder `__autoplay(4)` in der Konsole spielt einen Run mit der Bot-Strategie über die echte UI bis zum Game Over.

## 2. Balancing

- **Zielkurve:** Wachstum pro Generation bis Gen 8 **1,8** statt 2,2 (`CURVE` in `src/core/difficulty.ts`); ab Gen 9 weiter wie im GDD: Faktor +0,4 je Generation. Start 300, Finale ×3, Rundung auf 2 signifikante Stellen (gerundeter Wert ist das echte Ziel). Grund: Mit 2,2 endete der Simulations-Bot im Median bei Gen 4–5. Der MVP enthält keine legendäre Software und keine Cache-Hit-/Krypto-Karten, also weniger ×-Quellen als das GDD für das Endspiel annimmt. Der Unit-Test prüft weiterhin, dass die Formel mit 2,2 exakt die GDD-Tabelle ergibt.
- **Ergebnis** siehe `docs/progress.md` (Abschnitt Simulation). Der Bot ist bewusst einfach (keine Plattform-Planung, kein gezieltes Sparen); erfahrene Spieler sollten 1–3 Generationen weiter kommen.

### 2.1 P1 Balancing & Bot (Stand: sanft beendet, Kurve unverändert)

- **Geändert:** nur Bot und Skripte (`src/sim/bot.ts`, `scripts/sim.ts`, `scripts/power.ts`, neu `scripts/diag.ts`). Keine Zahlen in `core/` geändert; Kurve bleibt Wachstum 1,8 / Beschleunigung +0,4 ab Gen 8.
- **Bot neu:** Bewertung `power()` = mittlerer Score des besten Zugs über 12 gezogene Hände aus dem echten Deck (gemeinsame Zufallszahlen, Hitze über 3 Züge, Boss der aktuellen Generation zu 50 % mitgewertet: B4/B7/B8/B11/F1 …). Jeder Kauf (Hardware inkl. Plattform-Plan mit hypothetischen Ergänzungen wie Board/RAM/Gehäuse/Netzteil, Software inkl. Ersetzen, Treiber, Packs per Erwartungswert, Werkzeuge) wird als log-Zugewinn je Dollar verglichen; Kosten enthalten entgangene Zinsen, Geld über $25 wird freier ausgegeben. Spiel: ×-Karten (Instabil) ans Ende, B11 mit Opferkarte vorn, Abwurf behält Profilkarten, Hitze-Vorausschau. BIOS wählt die beste sichere OC-Stufe. Parameter per Env (`BOT_THETA`, `BOT_SAMPLES` …).
- **Sim:** `npm run sim` läuft parallel (`SIM_JOBS`, Standard 8 Prozesse, 300 Runs ≈ 2 min) und zeigt Tode in Gen 1–2 und Käufe je Kategorie. `scripts/power.ts` spielt „unsterblich“ (verlorene Benchmarks werden gewonnen) und zeigt die Bot-Stärke je Generation.
- **Erkenntnisse:**
  - Bot-Stärke wächst bis Gen 6 um ca. ×1,8 je Generation, ab Gen 8 nur noch ×1,1–1,3. Spätes Wachstum ist im MVP fast nur additiv (Treiber, Zwangs-Update, Shader-Cache); echte ×-Quellen sind nur SW3, SW6 und Instabil-Karten. Mit Beschleunigung +0,4 (×2,2/×2,6/×3,0) endet fast jeder Run 1–2 Generationen nach dem Schnittpunkt → Verteilung schmal (Gen 8–11).
  - F1 ist keine Wand mehr (30 von 300 Toden, vorher 69 von 200), weil der Bot GPU-Karten im Finale wertet und den Boss beim Einkauf berücksichtigt.
  - Häufige Engpässe des Bots: Netzteil P1 (400 W) blockiert C3/G5/G6; Plattformwechsel (MB3/MB7) kommen fast nie zustande; zu wenige Software-Slots (nur S1); Kühlung begrenzt 8-Kern-Züge. Sparen für Zinsen lohnt sich (`BOT_THETA` 0,02–0,03 besser als 0,012).
- **Nächste Schritte (später):**
  - Kurven-Kandidaten aus Sim-Läufen (200 Runs, gleicher Bot): Wachstum 1,75, Beschleunigung ab Gen 9 mit +0,2 → Median 11, p10 8, p90 12; Wachstum 1,7, ab Gen 9, +0,15 → Median 11, p10 10, p90 12, max 13 (wenig Tode in Gen 3–9). Wachstum 1,8, +0,2 ab Gen 8 → Median 10, p10 8, max 12. Für eine breitere Verteilung (Gen 10–14) müsste das späte Ziel-Wachstum nahe an ×1,3–1,5 liegen oder es braucht mehr ×-Quellen (legendäre Software, Cache-Hit).
  - Bot: Netzteil/Kühlung/Plattform als Kombination planen, Treiber auf ein Profil bündeln, Deck ausdünnen (Format C) und Instabil-Karten kopieren. Gen-1–2-Tode (≈ 2 %) sind meist Pech mit Händen bei B4/B5/B11.

## 3. Regel-Auslegungen

- **Begriffe EN:** Leistung = *Perf* (P), Takt = *Clock* (C), Durchlauf = *Run*, Neu priorisieren = *Reprioritize*, Profil = *Profile*, Generation = *Gen*.
- **Markennamen:** Hersteller-Parodien (Intellion, Veridia, Kingstorm, Bärenhoch …) bleiben in beiden Sprachen gleich. Deutsche Modellnamen, die englische Originale parodieren, sind im Englischen übersetzt (Kingstorm *Wut* → *Fury*, MSY *Mörtel* → *Mortar*, Intellion *Kern* → *Kore*, „Heizkraftwerk“ → „Power Plant“ …).
- **Mitgelieferte Lüfter:** Die Lüfter von CA1 (1× F1) und CA4 (3× F2) gehören fest zum Gehäuse (belegen Plätze, zählen für Kühlung/RGB/Watt, nicht ausbaubar). Freie Plätze = Lüfterplätze − mitgelieferte.
- **Multi-GPU** ist im MVP gesperrt (POST-Fehler „SLI-Brücke kommt später“).
- **Einbauen:** Ein Teil kann nur in physisch passende Slots (Sockel, DDR-Kerbe, Formfaktor, Länge, Höhe, Radiator, Slot-Verdeckung, Slotbreite, Lüfterplätze). Board, Gehäuse und Netzteil dürfen auch eingebaut werden, wenn dadurch andere Teile nicht mehr passen (Plattformwechsel); der POST zeigt dann den Fehler. Watt-Überlast blockiert den Einbau nicht, nur den POST.
- **Board-/Gehäusewechsel:** Teile ohne Platz auf dem neuen Board wandern ins Lager; ist das Lager voll, wird der Wechsel abgelehnt. Board und Gehäuse können nur getauscht, nicht ausgebaut werden.
- **Verkaufen** geht nur aus dem Lager (eingebaute Teile erst ausbauen). Softlock-Schutz: Solange der aktuelle Build den POST nicht besteht, sind Pflichtteile (Board, CPU, RAM, Laufwerk, Netzteil, Kühler, Gehäuse) im Lager nicht verkäuflich.
- **RAM-Kits** belegen DIMM-Paare (Kit 1 = DIMM 1+2). Zwei Kits: Werte des schwächeren Kits (niedrigere L, dann Takt), −1 L; RAM-OC = niedrigste OC-Stufe der Kits.
- **Lanes:** verfügbar = CPU + Chipsatz; Vergabe GPU → M.2 → übrige Slots von oben; zusätzlich begrenzt durch die elektrische Breite des Slots (GPU in x16(x4) = gedrosselt).
- **Hitze:** Pro Karte: Basis + OC (+1 je Stufe, ×2 mit Nachbrenner) + „Übertaktet“ + Krypto-Schürfer → Undervolt −1 → Boss-Multiplikator → „Effizient“/E-Kerne = 0. Summe aufgerundet. Abwerfen kühlt um 3 °C (min. 35 °C).
- **Not-Abschaltung** beendet den Run sofort (Game Over), wie im GDD.
- **Leeres Deck:** Hat der Spieler keine Handkarten und keinen Nachziehstapel mehr, endet der Run („OUT_OF_WORKLOADS“).
- **Defekte/abgeschaltete GPU** (12-Pin-Schmelze, Brownout): GPU-Karten nutzen dann die iGPU der CPU.
- **Brownout (B8):** Kandidaten sind CPU, Kühler, GPU, Laufwerke, RAM, Lüfter, Erweiterungskarten (nicht Board/Gehäuse/Netzteil), nach TDP absteigend, bis 60 % der Netzteilleistung reichen. Trifft es die CPU, zählt ihre halbe TDP als eingespart und der Takt wird am Ende ×0,5 gerechnet.
- **Kinobank (B3):** genau min(Kerne, Handkarten) Karten pro Durchlauf.
- **Shader-Cache:** Der Zähler steigt nach jedem gewerteten Durchlauf um die Zahl der GPU-Karten; der L-Bonus im selben Durchlauf enthält diese Karten bereits.
- **Zwangs-Update 11:** Zähler startet bei 2 und steigt nach jedem geschafften Benchmark um 1.
- **Zinsen** werden auf den Kontostand vor der Auszahlung berechnet. Streaming-Geld (Capture-Karte) fließt sofort und steht im Bon nur als Info-Zeile.
- **Ablauf:** Bon → Laden → (Werkbank ⇄ Laden) → POST → Benchmark-Auswahl. „Weiter“ im Laden führt in die Werkbank; nur ein bestandener POST führt zum nächsten Benchmark.
- **Laden:** Software-Regal 70 % Software (gewöhnlich 72 % / selten 28 %, keine legendären Titel im MVP), sonst 50/50 Treiber oder Werkzeug. Angebots-Pakete gewichtet: Workload 35, Treiber 25, Werkzeug 25, Software 15. Software-Bundle: 50 % Chance je Option auf seltene Software. Eindeutige Kategorien (Board, CPU, GPU, Netzteil, Kühler, Gehäuse) werden nicht angeboten, wenn man das Teil schon besitzt. Smart-Shop: Passt keins der beiden Hardware-Angebote, wird das zweite durch ein passendes Teil ersetzt.
- **Werkzeuge:** Im Laden/Werkbank zieht das Spiel 6 zufällige Deckkarten als Auswahl. Format C: lässt mindestens 10 Karten im Deck. Kopierschutz-Knacker legt die Kopie im Benchmark direkt auf die Hand. Werkzeuge können weggeworfen werden.
- **Workload-Paket:** Verbesserung (30 %) gleichverteilt aus Übertaktet/Optimiert/Effizient/Instabil.
- **Darstellung kleiner Handys:** Ist der Skalierungsfaktor < 1,5, zeigen Karten statt des Flavor-Namens den Typ groß an (Name per Long-Press/Tooltip).
- **Score-Vorschau** ist standardmäßig aus (Einstellung), wie im GDD.

## 4. Benchmark-Screen (P2)

- **Profil-Hervorhebung:** Alle gespielten Karten werden gewertet (GDD 6.1); Gold markiert nur die Karten, die das Profil bilden (`profileCards`).
- **Hitzeflimmern** (GDD 18.1 „Shader-Effekt“) ist als Overlay umgesetzt, nicht als Shader: eine warm getönte Kopie der Tischkacheln in 8-px-Streifen, die zeilenweise wabert, plus Hitzepartikel. Grund: kein Eingriff in Engine/Batch nötig.
- **Gespielte Karten** werden im Spielfeld bis ×1,5 (hoch) bzw. ×1,25 (quer) skaliert, wenn Platz ist.
- **Zweireihige Hand:** Entscheidung beim Aufbau des Screens nach max(Handgröße, Handkarten) ≥ 9 (nur Hochformat).

## 5. Werkbank & Laden (P3)

- **Gehäuse-Vermessung (`CASE_LAYOUT` in `src/view/pcView.ts`):** Pro Gehäuse sind Slotblenden-Spalte (Innenkante x, Oberkante der 1. Blende, Pitch), Lüfterplätze, Radiator, Netzteil und Schächte aus den Gehäusebildern abgelesen (Raster-Overlay). Das Board sitzt mit der Hinterkante an der Blenden-Innenkante; Skalierung 0,85 macht den PCIe-Pitch (14 px) gleich dem Blenden-Pitch (≈ 11,9 px bei Mesh/Glas). Beim Office-Gehäuse (Pitch 13,2) bleibt 0,85, damit das mATX-Board neben den Schächten Platz hat; Slot 0 sitzt exakt, tiefere Slots weichen bis 4 px ab.
- **Keine Verzerrung (Regel):** Pixel-Art-Sprites werden nur einheitlich skaliert (`fit()` oder `size()` im natürlichen Seitenverhältnis aus `contentBBox`); Ausnahmen nur 9-Slice und einfarbige Flächen. `src/view/aspectCheck.ts` meldet im Dev-Build jede Abweichung > 2 % in der Konsole (nach jedem Aufbau von Werkbank/Laden/Pack; manuell `__aspectCheck()`).
- **Steckkarten:** Die Karte ist an ihrer eigenen Slotblende verankert (`CARD_X`), vertikal gespiegelt (Kontakte oben) und einheitlich mit `CARD_SCALE` 0,7 skaliert. Damit entspricht die echte Bildhöhe den belegten Slots (L ≈ 3, M ≈ 2, S ≈ 1 bei Pitch 14) und die Längen S:M:L bleiben im GDD-Verhältnis. Alle Slots beginnen 12 px hinter der Blende; x16-Slot 56 px im natürlichen Verhältnis, dort liegen die Kontakte aller Karten. Tiefere Karten liegen über höheren.
- **GPU-Lüfter:** Frame 0 + kreisförmig maskierte, im Code rotierende Kopie (die Frames 1–3 drehen nicht sauber).
- **Lüfter:** frontal und unverzerrt, an Seiten-/Deckelwänden kleiner (22–32 px) auf der Mitte der Lüfteröffnung. Der AIO-Radiator wird frontal im natürlichen Verhältnis oben gezeigt; beim Glas-Gehäuse belegt er die Deckel-Lüfterplätze (360: alle 3, 240: die hinteren 2), freie Lüfter wandern auf die übrigen Plätze.
- **Kabel:** rein kosmetisch (24-Pin in die Durchführung, EPS nach oben, PCIe-Strom zur Netzteil-Abdeckung, AIO-Schläuche), per Schalter „Kabel“ in der Werkbank abschaltbar (`localStorage` `bottleneck.cables`, nicht im Spielstand).
- **POST-Beep-Codes je LED** (eigene Festlegung, an AMI/Award angelehnt): CPU 5× kurz, DRAM 3× kurz, VGA 1× lang + 3× kurz, BOOT 2× lang (`src/ui/postDialog.ts`). Das Netzteil (K6) meldet über die CPU-LED, wie im Core festgelegt.
- **Lager voll beim Board-/Gehäusetausch:** Die Werkbank prüft vorher, ob verdrängte Teile ins Lager passen. Wenn nicht, zeigt ein Dialog die verdrängten Teile und erlaubt, Lagerteile direkt zu verkaufen; danach wird automatisch eingebaut. Core unverändert.
- **Laden:** Angebote stehen in beiden Formaten auf der Theke des Hintergrundbilds, Preisschilder hängen an der Theke, der Titel steht im Ladenschild (Positionen aus der Cover-Skalierung des Hintergrunds, `bgRect()`). Stat-Zeilen erscheinen nur, wenn das Schild hoch genug ist (Hochformat).

## Audio (P4)

- **Pegeltabelle:** `src/audio/levels.ts` (`LEVELS_DB`, Spitzenpegel je Sound in dB vor Master). Nur dort Lautstärken ändern. Orientierung: ×Takt −6, Bluescreen −8, Slam −9, Einrasten −10, Kauf −12, POST-Beep −14, +Leistung −15, +Takt −16, Münze −16, UI-Klicks −21…−38, Zähl-Ticks −29, Lüfter max −23, Musik −25 (Bus).
- **Signalweg:** Stimmen → SFX-Bus → Tiefpass 9 kHz → Kompressor (−14 dB, 4:1) → Master. Lüfter und Musik (eigener Bus) gehen direkt auf den Master. Master = `volume^1.6 × 0.8`.
- **Tonleiter beim Werten:** `ladder(base, step)` in `sfx.ts`: Dur-Pentatonik, je Ereignis eine Stufe höher, zwei Oktaven, danach bleibt der Ton oben (`perf` ab C5, `clock` ab F4, `tick` ab G4).
- **Musik:** prozeduraler Chiptune-Loop (`src/audio/music.ts`, a-Moll, 96 bpm, 8 Takte, Bass/Arpeggio/Lead/Hi-Hat, Lookahead-Scheduler). Neue Einstellung `Settings.music` (Standard an, alte Spielstände bekommen den Default). Getrennt von „Ton“ (alles stumm) und „Lüfterrauschen“. Neue Texte `settings.bgm`/`settings.fanNoise` (EN/DE).
- **Lüfter in der Werkbank:** `src/audio/ambient.ts` prüft alle 400 ms: Phase `workbench` und kein POST-Fehler → leises Leerlaufrauschen (`FAN_IDLE` = 0,1); sonst 0. Der Benchmark steuert den Lüfter weiter selbst nach Temperatur.
- **Robustheit:** `AudioContext` entsteht erst nach einer Geste (pointerdown/keydown/touchend bzw. `userActivation`). Stummschalten setzt den Master sofort auf 0 und stoppt die Musik. `visibilitychange` → Musik stoppt, Context `suspend`, danach `resume`. Jede Stimme räumt ihre Nodes in `onended` auf (`disconnect`), max. 40 gleichzeitige Stimmen (`MAX_VOICES`). Debug: `window.__audio.stats` (`active`, `created`, `dropped`, `peak`).
