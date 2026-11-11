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
- `npm run sim -- 200` (Wachstum 1,8): Median **Gen 8**, Mittel 7,0, p10 4, p90 9, max 10. Verteilung: Gen 1–4 12 %, Gen 5–6 14 %, Gen 7 17,5 %, Gen 8 43,5 %, Gen 9–10 13 %. Häufigster Tod: Finale F1 (Gen 8).
- Browser (Chromium): Hochformat 390×844 und 360×640, Querformat 1280×720; Autoplay-Run über die echte UI bis Bluescreen (Gen 8, Querformat) ohne Konsolenfehler; Speichern/Fortsetzen nach Reload geprüft; Deutsch geprüft.

## Nächste Schritte

Siehe Pakete P1–P7 in `docs/handoff.md` (P1 Balancing, P2 Benchmark-Politur, P3 Werkbank/Laden, P4 Audio, P6 Texte parallel; dann P5 Lesbarkeit; zuletzt P7 Technik/Abschlusstest).

## Bekannte Probleme

- Balancing unter GDD-Ziel (Gen 10–14); Bot schwach (kauft v. a. Treiber-Packs).
- Querformat-Laden, POST-Fehlerdialog, zweireihige Hand, Touch-Long-Press nicht vollständig im Browser geprüft.
- Bundle 877 kB ohne Code-Splitting.
- Werkbank-Positionen (`CASE_LAYOUT`) handgemessen, GPU-Blende nicht exakt an Gehäuseblenden.
