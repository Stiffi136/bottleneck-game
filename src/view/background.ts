import { Node, Rect2, Sprite } from '../render/scene';
import type { Viewport } from '../render/engine';

export type BgKind = 'pcb' | 'esd' | 'bios' | 'shop' | 'title' | 'bsod' | 'none';

/** Full-window background (extends into the letterbox area). */
export class Background extends Node {
  kind: BgKind = 'none';
  private vp: Viewport | null = null;
  private heat = 0;
  private haze: Rect2 | null = null;

  set(kind: BgKind, vp: Viewport): void {
    this.kind = kind;
    this.layout(vp);
  }

  /** 0..1, tints the table red when the PC gets hot. */
  setHeat(k: number): void {
    this.heat = k;
    if (this.haze) this.haze.alpha = Math.max(0, k) * 0.22;
  }

  layout(vp: Viewport): void {
    this.vp = vp;
    this.removeAll();
    const x0 = -vp.ox;
    const y0 = -vp.oy;
    const W = vp.fullW;
    const H = vp.fullH;
    const tile = (name: string, size: number, tint: number) => {
      for (let y = y0; y < y0 + H; y += size) {
        for (let x = x0; x < x0 + W; x += size) {
          const s = new Sprite(name, { region: 'cell', ax: 0, ay: 0 });
          s.size(size + 0.4, size + 0.4).pos(x, y);
          s.tint = [tint, tint, tint];
          this.add(s);
        }
      }
    };
    switch (this.kind) {
      case 'pcb':
        tile('bg_tile_pcb', 96, 0.55);
        break;
      case 'esd':
        tile('bg_tile_esd', 64, 0.85);
        break;
      case 'bios':
        this.add(new Rect2(W, H, 0x10206a)).pos(x0, y0);
        break;
      case 'bsod':
        this.add(new Rect2(W, H, 0x1f4fb4)).pos(x0, y0);
        break;
      case 'shop':
      case 'title': {
        const name = `bg_${this.kind}_${vp.portrait ? 'portrait' : 'landscape'}`;
        const s = new Sprite(name, { region: 'cell', ax: 0.5, ay: 0.5 });
        const k = Math.max(W / s.natW, H / s.natH);
        s.size(s.natW * k, s.natH * k).pos(x0 + W / 2, y0 + H / 2);
        this.add(s);
        break;
      }
      case 'none':
        this.add(new Rect2(W, H, 0x0b0b12)).pos(x0, y0);
        break;
    }
    if (this.kind === 'pcb' || this.kind === 'esd') {
      // vignette: darker edges
      const v = 40;
      for (const [x, y, w, h] of [
        [x0, y0, W, v],
        [x0, y0 + H - v, W, v],
        [x0, y0, v, H],
        [x0 + W - v, y0, v, H],
      ] as const) {
        const r = new Rect2(w, h, 0x05050a, 0.25);
        r.pos(x, y);
        this.add(r);
      }
      this.haze = new Rect2(W, H, 0xe8432d, this.heat * 0.22);
      this.haze.pos(x0, y0);
      this.add(this.haze);
    } else this.haze = null;
  }

  relayout(): void {
    if (this.vp) this.layout(this.vp);
  }
}
