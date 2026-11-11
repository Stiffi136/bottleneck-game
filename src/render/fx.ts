import { Node, Sprite, Text, Rect2, type Batch, type TextOpts } from './scene';
import { ease, tween, wait } from './tween';
import { timeScale } from './tween';

/** Particles and one-shot effects, rendered in the engine's fx layer. */

interface Particle {
  node: Sprite | Rect2;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  spin: number;
  fade: boolean;
  shrink: boolean;
}

export class Fx {
  private parts: Particle[] = [];
  constructor(public layer: Node) {}

  update(dtReal: number): void {
    const dt = dtReal * timeScale.value;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.life -= dt;
      if (p.life <= 0 || p.node.destroyed) {
        p.node.destroy();
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.node.x += p.vx * dt;
      p.node.y += p.vy * dt;
      p.node.rot += p.spin * dt;
      const k = p.life / p.max;
      if (p.fade) p.node.alpha = Math.min(1, k * 2);
      if (p.shrink) p.node.sx = p.node.sy = 0.3 + 0.7 * k;
    }
  }

  clear(): void {
    for (const p of this.parts) p.node.destroy();
    this.parts = [];
  }

  /** One-shot sprite animation at a position. */
  oneShot(name: string, x: number, y: number, opts: { fps?: number; scale?: number; tint?: number; z?: number; rot?: number } = {}): Sprite {
    const s = new Sprite(name, { region: 'cell' });
    s.pos(x, y).scale(opts.scale ?? 1);
    s.rot = opts.rot ?? 0;
    s.z = opts.z ?? 0;
    if (opts.tint !== undefined) s.tint = hexToRgb(opts.tint);
    s.play(opts.fps ?? 18, false);
    s.onAnimEnd = () => s.destroy();
    this.layer.add(s);
    return s;
  }

  burst(x: number, y: number, kind: 'perf' | 'clock' | 'xclock' | 'spark' | 'click' | 'smoke' | 'fire' | 'frost' | 'coin', scale = 1): void {
    switch (kind) {
      case 'perf':
        this.oneShot('fx_burst_leistung', x, y, { fps: 24, scale: 1.3 * scale });
        this.sparks(x, y, 5, 0x8cc4ff, 60 * scale);
        break;
      case 'clock':
        this.oneShot('fx_burst_takt', x, y, { fps: 24, scale: 1.3 * scale });
        this.sparks(x, y, 5, 0xff8a2e, 60 * scale);
        break;
      case 'xclock':
        this.oneShot('fx_xtakt_flash', x, y, { fps: 18, scale: 1.4 * scale });
        this.sparks(x, y, 12, 0xffd23f, 120 * scale);
        break;
      case 'spark':
        this.oneShot('fx_spark', x, y, { fps: 20, scale: 1.5 * scale });
        break;
      case 'click':
        this.oneShot('fx_install_click', x, y, { fps: 20, scale });
        break;
      case 'smoke':
        this.oneShot('fx_smoke', x, y, { fps: 12, scale });
        break;
      case 'fire':
        this.oneShot('fx_fire', x, y, { fps: 14, scale });
        break;
      case 'frost':
        this.oneShot('fx_frost', x, y, { fps: 12, scale });
        break;
      case 'coin': {
        const s = new Sprite('fx_coin', { region: 'anim' });
        s.pos(x, y).scale(1.4 * scale).play(14);
        this.layer.add(s);
        this.parts.push({ node: s, vx: (Math.random() - 0.5) * 40, vy: -90, g: 260, life: 0.9, max: 0.9, spin: 0, fade: true, shrink: false });
        break;
      }
    }
  }

  sparks(x: number, y: number, n: number, color: number, speed = 80): void {
    for (let i = 0; i < n; i++) {
      const r = new Rect2(1.6, 1.6, color);
      r.ax = r.ay = 0.5;
      r.pos(x, y);
      this.layer.add(r);
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ node: r, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 140, life: 0.5 + Math.random() * 0.3, max: 0.8, spin: 0, fade: true, shrink: true });
    }
  }

  confetti(x: number, y: number, n: number, spread = 140): void {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(`fx_confetti_${i % 4}`, { region: 'content' });
      s.pos(x + (Math.random() - 0.5) * 20, y).scale(0.9 + Math.random() * 0.5);
      this.layer.add(s);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = spread * (0.5 + Math.random());
      this.parts.push({ node: s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 200, life: 1.4 + Math.random() * 0.6, max: 2, spin: (Math.random() - 0.5) * 12, fade: true, shrink: false });
    }
  }

  /** Floating text that pops and rises. */
  async float(x: number, y: number, text: string, opts: TextOpts & { rise?: number; dur?: number; pop?: number } = {}): Promise<void> {
    const t = new Text(text, { font: 'title', align: 'center', valign: 'middle', outline: 0x0b0b12, ...opts, size: (opts.size ?? 10) * 1.25 });
    t.pos(x, y);
    t.scale(0.2);
    this.layer.add(t);
    const pop = opts.pop ?? 1;
    await tween(t, { sx: 1.25 * pop, sy: 1.25 * pop }, { dur: 0.12, ease: ease.outBack });
    void tween(t, { sx: pop, sy: pop }, { dur: 0.1 });
    await tween(t, { y: y - (opts.rise ?? 16), alpha: 0 }, { dur: opts.dur ?? 0.7, ease: ease.inQuad, delay: 0.25 });
    t.destroy();
  }

  /** Full-screen colour flash. */
  async flashScreen(w: number, h: number, color = 0xffffff, alpha = 0.35, dur = 0.25): Promise<void> {
    const r = new Rect2(w * 3, h * 3, color, alpha);
    r.pos(-w, -h);
    this.layer.add(r);
    await tween(r, { alpha: 0 }, { dur });
    r.destroy();
  }

  /**
   * Digital glitch over a rect: flickering RGB slices, displaced noise strips and dark tears.
   * Resolves after `dur` seconds (game time).
   */
  async glitch(x: number, y: number, w: number, h: number, dur = 0.6, power = 1): Promise<void> {
    const n = new Node();
    n.z = 40;
    this.layer.add(n);
    const COLORS = [0xff3fa4, 0x2ef2ff, 0xf4f4fa, 0x0b0b12, 0x1f4fb4, 0x0b0b12];
    let next = 0;
    n.tick = (dt) => {
      next -= dt;
      if (next > 0) return;
      next = 0.03 + Math.random() * 0.04;
      n.removeAll();
      const slices = Math.round((5 + Math.random() * 7) * power);
      for (let i = 0; i < slices; i++) {
        const sh = 1 + Math.random() * Math.random() * 10;
        const sw = w * (0.15 + Math.random() * 0.85);
        const r = new Rect2(sw, sh, COLORS[(Math.random() * COLORS.length) | 0]!, 0.25 + Math.random() * 0.6);
        r.pos(x + Math.random() * (w - sw) + (Math.random() - 0.5) * 16, y + Math.random() * (h - sh));
        n.add(r);
      }
      const strips = Math.round((1 + Math.random() * 3) * power);
      for (let i = 0; i < strips; i++) {
        const s = new Sprite(`fx_glitch_noise_${(Math.random() * 4) | 0}`, { region: 'cell', ax: 0, ay: 0 });
        s.stretchOk = true; // noise texture
        const sw = w * (0.2 + Math.random() * 0.6);
        const sh = 3 + Math.random() * 14;
        s.size(sw, sh).pos(x + Math.random() * (w - sw), y + Math.random() * (h - sh));
        s.alpha = 0.35 + Math.random() * 0.4;
        if (Math.random() < 0.5) s.tint = Math.random() < 0.5 ? [1, 0.45, 0.8] : [0.45, 0.95, 1];
        n.add(s);
      }
    };
    await wait(dur);
    n.destroy();
  }

  /** Overlapping pulses on one node share the original base scale (otherwise the node ratchets up). */
  private pulseBase = new WeakMap<Node, { sx: number; sy: number; n: number }>();
  async pulse(n: Node, k = 1.2, dur = 0.18): Promise<void> {
    let b = this.pulseBase.get(n);
    if (!b) this.pulseBase.set(n, (b = { sx: n.sx, sy: n.sy, n: 0 }));
    b.n++;
    const { sx: bx, sy: by } = b;
    await tween(n, { sx: bx * k, sy: by * k }, { dur: dur * 0.45, ease: ease.outQuad });
    await tween(n, { sx: bx, sy: by }, { dur: dur * 0.55, ease: ease.outBack });
    if (--b.n === 0) this.pulseBase.delete(n);
  }
}

/**
 * Heat shimmer for the background (from 70 °C): a warm ghost copy of the table tiles that wobbles
 * row by row (heat haze), rising hot-air motes and a glow from below. `set(k)` with k = 0..1.
 */
export class HeatShimmer extends Node {
  private k = 0;
  private shown = 0;
  private t = 0;
  private rows: { n: Node; phase: number }[] = [];
  private glow: Rect2[] = [];
  private motes: { r: Rect2; vy: number; ph: number; x0: number; life: number }[] = [];
  private spawn = 0;
  constructor(
    private area: { x: number; y: number; w: number; h: number },
    tile = 'bg_tile_pcb',
    size = 96,
    tint = 0.55,
  ) {
    super();
    // ghost copy of the background tiles (same grid as Background: origin at area.x/area.y), cut into
    // thin horizontal strips that wobble independently
    const STRIP = 8;
    const per = size / STRIP;
    for (let y = area.y, row = 0; y < area.y + area.h; y += STRIP, row++) {
      const rn = new Node();
      this.add(rn);
      const j = row % per;
      for (let x = area.x - size; x < area.x + area.w + size; x += size) {
        const s = new StripSprite(tile, j / per, (j + 1) / per);
        s.size(size + 0.4, STRIP + 0.2).pos(x, y);
        s.tint = [Math.min(1, tint * 1.35), tint * 1.1, tint * 0.85];
        rn.add(s);
      }
      this.rows.push({ n: rn, phase: row * 0.55 });
    }
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      const bh = area.h * 0.06;
      const r = new Rect2(area.w, bh, i < 3 ? 0xff8a2e : 0xe8432d, 0);
      r.pos(area.x, area.y + area.h - bh * (i + 1));
      this.add(r);
      this.glow.push(r);
    }
    this.visible = false;
  }

  set(k: number): void {
    this.k = Math.max(0, Math.min(1, k));
  }

  override tick = (dt: number): void => {
    this.shown += (this.k - this.shown) * Math.min(1, dt * 2.5);
    if (this.shown < 0.01 && this.k === 0) {
      this.visible = false;
      return;
    }
    this.visible = true;
    this.t += dt;
    const k = this.shown;
    for (const r of this.rows) {
      r.n.x = Math.sin(this.t * 3.1 - r.phase) * (0.8 + 2.6 * k) + Math.sin(this.t * 7.3 + r.phase * 2.3) * 0.7 * k;
      r.n.alpha = (0.2 + 0.35 * k) * (0.7 + 0.3 * Math.sin(this.t * 4 - r.phase * 0.7));
    }
    this.glow.forEach((g, i) => (g.alpha = k * 0.07 * (1 - i / this.glow.length) * (0.8 + 0.2 * Math.sin(this.t * 2.6 + i))));
    // rising motes
    this.spawn -= dt * (6 + 30 * k);
    while (this.spawn < 0) {
      this.spawn += 1;
      const r = new Rect2(1.5, 2 + Math.random() * 4, Math.random() < 0.6 ? 0xffd23f : 0xff8a2e, 0);
      const x0 = this.area.x + Math.random() * this.area.w;
      r.pos(x0, this.area.y + this.area.h - Math.random() * this.area.h * 0.3);
      this.add(r);
      this.motes.push({ r, vy: -(20 + Math.random() * 40), ph: Math.random() * 6, x0, life: 1.5 + Math.random() * 1.5 });
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]!;
      m.life -= dt;
      if (m.life <= 0) {
        m.r.destroy();
        this.motes.splice(i, 1);
        continue;
      }
      m.r.y += m.vy * dt;
      m.r.x = m.x0 + Math.sin(this.t * 3 + m.ph) * 4;
      m.r.alpha = Math.min(1, m.life) * 0.85 * k;
    }
  };
}

/** Sprite that draws only a horizontal band [v0, v1] (fractions of its cell) of its frame. */
class StripSprite extends Sprite {
  constructor(
    name: string,
    private v0: number,
    private v1: number,
  ) {
    super(name, { region: 'cell', ax: 0, ay: 0 });
  }
  override draw(b: Batch): void {
    const f = this.frames[this.frameIndex] ?? this.frames[0]!;
    const rr = this.regionRect;
    const sx = f.px.x + rr.x * f.scale;
    const sy = f.px.y + rr.y * f.scale;
    const sw = rr.w * f.scale;
    const sh = rr.h * f.scale;
    b.quad(this, f.tex, 0, 0, this.w, this.h, sx / f.atlasW, (sy + sh * this.v0) / f.atlasH, (sx + sw) / f.atlasW, (sy + sh * this.v1) / f.atlasH);
  }
}

export function hexToRgb(c: number): [number, number, number] {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}

export { wait };
