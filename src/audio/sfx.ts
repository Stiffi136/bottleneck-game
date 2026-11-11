/**
 * WebAudio synthesizer for all sound effects, the fan noise and the music loop (no audio files).
 * Levels live in levels.ts. The AudioContext is only created after a user gesture.
 * Graph: voices -> sfxBus -> lowpass -> compressor -> master -> destination
 *        fan -> master;  music -> musicBus -> master
 */
import { FAN_IDLE, LEVELS_DB, MAX_VOICES, db, lv, type LevelKey } from './levels';
import { Music } from './music';

type Wave = OscillatorType;

interface ToneOpts {
  lv?: LevelKey;
  /** relative gain (linear) on top of the level table */
  g?: number;
  wave?: Wave;
  slide?: number;
  delay?: number;
  attack?: number;
  lp?: number;
  detune?: number;
}
interface NoiseOpts {
  lv?: LevelKey;
  g?: number;
  freq?: number;
  q?: number;
  delay?: number;
  type?: BiquadFilterType;
  sweep?: number;
  attack?: number;
}

/** Pentatonic ladder: step 0,1,2... climbs two octaves, then stays on the top note. */
const PENTA = [0, 2, 4, 7, 9];
export function ladder(base: number, step: number): number {
  const s = Math.max(0, Math.min(Math.floor(step), 14));
  return base * Math.pow(2, (Math.floor(s / 5) * 12 + PENTA[s % 5]!) / 12);
}

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private fanGain: GainNode | null = null;
  private fanFilter: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private music: Music | null = null;
  private gesture = false;
  private fanLevel = 0;
  volume = 0.7;
  muted = false;
  fanEnabled = true;
  musicEnabled = true;
  /** Debug counters: window.__audio */
  stats = { active: 0, created: 0, dropped: 0, peak: 0 };

  constructor() {
    const onGesture = () => {
      this.gesture = true;
      this.unlock();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(ev, onGesture, { capture: true });
    document.addEventListener('visibilitychange', () => this.onVisibility());
    if (import.meta.env.DEV) Object.assign(window as object, { __audio: this });
  }

  get state(): string {
    return this.ctx?.state ?? 'none';
  }
  get musicRunning(): boolean {
    return !!this.music?.running;
  }

  /** Creates the context after the first user gesture; later calls only resume it. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume().catch(() => undefined);
      return;
    }
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    if (!this.gesture && !active) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.15;
    comp.connect(this.master);
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 9000;
    soften.connect(comp);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(soften);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = lv('music');
    this.musicBus.connect(this.master);
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // fan noise loop (volume follows the temperature)
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.fanFilter = ctx.createBiquadFilter();
    this.fanFilter.type = 'lowpass';
    this.fanFilter.frequency.value = 300;
    this.fanGain = ctx.createGain();
    this.fanGain.gain.value = 0;
    src.connect(this.fanFilter).connect(this.fanGain).connect(this.master);
    src.start();
    this.music = new Music({
      ctx,
      out: this.musicBus,
      noise: this.noiseBuf,
      voice: (s, nodes) => this.track(s, nodes),
    });
    this.applyVolume();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  }

  /** Applies volume, mute, fan and music settings immediately. */
  applyVolume(): void {
    if (this.ctx && this.master) {
      const g = this.muted ? 0 : Math.pow(this.volume, 1.6) * 0.8;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(g, t, 0.01);
    }
    this.fan(this.fanLevel);
    this.applyMusic();
  }

  private applyMusic(): void {
    if (!this.music || !this.ctx) return;
    const on = this.musicEnabled && !this.muted && !document.hidden && this.volume > 0;
    if (on) this.music.start();
    else this.music.stop();
  }

  private onVisibility(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (document.hidden) {
      this.music?.stop();
      void ctx.suspend().catch(() => undefined);
    } else {
      void ctx.resume().catch(() => undefined);
      this.applyMusic();
    }
  }

  /** Registers a voice; frees its nodes when it ends. False when over the voice limit. */
  private track(src: AudioScheduledSourceNode, nodes: AudioNode[]): boolean {
    if (this.stats.active >= MAX_VOICES) {
      this.stats.dropped++;
      for (const n of nodes) n.disconnect();
      return false;
    }
    this.stats.active++;
    this.stats.created++;
    this.stats.peak = Math.max(this.stats.peak, this.stats.active);
    src.onended = () => {
      this.stats.active--;
      for (const n of nodes) n.disconnect();
      src.onended = null;
    };
    return true;
  }

  /** 0..1 – fan noise level (temperature feedback). */
  fan(level: number): void {
    this.fanLevel = Math.max(0, Math.min(1, level));
    if (!this.ctx || !this.fanGain || !this.fanFilter) return;
    const l = this.fanEnabled && !this.muted ? this.fanLevel : 0;
    const t = this.ctx.currentTime;
    this.fanGain.gain.setTargetAtTime(Math.pow(l, 1.5) * db(LEVELS_DB.fanMax), t, 0.25);
    this.fanFilter.frequency.setTargetAtTime(260 + l * 1400, t, 0.25);
  }

  /** Quiet idle fan noise (workbench, PC running). */
  fanIdle(): void {
    this.fan(FAN_IDLE);
  }

  private tone(freq: number, dur: number, o: ToneOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.muted || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.wave ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t0 + dur);
    if (o.detune) osc.detune.value = o.detune;
    const v = lv(o.lv ?? 'click') * (o.g ?? 1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + (o.attack ?? 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const nodes: AudioNode[] = [osc, g];
    osc.connect(g);
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      g.connect(f).connect(this.sfxBus);
      nodes.push(f);
    } else g.connect(this.sfxBus);
    if (!this.track(osc, nodes)) return;
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, o: NoiseOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.noiseBuf || this.muted || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1200, t0);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const v = lv(o.lv ?? 'click') * (o.g ?? 1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    if (!this.track(src, [src, f, g])) return;
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.03);
  }

  // ------------------------------------------------------------------ UI
  click(): void {
    this.tone(1200, 0.03, { lv: 'click', wave: 'triangle' });
  }
  hover(): void {
    this.tone(1800, 0.02, { lv: 'hover', wave: 'sine' });
  }
  select(): void {
    this.tone(520, 0.07, { lv: 'select', wave: 'triangle', slide: 1.5 });
  }
  deselect(): void {
    this.tone(560, 0.07, { lv: 'deselect', wave: 'triangle', slide: 0.7 });
  }
  deal(i = 0): void {
    this.noise(0.06, { lv: 'deal', freq: 2200 + Math.min(i, 10) * 100, q: 1.5 });
  }
  error(): void {
    this.tone(220, 0.12, { lv: 'error', wave: 'square', lp: 1200 });
    this.tone(165, 0.18, { lv: 'error', wave: 'square', lp: 1200, delay: 0.12 });
  }

  // ------------------------------------------------- scoring ladder (one note up per event)
  /** Count-up tick (score roll, POST LEDs). `step` climbs the ladder. */
  tick(step: number): void {
    this.tone(ladder(392, step / 1.5), 0.06, { lv: 'tick', wave: 'triangle' });
  }
  /** + Performance: bright pluck, one ladder step per event. */
  perf(step: number): void {
    const f = ladder(523.25, step);
    this.tone(f, 0.16, { lv: 'perf', wave: 'triangle' });
    this.tone(f * 2, 0.09, { lv: 'perf', g: 0.3, wave: 'sine' });
  }
  /** + Clock: softer square pluck a fifth below, same ladder. */
  clock(step: number): void {
    const f = ladder(349.23, step);
    this.tone(f, 0.14, { lv: 'clock', wave: 'square', lp: 2400 });
    this.tone(f * 1.5, 0.08, { lv: 'clock', g: 0.35, wave: 'sine' });
  }
  /** × Clock: fat bass hit, whoosh and rising shimmer. */
  xclock(): void {
    this.tone(70, 0.5, { lv: 'xclock', wave: 'sine', slide: 0.55, attack: 0.004 });
    this.tone(140, 0.4, { lv: 'xclock', g: 0.5, wave: 'sawtooth', slide: 0.5, lp: 700 });
    this.noise(0.4, { lv: 'xclock', g: 0.5, freq: 300, sweep: 2500, q: 0.8, type: 'lowpass', attack: 0.05 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.25, { lv: 'xclock', g: 0.22, wave: 'triangle', delay: 0.04 + i * 0.045 }));
  }
  money(): void {
    this.coin();
  }

  // --------------------------------------------------------------- events
  /** Final play slam. */
  slam(): void {
    this.noise(0.25, { lv: 'slam', g: 0.6, freq: 220, q: 0.8, type: 'lowpass' });
    this.tone(100, 0.3, { lv: 'slam', wave: 'sine', slide: 0.5 });
  }
  win(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.2, { lv: 'win', wave: 'triangle', delay: i * 0.1 }));
    this.tone(1046.5, 0.5, { lv: 'win', g: 0.6, wave: 'square', lp: 2500, delay: 0.4 });
  }
  lose(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, { lv: 'lose', wave: 'triangle', delay: i * 0.17 }));
  }
  throttle(): void {
    this.tone(300, 0.5, { lv: 'throttle', wave: 'sawtooth', slide: 0.5, lp: 900 });
  }
  shutdown(): void {
    this.tone(500, 1.1, { lv: 'shutdown', wave: 'sawtooth', slide: 0.06, lp: 1200 });
    this.noise(1.0, { lv: 'shutdown', g: 0.7, freq: 1800, sweep: 80, type: 'lowpass' });
  }
  /** Blue screen: low drone with beating, falling noise and a dull thump. */
  bsod(): void {
    this.tone(55, 1.8, { lv: 'bsod', wave: 'sawtooth', lp: 500, attack: 0.03 });
    this.tone(55, 1.8, { lv: 'bsod', g: 0.8, wave: 'sawtooth', lp: 500, detune: 14, attack: 0.03 });
    this.tone(110, 1.4, { lv: 'bsod', g: 0.35, wave: 'square', lp: 600, slide: 0.7 });
    this.noise(0.9, { lv: 'bsod', g: 0.5, freq: 900, sweep: 60, type: 'lowpass' });
    this.tone(60, 0.35, { lv: 'bsod', g: 1.3, wave: 'sine', slide: 0.4, attack: 0.003 });
  }

  // ---------------------------------------------------- shop / receipt
  /** Purchase / register: bell ding with harmonics plus coin clink. */
  cash(): void {
    this.tone(1318.5, 0.1, { lv: 'cash', wave: 'triangle' });
    this.tone(1760, 0.5, { lv: 'cash', wave: 'triangle', delay: 0.07 });
    this.tone(3520, 0.25, { lv: 'cash', g: 0.2, wave: 'sine', delay: 0.07 });
    this.tone(2637, 0.3, { lv: 'cash', g: 0.18, wave: 'sine', delay: 0.07 });
    this.noise(0.1, { lv: 'cash', g: 0.25, freq: 4500, q: 3, delay: 0.04 });
  }
  coin(): void {
    this.tone(987.8, 0.06, { lv: 'coin', wave: 'triangle' });
    this.tone(1318.5, 0.2, { lv: 'coin', wave: 'triangle', delay: 0.06 });
  }
  printer(): void {
    this.noise(0.05, { lv: 'printer', freq: 2800, q: 4 });
  }
  pack(): void {
    this.noise(0.4, { lv: 'pack', g: 0.8, freq: 800, sweep: 5000, q: 1, attack: 0.1 });
    [784, 988, 1175].forEach((f, i) => this.tone(f, 0.18, { lv: 'pack', g: 0.6, wave: 'triangle', delay: 0.25 + i * 0.06 }));
  }
  frost(): void {
    this.noise(0.5, { lv: 'frost', freq: 5500, q: 0.5, type: 'highpass', attack: 0.1 });
  }

  // -------------------------------------------------------------- hardware
  /** POST beep: classic ~1 kHz square, rounded off. */
  beep(long = false): void {
    this.tone(1000, long ? 0.5 : 0.14, { lv: 'beep', wave: 'square', lp: 3200, attack: 0.004 });
  }
  /** Beep code; timing mirrored in ui/postDialog.ts (long 0.6 s, short 0.22 s). */
  beepCode(longs: number, shorts: number): void {
    let t = 0;
    for (let i = 0; i < longs; i++, t += 0.6) this.tone(880, 0.45, { lv: 'beep', wave: 'square', lp: 3000, delay: t });
    for (let i = 0; i < shorts; i++, t += 0.22) this.tone(880, 0.12, { lv: 'beep', wave: 'square', lp: 3000, delay: t });
  }
  /** Part clicks into its slot: crisp click plus low thunk. */
  snap(): void {
    this.noise(0.04, { lv: 'snap', g: 0.7, freq: 3000, q: 3 });
    this.tone(190, 0.1, { lv: 'snap', wave: 'sine', slide: 0.5, attack: 0.002 });
    this.tone(1900, 0.03, { lv: 'snap', g: 0.3, wave: 'triangle', delay: 0.012 });
  }
  thud(): void {
    this.tone(120, 0.14, { lv: 'thud', wave: 'sine', slide: 0.6 });
  }
  boot(): void {
    this.tone(1000, 0.16, { lv: 'boot', wave: 'square', lp: 3200 });
    this.tone(523.25, 0.2, { lv: 'boot', g: 0.6, wave: 'triangle', delay: 0.2 });
    this.tone(783.99, 0.3, { lv: 'boot', g: 0.6, wave: 'triangle', delay: 0.3 });
    this.noise(0.6, { lv: 'boot', g: 0.35, freq: 300, sweep: 1200, type: 'lowpass', delay: 0.1, attack: 0.1 });
  }
}

export const sfx = new Sfx();
