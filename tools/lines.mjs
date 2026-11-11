// lines.mjs – erkennt gerade, durchgehende Trennlinien an/nahe den Zellgrenzen eines Sheets und macht sie zu Hintergrund.
// Eingabe: bgLike (1 = Hintergrundfarbe), Funktion lab(i) -> [L,a,b]; Linien liegen im Fenster ±win um jede Zellgrenze (und die Bildränder).
// Ein Linienpixel ist ein Nicht-Hintergrundpixel, dessen beide Seiten (±side px quer zur Linie) Hintergrund sind.
// Eine Spalte/Zeile gilt als Linie, wenn >= minCover der Länge so ein Pixel ist. Zusammenhängende Spalten/Zeilen = eine Linie (Dicke).
// Gelöscht wird das Band der Linie (+1 px Saum) in den Linienzeilen sowie überall dort im Band, wo die Farbe der Linienfarbe gleicht.
export function removeGridLines({ bgLike, W, H, cellW, cellH, cols, rows, lab, minCover = 0.35, side = 4, opts = {} }) {
  const found = [];
  const labDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (const axis of ['v', 'h']) {
    const vertical = axis === 'v';
    const L = vertical ? W : H;       // Länge quer (Anzahl Positionen auf der Achse)
    const Len = vertical ? H : W;     // Länge der Linie
    const cell = vertical ? cellW : cellH, n = vertical ? cols : rows;
    const win = Math.max(8, Math.round((opts.win ?? 0.07) * cell));
    const idx = (p, q) => (vertical ? q * W + p : p * W + q); // p: Position quer, q: entlang
    const bgAt = (p, q) => (p < 0 || p >= L ? 1 : bgLike[idx(p, q)]);
    const handled = new Uint8Array(L);
    for (let k = 0; k <= n; k++) {
      const b = Math.round(k * cell);
      const lo = Math.max(0, b - win), hi = Math.min(L - 1, b + win);
      const score = new Float32Array(L), isLine = new Map();
      for (let p = lo; p <= hi; p++) {
        const rowsHit = new Uint8Array(Len); let cnt = 0;
        for (let q = 0; q < Len; q++) {
          if (!bgLike[idx(p, q)] && bgAt(p - side, q) && bgAt(p + side, q)) { rowsHit[q] = 1; cnt++; }
        }
        score[p] = cnt / Len; isLine.set(p, rowsHit);
      }
      // zusammenhängende Spalten mit Score >= minCover
      let p = lo;
      while (p <= hi) {
        if (score[p] < minCover || handled[p]) { p++; continue; }
        let p1 = p; while (p1 + 1 <= hi && score[p1 + 1] >= minCover) p1++;
        if (p1 - p + 1 > Math.max(10, 0.05 * cell)) { p = p1 + 1; continue; } // zu dick: keine Linie
        // Linienzeilen: Vereinigung der Treffer im Band
        const hit = new Uint8Array(Len);
        for (let pp = p; pp <= p1; pp++) { const r = isLine.get(pp); for (let q = 0; q < Len; q++) if (r[q]) hit[q] = 1; }
        // Linienfarbe: Median der Treffer
        const ls = [[], [], []];
        for (let q = 0; q < Len; q += 3) if (hit[q]) { const c = lab(idx(Math.round((p + p1) / 2), q)); ls[0].push(c[0]); ls[1].push(c[1]); ls[2].push(c[2]); }
        const med = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
        const lc = ls[0].length ? [med(ls[0]), med(ls[1]), med(ls[2])] : null;
        // Linienzeilen auf 3 px Umgebung erweitern, Lücken bis 12 % Länge schließen, wenn die Farbe passt
        const near = new Uint8Array(Len);
        for (let q = 0; q < Len; q++) if (hit[q]) for (let d = -4; d <= 4; d++) if (q + d >= 0 && q + d < Len) near[q + d] = 1;
        let cleared = 0;
        const bp0 = Math.max(0, p - 2), bp1 = Math.min(L - 1, p1 + 2);
        for (let pp = bp0; pp <= bp1; pp++) for (let q = 0; q < Len; q++) {
          const i = idx(pp, q); if (bgLike[i]) continue;
          const similar = lc && labDist(lab(i), lc) < 0.06;
          if (near[q] || similar) { bgLike[i] = 1; cleared++; }
        }
        found.push({ axis, boundary: k, at: [p, p1], thickness: p1 - p + 1, cover: +Math.max(...Array.from({ length: p1 - p + 1 }, (_, j) => score[p + j])).toFixed(2), cleared, color: lc });
        for (let pp = Math.max(lo, p - 3); pp <= Math.min(hi, p1 + 3); pp++) handled[pp] = 1;
        p = p1 + 1;
      }
    }
  }
  return found;
}
