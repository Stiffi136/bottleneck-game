/** Procedural chiptune loop (A minor, 96 bpm, 8 bars). Scheduled with a short lookahead. */
const N = (n: string): number => {
  const m = /^([A-G])(#?)(\d)$/.exec(n)!;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  const midi = 12 * (Number(m[3]) + 1) + base + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
};
const BASS = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'E2'].map(N);
const CHORD = [
  ['A3', 'C4', 'E4'],
  ['F3', 'A3', 'C4'],
  ['C4', 'E4', 'G4'],
  ['G3', 'B3', 'D4'],
  ['A3', 'C4', 'E4'],
  ['F3', 'A3', 'C4'],
  ['G3', 'B3', 'D4'],
  ['E3', 'G#3', 'B3'],
].map((c) => c.map(N));
// lead: 8 eighth notes per bar, '' = rest
const LEAD = [
  'E5 . C5 . E5 . A5 .',
  'C5 . . A4 C5 . F5 .',
  'G5 . E5 . C5 . . .',
  'D5 . . . B4 . G4 .',
  'E5 . C5 . E5 . A5 G5',
  'F5 . C5 . A4 . . .',
  'D5 . B4 . G4 . B4 D5',
  'E5 . . . . . . .',
].map((b) => b.split(' ').map((s) => (s === '.' ? 0 : N(s))));

export const BPM = 96;
const EIGHTH = 60 / BPM / 2;

export interface MusicHost {
  ctx: AudioContext;
  out: AudioNode;
  noise: AudioBuffer;
  /** Registers a voice's nodes for cleanup; returns false when the voice limit is hit. */
  voice(src: AudioScheduledSourceNode, nodes: AudioNode[]): boolean;
}

export class Music {
  private timer = 0;
  private next = 0; // next eighth-note index (global)
  private nextTime = 0;
  running = false;
  constructor(private h: MusicHost) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextTime = this.h.ctx.currentTime + 0.15;
    this.timer = window.setInterval(() => this.pump(), 80);
    this.pump();
  }

  stop(): void {
    this.running = false;
    window.clearInterval(this.timer);
  }

  private pump(): void {
    const ctx = this.h.ctx;
    if (ctx.state !== 'running') {
      this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.1);
      return;
    }
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.4) {
      this.step(this.next, this.nextTime);
      this.next = (this.next + 1) % 64;
      this.nextTime += EIGHTH;
    }
  }

  private step(i: number, t: number): void {
    const bar = Math.floor(i / 8);
    const e = i % 8;
    // bass: root on beats 1 and 3, octave pulse between
    if (e % 2 === 0) this.note(BASS[bar]! * (e === 2 || e === 6 ? 2 : 1), EIGHTH * 1.6, t, 'triangle', 0.9);
    // arpeggio on every eighth, quiet
    const ch = CHORD[bar]!;
    this.note(ch[[0, 1, 2, 1][e % 4]!]! * 1, EIGHTH * 0.8, t, 'square', 0.16, 1800);
    // lead
    const l = LEAD[bar]![e]!;
    if (l) this.note(l, EIGHTH * 1.7, t, 'square', 0.3, 2600);
    // hat on off-beats
    if (e % 2 === 1) this.hat(t);
  }

  private note(f: number, dur: number, t: number, wave: OscillatorType, vol: number, lp = 0): void {
    const { ctx, out } = this.h;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const nodes: AudioNode[] = [o, g];
    o.connect(g);
    if (lp) {
      const f2 = ctx.createBiquadFilter();
      f2.type = 'lowpass';
      f2.frequency.value = lp;
      g.connect(f2).connect(out);
      nodes.push(f2);
    } else g.connect(out);
    if (!this.h.voice(o, nodes)) return;
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private hat(t: number): void {
    const { ctx, out, noise } = this.h;
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(out);
    if (!this.h.voice(s, [s, f, g])) return;
    s.start(t, (t * 7) % 1);
    s.stop(t + 0.07);
  }
}
