# BOTTLENECK – Game Design Document

> Arbeitstitel: **BOTTLENECK** · Untertitel: *Ein Hardware-Roguelike*
> Genre: Roguelike-Deckbuilder (Endlos-Eskalation) · Plattform: Web (Desktop + Mobile, Touch)
> Technik (später): Vite + TypeScript + three.js, 2D-Pixel-Art über orthografische Kamera
> Status: Entwurf v0.1 – noch kein Code. Alle Zahlen sind Startwerte für das Balancing.

---

## 1. Pitch

Du startest mit einem klapprigen Büro-PC vom Flohmarkt. Jede Runde muss dein Rechner einen **Benchmark** schaffen: ein Score-Ziel, das von Generation zu Generation explodiert. Du spielst **Workload-Karten** (Rechenaufgaben) aus deinem Deck. Dein **verbauter PC** entscheidet, wie viel jede Karte bringt. Zwischen den Benchmarks gehst du in den Computerladen: Du kaufst Mainboards, CPUs, Grafikkarten, RAM, SSDs, Netzteile und Kühler. Dann schraubst du alles auf der Werkbank zusammen. Passt der Sockel? Reicht das Netzteil? Blockiert die dicke Grafikkarte den Slot für die Soundkarte? Hält der Kühler den übertakteten 250-Watt-Prozessor unter 100 °C?

Irgendwann wird der Benchmark zu schwer, und dein PC zeigt einen Bluescreen. Dann beginnt ein neuer Run.

**In einem Satz:** *Balatro trifft PC-Bau-Simulator: Baue Combos aus Karten, aber die Joker sind dein echter, schraubbarer Rechner.*

## 2. Design-Säulen

1. **„Ich baue einen echten PC."** Sockel, RAM-Generation, Slots, PCIe-Lanes, Watt, Gehäusegröße und Kühlung sind echte Regeln. Wer sich mit Hardware auskennt, erkennt alles wieder. Wer sich nicht auskennt, lernt es nebenbei.
2. **Zahlen, die explodieren.** Die Wertung folgt dem Prinzip *Leistung × Takt*. Gute Builds steigern den Score über viele Größenordnungen.
3. **Risiko durch Physik.** Hitze und Strom sind die Gegenspieler. Übertakten bringt viel, aber der Rechner kann drosseln oder abstürzen.
4. **Humor durch Wiedererkennung.** Parodie-Marken, Benchmarks und Memes (RGB bringt mehr FPS, schmelzende Stecker, Zwangs-Updates).
5. **Kurze Runs, mobil spielbar.** Ein Run dauert 20–45 Minuten. Er ist im Hochformat mit einer Hand bedienbar.

---

## 3. Spielelemente: Was ist was?

Diese Tabelle klärt die zentrale Frage: Was sind Karten, was ist permanent?

| Ebene | Was ist das? | Wo liegt es? | Lebensdauer | Balatro-Entsprechung |
|---|---|---|---|---|
| **Workload-Karten** | Rechenaufgaben, z. B. „Raytracing (GPU 8)“. 4 Typen × Stufe 1–10. | Deck → Hand → Spielfläche | Ganzer Run; Deck wird verändert (hinzufügen, entfernen, verbessern) | Spielkarten |
| **Hardware (Build)** | Mainboard, CPU, RAM, GPU, Laufwerke, Netzteil, Kühler, Gehäuse, Lüfter, Erweiterungskarten | Auf dem Mainboard bzw. im Gehäuse (Werkbank) | Permanent, bis du sie verkaufst oder ersetzt | Joker *und* Rahmenwerte (Handgröße, Hände) |
| **Software** | Programme mit Spezialeffekten, z. B. „Fake-Frames“ | Software-Slots (Anzahl = Speicherplatz deiner Laufwerke) | Permanent | Joker |
| **Treiber-Updates** | Verbessern ein Workload-Profil dauerhaft | Sofortwirkung | Einmalig | Planetenkarten |
| **Werkzeuge** | Einmal-Gegenstände: Lötkolben, Wärmeleitpaste, Druckluft … | 2 Werkzeug-Slots | Einmalig | Tarotkarten |
| **Benchmarks** | Gegner bzw. Score-Ziele, je Generation 3 Stück | Run-Karte | Eine Runde | Blinds |

**Kernidee:** Die Hardware bestimmt die **Rahmenwerte** des Kartenspiels:

| Bauteil | bestimmt … |
|---|---|
| **CPU** | **Kerne = maximale Karten pro Durchlauf**; globaler Takt-Bonus; Bonus für CPU-Karten; PCIe-Lanes |
| **RAM** | **Handgröße** (nach Kapazität); Bonus für RAM-Karten |
| **GPU** | Bonus für GPU-Karten (größter Leistungsbringer) |
| **Laufwerke** | **Software-Slots** (Speicherplatz); Bonus für I/O-Karten; **Neu-Priorisierungen** (Geschwindigkeit) |
| **Netzteil** | **Watt-Budget** (harte Grenze) und Stromrechnung |
| **Kühler + Gehäuse + Lüfter** | **Kühlung** (Grad pro Durchlauf) |
| **Mainboard** | Welche Teile passen (Sockel, DDR-Generation, Slots, OC-Freigabe, Lanes) |
| **Erweiterungskarten** | Spezialeffekte (Netzwerk, Sound, Capture …) |

Wichtiger Effekt: Die Start-CPU hat **4 Kerne**. Damit sind nur Profile mit bis zu 4 Karten möglich. Erst eine 6-Kern-CPU schaltet Pipeline, Full Stack & Co. frei. **Ein Hardware-Upgrade fühlt sich darum sofort spürbar an.**

---

## 4. Core Loop

```
 ┌─────────────────────── RUN ───────────────────────────────┐
 │  Starter-PC + Startdeck (40 Karten) + $4                  │
 │                                                           │
 │  ┌──── GENERATION g (1, 2, 3, … endlos) ────────────────┐ │
 │  │  Benchmark 1: Office-Test (Ziel × 1,0)               │ │
 │  │      → Belohnung → SHOP → WERKBANK (Bauen, BIOS)     │ │
 │  │  Benchmark 2: Gaming-Test (Ziel × 1,5)               │ │
 │  │      → Belohnung → SHOP → WERKBANK                   │ │
 │  │  Benchmark 3: BOSS (Ziel × 2,0 + Spezialregel)       │ │
 │  │      → Belohnung − Stromrechnung → SHOP → WERKBANK   │ │
 │  └──────────────────────────────────────────────────────┘ │
 │  g+1 … bis ein Benchmark nicht geschafft wird → Game Over │
 └───────────────────────────────────────────────────────────┘
```

- **Mikro-Loop (Sekunden):** Karten wählen → Hitze-Vorschau prüfen → Ausführen oder Neu priorisieren.
- **Meso-Loop (Minuten):** Benchmark schaffen → Geld → Shop → Bauteile einbauen → POST-Check.
- **Makro-Loop (Run):** Plattform-Strategie (z. B. „billiges DDR4-System maximal ausreizen“ oder „sparen und auf AMX-5 + DDR5 wechseln“), Synergie-Builds (Hitze-Build, RGB-Build, I/O-Build …).
- **Meta-Loop:** Freischaltungen (Starter-PCs, Teile im Pool, Garantie-Stufen), siehe Kapitel 17.

**Niederlage:** Der Benchmark-Score erreicht das Ziel nicht, wenn alle Durchläufe verbraucht sind, oder eine Not-Abschaltung (≥ 100 °C) beendet den Benchmark vorzeitig.
**Kein Sieg-Ende:** Generation 8 ist ein Meilenstein („Flaggschiff-Status“, Freischaltungen). Danach läuft das Spiel endlos weiter, bis die Anforderungen den Spieler einholen.
**Run-Wertung:** Höchste erreichte Generation, bester einzelner Durchlauf, Seed.

---

## 5. Zugablauf (ein Benchmark)

### 5.1 Startwerte eines Benchmarks

| Wert | Start | Quelle |
|---|---|---|
| Durchläufe (Hände) | 4 | fest; Bosse/Software ändern es |
| Neu-Priorisierungen (Abwürfe) | 3 + Bonus des schnellsten Laufwerks | HDD −1, SATA-SSD ±0, NVMe +1 bzw. +2 |
| Handgröße | nach RAM-Kapazität (Tabelle 7.5) | RAM |
| Max. Karten pro Durchlauf | CPU-Kerne (max. 8) | CPU |
| Temperatur | 35 °C (Leerlauf) | Bosse ändern es |
| Benchmark-Score | 0 | — |

### 5.2 Ablauf Schritt für Schritt

1. **Vorbereitung:** Das Deck wird gemischt. Der Benchmark-Bildschirm zeigt Ziel, Belohnung und ggf. die Boss-Regel. Der PC „bootet“ (kurze POST-Animation).
2. **Ziehen:** Der Spieler zieht Karten bis zur Handgröße.
3. **Auswahl:** Der Spieler wählt 1 bis *Kerne* Karten. Die UI zeigt sofort:
   - das erkannte **Profil** (z. B. „Dual-Channel Lv.1 · 10 × 2“),
   - die **Hitze-Vorschau** („+14 °C → 63 °C“; gelb ab 85 °C = Drosselung, rot ab 100 °C = Absturz).
   Die volle Score-Vorschau ist aus (Spannung). Sie ist als Option in den Einstellungen verfügbar.
4. **Aktion:**
   - **Ausführen** (Durchläufe −1) → Auflösung, siehe 5.3.
   - **Neu priorisieren** (Neu-Prio −1): Bis zu 5 gewählte Karten gehen auf den Ablagestapel, dann wird nachgezogen. Leerlauf kühlt: Temperatur −3 °C.
   - **Werkzeug benutzen** (jederzeit, kostet keine Aktion).
   - **Karten sortieren** (nach Stufe/Typ) und Reihenfolge per Drag ändern. Die Reihenfolge zählt für die Wertung.
5. **Auflösung eines Durchlaufs:**
   1. **Hitze-Schritt:** Temperatur += Summe der Hitze aller gespielten Karten.
      - ≥ 100 °C → **Not-Abschaltung:** Der Durchlauf zählt 0. Der Benchmark endet sofort. Ist das Ziel nicht erreicht → Game Over.
      - ≥ 85 °C → **Thermal Throttling:** Der Takt des Durchlaufs wird am Ende halbiert.
   2. **Stabilitäts-Check:** Für jedes instabil übertaktete Bauteil gilt eine Chance von 1/4 auf **Bluescreen**. Dann zählt der Durchlauf 0, die Hitze bleibt.
   3. **Wertung** (Kapitel 6): Die Karten werden von links nach rechts animiert und gewertet. Bauteile leuchten auf, wenn sie auslösen.
   4. Der Durchlauf-Score wird zum Benchmark-Score addiert.
   5. **Kühlung:** Temperatur = max(35, Temperatur − Kühlung).
   6. Gespielte Karten → Ablage. Nachziehen bis zur Handgröße.
6. **Ende:** Benchmark-Score ≥ Ziel → **sofort geschafft.** Jeder ungenutzte Durchlauf bringt $1. Durchläufe = 0 und Ziel verfehlt → **Game Over** (Bluescreen-Bildschirm).
7. **Belohnung** („Kassenbon“) → **Shop** → **Werkbank/BIOS** → **POST-Check** → nächster Benchmark.

---

## 6. Wertung

### 6.1 Workload-Profile („Pokerhände“)

Das Profil wird aus **allen gespielten Karten** ermittelt: die beste Teilmenge, nach fester Rangfolge. **Alle gespielten Karten werden gewertet** („jeder Thread rechnet mit“), nicht nur die Karten des Profils. Darum sind mehr Kerne mächtig. Mehr Karten bedeuten aber auch mehr Hitze.

| Rang | Profil | Bedingung | Basis L | Basis Takt | Treiber-Update je Stufe |
|---|---|---|---|---|---|
| 1 | **Einzeltask** | keine Kombination (höchste Karte) | 5 | 1 | +10 L / +1 Takt |
| 2 | **Dual-Channel** | 2 Karten gleicher Stufe | 10 | 2 | +15 / +1 |
| 3 | **Quad-Channel** | 2 × 2 Karten gleicher Stufe | 20 | 2 | +20 / +1 |
| 4 | **Heterogen** | 4 Karten, je 1 von jedem Typ (CPU, GPU, RAM, I/O) | 25 | 3 | +20 / +2 |
| 5 | **Triple-Buffer** | 3 Karten gleicher Stufe | 30 | 3 | +20 / +2 |
| 6 | **Pipeline** | 5 aufeinanderfolgende Stufen (z. B. 4-5-6-7-8) | 30 | 4 | +30 / +3 |
| 7 | **Spezialisiert** | 5 Karten gleichen Typs | 35 | 4 | +15 / +2 |
| 8 | **Full Stack** | 3 gleiche + 2 gleiche Stufe | 40 | 4 | +25 / +2 |
| 9 | **Quad-Core** | 4 Karten gleicher Stufe | 60 | 7 | +30 / +3 |
| 10 | **Optimierte Pipeline** | 5 aufeinanderfolgende Stufen, gleicher Typ | 100 | 8 | +40 / +4 |

- Die Profile 6–8 und 10 brauchen **mindestens 5 Kerne**. Das ist das „Kerne-Gate“ für das erste CPU-Upgrade.
- Heterogen ist das starke Profil für die 4-Kern-Startphase.

### 6.2 Score-Formel

```
Durchlauf-Score = ⌊ Leistung × Takt ⌋

Leistung (L) = Profil-L
             + Σ über alle gespielten Karten [ Stufe + Verbesserungs-L + Bauteil-L(Kartentyp) ]
             + globale L-Boni (Software, Bauteile)

Takt (T)     = laufender Wert: startet bei Profil-Takt,
               „+Takt“-Effekte addieren, „×Takt“-Effekte multiplizieren,
               jeweils in Auslösereihenfolge; am Ende × 0,5 bei Throttling
```

### 6.3 Auflösungsreihenfolge (wichtig für ×-Effekte)

1. **Profil:** L und Takt des Profils (inkl. Treiber-Stufe).
2. **Karten, von links nach rechts.** Pro Karte:
   1. Stufe → +L
   2. Karten-Verbesserung (Übertaktet, Optimiert …)
   3. Hardware-Trigger des Kartentyps (CPU-Karte → CPU; GPU-Karte → GPU/iGPU; RAM-Karte → RAM; I/O-Karte → alle Laufwerke + I/O-Erweiterungskarten)
   4. Software-Trigger „pro Karte“ (Software von links nach rechts)
3. **Hardware global:** Mainboard → CPU-Basistakt → Kühler → Gehäuse → Lüfter → Erweiterungskarten (feste Reihenfolge)
4. **Software global:** von links nach rechts (der Spieler ordnet die Software per Drag)
5. **Throttling:** Takt × 0,5, falls Temperatur ≥ 85 °C
6. Score = ⌊L × T⌋

### 6.4 Beispielrechnung 1 – Starter-PC, Generation 1

**Build:** Celerity G4 (4 Kerne, +1 Takt global, +2 L/CPU-Karte, iGPU +2 L/GPU-Karte), 2 × 4 GB DDR4-2133 (+1 L/RAM-Karte), Starter-SSD (+2 L/I/O-Karte). Keine Software.

**Gespielt (4 Karten):** GPU 7 · CPU 7 · RAM 3 · I/O 9 → Profil **Heterogen** (alle 4 Typen; schlägt Dual-Channel 7-7).

| Schritt | L | Takt |
|---|---|---|
| Profil Heterogen Lv.1 | 25 | 3 |
| GPU 7: Stufe 7 + iGPU 2 | +9 → 34 | |
| CPU 7: Stufe 7 + CPU 2 | +9 → 43 | |
| RAM 3: Stufe 3 + RAM 1 | +4 → 47 | |
| I/O 9: Stufe 9 + SSD 2 | +11 → 58 | |
| CPU-Basistakt | | +1 → 4 |
| **Score** | **58 × 4 = 232** | |

Hitze: CPU 3 + iGPU 1 + RAM 1 + I/O 1 = +6 °C → 41 °C. Kühlung 8 → zurück auf 35 °C.
Ziel Office-Test Gen 1 = 300 → 2 Durchläufe reichen. Das ist ein bewusst sanfter Einstieg.

### 6.5 Beispielrechnung 2 – Mittelklasse-Build, Generation 5 (Boss-Ziel 14.000)

**Build:** MSY B650M Mörtel · Zenit 7 7800X3D (8 Kerne, +4 Takt global, +6 L/CPU-Karte, Spezial: jede GPU-Karte +2 Takt) · Veridia RTZ 4070 mit OC-Stufe 1 (+13 L und +2 Takt pro GPU-Karte, DLSZ-fähig) · Kingstorm Biest DDR5-6000 2×16 GB (+6 L, +1 Takt pro RAM-Karte; Hand 8) · Sansung 990 Pro (+6 L/I/O) · Killa-NIC (+2 Takt/I/O) · NXZT Krake 360 LCD (+2 Takt global) im Phrantex Mesh-Midi mit 1 Standard-Lüfter.
TDP ≈ 30 + 120 + 230 (4070 mit OC) + 8 + 7 + 3 + 8 + 2 = 408 W → Netzteil 550 W reicht.
**Software (links → rechts):** Kompilierer -O3 (+2 Takt/CPU-Karte) · Task-Mangler (+4 Takt) · Fake-Frames (×2 mit DLSZ-GPU).
**Profil:** Pipeline Lv.2 (1 Treiber-Update: 60 L / 7 Takt).

**Gespielt (6 Karten):** CPU 5 · GPU 6 · GPU 7 · RAM 8 · I/O 9 · CPU 9 → Pipeline 5-6-7-8-9, CPU 9 rechnet mit.

| Schritt | L | Takt |
|---|---|---|
| Profil Pipeline Lv.2 | 60 | 7 |
| CPU 5: 5 + CPU 6 · Kompilierer +2 T | 71 | 9 |
| GPU 6: 6 + GPU 13 · GPU +2 T · 3D-Cache +2 T | 90 | 13 |
| GPU 7: 7 + 13 · +2 T · +2 T | 110 | 17 |
| RAM 8: 8 + 6 · RAM +1 T | 124 | 18 |
| I/O 9: 9 + SSD 6 · NIC +2 T | 139 | 20 |
| CPU 9: 9 + 6 · Kompilierer +2 T | 154 | 22 |
| Hardware global: CPU-Basistakt +4 | | 26 |
| Hardware global: Kühler Krake 360 LCD +2 | | 28 |
| Software global: Task-Mangler +4 | | 32 |
| Software global: Fake-Frames ×2 | | 64 |
| **Score** | **154 × 64 = 9.856** | |

Hitze: 2 × CPU (4) + 2 × GPU (4 + 1 OC) + RAM 1 + I/O 1 = +20 °C. Kühlung: Krake 360 (18) + Mesh-Gehäuse (3) + 1 Lüfter (1) = 22. Der Build ist stabil. Mit Stresstest-Suite (×2 ab 70 °C) wäre ein „heißer“ Spielstil lohnend, dann aber nah an der Drosselung.

---

## 7. Ressourcen

### 7.1 Geld ($)

- Start: **$4**.
- Belohnung: Office-Test **$3**, Gaming-Test **$4**, Boss **$5**.
- **+$1** je ungenutztem Durchlauf.
- **Zinsen („Festgeld“):** +$1 je volle $5 Guthaben, maximal +$5.
- **Stromrechnung** (einmal pro Generation, nach dem Boss): `⌊Gesamt-TDP / 100⌋ + Netzteil-Modifikator`, mindestens $0. Ein Kontostand unter $0 ist nicht möglich: Fehlendes Geld wird von der nächsten Belohnung abgezogen.
- Verkauf („Kleinanzeigen“): ⌊Kaufpreis / 2⌋, mindestens $1. Startteile: $1.

### 7.2 Watt (Strom)

- Jedes Bauteil hat eine **TDP** (W). Die Summe aller Bauteile muss **≤ Netzteil-Leistung** sein. Sonst besteht der Build den POST-Check nicht: „PC fährt nicht hoch“.
- Übertakten erhöht die TDP (CPU +20 %, GPU +15 % je OC-Stufe).
- Last > 90 % ist erlaubt, aber riskant für die RTZ 4090 ohne ATX-3-Netzteil (siehe G6).
- Die Watt-Leiste in der Werkbank zeigt grün (< 70 %), gelb (70–90 %) oder rot (> 90 %).

### 7.3 Hitze (dynamisch im Benchmark)

| Kartentyp | Hitze pro gespielter Karte |
|---|---|
| CPU-Karte | Hitze-Wert der CPU (3–8) |
| GPU-Karte | Hitze-Wert der GPU (1–8); ohne dedizierte GPU: iGPU = 1 |
| RAM-Karte | 1 |
| I/O-Karte | 1 (Gen5-SSD: 2) |

- OC: +1 Hitze pro Karte des Typs und pro OC-Stufe. Verbesserung „Effizient“: 0 Hitze.
- **Kühlung** = Kühler + Gehäuse-Airflow + Lüfter + Boni. Wirkt nach jedem Durchlauf.
- Leerlauf: 35 °C · Drosselung: ab 85 °C (Takt × 0,5) · Not-Abschaltung: ab 100 °C.
- Zwischen Benchmarks kühlt der PC immer vollständig ab.
- Synergien belohnen hohe Temperaturen: Stresstest-Suite, Overlay-Monitor, Turbo-Boost der K9. Spieler wählen also zwischen „kühl und sicher“ und „heiß und stark“.

### 7.4 Slots & Lanes

- **Mainboard-Slots:** 1 CPU-Sockel, 2 oder 4 DIMM, PCIe-Slots (x16 / x16 mit nur x4 Anbindung / x1), M.2-Slots, SATA-Ports.
- **Gehäuse:** Lüfterplätze, Radiatorplätze, max. GPU-Länge, max. Kühlerhöhe.
- **PCIe-Lanes:** Verfügbar = CPU-Lanes + Chipsatz-Lanes. Bedarf: GPU 16 (GT 1030: 4, RZ 6600: 8), NVMe 4, Netzwerk-/Soundkarte 1, Capture 4. Die Lanes werden in fester Priorität vergeben: GPU → M.2 → Slots von oben nach unten. Ein Gerät mit weniger Lanes als benötigt läuft **gedrosselt** (halbe L- und Takt-Boni). Ein Gerät ohne Lanes funktioniert nicht. (Bewusste Spielvereinfachung; in der Realität verliert eine GPU an x8 kaum Leistung.)
- **Software-Slots:** Summe der Laufwerkswerte, maximal 8.
- **Werkzeug-Slots:** 2.
- **Lager:** 3 Plätze für gekaufte, nicht verbaute Hardware (z. B. für einen Plattformwechsel über mehrere Shops).

### 7.5 Abgeleitete Werte

| RAM gesamt | 8 GB | 16 GB | 32 GB | 48–64 GB | ≥ 96 GB |
|---|---|---|---|---|---|
| Handgröße | 6 | 7 | 8 | 9 | 10 |

| Laufwerk (schnellstes) | HDD | SATA-SSD | NVMe Gen3/Gen4 | NVMe Gen5 |
|---|---|---|---|---|
| Neu-Prio-Bonus | −1 | ±0 | +1 | +2 |

---

## 8. Kompatibilitätsregeln (POST-Check)

Der Build wird geprüft, wenn der Spieler die Werkbank verlässt. Ungültige Builds sind nicht erlaubt: Das UI verhindert den Start und erklärt den Fehler mit einem **Beep-Code** und einem Klartext.

| # | Regel | Fehlermeldung (Beispiel) |
|---|---|---|
| K1 | CPU-Sockel = Mainboard-Sockel (LGA-12, LGA-17, AMX-4, AMX-5) | „Sockel passt nicht: Die CPU ist AMX-5, das Board ist LGA-17.“ |
| K2 | RAM-Generation = Board-Generation (DDR4 / DDR5) | „Die DDR5-Kerbe sitzt anders. Der Riegel passt nicht in den DDR4-Slot.“ |
| K3 | Anzahl RAM-Riegel ≤ DIMM-Slots (RAM wird als 2er-Kit gekauft) | „Kein freier DIMM-Slot.“ |
| K4 | Mindestens 1 RAM-Kit, 1 CPU, 1 Laufwerk, 1 Netzteil, 1 Kühler | „Kein Bootlaufwerk gefunden.“ |
| K5 | **Bildausgabe:** CPU mit iGPU **oder** dedizierte GPU | „Kein Bild! Diese CPU hat keine Grafikeinheit.“ |
| K6 | Gesamt-TDP ≤ Netzteil-Watt | „Netzteil überlastet: 612 W von 550 W.“ |
| K7 | Board-Formfaktor passt ins Gehäuse (ITX ⊂ mATX ⊂ ATX ⊂ E-ATX) | „ATX-Board passt nicht in ein mATX-Gehäuse.“ |
| K8 | GPU-Länge ≤ Gehäuse-Maximum (S ≤ 170 mm, M ≤ 280 mm, L ≤ 340 mm) | „Die Grafikkarte ist 336 mm lang. Platz ist für 280 mm.“ |
| K9 | Luftkühler-Höhe ≤ Gehäuse-Maximum; AIO braucht einen passenden Radiatorplatz (240/360) | „Der Kühler ist zu hoch. Die Seitenwand geht nicht zu.“ |
| K10 | **Slot-Belegung:** Eine 2-Slot-Karte blockiert den Slot darunter, eine 3-Slot-Karte die zwei Slots darunter | „Der Slot ist von der Grafikkarte verdeckt.“ |
| K11 | NVMe nur in M.2-Slots, SATA-Laufwerke nur an SATA-Ports, Gen5-SSD nur in Gen5-M.2 | „Kein freier M.2-Slot.“ |
| K12 | Lüfter + AIO-Radiatoren ≤ Lüfterplätze (AIO 240 belegt 2, AIO 360 belegt 3) | „Keine freien Lüfterplätze.“ |

**Weiche Regeln (erlaubt, aber mit Nachteil):**
- Lane-Mangel → betroffene Geräte gedrosselt (7.4).
- XMP-RAM auf einem H-Chipsatz → läuft ohne XMP: −2 L und −1 Takt pro RAM-Karte (mindestens 0).
- Zwei RAM-Kits („Vollbestückung“): Die Kapazität wird addiert. Beide Kits laufen mit den Werten des schwächeren Kits, zusätzlich −1 L.
- OC über dem Silizium-Limit → instabil (Kapitel 9).

**Softlock-Schutz:** Der Spieler kann ein Pflichtteil (CPU, Board, RAM, Netzteil, Laufwerk, Kühler, Gehäuse) nur verkaufen, wenn ein kompatibler Ersatz im Lager liegt oder im selben Shop gekauft wird. Der Button „Werkbank verlassen“ ist nur aktiv, wenn der POST-Check grün ist.

---

## 9. Übertakten (BIOS) & Silizium-Lotterie

- **Voraussetzungen:**
  - CPU-OC: CPU mit „X“ im Namen **und** OC-Chipsatz (Intellion: Z; AMX: B oder X).
  - RAM-OC: XMP-Kit und Chipsatz B, Z oder X.
  - GPU-OC: immer möglich (Treiber-Tool).
- **OC-Stufen 0–3** pro Bauteil. Die Einstellung erfolgt im BIOS-Bildschirm, ohne Kosten.

| Bauteil | pro OC-Stufe |
|---|---|
| CPU | +1 Takt global, +1 L pro CPU-Karte, +1 Hitze pro CPU-Karte, +20 % TDP |
| GPU | +3 L pro GPU-Karte, +1 Hitze pro GPU-Karte, +15 % TDP |
| RAM | +1 L pro RAM-Karte (keine Hitze, keine Watt) |

- **Silizium-Lotterie:** Jedes OC-fähige Bauteil hat beim Kauf ein verborgenes **OC-Limit** (1: 30 %, 2: 50 %, 3: 20 %). Über dem Limit ist es **instabil**: Pro Durchlauf gilt eine Chance von 1/4 auf Bluescreen (Durchlauf zählt 0). Nach dem ersten Bluescreen ist das Limit sichtbar.
- **Stabilitätstest** im BIOS: $1, deckt das Limit eines Bauteils auf.

---

## 10. Hardware-Katalog

Spalten: **T** = Tier (T0 Startteil, T1 Budget, T2 Mittelklasse, T3 Oberklasse, T4 Flaggschiff) · **MVP** = im ersten spielbaren Build enthalten. Preise in $. Alle Marken sind Parodien.

**Fiktive Hersteller:** Intellion (CPU, blau) · AMX (CPU, rot) · Veridia (GPU, grün) · Rubeon (GPU, rot) · AsRack, Gigabait, MSY, Azus (Boards) · Kingstorm, G.Skull, Crucible, Corsiar (RAM) · Sansung, Westen Digital, Kingsten, Krakon (Laufwerke) · be loud!, Seesonic (Netzteile) · Noctula, Bärenhoch, Arktik, NXZT (Kühlung) · Phrantex, Fractal Desine (Gehäuse) · Killa, Soundblastor, Elgatto (Karten).

### 10.1 Mainboards (8)

| ID | Name | Sockel | Chipsatz | Form | RAM | DIMM | PCIe-Slots (oben → unten) | M.2 | SATA | Chipsatz-Lanes | TDP | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MB1 | AsRack H410M-Büro | LGA-12 | H (kein OC) | mATX | DDR4 | 2 | x16, x1 | 1 | 4 | 4 | 25 | – | T0 | Startboard | ✔ |
| MB2 | Gigabait B560 Gaming | LGA-12 | B | ATX | DDR4 | 4 | x1, x16, x1, x16(x4) | 2 | 6 | 8 | 30 | 5 | T1 | – | ✔ |
| MB3 | MSY Z790 Tomahock | LGA-17 | Z | ATX | DDR5 | 4 | x16, x1, x16(x4), x1 | 3 (1× Gen5) | 6 | 12 | 35 | 9 | T3 | – | ✔ |
| MB4 | Azus ROC Z790-I Strich | LGA-17 | Z | ITX | DDR5 | 2 | x16 | 2 (1× Gen5) | 2 | 4 | 25 | 10 | T3 | +2 Takt global in ITX-Gehäuse | – |
| MB5 | Gigabait B760M DDR4 | LGA-17 | B | mATX | DDR4 | 4 | x16, x1, x1 | 2 | 4 | 8 | 25 | 5 | T2 | Brückenboard: neue CPU, alter RAM | ✔ |
| MB6 | AsRack B550 Stahllegende | AMX-4 | B | ATX | DDR4 | 4 | x16, x1, x16(x4), x1 | 2 | 6 | 8 | 30 | 5 | T1 | – | – |
| MB7 | MSY B650M Mörtel | AMX-5 | B | mATX | DDR5 | 4 | x16, x1, x16(x4) | 2 | 4 | 8 | 30 | 7 | T2 | – | ✔ |
| MB8 | Azus ROC X670E Gottgleich | AMX-5 | X | E-ATX | DDR5 | 4 | x16, x16(x8), x1, x16(x4) | 4 (2× Gen5) | 8 | 16 | 45 | 15 | T4 | Premium-VRM: +2 Takt global | – |

### 10.2 CPUs (10)

| ID | Name | Sockel | Kerne | Takt global | L/CPU-Karte | Hitze/CPU-Karte | Lanes | iGPU | TDP | OC | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Intellion Celerity G4 | LGA-12 | 4 | +1 | +2 | 3 | 16 | ✔ | 65 | – | – | T0 | Start-CPU | ✔ |
| C2 | Intellion Kern K5-11400 | LGA-12 | 6 | +2 | +4 | 3 | 20 | ✔ | 65 | – | 6 | T1 | – | ✔ |
| C3 | Intellion Kern K7-11700X | LGA-12 | 8 | +3 | +5 | 5 | 20 | ✔ | 125 | ✔ | 10 | T2 | – | ✔ |
| C4 | Intellion Kern K5-13600X | LGA-17 | 6 | +4 | +6 | 4 | 20 | ✔ | 125 | ✔ | 10 | T2 | Effizienzkerne: Die 6. bis 8. Karte eines Durchlaufs erzeugt keine Hitze | ✔ |
| C5 | Intellion Kern K9-14900X | LGA-17 | 8 | +6 | +8 | 8 | 20 | ✔ | 253 | ✔ | 18 | T4 | Turbo-Boost: +1 Takt je 10 °C über 50 °C | ✔ |
| C6 | AMX Zenit 3 4100 | AMX-4 | 4 | +2 | +3 | 3 | 20 | – | 65 | ✔ | 4 | T1 | – | – |
| C7 | AMX Zenit 7 5800X3D | AMX-4 | 8 | +3 | +5 | 4 | 20 | – | 105 | – | 12 | T3 | 3D-Cache: jede RAM-Karte +3 Takt | – |
| C8 | AMX Zenit 5 7600 | AMX-5 | 6 | +3 | +5 | 3 | 24 | ✔ | 65 | ✔ | 8 | T2 | – | ✔ |
| C9 | AMX Zenit 7 7800X3D | AMX-5 | 8 | +4 | +6 | 4 | 24 | ✔ | 120 | – | 15 | T3 | 3D-Cache: jede GPU-Karte +2 Takt | ✔ |
| C10 | AMX Zenit 9 7950X | AMX-5 | 8 | +5 | +8 | 7 | 24 | ✔ | 170 | ✔ | 19 | T4 | Workstation: Profil-Basis-L × 2 | – |

> Hinweis: „Kerne“ ist ein Spielwert (maximal 8), keine echte Kernzahl.

### 10.3 Grafikkarten (6)

| ID | Name | L/GPU-Karte | Takt/GPU-Karte | Hitze/GPU-Karte | Länge | Breite (Slots) | Lanes | TDP | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | Veridia GT 1030 „Bürobrett“ | +3 | 0 | 1 | S | 1 | 4 | 30 | 3 | T1 | – | ✔ |
| G2 | Rubeon RZ 6600 | +6 | +1 | 3 | M | 2 | 8 | 130 | 6 | T1 | Sparsam: Stromrechnung −$1 pro Generation | ✔ |
| G3 | Veridia RTZ 3060 | +7 | +1 | 4 | M | 2 | 16 | 170 | 7 | T2 | DLSZ-fähig | ✔ |
| G4 | Veridia RTZ 4070 | +10 | +2 | 4 | M | 2 | 16 | 200 | 11 | T3 | DLSZ-fähig | ✔ |
| G5 | Rubeon RZ 7900 XTZ | +14 | +2 | 6 | L | 3 | 16 | 355 | 15 | T3 | 24 GB VRAM: Handgröße +1 | ✔ |
| G6 | Veridia RTZ 4090 „Heizkraftwerk“ | +20 | +3 | 8 | L | 3 | 16 | 450 | 22 | T4 | DLSZ-fähig · 12-Pin-Stecker: ohne ATX-3-Netzteil 1/8 Chance je Benchmark, dass der Stecker schmilzt (GPU defekt, Reparatur $5 im Shop) | ✔ |

iGPU (ohne dedizierte GPU): +2 L pro GPU-Karte (Zenit 5/7: +1), 1 Hitze, 0 W extra.

### 10.4 Arbeitsspeicher (7, als 2er-Kits)

| ID | Name | Gen | Kit | L/RAM-Karte | Takt/RAM-Karte | TDP | XMP | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | NoName DDR4-2133 | DDR4 | 2 × 4 GB | +1 | 0 | 6 | – | – | T0 | Start-RAM | ✔ |
| R2 | Kingstorm Wut DDR4-3200 | DDR4 | 2 × 8 GB | +3 | 0 | 6 | – | 4 | T1 | – | ✔ |
| R3 | G.Skull Rippsäge DDR4-3600 | DDR4 | 2 × 16 GB | +4 | +1 | 6 | ✔ | 7 | T2 | – | ✔ |
| R4 | Crucible DDR5-4800 | DDR5 | 2 × 16 GB | +4 | +1 | 8 | – | 6 | T2 | – | ✔ |
| R5 | Kingstorm Biest DDR5-6000 | DDR5 | 2 × 16 GB | +6 | +1 | 8 | ✔ | 9 | T3 | – | ✔ |
| R6 | G.Skull Dreizack Z5 RGB DDR5-6400 | DDR5 | 2 × 32 GB | +7 | +2 | 10 | ✔ | 13 | T4 | RGB | ✔ |
| R7 | Corsiar Domino Platin DDR5-7200 | DDR5 | 2 × 24 GB | +9 | +2 | 10 | ✔ | 15 | T4 | Volle Werte nur auf Z/X; bei Vollbestückung Werte wie R5 | – |

### 10.5 Laufwerke (6)

| ID | Name | Typ | Anschluss | Software-Slots | L/I/O-Karte | Neu-Prio-Bonus | Lanes | TDP | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Kingsten A400 240 GB | SATA-SSD | SATA | 2 | +2 | ±0 | – | 3 | – | T0 | Start-Laufwerk | ✔ |
| S2 | Westen Digital Blau 1 TB | HDD | SATA | 3 | +1 | −1 | – | 7 | 2 | T1 | – | ✔ |
| S3 | Sansung 870 Evo 1 TB | SATA-SSD | SATA | 3 | +3 | ±0 | – | 3 | 4 | T1 | – | ✔ |
| S4 | Crucible P3 1 TB | NVMe Gen3 | M.2 | 3 | +4 | +1 | 4 | 5 | 5 | T2 | – | ✔ |
| S5 | Sansung 990 Pro 2 TB | NVMe Gen4 | M.2 | 4 | +6 | +1 | 4 | 7 | 9 | T3 | – | ✔ |
| S6 | Krakon T700 4 TB | NVMe Gen5 | M.2 Gen5 | 5 | +9 | +2 | 4 | 10 | 14 | T4 | I/O-Karten erzeugen 2 Hitze | – |

### 10.6 Netzteile (5)

| ID | Name | Watt | Effizienz | Strom-Modifikator | ATX-3 | $ | T | MVP |
|---|---|---|---|---|---|---|---|---|
| P1 | Billigböller 400 W | 400 | – | +1 | – | – | T0 | ✔ |
| P2 | be loud! Systemkraft 550 W | 550 | Bronze | 0 | – | 4 | T1 | ✔ |
| P3 | Seesonic Fokus 750 W | 750 | Gold | −1 | – | 7 | T2 | ✔ |
| P4 | Corsiar HX1000 | 1000 | Platin | −2 | ✔ | 11 | T3 | ✔ |
| P5 | be loud! Dunkle Kraft 1600 W | 1600 | Titan | −3 | ✔ | 16 | T4 | – |

### 10.7 CPU-Kühler (6)

| ID | Name | Typ | Kühlung | Höhe / Radiator | TDP | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|
| K1 | Intellion Laminar (Boxed) | Luft | 6 | 60 mm | 2 | – | T0 | Startkühler | ✔ |
| K2 | Bärenhoch Reiner Fels 2 | Tower | 10 | 155 mm | 2 | 3 | T1 | – | ✔ |
| K3 | Noctula NH-D15 „Kackbraun“ | Doppelturm | 15 | 165 mm | 3 | 7 | T2 | +3 Kühlung, wenn kein RGB-Teil verbaut ist | ✔ |
| K4 | Arktik Flüssigfrierer 240 | AIO | 13 | Radiator 240 | 6 | 6 | T2 | belegt 2 Lüfterplätze | ✔ |
| K5 | NXZT Krake 360 LCD | AIO | 18 | Radiator 360 | 8 | 11 | T3 | RGB · LCD-Display: +2 Takt global („Placebo“) · belegt 3 Lüfterplätze | ✔ |
| K6 | Custom-Loop „Aquarium“ | Wasser | 26 | 2 × 360 | 15 | 20 | T4 | GPU-Hitze −2 pro Karte · 1/20 Chance je Benchmark auf ein Leck (Benchmark startet bei 70 °C) | – |

Vereinfachung: Alle Kühler passen auf alle Sockel (Montagekit liegt bei).

### 10.8 Gehäuselüfter (3)

| ID | Name | Kühlung | Effekt | TDP | $ | T | MVP |
|---|---|---|---|---|---|---|---|
| F1 | Standard-Lüfter 120 mm | +1 | – | 2 | 1 | T1 | ✔ |
| F2 | RGB-Lüfter „Regenbogen“ | +1 | RGB · +1 Takt global („RGB bringt FPS“) | 3 | 2 | T1 | ✔ |
| F3 | Industrielüfter 3000 U/min | +3 | Laut: Soundkarte wirkungslos | 4 | 3 | T2 | – |

### 10.9 Gehäuse (5)

| ID | Name | Max. Board | Max. GPU | Max. Kühlerhöhe | Radiator | Lüfterplätze (frei) | Airflow | $ | T | Spezial | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CA1 | Büro-Kiste 2005 | mATX | M | 140 mm | – | 1 (mit F1 belegt) | +1 | – | T0 | Startgehäuse | ✔ |
| CA2 | Schuhkarton ITX | ITX | M | 70 mm | 240 | 2 | 0 | 4 | T2 | Kompakt: +3 Takt global · Hitzestau: Start bei 45 °C | – |
| CA3 | Phrantex Mesh-Midi | ATX | L | 165 mm | 360 | 4 | +3 | 5 | T1 | – | ✔ |
| CA4 | Fractal Desine Glas-Aquarium | ATX | L | 170 mm | 360 | 6 (3 mit F2 belegt, inklusive) | +1 | 9 | T3 | Schaufenster: alle RGB-Boni × 2 | ✔ |
| CA5 | Big Tower „Kühlschrank“ | E-ATX | L | 185 mm | 2 × 360 | 6 | +5 | 10 | T3 | – | – |

### 10.10 Erweiterungskarten (6)

| ID | Name | Slot | Lanes | Effekt | TDP | $ | T | MVP |
|---|---|---|---|---|---|---|---|---|
| E1 | Killa E3100 2,5G-Netzwerkkarte | x1 | 1 | I/O-Karten: +2 Takt | 3 | 4 | T1 | ✔ |
| E2 | Intellion X540 10G-Netzwerkkarte | ≥ x4 | 4 | I/O-Karten: +4 Takt | 10 | 8 | T3 | – |
| E3 | Soundblastor Z | x1 | 1 | Surround: Durchlauf mit genau 5 Karten: +6 Takt | 5 | 5 | T2 | ✔ |
| E4 | Elgatto Capture 4K | ≥ x4 | 4 | Streaming: +$1 je gewerteter GPU-Karte (max. $3 pro Benchmark) | 7 | 6 | T2 | ✔ |
| E5 | WLAN-Karte AX | x1 | 1 | +1 Neu-Prio | 3 | 3 | T1 | – |
| E6 | RAID-Controller | ≥ x8 | 8 | SATA-Laufwerke: L-Boni × 2, +1 Software-Slot | 12 | 9 | T3 | – |

**Summe Hardware:** 62 Teile, davon 46 im MVP.

### 10.11 Starter-PC „Flohmarkt-Büro-PC“

MB1 · C1 · R1 · S1 · P1 · K1 · CA1 (+ F1). TDP ≈ 103 W von 400 W.
Werte: 4 Kerne · Hand 6 · 2 Software-Slots · 3 Neu-Prio · Kühlung 8 (6 + 1 + 1) · Lanes 20 (0 belegt).

---

## 11. Software (Joker-Äquivalent)

Seltenheit: **G** = gewöhnlich (70 %), **S** = selten (25 %), **L** = legendär (5 %, ab Gen 3 bzw. aus dem Software-Bundle).

| ID | Name | Selt. | $ | Effekt | MVP |
|---|---|---|---|---|---|
| SW1 | Task-Mangler | G | 3 | +4 Takt | ✔ |
| SW2 | Kompilierer -O3 | G | 4 | Jede gewertete CPU-Karte: +2 Takt | ✔ |
| SW3 | Fake-Frames (DLSZ) | S | 6 | × 1,5 Takt, wenn mindestens 1 GPU-Karte gewertet wird; × 2 mit DLSZ-fähiger GPU | ✔ |
| SW4 | RAM-Disk | G | 4 | RAM-Karten lösen zusätzlich die I/O-Boni aus | ✔ |
| SW5 | FanKurve | G | 3 | +4 Kühlung | ✔ |
| SW6 | Stresstest-Suite | S | 6 | × 2 Takt, wenn die Temperatur nach dem Hitze-Schritt ≥ 70 °C ist | ✔ |
| SW7 | Nachbrenner | S | 5 | OC-Boni × 2, OC-Hitze × 2 | ✔ |
| SW8 | Regenbogen-Sync | G | 4 | +2 Takt je verbautem RGB-Teil | ✔ |
| SW9 | Pinguin-OS | S | 5 | Belegt keinen Slot. +3 Takt je freiem Software-Slot | ✔ |
| SW10 | Zwangs-Update 11 | G | 4 | Startet mit +2 Takt, +1 Takt nach jedem Benchmark (dauerhaft). 1/5 Chance je Benchmark: Neustart, der 1. Durchlauf entfällt | ✔ |
| SW11 | Krypto-Schürfer | G | 4 | +$2 nach jedem Benchmark · GPU-Karten erzeugen +2 Hitze | ✔ |
| SW12 | Shader-Cache | S | 6 | Zähler +1 je gewerteter GPU-Karte (dauerhaft); gibt +L in Höhe des Zählers | ✔ |
| SW13 | Treiber-Fuchs | S | 5 | Treiber-Updates geben +2 Stufen statt +1 | – |
| SW14 | Antivirus Plus Pro | G | 3 | −1 Takt · blockiert „Malware“-Bosse (Zwangs-Update, Lösegeld.exe) | – |
| SW15 | Overlay-Monitor | G | 4 | +L in Höhe der aktuellen Temperatur (°C) | ✔ |
| SW16 | Undervolt-Skript | S | 5 | Alle Hitzewerte −1 (min. 0) · TDP von CPU und GPU −20 % · kein OC möglich | ✔ |
| SW17 | Benchmark-Cheat.exe | L | 10 | × 3 Takt · 1/4 Chance je Benchmark: Der Cheat wird erkannt, die Belohnung ist $0 | – |
| SW18 | KI-Upscaler | L | 10 | Karten mit Stufe ≤ 4 zählen für die L-Wertung als Stufe 10 | – |
| SW19 | Defragmentierer | G | 3 | Pipeline und Optimierte Pipeline: +40 L | ✔ |
| SW20 | Dual-Boot | L | 9 | Kopiert den Effekt der Software rechts daneben | – |

20 Software-Titel, davon 15 im MVP.

---

## 12. Treiber, Werkzeuge, Verbesserungen, Booster

### 12.1 Treiber-Updates (10)
Je ein Treiber pro Profil (Kapitel 6.1, letzte Spalte). Name z. B. „Pipeline-Treiber v2.1“. Wirkung sofort und dauerhaft: Das Profil steigt um 1 Stufe. Preis $3.

### 12.2 Werkzeuge (10, max. 2 im Werkzeugkasten)

| ID | Name | $ | Effekt | MVP |
|---|---|---|---|---|
| T1 | Wärmeleitpaste | 3 | Dauerhaft +2 Kühlung (max. 3× pro Run) | ✔ |
| T2 | Lötkolben | 3 | Bis zu 2 gewählte Karten erhalten einen Typ deiner Wahl | ✔ |
| T3 | Druckluftspray | 3 | Temperatur sofort −25 °C (nur im Benchmark) | ✔ |
| T4 | Format C: | 3 | Bis zu 2 gewählte Karten zerstören (Deck ausdünnen) | ✔ |
| T5 | Kopierschutz-Knacker | 3 | 1 gewählte Karte duplizieren | ✔ |
| T6 | Kabelbinder | 2 | Dauerhaft +1 Kühlung und +1 Lüfterplatz (max. 1× pro Run) | – |
| T7 | BIOS-Mod | 5 | 1 Bauteil: OC-Sperre aufheben (ignoriert den Chipsatz) | – |
| T8 | OC-Kit | 3 | Bis zu 2 Karten erhalten „Übertaktet“ | ✔ |
| T9 | Wärmeleitpad | 3 | Bis zu 2 Karten erhalten „Effizient“ | ✔ |
| T10 | Silizium-Lotterie-Los | 4 | OC-Limit eines Bauteils neu würfeln | – |

Werkzeuge, die Karten brauchen, wirken im Benchmark auf Handkarten. Im Shop zieht das Spiel dafür 6 Karten aus dem Deck.

### 12.3 Karten-Verbesserungen

| Name | Effekt | Quelle | MVP |
|---|---|---|---|
| Übertaktet | +3 Takt beim Werten, +1 Hitze | OC-Kit, Workload-Paket | ✔ |
| Optimiert | +20 L | Workload-Paket | ✔ |
| Effizient | 0 Hitze, +5 L | Wärmeleitpad, Workload-Paket | ✔ |
| Instabil | × 2 Takt beim Werten; danach 1/4 Chance, dass die Karte zerstört wird („Bluescreen“) | Workload-Paket | ✔ |
| Krypto | +$1 beim Werten | später | – |
| Cache-Hit | Die Karte wird 2× gewertet | später | – |

### 12.4 Booster-Pakete

| Paket | $ | Inhalt |
|---|---|---|
| Workload-Paket | 4 | 3 Karten zeigen, 1 ins Deck legen (30 % Chance auf Verbesserung pro Karte) |
| Treiber-Paket | 4 | 3 Treiber zeigen, 1 wählen |
| Werkzeugkoffer | 4 | 3 Werkzeuge zeigen, 1 wählen |
| Software-Bundle | 6 | 2 Software-Titel zeigen, 1 wählen (höhere Chance auf S/L) |

---

## 13. Workload-Deck

**Startdeck:** 40 Karten = 4 Typen × Stufen 1–10, jede Kombination einmal.

| Typ | Farbe | Symbol | Wird verstärkt durch |
|---|---|---|---|
| CPU | Blau | Chip | CPU |
| GPU | Grün | Lüfter | GPU / iGPU |
| RAM | Gelb | Riegel | RAM-Kit |
| I/O | Violett | Stecker | Laufwerke, Netzwerk-, Sound- und Capture-Karte |

Typen unterscheiden sich **immer auch über das Symbol**, nicht nur über die Farbe (Farbenblindheit).

**Kartennamen (Flavor, nur Daten, keine eigene Grafik):**

| Stufe | CPU | GPU | RAM | I/O |
|---|---|---|---|---|
| 1 | Taschenrechner | Desktop zeichnen | Notizblock | Tastendruck |
| 2 | Tabellenkalkulation | Videoplayer | Cache-Abruf | Mausklick |
| 3 | Archiv entpacken | Indie-Spiel | Browser-Cache | USB-Stick |
| 4 | 80 Browser-Tabs | 2D-Partikel | Texturpool | Spielstand speichern |
| 5 | Code kompilieren | Schatten | Datenbank-Index | Patch laden |
| 6 | Physik-Simulation | Texturen | VM starten | Voice-Chat |
| 7 | KI-Gegner | Kantenglättung | Level laden | Download |
| 8 | Video-Encoding | Raytracing | Riesentabelle | Streaming |
| 9 | Shader kompilieren | Pfadverfolgung | RAM-Disk | Backup |
| 10 | Wettermodell | 8K-Rendering | Speicherleck | Day-One-Patch (150 GB) |

---

## 14. Shop & Ökonomie

### 14.1 Aufbau „Computerladen“

| Bereich | Plätze | Inhalt |
|---|---|---|
| Hardware-Regal | 2 | Hardware nach Tier-Gewichtung (14.2). **Mindestens 1 Angebot passt zum aktuellen Build** („Smart-Shop“). |
| Software-Regal | 1 | Software (70 %) oder Treiber/Werkzeug (30 %) |
| Angebote | 2 | Booster-Pakete |
| Reparatur | situativ | Defekte Teile reparieren (z. B. geschmolzener 12-Pin-Stecker, $5) |

- **Neu würfeln:** $2, danach +$1 pro weiterem Würfeln im selben Shop. Würfelt beide Regale neu.
- **Kaufen** legt Hardware ins Lager. **„Kaufen & einbauen“** öffnet direkt die Werkbank mit markierten Slots.
- Jedes Hardware-Angebot zeigt ein **Kompatibilitäts-Badge**: ✔ passt · ⚠ passt mit Nachteil (Lanes, XMP, Slot verdeckt) · ✖ braucht anderes Board/Gehäuse/Netzteil (mit Grund).
- **Verkaufen:** jederzeit im Shop bzw. in der Werkbank, für die Hälfte des Preises.

### 14.2 Tier-Gewichtung des Hardware-Regals

| Generation | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| 1 | 70 % | 30 % | – | – |
| 2 | 50 % | 40 % | 10 % | – |
| 3 | 30 % | 45 % | 20 % | 5 % |
| 4 | 15 % | 40 % | 30 % | 15 % |
| ≥ 5 | 10 % | 30 % | 35 % | 25 % |

### 14.3 Ökonomie-Richtwerte

- Einnahmen pro Generation (früh): ca. $15–20 inklusive Zinsen; spät: $20–30.
- Die Stromrechnung bremst Monster-Builds: Ein 4090-Build mit 900 W kostet $7–9 pro Generation (je nach Netzteil). Ein effizientes Netzteil lohnt sich also.
- Ziel-Gefühl: **ein großes oder zwei kleine Upgrades pro Generation.** Ein Plattformwechsel (Board + CPU + RAM, ca. $25–35) braucht 1–2 Generationen Sparen. Dafür gibt es das Lager.

---

## 15. Progression & Schwierigkeit

### 15.1 Formel für die Score-Ziele

```
Basis(g) = 300 × 2,2^(g−1)                         für g ≤ 8
Basis(g) = Basis(g−1) × (2,2 + 0,4 × (g − 8))      für g > 8   (Wachstum beschleunigt sich)

Ziel = Basis(g) × Faktor      Office-Test 1,0 · Gaming-Test 1,5 · Boss 2,0 (Finale 3,0)
Anzeige gerundet auf 2 signifikante Stellen
```

| Gen | Office | Gaming | Boss |
|---|---|---|---|
| 1 | 300 | 450 | 600 |
| 2 | 660 | 990 | 1.300 |
| 3 | 1.500 | 2.200 | 2.900 |
| 4 | 3.200 | 4.800 | 6.400 |
| 5 | 7.000 | 11.000 | 14.000 |
| 6 | 15.000 | 23.000 | 31.000 |
| 7 | 34.000 | 51.000 | 68.000 |
| 8 | 75.000 | 110.000 | 220.000 (Finale × 3) |
| 9 | 190.000 | 290.000 | 390.000 |
| 10 | 580.000 | 880.000 | 1,2 Mio. |
| 11 | 2,0 Mio. | 3,0 Mio. | 4,0 Mio. |
| 12 | 7,5 Mio. | 11 Mio. | 15 Mio. |
| 13 | 32 Mio. | 48 Mio. | 63 Mio. |
| 14 | 150 Mio. | 220 Mio. | 290 Mio. |

Bis Gen 8 wächst das Ziel um × 2,2 pro Generation. Danach steigt der Faktor jede Generation um 0,4. Kein Build kann dauerhaft mithalten: Der Endlos-Modus endet garantiert, typischerweise zwischen Gen 10 und Gen 14.

### 15.2 Zielkurve für das Balancing

- Gen 1–2: Der Starter-PC plus 1–2 Upgrades reicht.
- Gen 3–4: Die erste 6-Kern-CPU und eine dedizierte GPU sind nötig.
- Gen 5–7: Plattformwechsel oder 2–3 starke Software-Synergien, erste ×-Takt-Effekte.
- Gen 8+: Nur Builds mit mehreren ×-Takt-Quellen, Treiber-Stufen und OC skalieren mit.
- **Telemetrie im Prototyp:** Score pro Durchlauf je Gen, Todesursache (Ziel/Hitze/Bluescreen), Kaufquote je Teil.

---

## 16. Benchmarks & Bosse

- **Office-Test** (× 1,0) und **Gaming-Test** (× 1,5): keine Sonderregel.
- **Boss-Benchmark** (× 2,0): zufällig aus allen Bossen mit „ab Gen“ ≤ g; kein Boss doppelt pro Run, solange Alternativen existieren.
- **Finale** jede 8. Generation (8, 16, 24 …).

| ID | Boss | Effekt | Ziel | ab Gen | MVP |
|---|---|---|---|---|---|
| B1 | **Krysis** („Aber kann es Krysis?“) | Nur GPU-Karten lösen Hardware-Boni aus | × 2 | 1 | ✔ |
| B2 | **Prime96-Stresstest** | Alle Hitze × 2 | × 2 | 2 | ✔ |
| B3 | **Kinobank R99 Multi-Core** | Jeder Durchlauf muss so viele Karten wie Kerne enthalten (bzw. alle Handkarten) | × 2 | 1 | ✔ |
| B4 | **MemTest 68** | Handgröße −2 | × 2 | 1 | ✔ |
| B5 | **Zeitspion** (3DMurks) | −1 Durchlauf, −1 Neu-Prio | × 2 | 1 | ✔ |
| B6 | **Fellmark Burn-In** | GPU-Hitze × 3 (auch iGPU) | × 2 | 2 | ✔ |
| B7 | **Hitzewelle** | Start bei 60 °C, Kühlung −25 % | × 2 | 3 | ✔ |
| B8 | **Brownout** | Das Netzteil liefert nur 60 %: Teile mit der höchsten TDP werden abgeschaltet, bis es passt. Abgeschaltete Teile geben keine Boni (die CPU wird stattdessen auf Takt × 0,5 gedrosselt) | × 2 | 3 | ✔ |
| B9 | **Zwangs-Update** | Die Software ganz links ist deaktiviert | × 2 | 2 | – |
| B10 | **Lösegeld.exe** | Jede Neu-Priorisierung kostet $1 | × 2 | 2 | – |
| B11 | **Shader-Kompilierung** | Die erste Karte jedes Durchlaufs wird nicht gewertet (zählt auch nicht für das Profil) | × 2 | 2 | ✔ |
| B12 | **Ping 999** | I/O-Karten werden verdeckt gezogen | × 2 | 3 | – |
| B13 | **Treiber-Rollback** | Alle Profile zählen als Stufe 1 | × 2 | 4 | – |
| F1 | **Cyberpunk 2088 – Pfadverfolgung** (Finale) | Durchläufe ohne GPU-Karte zählen 0 · Hitze × 1,5 | × 3 | 8 | ✔ |
| F2 | **Folding@Zuhause-Marathon** (Finale) | 8 Durchläufe, keine Neu-Prio, Kühlung halbiert | × 4 | 16 | – |
| F3 | **Y2K38** (Finale) | Ein Durchlauf über 2.147.483.647 Punkte wird negativ (32-Bit-Überlauf) | × 3 | 24 | – |

MVP: 9 Bosse + 1 Finale.

---

## 17. Meta-Progression (knapp, nach dem MVP)

- **Keine dauerhaften Stat-Boni.** Freischaltungen erweitern nur die Vielfalt.
- **Starter-PCs** (per Erfolg freischaltbar):
  - Flohmarkt-Büro-PC (Standard)
  - Gebrauchter Gaming-PC: GTX-artige GPU, schwache CPU, $0
  - Workstation: 8 Kerne, keine GPU, 1 HDD
  - Retro-Kiste: AMX-4-Plattform, „Pinguin-OS“ vorinstalliert
- **Teile-Pool:** Erfolge schalten Teile frei, z. B. „Erreiche Gen 5 mit einer AMX-CPU“ → Zenit 9 im Pool.
- **Garantie-Stufen** (Schwierigkeit, 8 Stufen, kumulativ). Beispiele: Office-Test ohne Geld · Ziele × 1,25 · Stromrechnung × 2 · nur 1 Lagerplatz · Shop-Preise +$1 …
- **Hardware-Katalog** (Kompendium) mit allen gesehenen Teilen und Bestwerten.
- **Tägliche Seed-Challenge** (später, lokal oder mit Online-Bestenliste).

---

## 18. UI, Screens & Layout

### 18.1 Technische Bildvorgaben (für three.js)

- **Virtuelle Auflösung (Layout-Raster):**
  - **Hochformat:** Breite 360–400 px, Höhe 640–900 px (adaptiv).
  - **Querformat:** Breite 640–720 px, Höhe 360–400 px.
  - Der Skalierungsfaktor *s* ist meist 2–4 und muss nicht ganzzahlig sein (HD-Look mit linearer Filterung, siehe assets.md 1.4). Er wird so gewählt, dass die virtuelle Breite im Zielbereich liegt. Beispiele: iPhone 1170 × 2532 → s = 3 → 390 × 844 · Desktop 1920 × 1080 → s = 3 → 640 × 360 · 2560 × 1440 → s = 4 → 640 × 360 · 1366 × 768 → s = 2 → 683 × 384.
  - Wenn es nicht exakt passt: Rest als Letterbox mit Hintergrund-Kachel.
- **Render-Pipeline:** Szene direkt in Canvas-Auflösung rendern (Layout in virtuellen Pixeln, Faktor *s*). Texturen: HD-Atlas (WebP, `hd-scale` 4), `LinearFilter`, keine Mipmaps, sRGB. Sprite-Positionen auf Gerätepixel runden; ganzzahlige Skalierung ist nicht nötig.
- **Kamera:** `OrthographicCamera` mit 1 Einheit = 1 virtueller Pixel, Ursprung unten links.
- **Sprites:** Texture-Atlanten (WebP, HD-Frames = Zelle × 4, 2 px Padding mit Extrusion). Gleichartige Objekte (Karten, Partikel, Text) als `InstancedMesh` bzw. gebatcht. Ziel: < 50 Draw Calls, 60 fps auf Mittelklasse-Handys.
- **Text:** Bitmap-Fonts (siehe assets.md) als Quads. Texte sind nie in Sprites eingebacken (Lokalisierung).
- **Shader-Effekte:** Palette-Swap (Markenfarben, Board-Farben; Schlüsselfarben per Toleranz bzw. Farbton-Maske erkannt), RGB-Farbzyklus, Hitzeflimmern (nur Hintergrund, ab 70 °C), optionaler CRT-Filter, Glitch für den Bluescreen.
- **Karten-Wackeln:** max. ±4°, über Vertex-Shader (Position auf Gerätepixel gerundet). Sonst keine freie Rotation.
- **Input:** Pointer-Events → Umrechnung in virtuelle Koordinaten → Hit-Test über Rechtecke (kein Raycasting nötig). Touch-Ziele mindestens **44 × 44 virtuelle px**. Kleine Icons erhalten vergrößerte Trefferflächen.
- **Layout-System:** Anker-basiert (oben/unten/Mitte). Es gibt 2 Layout-Definitionen (Hoch/Quer). Umschalten bei `resize`/`orientationchange`. Zusätzliche Höhe geht immer in die Spielfläche. Safe-Area-Insets (Notch) werden beachtet.
- **Daten:** Alle Teile, Software, Bosse und Profile sind datengetrieben (JSON/TS-Daten). Effekte nutzen ein Hook-System: `onBenchmarkStart`, `onHeatStep`, `onCardScored`, `onHardwareGlobal`, `onSoftwareGlobal`, `onPlayEnd`, `onBenchmarkEnd`, `onShopEnter`.
- **Zufall:** Seed-basierter RNG (Seed auf dem Game-Over-Bildschirm). Autosave in `localStorage` bei jedem Bildschirmwechsel.

### 18.2 Bildschirm-Übersicht

| # | Screen | Zweck | MVP |
|---|---|---|---|
| 1 | Titel | Start, Fortsetzen, Einstellungen | ✔ |
| 2 | Run-Start | Starter-PC und Garantie-Stufe wählen | später (MVP: direkt starten) |
| 3 | Benchmark-Auswahl | 3 Benchmarks der Generation, Boss-Regel, Belohnung | ✔ |
| 4 | **Benchmark (Spiel)** | Kartenspiel | ✔ |
| 5 | Kassenbon | Belohnung, Zinsen, Stromrechnung | ✔ |
| 6 | **Computerladen (Shop)** | Kaufen, Verkaufen, Packs öffnen | ✔ |
| 7 | **Werkbank** | Bauteile einbauen, Stats, POST-Check | ✔ |
| 8 | BIOS | Übertakten, Stabilitätstest | ✔ |
| 9 | Deck-Ansicht | Alle Karten, Ablage, Verbesserungen | ✔ |
| 10 | Game Over (Bluescreen) | Statistik, Seed, Neustart | ✔ |
| 11 | Pause/Einstellungen | Lautstärke, Tempo (1×/2×/4×), Score-Vorschau, Screenshake, CRT, Linkshänder-Modus | ✔ |
| 12 | Hardware-Katalog | Kompendium | später |

### 18.3 Benchmark-Screen – Hochformat (Basis 360 × 640)

```
y   ┌────────────────────────────────────┐
0   │[Boss]  GEN 3 · GAMING-TEST    [II] │  Topbar 40 px
    │ Ziel 2.200 ▓▓▓▓▓▓░░░ 1.340    $12  │
40  ├────────────────────────────────────┤
    │ ▶3  ↻2   [██████░░░░] 62°C  ⚡382W │  Status 24 px (Thermometer horizontal)
64  ├────────────────────────────────────┤
    │ [SW][SW][SW][SW][ ][ ]    [T1][T2] │  Software-Leiste 36×36 + Werkzeuge 28×28
108 ├────────────────────────────────────┤
    │        PIPELINE  Lv.2              │  Profil + Wertung
    │    [ 154  L ]  ×  [ 60 Takt ]      │  Boxen 56×24, große Ziffern
164 ├────────────────────────────────────┤
    │  [CPU][GPU][RAM][SSD][NIC]         │  Bauteil-Leiste 32×32 (leuchtet bei Trigger)
200 ├────────────────────────────────────┤
    │                                    │
    │       gespielte Karten 48×64       │  Spielfläche (+ alle Mehrhöhe)
    │       (Wertungsanimation)          │
380 ├────────────────────────────────────┤
    │  Hitze-Vorschau: +20°C → 82°C  ⚠   │
    │  ╭──╮╭──╮╭──╮╭──╮╭──╮╭──╮╭──╮╭──╮  │  Hand: Fächer, ab 8 Karten überlappend,
    │  │7 ││5 ││5 ││9 ││2 ││8 ││6 ││1 │  │  gewählte Karte +12 px nach oben
    │  ╰──╯╰──╯╰──╯╰──╯╰──╯╰──╯╰──╯╰──╯  │  [Deck 32] unten rechts
580 ├────────────────────────────────────┤
    │ [↻ NEU-PRIO 2] [⇅] [▶ AUSFÜHREN 3] │  Buttons 44 px hoch
640 └────────────────────────────────────┘
```

- Tippen = Karte wählen/abwählen · Halten = vergrößerte Ansicht + Tooltip · Ziehen = Reihenfolge ändern.
- Ab 9 Karten auf der Hand: zwei Reihen, damit jede Karte ≥ 36 px Trefferbreite hat.
- Tippen auf ein Software- oder Bauteil-Icon öffnet ein Bottom-Sheet mit Details.
- Linkshänder-Modus spiegelt die Buttonleiste.

### 18.4 Benchmark-Screen – Querformat (Basis 640 × 360)

```
┌──────────────┬───────────────────────────────────────────┬──────────┐
│ [Boss-Chip]  │ [SW][SW][SW][SW][SW][  ][  ][  ]  48×64   │ [T1][T2] │ 0–72
│ GEN 3        ├───────────────────────────────────────────┤          │
│ GAMING-TEST  │  [CPU][GPU][RAM][SSD][NIC]  Bauteil-Leiste│  Thermo- │
│ Ziel  2.200  │                                           │  meter   │
│ Score 1.340  │         gespielte Karten / Wertung        │  16×96   │ 72–200
│ ──────────── │                                           │  62°C    │
│ PIPELINE L2  │                                           │          │
│ [154]×[60]   ├───────────────────────────────────────────┤  ⚡382W  │
│ ▶3   ↻2      │  Hitze-Vorschau +20°C → 82°C              │          │
│ $12          │  Hand: bis 10 × 48 px, leicht überlappend │ [Deck]   │ 200–360
│ [Deck][Opt.] │  [↻ NEU-PRIO]              [▶ AUSFÜHREN]  │          │
└──────────────┴───────────────────────────────────────────┴──────────┘
   0–150                    150–560                          560–640
```

Desktop: Hover = Tooltip, Tastatur: 1–9/0 Karte wählen, Leertaste = Ausführen, D = Neu-Prio, S = Sortieren.

### 18.5 Computerladen – Hochformat

```
┌────────────────────────────────────┐
│ COMPUTERLADEN  GEN 3      $ 23     │
│ [Lager 2/3]  [Werkbank]            │
├────────────────────────────────────┤
│ HARDWARE                           │
│  ╭────╮ $11 ✔      ╭────╮ $9  ✖    │  Hardware-Karten 48×64
│  │4070│ RTZ 4070   │Z790│ braucht  │  + Kurzinfo daneben
│  ╰────╯ +10L +2T   ╰────╯ DDR5     │
├────────────────────────────────────┤
│ SOFTWARE          ANGEBOTE         │
│  ╭────╮ $6        ╭───╮ ╭───╮      │  Booster 40×56
│  │ FF │           │PKG│ │PKG│      │
│  ╰────╯           ╰───╯ ╰───╯      │
├────────────────────────────────────┤
│ Dein Build: 6 Kerne · Hand 8 ·     │  Mini-Status
│ 412/550 W · Kühlung 16 · SW 3/4    │
├────────────────────────────────────┤
│ [⟳ NEU WÜRFELN $2]   [WEITER ▶]    │  44 px
└────────────────────────────────────┘
```

Tippen auf ein Angebot öffnet ein Bottom-Sheet: alle Werte, Vergleich mit dem verbauten Teil (grün/rot), Kompatibilitätsgrund, Buttons [Kaufen] und [Kaufen & einbauen].

### 18.6 Werkbank – Hochformat

```
┌────────────────────────────────────┐
│ ⚡[██████░░] 412/550W  ❄16  🔀20/24 │  Stats: Watt, Kühlung, Lanes
│ Kerne 6 · Hand 8 · SW 3 · ↻4       │
├────────────────────────────────────┤
│  ┌──────── Gehäuse (Innen) ──────┐ │
│  │ ┌──── Mainboard ────┐ [Lüfter]│ │  Gehäuse 260×320, Board 160×200
│  │ │ [CPU+Kühler] ║║║║ │         │ │  DIMM-Slots rechts vom Sockel
│  │ │ ═══ PCIe x16 ════ │         │ │  GPU „aufgeklappt“, verdeckt Slots
│  │ │ ─ x1    ═ M.2 ═   │ [HDD]   │ │
│  │ └───────────────────┘         │ │
│  │ [ Netzteil ]                  │ │
│  └───────────────────────────────┘ │
├────────────────────────────────────┤
│ LAGER  [▢][▢][▢]   [Verkaufen]     │
├────────────────────────────────────┤
│ [BIOS] [DECK]        [POST ▶]      │
└────────────────────────────────────┘
```

- **Einbauen per Touch:** Tippen auf ein Lagerteil → Gültige Slots pulsieren grün, ungültige werden rot mit Grund. Gleichzeitig erscheint eine **Slot-Liste als Buttons** („PCIe x16 #1“, „PCIe x1 #2 – verdeckt“), denn die echten Slots sind auf dem Handy zu klein zum Antippen. Auf Desktop zusätzlich Drag & Drop.
- **Zoom:** Doppeltippen zoomt das Board auf Faktor 2 (ganzzahlig).
- **POST ▶:** Animation mit Debug-LEDs (CPU/DRAM/VGA/BOOT) und Beep. Bei einem Fehler leuchtet die passende LED, dazu kommt der Klartext aus Kapitel 8.

### 18.7 Weitere Screens (Kurzbeschreibung)

- **Benchmark-Auswahl:** 3 Chips untereinander (Hochformat) bzw. nebeneinander (Querformat): Name, Ziel, Belohnung, Boss-Regel. Erledigte Benchmarks sind abgehakt.
- **Kassenbon:** Belohnung als Thermopapier-Bon, Zeile für Zeile animiert (Belohnung, ungenutzte Durchläufe, Zinsen, Stromrechnung, Summe).
- **BIOS:** Retro-BIOS-Optik (Blau/Grau). Liste der OC-fähigen Teile mit ◄ Stufe ►, Live-Vorschau (L/Takt/Hitze/Watt), Silizium-Limit (? oder Zahl), Button „Stabilitätstest $1“.
- **Deck-Ansicht:** Raster 4 Spalten (Typen) × 10 Zeilen (Stufen), gezogene Karten abgedunkelt.
- **Game Over:** Bluescreen-Parodie „:( Dein PC ist auf ein Problem gestoßen …“ mit Fehlercode (z. B. `BENCHMARK_TARGET_NOT_MET`), Statistik, Seed und [Neuer Run].

### 18.8 Audio (Kurzvorgabe)
Chiptune-Soundtrack. SFX: POST-Beep, Lüfter-Rauschen (Lautstärke steigt mit der Temperatur, das ist wichtiges Feedback), HDD-Klackern, Kassen-Klingeln, Wertungs-„Ticks“ mit steigender Tonhöhe, Bluescreen-Brummen.

---

## 19. MVP-Scope vs. später

### MVP (erster vollständig spielbarer Run, endlos)
- Komplette Benchmark-Logik: 10 Profile, Wertung, Hitze, Throttling, Not-Abschaltung, Bluescreen bei instabilem OC.
- 46 Hardware-Teile, 4 Sockel-Plattformen davon 3 aktiv (LGA-12, LGA-17, AMX-5), alle Kompatibilitätsregeln K1–K12, Lanes, Slot-Verdeckung.
- 15 Software, 10 Treiber, 7 Werkzeuge, 4 Verbesserungen, 4 Booster.
- Shop mit Smart-Shop-Regel, Lager, Verkauf, Neu würfeln, Stromrechnung, Zinsen.
- BIOS mit OC und Silizium-Lotterie.
- 9 Bosse + 1 Finale, Endlos-Formel.
- Screens 1, 3–11; Hoch- und Querformat; Touch und Maus.
- 1 Starter-PC, keine Meta-Progression, lokale Bestenliste (höchste Gen).
- Autosave, Seed.

### Später
- Restliche 16 Hardware-Teile (AMX-4-Plattform, ITX, E-ATX, Custom-Loop, Gen5-SSD …), 5 Software, 3 Werkzeuge, 4 Bosse + 2 Finale.
- Meta-Progression (Starter-PCs, Garantie-Stufen, Freischaltungen, Katalog).
- Benchmarks überspringen (mit Belohnungs-Gutscheinen), Gutscheine/Ladenumbauten (Balatro-Voucher-Äquivalent), Gebrauchtmarkt mit versteckten Defekten.
- Multi-GPU („SLI-Brücke“ als Witz-Mechanik), Kabelmanagement als Kosmetik oder Bonus.
- Tägliche Challenge mit Online-Bestenliste, PWA/Offline, Englisch-Lokalisierung.
- Animierte Boss-Porträts, Karten-Illustrationen pro Stufe.

### Vorschlag für Umsetzungs-Meilensteine
1. **M1 Wertungs-Prototyp:** Deck, Hand, Profile, Score-Formel, Platzhalter-Grafik, feste Hardware.
2. **M2 Build-System:** Datenmodell der Hardware, Kompatibilität, Werkbank (UI zunächst als Liste), POST.
3. **M3 Loop:** Benchmarks, Shop, Geld, Endlos-Formel, Bosse, Game Over.
4. **M4 Risiko:** Hitze, OC/BIOS, Silizium-Lotterie, Watt-Events.
5. **M5 Präsentation:** Pixel-Art, Animationen, Mobile-Layout, Audio, Autosave.

---

## 20. Offene Fragen an den Auftraggeber

> **Entscheidungen des Auftraggebers:**
> - Marken: erkennbare Parodie-Namen (Frage 1).
> - Regeln wie im Entwurf: alle gespielten Karten zählen, Watt ist eine harte Grenze, Zufallsrisiken wie geplant (Fragen 2–4).
> - Format: Hochformat (Handy) und Querformat (Desktop) gleichzeitig (Frage 6).
> - Pixel-Art: liefert der Auftraggeber. **Keine Implementierung, bis die Assets geliefert sind** (Frage 9).
> - Noch offen: Fragen 5, 7, 8, 10, 11.

1. **Marken-Parodien:** Sind leicht erkennbare Parodie-Namen (Intellion, Veridia, Rubeon, Azus …) gewünscht, oder sollen die Namen komplett frei erfunden sein? Eine rechtliche Prüfung wird empfohlen.
2. **Wertungsregel:** Sollen *alle* gespielten Karten zählen (aktueller Entwurf; macht Kerne wertvoll und Hitze relevant), oder wie bei Balatro nur die Karten des Profils?
3. **Watt als harte Grenze:** POST verweigert den Start (aktuell). Alternative: Überlast erlaubt, mit Absturzrisiko pro Durchlauf.
4. **Zufallsrisiken:** Wie viel Pech ist ok? (Schmelzender Stecker, Silizium-Lotterie, Bluescreens, Zwangs-Update.)
5. **Endlos ohne Sieg:** Reicht der Meilenstein bei Gen 8, oder soll es ein klares „Gewonnen, weiterspielen?“ geben?
6. **Primäres Format:** Hochformat-Handy zuerst oder Desktop zuerst? Das bestimmt die Reihenfolge der Layout-Arbeit.
7. **Realismus vs. Lesbarkeit:** Sind die Vereinfachungen ok (Kerne max. 8, Lane-Drosselung halbiert Boni, alle Kühler passen auf alle Sockel)?
8. **Sprache:** Nur Deutsch, oder von Anfang an Deutsch + Englisch (betrifft Fonts und Textlängen)?
9. **Grafik-Produktion:** Wer erstellt die Pixel-Art? Dürfen freie Fonts (z. B. m5x7/m6x11, Lizenz prüfen) und eine eigene oder freie Palette genutzt werden?
10. **Meta-Progression und Monetarisierung:** Reine Web-Version ohne Accounts? Online-Bestenliste gewünscht?
11. **Währung:** „$“ (Balatro-Gefühl) oder „€“/eigene Währung (z. B. „Credits“)?

---

## Anhang A: Glossar

| Begriff im Spiel | Bedeutung |
|---|---|
| Durchlauf | Eine gespielte Kartenauswahl („Hand spielen“) |
| Neu priorisieren | Karten abwerfen und nachziehen |
| Leistung (L) | Additiver Basiswert („Chips“) |
| Takt | Multiplikator („Mult“) |
| Profil | Kombination der gespielten Karten („Pokerhand“) |
| Generation | Stufe aus 3 Benchmarks („Ante“) |
| POST | Kompatibilitätsprüfung beim Verlassen der Werkbank |
| Throttling | Drosselung ab 85 °C: Takt × 0,5 |
| Not-Abschaltung | Ab 100 °C: Der Benchmark endet |
