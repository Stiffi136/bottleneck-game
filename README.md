# BOTTLENECK

Roguelike-Deckbuilder zum Thema PC-Hardware (Parodie-Marken). Du baust einen PC, deine Teile sind das Deck, Benchmarks sind die Runden. Mehr Takt und Kerne bedeuten mehr Punkte, mehr Hitze bedeutet Throttling, Shutdown oder Bluescreen. Läuft im Browser (Hoch- und Querformat, EN/DE). Vite + TypeScript + three.js (2D-Sprite-Batch), Audio per WebAudio-Synth.

## Befehle

```bash
npm install
npm run dev            # Dev-Server http://localhost:5173
npm run build          # tsc --noEmit + vite build -> dist/ (base './', läuft aus jedem Unterordner)
npm test               # vitest (53 Tests)
npm run sim -- 300     # Balancing-Simulation mit Bot
npx tsx scripts/power.ts 30 12
```
Selbsttest im Browser (nur Dev-Server, nicht im Production-Build): `/?autoplay=4` spielt einen kompletten Run über die echte UI. Debug (nur DEV): `window.__game`, `window.__timeScale`, `window.__autoplay`, `window.__audio`.

## Struktur

```
src/core/     reine Spiellogik (deterministisch, ohne DOM), Daten in core/data/
src/render/   three.js-Engine, Sprite-Batch, Asset-Lader, Bitmap-Font, Tweens/FX
src/view/     Szenenteile (Karten, HUD, Werkbank-PC, Hintergrund)
src/ui/       DOM-Overlay und Screens (ui/screens/)
src/game/     Controller und localStorage-Speicherstand
src/audio/    Synth-SFX, Musik, Lüfter
src/i18n/     en.ts / de.ts
src/sim/      Bot + Autoplay
tests/, scripts/, docs/, public/licenses/
```
Details: `docs/handoff.md`; Regeln: `docs/game-design.md`; Stand und offene Punkte: `docs/progress.md`.

Build-Chunks: `three` (~530 kB, eigener Chunk), `core`, `ui`, Einstieg, `autoplay` (lazy).

## Asset-Pipeline

Pixel-Art-Sheets liegen als KI-Rohbilder in `assets/raw/`. `node tools/build-all.mjs` erzeugt daraus alle HD-Assets (`assets/hd/*.webp` + `.json`, Manifest, Vorschauen unter `assets/preview/`). Es ist wiederholbar; mit `--only S16,E01` baut es einzelne Sheets. Sheet-Tabelle: `docs/asset-sheets.md`. Der Build lädt `assets/hd` per `import.meta.glob`. Die Werkzeuge brauchen eigene Abhängigkeiten (`cd tools && npm install`).

## Lizenzen

Code: siehe Repo-Inhaber. Schriften Pixelify Sans, Silkscreen, VT323, Jersey 15: SIL OFL 1.1; three.js: MIT. Lizenztexte in `public/licenses/` (landen in `dist/licenses/`). Alle Marken im Spiel sind Parodien.
