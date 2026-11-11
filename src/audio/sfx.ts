/**
 * Tiny WebAudio synthesizer for all sound effects (no audio files).
 * Muted state and volume come from the settings.
 */

type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private fanGain: GainNode | null = null;
  private fanFilter: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  volume = 0.7;
  muted = false;
  fanEnabled = true;

  /** Must be called from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyVolume();
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // fan noise loop (volume follows the temperature)
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.fanFilter = this.ctx.createBiquadFilter();
    this.fanFilter.type = 'lowpass';
    this.fanFilter.frequency.value = 500;
    this.fanGain = this.ctx.createGain();
    this.fanGain.gain.value = 0;
    src.connect(this.fanFilter).connect(this.fanGain).connect(this.master);
    src.start();
  }

  applyVolume(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.5;
  }

  /** 0..1 – fan noise level (temperature feedback). */
  fan(level: number): void {
    if (!this.ctx || !this.fanGain || !this.fanFilter) return;
    const l = this.fanEnabled ? Math.max(0, Math.min(1, level)) : 0;
    const t = this.ctx.currentTime;
    this.fanGain.gain.setTargetAtTime(l * 0.09, t, 0.3);
    this.fanFilter.frequency.setTargetAtTime(300 + l * 1600, t, 0.3);
  }

  private tone(freq: number, dur: number, opts: { wave?: Wave; vol?: number; slide?: number; delay?: number; attack?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.wave ?? 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t0 + dur);
    const v = (opts.vol ?? 0.2) * 0.6;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opts: { vol?: number; freq?: number; q?: number; delay?: number; type?: BiquadFilterType; sweep?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.02);
  }

  click(): void {
    this.tone(1400, 0.03, { wave: 'square', vol: 0.08 });
  }
  hover(): void {
    this.tone(2200, 0.015, { wave: 'sine', vol: 0.03 });
  }
  select(): void {
    this.tone(660, 0.05, { wave: 'triangle', vol: 0.15, slide: 1.5 });
  }
  deselect(): void {
    this.tone(700, 0.05, { wave: 'triangle', vol: 0.12, slide: 0.7 });
  }
  deal(i = 0): void {
    this.noise(0.06, { freq: 2500 + i * 120, q: 2, vol: 0.12, delay: 0 });
  }
  /** Rising scoring tick. */
  tick(step: number): void {
    const f = 440 * Math.pow(2, Math.min(step, 24) / 12);
    this.tone(f, 0.07, { wave: 'square', vol: 0.09 });
  }
  perf(step: number): void {
    const f = 520 * Math.pow(2, Math.min(step, 24) / 12);
    this.tone(f, 0.08, { wave: 'triangle', vol: 0.18 });
  }
  clock(step: number): void {
    const f = 780 * Math.pow(2, Math.min(step, 24) / 12);
    this.tone(f, 0.09, { wave: 'square', vol: 0.12 });
  }
  xclock(): void {
    this.tone(160, 0.35, { wave: 'sawtooth', vol: 0.25, slide: 0.4 });
    this.noise(0.35, { freq: 400, q: 0.7, vol: 0.35, type: 'lowpass' });
    this.tone(1200, 0.2, { wave: 'square', vol: 0.08, slide: 2, delay: 0.02 });
  }
  slam(): void {
    this.noise(0.25, { freq: 180, q: 0.8, vol: 0.5, type: 'lowpass' });
    this.tone(90, 0.3, { wave: 'sine', vol: 0.35, slide: 0.5 });
  }
  win(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, { wave: 'square', vol: 0.12, delay: i * 0.09 }));
  }
  lose(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, { wave: 'triangle', vol: 0.18, delay: i * 0.16 }));
  }
  cash(): void {
    this.tone(1318, 0.08, { wave: 'square', vol: 0.1 });
    this.tone(1760, 0.25, { wave: 'square', vol: 0.1, delay: 0.07 });
    this.noise(0.12, { freq: 5000, q: 3, vol: 0.08, delay: 0.05 });
  }
  coin(): void {
    this.tone(988, 0.06, { wave: 'square', vol: 0.1 });
    this.tone(1319, 0.18, { wave: 'square', vol: 0.1, delay: 0.06 });
  }
  printer(): void {
    this.noise(0.05, { freq: 3000, q: 5, vol: 0.08 });
  }
  beep(long = false): void {
    this.tone(1000, long ? 0.5 : 0.12, { wave: 'square', vol: 0.12 });
  }
  beepCode(longs: number, shorts: number): void {
    let t = 0;
    for (let i = 0; i < longs; i++, t += 0.6) this.tone(880, 0.45, { wave: 'square', vol: 0.12, delay: t });
    for (let i = 0; i < shorts; i++, t += 0.22) this.tone(880, 0.12, { wave: 'square', vol: 0.12, delay: t });
  }
  snap(): void {
    this.noise(0.04, { freq: 3500, q: 4, vol: 0.3 });
    this.tone(2400, 0.03, { wave: 'square', vol: 0.08, delay: 0.01 });
  }
  thud(): void {
    this.tone(120, 0.12, { wave: 'sine', vol: 0.3, slide: 0.6 });
  }
  error(): void {
    this.tone(200, 0.12, { wave: 'square', vol: 0.12 });
    this.tone(150, 0.18, { wave: 'square', vol: 0.12, delay: 0.12 });
  }
  throttle(): void {
    this.tone(300, 0.5, { wave: 'sawtooth', vol: 0.12, slide: 0.5 });
  }
  shutdown(): void {
    this.tone(600, 1.2, { wave: 'sawtooth', vol: 0.18, slide: 0.05 });
    this.noise(1.0, { freq: 2000, vol: 0.2, sweep: 80, type: 'lowpass' });
  }
  bsod(): void {
    this.tone(55, 1.6, { wave: 'sawtooth', vol: 0.12 });
    this.tone(110, 1.6, { wave: 'square', vol: 0.05 });
  }
  pack(): void {
    this.noise(0.4, { freq: 800, sweep: 6000, q: 1, vol: 0.25 });
    [784, 988, 1175].forEach((f, i) => this.tone(f, 0.15, { wave: 'triangle', vol: 0.1, delay: 0.25 + i * 0.06 }));
  }
  boot(): void {
    this.tone(1000, 0.15, { wave: 'square', vol: 0.12 });
    this.noise(0.6, { freq: 300, vol: 0.12, sweep: 1200, type: 'lowpass', delay: 0.1 });
  }
  frost(): void {
    this.noise(0.5, { freq: 6000, q: 0.5, vol: 0.18, type: 'highpass' });
  }
}

export const sfx = new Sfx();
