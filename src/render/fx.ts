import { Node, Sprite, Text, Rect2, type TextOpts } from './scene';
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

  async pulse(n: Node, k = 1.2, dur = 0.18): Promise<void> {
    const bx = n.sx;
    const by = n.sy;
    await tween(n, { sx: bx * k, sy: by * k }, { dur: dur * 0.45, ease: ease.outQuad });
    await tween(n, { sx: bx, sy: by }, { dur: dur * 0.55, ease: ease.outBack });
  }
}

export function hexToRgb(c: number): [number, number, number] {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}

export { wait };
