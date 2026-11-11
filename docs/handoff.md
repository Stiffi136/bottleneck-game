# BOTTLENECK – Übergabe an neue Agenten

Stand: siehe `docs/progress.md`. Regeln/Zahlen: `docs/game-design.md` (nicht ändern). Abweichungen/Annahmen: `docs/implementation-notes.md` (bei jeder neuen Abweichung ergänzen). Assets: `assets/hd/` nur lesen; `docs/asset-sheets.md`, `assets/raw/`, `tools/` nicht ändern.

**Git:** Autor und Committer müssen `Stiffi136 <git@mxsd.de>` sein (ist lokal per `git config` gesetzt; prüfen mit `git log --format='%an <%ae> | %cn <%ce>'`). Kleine Commits pro Paket.

## 1. Befehle

```bash
npm install
npm run dev          # Vite, http://localhost:5173
npm run build        # tsc --noEmit + vite build (base './', läuft aus Unterordner)
npm test             # vitest (53 Tests)
npm run sim -- 200   # Balancing-Simulation (Bot), Gen-Verteilung
npx tsx scripts/power.ts 30 12   # Power-Kurve des Bots je Generation
```
Browser-Selbsttest: `http://localhost:5173/?autoplay=4` (oder `__autoplay(4)` in der Konsole) spielt einen ganzen Run über die echte UI bis zum Game Over. Debug: `window.__game` (Game-Controller, `__game.run` = Zustand), `window.__timeScale.value` (Animationstempo). Subagenten haben kein `background`-Tool: Dev-Server mit `nohup npx vite --port 5199 > /tmp/vite.log 2>&1 &` starten und nach dem Test beenden.

## 2. Architektur

```
src/core/        reine Spiellogik, kein DOM, deterministisch, serialisierbar
  types.ts       Card, PartDef/PartInst, Build (Slot-Arrays), SoftwareInst, IDs
  rng.ts         mulberry32; Zustand (uint32) liegt in RunState.rng
  data/hardware.ts  46 MVP-Teile (GDD Kap. 10), Hilfen part()/partOf()
  data/content.ts   Profile, Software, Werkzeuge, Bosse, Preise
  profiles.ts    detectProfile()
  build.ts       Slots, reflow, Lanes, Watt, abgeleitete Werte computeStats()
  compat.ts      POST validate() (K1–K12 + weiche Regeln), slotOptions(), shopBadge()
  scoring.ts     computeHeat(), evaluatePlay() → Event-Liste für die Animation, brownout()
  difficulty.ts  Zielkurve (CURVE), Belohnung, Zinsen, Tier-Gewichte
  run.ts         RunState + alle Aktionen (startBenchmark, playCards, discardCards, collectReceipt,
                 Shop-, Pack-, Werkbank-, BIOS-, Werkzeug-Aktionen). Rückgabe Result {ok}|{ok:false,err}
src/sim/bot.ts   Heuristik-Bot (Sim + Autoplay); src/sim/autoplay.ts treibt die echte UI
src/i18n/        en.ts (Referenz, Typ Dict), de.ts (: Dict → fehlende Schlüssel = Compile-Fehler),
                 index.ts: L() liefert aktives Dict, fmt() ersetzt {x}, num()/big()/money() Zahlenformat
src/render/      three.js-Engine
  engine.ts      Renderer, Ortho-Kamera, Viewport (Hoch/Quer), Input (Tap/Long-Press/Drag/Hover), Shake, Screen-Wechsel
  scene.ts       Node/Sprite/Text/Rect2, Sprite-Batch mit Shader (Marken-/PCB-/RGB-Swap, Kreis-Maske)
  assets.ts      lädt assets/hd per import.meta.glob, frame()/anim()/frameURL() (contentBBox!)
  font.ts        Bitmap-Font-Atlas zur Laufzeit aus Webfonts (Pixelify Sans, Silkscreen, VT323)
  tween.ts, fx.ts  Tweens (timeScale = Spieltempo), Partikel, Float-Texte, Bursts
src/view/        wiederverwendbare Szenenteile: cards.ts (CardView, ItemCard), hud.ts (Thermo, ValueBox,
                 ScoreBar, SwChip, HwChip), pcView.ts (Werkbank-PC, CASE_LAYOUT), background.ts
src/ui/          DOM-Overlay: dom.ts (h(), button, tip, sheet, toast), describe.ts (lokalisierte Texte zu Teilen etc.),
                 settings.ts, deckSheet.ts, bios.ts, toolSheet.ts
src/ui/screens/  base.ts (BaseScreen: build() bei Resize/Sprachwechsel neu), title, select, bench, receipt,
                 shop, workbench, gameover
src/game/        game.ts (Controller: run, settings, route() nach run.phase, save()), storage.ts (localStorage)
src/audio/sfx.ts WebAudio-Synth (alle SFX + Lüfterrauschen nach Temperatur)
tests/           vitest: scoring, profiles, compat, run (Shop/Ökonomie/Kurve), i18n
scripts/         sim.ts, power.ts
```

**Zusammenspiel:** UI ruft eine Aktion aus `core/run.ts` auf → Zustand ändert sich sofort → `game.save()` → Screen animiert das Ergebnis (z. B. `PlayOutcome.eval.events`) und zeigt danach den echten Zustand. `game.route()` wählt den Screen nach `run.phase` (`select | bench | receipt | shop | workbench | gameover`).

**Konventionen:**
- Jede Zufallsentscheidung über `withRng(run, r => …)`; nie `Math.random()` in `core/`.
- Alle Texte in `src/i18n/en.ts` + `de.ts`; Core liefert nur Codes (`CompatMsg`, `ErrKey`, IDs). Neue Schlüssel immer in beiden Dateien. Test `tests/i18n.test.ts` prüft Gleichheit der Schlüssel und Platzhalter.
- Koordinaten: virtuelle Pixel, Ursprung oben links. DOM-Elemente mit `placeEl(el, box)`; three-Nodes in `this.root`. Kein three-Inhalt unter undurchsichtigem DOM (Panels dann mit `this.panel()` in three zeichnen).
- Sprite-Größen immer aus `contentBBox` (`new Sprite(name).fit(w,h)`), nie Sollmaße annehmen.

## 3. Stand

Fertig und im Browser getestet (Hoch 390×844 / 360×640 und Quer 1280×720, kompletter Autoplay-Run bis Bluescreen bei Gen 8, keine Konsolenfehler):
- Core komplett (alle MVP-Regeln, 10 Profile, 46 Teile, 15 Software, 10 Treiber, 7 Werkzeuge, 4 Verbesserungen, 4 Packs, 9 Bosse + Finale, OC/Silizium-Lotterie, Stromrechnung, Schulden, Smart-Shop, Softlock-Schutz). 53 Unit-Tests grün, GDD-Beispielrechnungen 1+2 exakt.
- Screens: Titel, Benchmark-Auswahl, Benchmark (Wertungsanimation, Hitze, Throttling, Shutdown, Bluescreen, Drag-Sortierung, Tastatur), Kassenbon, Laden (inkl. Pack-Öffnen), Werkbank (Slots grün/gelb/rot + Slot-Liste, Drag & Drop, Einrast-Effekt, POST-LEDs, BIOS), Deck-Ansicht, Einstellungen, Bluescreen-Game-Over. EN/DE umschaltbar.
- Speichern/Fortsetzen nach Reload funktioniert (auch mitten im Benchmark).

Halb fertig / nicht geprüft:
- Laden im Querformat und POST-Fehlerdialog nur kurz bzw. gar nicht per Screenshot geprüft.
- Hand mit ≥ 9 Karten (zweireihig im Hochformat) nicht im Browser geprüft.
- Long-Press-Tooltips auf echtem Touch-Gerät nicht geprüft (nur Code).
- Audio nur „läuft ohne Fehler“, nicht klanglich abgestimmt.
- Kartennamen-Verkleinerung (Fix in `cards.ts`) und größere Pack-Öffnen-Animation nach dem letzten Screenshot geändert, nicht erneut angesehen.

Bekannte Probleme:
- **Balancing:** Sim-Median Gen 8 (Mittel 7,0, p90 9, max 10) statt GDD-Ziel 10–14. Kurve bereits auf Wachstum 1,8 gesenkt (GDD 2,2). Finale F1 (Gen 8, ×3) ist die Wand (69 von 200 Toden). Der Bot kauft fast nur Treiber-Packs (1549 von ~4000 Käufen), plant keine Plattformwechsel und spart nicht für Zinsen → er ist schwach; unklar, wie weit ein Mensch kommt.
- `src/sim/bot.ts` ist organisch gewachsen (env-Parameter `BOT_PD`, `BOT_RES`, `BOT_SPEC`), `assemble()` ist unschön.
- JS-Bundle 877 kB (three.js komplett); kein Code-Splitting.
- Werkbank: Positionen in `CASE_LAYOUT` (`src/view/pcView.ts`) sind von Hand aus den Gehäusebildern abgelesen; GPU-Slotblende sitzt nicht exakt an den Gehäuse-Slotblenden.
- Kleine Handys (360 px): Fließtext 8,5–9,5 virtuelle px, an der Grenze der Lesbarkeit.

## 4. Offene Pakete

Dateibesitz: Ein Paket ändert nur seine Dateien. Gemeinsame Dateien (`src/i18n/en.ts`, `src/i18n/de.ts`, `src/style.css`, `docs/*`) nur **anhängend/lokal** ändern und vor dem Commit `git pull --rebase` bzw. Konflikte klein halten. Nach jedem Paket: `npm run build`, `npm test` grün, Commit.

### P1 Balancing & Bot  — sofort, parallel
- Ziel: Sim-Verteilung typischerweise Gen 10–14 bei einem *vernünftigen* Bot, ohne Gen 1–3 unfair zu machen (< 5 % Tode in Gen 1–2). F1 entschärfen oder vorbereiten (z. B. Bot spielt im Finale GPU-Karten, Kurve um Gen 8 glätten).
- Dateien: `src/sim/bot.ts`, `scripts/sim.ts`, `scripts/power.ts`, `src/core/difficulty.ts`, Zahlen in `src/core/data/*.ts` (nur wenn nötig), `tests/run.test.ts` (Kurven-Tests anpassen).
- Abhängigkeiten: keine. Änderungen an Regeln in `core/run.ts`/`scoring.ts` mit P2 absprechen (nur Zahlen, keine Strukturänderungen).
- Abnahme: `npm run sim -- 300` zeigt Median ≥ 10, p10 ≥ 6; Bot kauft gemischt (Hardware, Software, Treiber). Ergebnis + Begründung in `docs/implementation-notes.md` §2 und `docs/progress.md`.

### P2 Benchmark-Screen-Politur  — sofort, parallel
- Ziel: Spielgefühl verfeinern: Profil-Karten im Spielfeld hervorheben, zweireihige Hand prüfen, Hover/Long-Press-Detail größer (vergrößerte Karte), Heat-Shimmer ab 70 °C (Hintergrund), Boss-Intro-Banner, Instabil/Bluescreen-Glitch schöner, Score-Zählwerk.
- Dateien: `src/ui/screens/bench.ts`, `src/view/cards.ts`, `src/view/hud.ts`, `src/render/fx.ts`.
- Abhängigkeiten: keine.
- Abnahme: Screenshots Hoch (360×640, 390×844) und Quer (1280×720) ohne Überlappungen; Autoplay-Run ohne Konsolenfehler.

### P3 Werkbank & Laden  — sofort, parallel
- Ziel: `CASE_LAYOUT` feinjustieren (GPU-Blende an Gehäuseblenden, Laufwerksschächte, Radiator), Laden im Querformat prüfen/verbessern (Angebote ggf. auf der Theke), POST-Fehlerdialog + Beep-Codes je LED, Kabel optional, „Kaufen & einbauen“-Flow testen, Board-Tausch mit vollem Lager.
- Dateien: `src/view/pcView.ts`, `src/ui/screens/workbench.ts`, `src/ui/screens/shop.ts`, `src/ui/bios.ts`, `src/ui/toolSheet.ts`.
- Abhängigkeiten: keine.
- Abnahme: Für alle 3 Gehäuse × (mATX/ATX) × GPU S/M/L Screenshots ohne grobe Fehlplatzierung; POST-Fehler mit LED sichtbar.

### P4 Audio  — sofort, parallel
- Ziel: SFX abstimmen (Lautstärken, Tonhöhen-Leiter beim Werten), optional kurzer Chiptune-Loop (stummschaltbar), Lüfterrauschen auch in Werkbank.
- Dateien: `src/audio/sfx.ts` (+ neue Dateien in `src/audio/`). Aufrufe in Screens nur minimal (mit P2/P3 abstimmen).
- Abnahme: Stummschalten wirkt sofort; keine WebAudio-Fehler; kein Ton vor erster Nutzerinteraktion.

### P5 Lesbarkeit, Responsivität, Barrierefreiheit  — nach P2 und P3
- Ziel: Mindestgrößen auf 360-px-Handys (Fließtext ≥ 9,5 vpx, Touch-Ziele ≥ 44 vpx), Safe-Area auf iPhone, Tablet-Hochformat (Letterbox), Linkshänder-Modus überall, Farbe+Form bei Status.
- Dateien: `src/style.css`, `src/render/engine.ts` (Viewport), Layout-Konstanten in Screens (nach Absprache).
- Abnahme: Screenshot-Serie 360×640, 390×844, 820×1180, 1366×768, 1920×1080.

### P6 Übersetzung & Texte  — sofort, parallel (nur `src/i18n/*`)
- Ziel: EN-Texte gegenlesen (knappes Spiel-Englisch), DE gegen GDD prüfen, Tooltips zu Profilen im Spiel (Profil-Liste/Hilfe), Credits/Lizenztexte (OFL) als Datei `public/licenses/`.
- Dateien: `src/i18n/en.ts`, `src/i18n/de.ts`, `public/licenses/*`.
- Abnahme: `npm test` (i18n-Test) grün; keine abgeschnittenen Texte in Screenshots (gemeinsam mit P5).

### P7 Technik & Abschlusstest  — zuletzt
- Ziel: Bundle splitten (three.js, Screens), Performance-Check (Draw-Calls, 60 fps), `dist/` aus Unterordner testen (`npx vite preview --base ./` oder statischer Server in Unterordner), vollständige Autoplay-Runs in beiden Formaten, Doku final.
- Dateien: `vite.config.ts`, `src/main.ts`, `docs/progress.md`.
- Abhängigkeiten: nach allen anderen.
- Abnahme: Build ohne Warnung zu Chunk-Größen; 2 Autoplay-Runs (hoch/quer) bis Game Over ohne Fehler; Browser und Server geschlossen.

**Parallel sofort:** P1, P2, P3, P4, P6. **Danach:** P5 (braucht stabile Layouts aus P2/P3). **Zuletzt:** P7.
