import { Node, Sprite } from '../render/scene';
import logoAtlas from '../../assets/hd/logo_v2.json';

/**
 * Animated title logo: BOTTLE | PC | NECK. Only the PC has animation frames (logo_pc_0…); the words are static
 * and are *moved* (never scaled) so their inner edges stay on the waist of the PC case while it is squeezed.
 * Local coordinates: art px (atlas px / 4), origin = bottom centre of the PC (anchor), y points down.
 * Words are drawn behind the PC. Moving inward: critically damped; springing back: underdamped (small overshoot).
 */
interface Waist { src: string; left: number; right: number; y: number }
const META = logoAtlas.meta as unknown as { hdScale: number; pcAnchor: { x: number; y: number }; pcCell: { w: number; h: number }; waist: Waist[] };
const HD = META.hdScale;
const WAIST = META.waist; // index = logo_pc_<i>
const AX = META.pcAnchor.x;
const OVERLAP = 0.5; // art px: words reach slightly behind the PC outline

/** Animation: [frame, hold in s]; afterwards REST seconds pause on frame 0. Frame 4 = highlight sweep (rebound). */
export const LOGO_SEQ: ReadonlyArray<readonly [number, number]> = [[1, 0.14], [2, 0.18], [3, 0.15], [4, 0.15]];
export const LOGO_PAUSE = 1.5;

export class LogoView extends Node {
  private pc: Sprite;
  private bottle: Sprite;
  private neck: Sprite;
  private step = -1; // -1 = pause on frame 0
  private t = 0.8;
  /** inward shift (art px) of the words, spring state */
  private d = 0;
  private v = 0;
  private target = 0;
  readonly extent: { x0: number; x1: number; y0: number; y1: number };

  constructor() {
    super();
    this.bottle = new Sprite('logo_bottle', { region: 'cell', ax: 1, ay: 0.5 });
    this.neck = new Sprite('logo_neck', { region: 'cell', ax: 0, ay: 0.5 });
    this.pc = new Sprite('logo_pc', { region: 'cell', ax: 0.5, ay: META.pcAnchor.y / META.pcCell.h });
    this.add(this.bottle);
    this.add(this.neck);
    this.add(this.pc); // later child = in front
    const w0 = WAIST[0]!;
    const wordY = (w0.y - META.pcAnchor.y) / HD;
    this.bottle.y = this.neck.y = wordY;
    const half = (w0.right - w0.left) / 2 / HD;
    this.extent = { x0: -half - this.bottle.w, x1: half + this.neck.w, y0: -META.pcCell.h / HD + 0, y1: 0 };
    this.place();
    this.tick = (dt) => this.run(dt);
  }

  private edges(i: number): { l: number; r: number } {
    const w = WAIST[i]!;
    return { l: (w.left - AX) / HD, r: (w.right - AX) / HD };
  }

  /** inward shift (art px per side) that keeps the words on the waist of frame i, relative to frame 0 */
  private shiftFor(i: number): number {
    const a = this.edges(0), b = this.edges(i);
    return ((b.l - a.l) + (a.r - b.r)) / 2;
  }

  private place(): void {
    const e = this.edges(0);
    this.bottle.x = e.l + OVERLAP + this.d;
    this.neck.x = e.r - OVERLAP - this.d;
  }

  private show(i: number): void {
    this.pc.frameIndex = i;
    this.target = this.shiftFor(i);
  }

  private run(dt: number): void {
    this.t -= dt;
    if (this.t <= 0) {
      if (this.step < 0) { this.step = 0; } else { this.step++; }
      if (this.step >= LOGO_SEQ.length) { this.step = -1; this.show(0); this.t = LOGO_PAUSE; }
      else { const [f, hold] = LOGO_SEQ[this.step]!; this.show(f); this.t = hold; }
    }
    // spring (semi-implicit Euler, substeps for stability)
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, w = 38;
    for (let k = 0; k < n; k++) {
      const inward = this.target > this.d;
      const zeta = inward ? 1 : 0.38; // overshoot only while springing back
      this.v += (-2 * zeta * w * this.v + w * w * (this.target - this.d)) * h;
      this.d += this.v * h;
    }
    this.place();
  }
}
