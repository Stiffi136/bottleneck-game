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
- **Viewport:** Hochformat, wenn Breite/Höhe < 1,05. Faktor `s = min(W/360, H/640)` bzw. `min(W/640, H/360)`; die virtuelle Fläche wird auf max. 400×900 bzw. 720×400 begrenzt, der Rest ist Letterbox mit Hintergrund. Safe-Area-Insets werden berücksichtigt. Umschalten bei `resize`/`orientationchange`.
- **Speichern:** Der komplette `RunState` (JSON) liegt nach jeder Aktion in `localStorage` (`bottleneck.run.v1`). Einstellungen und Bestenliste (Top 5, höchste Gen) separat. Spielzustand ist deterministisch (mulberry32, Zustand im Run gespeichert).
- **Autoplay-Selbsttest:** `?autoplay=4` oder `__autoplay(4)` in der Konsole spielt einen Run mit der Bot-Strategie über die echte UI bis zum Game Over.

## 2. Balancing

- **Zielkurve:** Wachstum pro Generation bis Gen 8 **1,8** statt 2,2 (`CURVE` in `src/core/difficulty.ts`); ab Gen 9 weiter wie im GDD: Faktor +0,4 je Generation. Start 300, Finale ×3, Rundung auf 2 signifikante Stellen (gerundeter Wert ist das echte Ziel). Grund: Mit 2,2 endete der Simulations-Bot im Median bei Gen 4–5. Der MVP enthält keine legendäre Software und keine Cache-Hit-/Krypto-Karten, also weniger ×-Quellen als das GDD für das Endspiel annimmt. Der Unit-Test prüft weiterhin, dass die Formel mit 2,2 exakt die GDD-Tabelle ergibt.
- **Ergebnis** siehe `docs/progress.md` (Abschnitt Simulation). Der Bot ist bewusst einfach (keine Plattform-Planung, kein gezieltes Sparen); erfahrene Spieler sollten 1–3 Generationen weiter kommen.

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
