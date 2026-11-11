# BOTTLENECK – Fortschritt

Übergabe für neue Agenten: **`docs/handoff.md`** (Architektur, offene Pakete). Abweichungen: `docs/implementation-notes.md`.

## Meilensteine (GDD Abschnitt 19)

| Meilenstein | Stand |
|---|---|
| M1 Wertungs-Prototyp | ✅ Core (Profile, Score-Formel, Hitze, Throttling, Shutdown) + vertikaler Durchstich im Browser |
| M2 Build-System | ✅ 46 Teile, K1–K12, Lanes, Slot-Verdeckung, Werkbank mit PC-Ansicht, POST |
| M3 Loop | ✅ Benchmarks, Kassenbon, Laden, Packs, Geld/Zinsen/Stromrechnung, 9 Bosse + Finale, Endlos-Kurve, Game Over |
| M4 Risiko | ✅ OC/BIOS, Silizium-Lotterie, Bluescreen, 12-Pin, Brownout, Zwangs-Update |
| M5 Präsentation | 🟡 Pixel-Art, Animationen, Hoch-/Querformat, Audio (Synth), Autosave fertig; Politur offen (siehe handoff.md) |

## Tests (letzter Lauf)

- `npm test`: 5 Dateien, 53 Tests grün (Scoring inkl. GDD-Beispiel 1 = 232 und 2 = 9.856, Profile, Kompatibilität, Run/Shop/Ökonomie, Kurve, i18n).
- `npm run build`: ohne Fehler (TS strict), `base: './'`.
- `npm run sim -- 200` (Wachstum 1,8, alter Bot): Median **Gen 8**, Mittel 7,0, p10 4, p90 9, max 10. Häufigster Tod: Finale F1 (Gen 8).
- **P1 (Bot neu, Kurve unverändert 1,8):** `npm run sim -- 300`: Median **Gen 10**, Mittel 9,26, p10 8, p90 11, max 11, Tode in Gen 1–2: 2,0 %. Verteilung: Gen 1–7 7 %, Gen 8 11,7 %, Gen 9 22 %, Gen 10 48 %, Gen 11 11,3 %. F1: 30 von 300 Toden. Käufe je Run: Hardware 10,6, Treiber-Packs 7,3 + Treiber 1,7, Software 5,8 + Software-Packs 2,8, Werkzeug-/Workload-Packs je ≈ 2,8.
- Browser (Chromium): Hochformat 390×844 und 360×640, Querformat 1280×720; Autoplay-Run über die echte UI bis Bluescreen (Gen 8, Querformat) ohne Konsolenfehler; Speichern/Fortsetzen nach Reload geprüft; Deutsch geprüft.

## Nächste Schritte

Siehe Pakete P1–P7 in `docs/handoff.md` (P1 Balancing, P2 Benchmark-Politur, P3 Werkbank/Laden, P4 Audio, P6 Texte parallel; dann P5 Lesbarkeit; zuletzt P7 Technik/Abschlusstest).

## Bekannte Probleme

- P1 sanft beendet: Abnahme (Median ≥ 10, p10 ≥ 6, < 5 % Tode in Gen 1–2, gemischte Käufe) erfüllt, aber Verteilung schmal (Gen 8–11, nicht 10–14). Kurven-Kandidaten und Bot-Schwächen: `docs/implementation-notes.md` §2.1.
- Querformat-Laden, POST-Fehlerdialog, Touch-Long-Press (echtes Gerät) nicht vollständig im Browser geprüft.
- Bundle 877 kB ohne Code-Splitting.
- Werkbank-Positionen (`CASE_LAYOUT`) handgemessen, GPU-Blende nicht exakt an Gehäuseblenden.

## P2 Benchmark-Screen-Politur (Agent B)

Erledigt (Dateien: `bench.ts`, `cards.ts`, `hud.ts`, `fx.ts`; Commit 0c66b39):
- Profil-Karten: Die Karten des erkannten Profils leuchten gold (schon bei der Auswahl in der Hand); beim Werten springen sie hoch und sprühen Funken, die übrigen nicken nur.
- Hand ab 9 Karten im Hochformat zweireihig (Reihenabstand 68 px, Handbereich 150 px), Trefferbreite ≥ 52 px. Geprüft mit 10 Karten bei 360×640 und 390×844.
- Hover (Desktop) / Long-Press (Touch): vergrößerte Karte (bis ×2,4, mit Kartennamen) im leeren Spielfeld, Tooltip darüber (hoch) bzw. rechts daneben (quer); Long-Press schließt beim Loslassen.
- Gespielte Karten werden im Spielfeld bis ×1,5 größer, wenn Platz ist.
- Hitzeflimmern ab 70 °C (voll bei 100 °C): `HeatShimmer` in `fx.ts` (wabernde Geisterkopie der Tischkacheln in 8-px-Streifen, aufsteigende Hitzepartikel, Glut von unten).
- Boss-Intro-Banner: Abdunkeln, Warnband mit laufenden Warnstreifen, Boss-Icon schlägt ein (Shake, Funken), Name + Regel; Finale in Gelb.
- Glitch: `Fx.glitch()` (RGB-Streifen, verschobene Rauschstreifen); instabile Karten glitchen ab und zu von selbst (chromatische Geister); Bluescreen: Glitch über dem Spielfeld + Mini-Bluescreen mit `:(`, Stop-Zeile mit dem Bauteil (neuer Text `bench.bsodStop`), Prozent-Zähler, CRT-Aus.
- Score-Zählwerk: Durchlauf-Score rollt hoch (Ticks) und schlägt dann ein (Konfetti, wenn das Ziel damit erreicht ist); Header-Score als Odometer (`Odometer` in `hud.ts`, rollende Ziffernstreifen) mit Pop.
- Banner allgemein: Farblinien, Text gleitet ein, zu lange Texte werden verkleinert. Score-Balken im Hochformat beginnt hinter dem gemessenen Ziel-Text (keine Überlappung bei großen Zielen).
- Kartennamen: neue Einpassung (`fitName`): größte Schrift, bei der jedes Wort in 34 px passt und der Name in 2 Zeilen; ein langes Wort mit Bindestrich bricht nach dem Bindestrich. Alle 40 Namen EN und DE bei 1280×720 geprüft.

Zusatz Lesbarkeit (Commit f3c9d99): Ziffern, Zahlzeichen (`$ % + , - . ± × −`) und „B“ der Body-Schrift kommen aus **Jersey 15** (OFL, `@fontsource/jersey-15`), per `FontFace` mit `unicode-range` und `size-adjust 125 %` vor Pixelify Sans (DOM `--font-body` und Bitmap-Font). „8“ ≠ „S“, „5“ ≠ „S“, „B“ ≠ „8“. HW-Chip-Badge („OC1“) nutzt jetzt die Body-Schrift.

Geprüft: Screenshots 360×640, 390×844 (auch 720×1280 = 2×), 1280×720; Autoplay-Runs hoch (360×640, Gen 10) und quer (1280×720, Gen 10) ohne Konsolenfehler; Bluescreen-Pfad über `animatePlay` mit erzwungenem Ergebnis.

Offen:
- Silkscreen (Titel-Schrift): „0“ und „O“ sind fast gleich (nur in Zahlen-Kontexten, unkritisch). Pixelify „l“/„I“ gleich.
- Hitzeflimmern ist ein Overlay (kein echter Verzerrungs-Shader).
- Long-Press-Zoom nur per Code/Maus geprüft, nicht auf echtem Touch-Gerät.
- „NEU PRIORISIEREN“ (DE) ist bei 360 px im Button zu breit (P5/P6).

## P6 Übersetzung & Texte (Agent A)

- „Neu-Prio“ heißt jetzt **Abwerfen / Discard** (Button), Zähler **Abwürfe / Discards**. „Durchlauf“ (gespielte Hand) heißt EN jetzt **Play/Plays** (vorher „Run“, kollidierte mit „New run“ = ganzer Lauf). Der Button „Neu priorisieren“ ist damit gelöst (8 statt 16 Zeichen).
- DE: „Pfadverfolgung“ → „Pathtracing“, „Festgeld-Zinsen“ → „Sparzinsen“, „Ins Lager ausbauen“ → „Ausbauen“.
- **Profil-Hilfe:** neue Schlüssel `profileHelp.<id>` (Erklärtext mit Beispiel, Basiswerten, Kern-Bedarf) und `profileHelpUi` (`title`, `intro`, `needCores`, `base`) in beiden Sprachdateien. Noch keine UI. Sinnvoll: Button „Kombis“ (Rangliste aller 10 Profile mit Stufe, Basis L×T, `profileHelp`-Text) im Benchmark-Header bzw. Deck-Dialog; Profil-Name im Spielfeld antippbar → öffnet denselben Eintrag.
- Lizenzen in `public/licenses/` (4× OFL, three.js MIT, README). Credits (`settings.creditsText`) nennen Schriften, three.js, Parodie-Hinweis und `/licenses/README.txt`.

## P3 Werkbank & Laden (Agent B)

Erledigt (Dateien: `pcView.ts`, `workbench.ts`, `shop.ts`, neu `postDialog.ts`; Details: implementation-notes §5):
- `CASE_LAYOUT` neu vermessen: Board an den Gehäuse-Slotblenden, PCIe-Slots auf Blendenhöhe, GPU-/Kartenblende auf den Gehäuseblenden, Karten einheitlich skaliert (Höhe = belegte Slots, keine Stauchung); Lüfter frontal; Radiator oben (Glas: auf den Deckel-Lüfterplätzen); 5,25"-Schächte (Office) mit Laufwerkskäfig vor dem Board, sonst Laufwerke auf der Netzteil-Abdeckung; GPU-/RAM-Knoten antippbar.
- GPU-Lüfter drehen per Code (Frame 0 + rotierende Kreismaske).
- Kabel (optional, Schalter „Kabel“): 24-Pin, EPS, PCIe-Strom, AIO-Schläuche.
- POST-Fehlerdialog: LED-Leiste mit blinkender Fehler-LED, Beep-Code je LED (Ton + Symbolanzeige, „Erneut piepen“), Klartext, betroffene Teile, weitere Fehler; Fehlteil blinkt im Gehäuse rot.
- Board-Tausch bei vollem Lager: Dialog „Lager zu klein“ mit Direktverkauf, danach automatischer Einbau; Slot-Liste zeigt „Ins Lager: …“.
- Laden: Angebote auf der Theke (hoch und quer), Preisschilder, Titel im Ladenschild; größere Pack-Öffnen-Animation (Pack fällt, wackelt, Blitz + Riss + Funken/Konfetti, Karten fliegen heraus und drehen sich).

Verzerrungs-Korrektur (nach Rückmeldung): Perspektiv-Stauchung der Lüfter und des Radiators, Stauchung der Steckkarten auf die Slothöhe, gestreckte PCIe-Slots, Watt-Balken-Füllung, Lager-Highlight (nicht quadratische Kunst) und die Kartendrehung (scaleX) in der Pack-Animation entfernt. Debug-Prüfung `src/view/aspectCheck.ts` (Dev, Toleranz 2 %): 0 Abweichungen in Werkbank (18 Kombinationen, mit Auswahl), Laden (hoch/quer) und während der Pack-Animation – außer `card_shadow` (bis 4,9 %), `card_ov_*` und `card_frame_*` (2 %) aus `src/view/cards.ts` (P2, `ItemCard`/`CardView`: `shadow.size(w + 2, hh + 2)`, Overlay `CARD_H * 1.12`), dort nicht geändert.

Geprüft (Chromium): alle 3 Gehäuse × mATX/ATX × GPU S/M/L als Matrix (auch mit AIO 240/360, Zusatzkarten, 4 Laufwerken); POST-Fehler hoch (390×844) und quer (1280×720); Laden 390×844, 360×640 (DE), 844×390, 1280×720 ohne Überlappung; „Kaufen & einbauen“ per Klick bis zum Einbau; Board-Tausch mit vollem Lager (Verkauf → Einbau); Pack-Animation verlangsamt (`__timeScale`) hoch und quer; Autoplay quer (1280×720) bis Game Over (Gen 11) ohne Fehler (nur die bekannten AudioContext-Warnungen); `npm run build`, `npm test` grün.

Offen:
- `src/view/cards.ts` (P2): `card_shadow`/Overlays/Frames leicht verzerrt (siehe oben) – mit `fit()` bzw. natürlichen Maßen beheben.
- ATX-Board im Office-Gehäuse (ungültig, K7) ragt bis auf den Boden – nur Fehlerfall.
- Office-Gehäuse: Blenden-Pitch 13,2 vs. Board 11,9 – tiefere Slots bis 4 px versetzt.
- Doppeltipp-Zoom des Boards (GDD 18.6) nicht umgesetzt.
- Touch-Long-Press auf echtem Gerät nicht geprüft.

Vorschläge (nicht umgesetzt): Seitenlüfter als eigene Profil-Sprites (statt kleiner Frontal-Lüfter); Kabel-Sprites statt Linien; Laufwerke als Seitenansicht in den 5,25"-Schächten.

## P4 Audio (Agent A)

Erledigt (`src/audio/{sfx,levels,music,ambient}.ts`, kleine Änderungen in `game.ts`, `storage.ts`, `settings.ts`, i18n):
- Zentrale Pegeltabelle (dB), Kompressor/Tiefpass, Pentatonik-Leiter beim Werten, neue Sounds für ×Takt, Einrasten, POST-Beep, Bluescreen, Kauf.
- Chiptune-Loop, getrennt schaltbar (Einstellung „Musik“/„Music“); Lüfter-Leerlauf in der Werkbank.
- Robustheit: Context erst nach Geste, Mute sofort, Musik pausiert bei Tab-Wechsel, Node-Aufräumung (`window.__audio.stats`).
- Browser-Test (Autoplay 4, ~1350 Stimmen, aktiv ≤ 18, 0 verworfen, keine Konsolenmeldungen). Klang selbst nicht gehört (nur Werte aus der Tabelle).
Offen: Feinabstimmung nach Gehör (Tabelle `levels.ts`).
