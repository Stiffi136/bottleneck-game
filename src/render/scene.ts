import * as THREE from 'three';
import { anim, animBounds, frame, type Frame, type Rect } from './assets';
import { font, measure, type FontId } from './font';

// ------------------------------------------------------------------ nodes

export type Mode = 'normal' | 'brand' | 'pcb' | 'rgb' | 'circle' | 'gray';
const MODE_ID: Record<Mode, number> = { normal: 0, brand: 1, pcb: 2, rgb: 3, circle: 4, gray: 5 };

export interface Interactive {
  onTap?: (e: PointerInfo) => void;
  onDown?: (e: PointerInfo) => void;
  onUp?: (e: PointerInfo) => void;
  onLongPress?: (e: PointerInfo) => void;
  onDragStart?: (e: PointerInfo) => void;
  onDrag?: (e: PointerInfo) => void;
  onDragEnd?: (e: PointerInfo) => void;
  onHover?: (inside: boolean, e: PointerInfo) => void;
  /** extra touch padding in virtual px */
  pad?: number;
  cursor?: string;
  enabled?: boolean;
}

export interface PointerInfo {
  x: number;
  y: number;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  touch: boolean;
}

/** 2D affine matrix [a, b, c, d, tx, ty]. */
type M = [number, number, number, number, number, number];

export class Node {
  x = 0;
  y = 0;
  sx = 1;
  sy = 1;
  rot = 0;
  alpha = 1;
  visible = true;
  z = 0;
  name = '';
  children: Node[] = [];
  parent: Node | null = null;
  interactive: Interactive | null = null;
  /** hit rect in local coordinates (defaults to the sprite bounds) */
  hit: Rect | null = null;
  wm: M = [1, 0, 0, 1, 0, 0];
  walpha = 1;
  destroyed = false;
  /** per-frame callback */
  tick: ((dt: number) => void) | null = null;

  add<T extends Node>(child: T): T {
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove(child: Node): void {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
  }

  removeAll(): void {
    for (const c of this.children) {
      c.parent = null;
      c.markDestroyed();
    }
    this.children = [];
  }

  destroy(): void {
    this.parent?.remove(this);
    this.markDestroyed();
  }

  private markDestroyed(): void {
    this.destroyed = true;
    for (const c of this.children) c.markDestroyed();
  }

  pos(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  scale(s: number): this {
    this.sx = this.sy = s;
    return this;
  }

  /** Local bounds (for hit tests). */
  bounds(): Rect | null {
    return this.hit;
  }

  updateWorld(parent: M, palpha: number): void {
    const c = Math.cos(this.rot);
    const s = Math.sin(this.rot);
    const a = c * this.sx;
    const b = s * this.sx;
    const cc = -s * this.sy;
    const d = c * this.sy;
    const [pa, pb, pc, pd, ptx, pty] = parent;
    this.wm = [
      pa * a + pc * b,
      pb * a + pd * b,
      pa * cc + pc * d,
      pb * cc + pd * d,
      pa * this.x + pc * this.y + ptx,
      pb * this.x + pd * this.y + pty,
    ];
    this.walpha = palpha * this.alpha;
  }

  toWorld(lx: number, ly: number): [number, number] {
    const m = this.wm;
    return [m[0] * lx + m[2] * ly + m[4], m[1] * lx + m[3] * ly + m[5]];
  }

  /** World axis-aligned rect of the hit area. */
  worldRect(): Rect | null {
    const r = this.bounds();
    if (!r) return null;
    const pts = [this.toWorld(r.x, r.y), this.toWorld(r.x + r.w, r.y), this.toWorld(r.x, r.y + r.h), this.toWorld(r.x + r.w, r.y + r.h)];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
  }

  /** Emits quads; overridden by drawables. */
  draw(_b: Batch): void {}
}

export interface SpriteOpts {
  region?: 'content' | 'cell' | 'anim';
  w?: number;
  h?: number;
  ax?: number;
  ay?: number;
  nine?: number; // 9-slice border in art px
  nineScale?: number;
}

export class Sprite extends Node {
  frames: Frame[];
  frameIndex = 0;
  fps = 0;
  loop = true;
  private animT = 0;
  region: 'content' | 'cell' | 'anim';
  regionRect: Rect; // art px relative to the cell
  w: number;
  h: number;
  ax: number;
  ay: number;
  tint: [number, number, number] = [1, 1, 1];
  flash = 0;
  mode: Mode = 'normal';
  param = 0;
  swap: [number, number, number] = [1, 1, 1];
  nine = 0;
  nineScale = 1;
  /** noise/colour-bar sprites that may be stretched (skipped by the dev aspect check) */
  stretchOk = false;
  /** visible fraction from the left (1 = full) – for bars */
  cropR = 1;
  /** visible fraction from the bottom (1 = full) – for vertical bars */
  cropT = 1;
  onAnimEnd: (() => void) | null = null;

  constructor(name: string, opts: SpriteOpts = {}) {
    super();
    this.frames = anim(name);
    this.region = opts.region ?? (this.frames.length > 1 ? 'anim' : 'content');
    this.regionRect = this.computeRegion(name);
    this.w = opts.w ?? this.regionRect.w;
    this.h = opts.h ?? this.regionRect.h;
    this.ax = opts.ax ?? 0.5;
    this.ay = opts.ay ?? 0.5;
    this.nine = opts.nine ?? 0;
    this.nineScale = opts.nineScale ?? 1;
  }

  private computeRegion(name: string): Rect {
    const f = this.frames[0]!;
    if (this.region === 'cell') return { x: 0, y: 0, w: f.w, h: f.h };
    if (this.region === 'anim') return this.frames.length > 1 ? animBounds(name) : { ...f.bb };
    return { ...f.bb };
  }

  setFrame(name: string): this {
    this.frames = anim(name);
    this.frameIndex = 0;
    this.regionRect = this.computeRegion(name);
    return this;
  }

  /** Natural size of the region (art px). */
  get natW(): number {
    return this.regionRect.w;
  }
  get natH(): number {
    return this.regionRect.h;
  }

  size(w: number, h: number): this {
    this.w = w;
    this.h = h;
    return this;
  }

  /** Scales to fit into w×h keeping the aspect ratio. */
  fit(w: number, h: number): this {
    const k = Math.min(w / this.regionRect.w, h / this.regionRect.h);
    this.w = this.regionRect.w * k;
    this.h = this.regionRect.h * k;
    return this;
  }

  play(fps: number, loop = true): this {
    this.fps = fps;
    this.loop = loop;
    this.animT = 0;
    this.frameIndex = 0;
    return this;
  }

  stepAnim(dt: number): void {
    if (!this.fps || this.frames.length < 2) return;
    this.animT += dt * this.fps;
    let i = Math.floor(this.animT);
    if (i >= this.frames.length) {
      if (this.loop) {
        i %= this.frames.length;
      } else {
        i = this.frames.length - 1;
        this.fps = 0;
        this.onAnimEnd?.();
      }
    }
    this.frameIndex = i;
  }

  override bounds(): Rect {
    return this.hit ?? { x: -this.w * this.ax, y: -this.h * this.ay, w: this.w, h: this.h };
  }

  override draw(b: Batch): void {
    const f = this.frames[this.frameIndex] ?? this.frames[0]!;
    const rr = this.regionRect;
    // atlas px of the region
    const sx = f.px.x + rr.x * f.scale;
    const sy = f.px.y + rr.y * f.scale;
    const sw = rr.w * f.scale;
    const sh = rr.h * f.scale;
    const x0 = -this.w * this.ax;
    const y0 = -this.h * this.ay;
    if (this.nine > 0) {
      const n = this.nine;
      const nd = n * this.nineScale;
      const np = n * f.scale;
      const xs = [x0, x0 + nd, x0 + this.w - nd, x0 + this.w];
      const ys = [y0, y0 + nd, y0 + this.h - nd, y0 + this.h];
      const us = [sx, sx + np, sx + sw - np, sx + sw];
      const vs = [sy, sy + np, sy + sh - np, sy + sh];
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 3; i++) {
          if (xs[i + 1]! - xs[i]! <= 0 || ys[j + 1]! - ys[j]! <= 0) continue;
          b.quad(this, f.tex, xs[i]!, ys[j]!, xs[i + 1]!, ys[j + 1]!, us[i]! / f.atlasW, vs[j]! / f.atlasH, us[i + 1]! / f.atlasW, vs[j + 1]! / f.atlasH);
        }
      return;
    }
    if (this.cropR < 1 || this.cropT < 1) {
      const cr = Math.max(0, Math.min(1, this.cropR));
      const ct = Math.max(0, Math.min(1, this.cropT));
      if (cr <= 0 || ct <= 0) return;
      const yTop = y0 + this.h * (1 - ct);
      const vTop = sy + sh * (1 - ct);
      b.quad(this, f.tex, x0, yTop, x0 + this.w * cr, y0 + this.h, sx / f.atlasW, vTop / f.atlasH, (sx + sw * cr) / f.atlasW, (sy + sh) / f.atlasH);
      return;
    }
    b.quad(this, f.tex, x0, y0, x0 + this.w, y0 + this.h, sx / f.atlasW, sy / f.atlasH, (sx + sw) / f.atlasW, (sy + sh) / f.atlasH);
  }
}

/** Solid rectangle (uses a white texture). */
export class Rect2 extends Node {
  w: number;
  h: number;
  ax = 0;
  ay = 0;
  tint: [number, number, number];
  flash = 0;
  mode: Mode = 'normal';
  param = 0;
  swap: [number, number, number] = [1, 1, 1];
  constructor(w: number, h: number, color: number | string = 0xffffff, alpha = 1) {
    super();
    this.w = w;
    this.h = h;
    this.tint = rgb(color);
    this.alpha = alpha;
  }
  override bounds(): Rect {
    return this.hit ?? { x: -this.w * this.ax, y: -this.h * this.ay, w: this.w, h: this.h };
  }
  override draw(b: Batch): void {
    const x0 = -this.w * this.ax;
    const y0 = -this.h * this.ay;
    b.quad(this, b.white, x0, y0, x0 + this.w, y0 + this.h, 0, 0, 1, 1);
  }
}

export interface TextOpts {
  font?: FontId;
  size?: number;
  color?: number | string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  maxWidth?: number;
  lineHeight?: number;
  shadow?: number | string | null;
  outline?: number | string | null;
}

interface Line {
  text: string;
  w: number;
}

export class Text extends Node {
  private _text = '';
  font: FontId;
  size: number;
  tint: [number, number, number];
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  maxWidth: number;
  lineHeight: number;
  shadow: [number, number, number] | null;
  outline: [number, number, number] | null;
  flash = 0;
  mode: Mode = 'normal';
  param = 0;
  swap: [number, number, number] = [1, 1, 1];
  private lines: Line[] = [];
  private dirty = true;
  private shadowPass = 0; // 0 = main, 1 = shadow

  constructor(text: string, opts: TextOpts = {}) {
    super();
    this.font = opts.font ?? 'body';
    this.size = opts.size ?? 8;
    this.tint = rgb(opts.color ?? 0xf4f4fa);
    this.align = opts.align ?? 'left';
    this.valign = opts.valign ?? 'top';
    this.maxWidth = opts.maxWidth ?? 0;
    this.lineHeight = opts.lineHeight ?? 1.15;
    this.shadow = opts.shadow === undefined ? rgb(0x0b0b12) : opts.shadow === null ? null : rgb(opts.shadow);
    this.outline = opts.outline === undefined || opts.outline === null ? null : rgb(opts.outline);
    this.text = text;
  }

  get text(): string {
    return this._text;
  }
  set text(v: string) {
    if (v === this._text) return;
    this._text = v;
    this.dirty = true;
  }

  setSize(s: number): this {
    if (s !== this.size) {
      this.size = s;
      this.dirty = true;
    }
    return this;
  }

  color(c: number | string): this {
    this.tint = rgb(c);
    return this;
  }

  setFont(f: FontId): this {
    if (f !== this.font) {
      this.font = f;
      this.dirty = true;
    }
    return this;
  }

  private layout(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const out: Line[] = [];
    for (const para of this._text.split('\n')) {
      if (!this.maxWidth) {
        out.push({ text: para, w: measure(this.font, para, this.size) });
        continue;
      }
      const words = para.split(' ');
      let cur = '';
      for (const w of words) {
        const cand = cur ? cur + ' ' + w : w;
        if (cur && measure(this.font, cand, this.size) > this.maxWidth) {
          out.push({ text: cur, w: measure(this.font, cur, this.size) });
          cur = w;
        } else cur = cand;
      }
      out.push({ text: cur, w: measure(this.font, cur, this.size) });
    }
    this.lines = out;
  }

  get width(): number {
    this.layout();
    return Math.max(0, ...this.lines.map((l) => l.w));
  }

  get height(): number {
    this.layout();
    const f = font(this.font);
    const k = this.size / f.raster;
    return this.lines.length * f.lineH * k * this.lineHeight - f.lineH * k * (this.lineHeight - 1);
  }

  override bounds(): Rect {
    if (this.hit) return this.hit;
    const w = this.width;
    const h = this.height;
    const x = this.align === 'center' ? -w / 2 : this.align === 'right' ? -w : 0;
    const y = this.valign === 'middle' ? -h / 2 : this.valign === 'bottom' ? -h : 0;
    return { x, y, w, h };
  }

  override draw(b: Batch): void {
    this.layout();
    if (this.shadow) {
      this.shadowPass = 1;
      const off = Math.max(0.5, this.size / 12);
      this.emit(b, off, off, this.shadow);
      if (this.outline) for (const [dx, dy] of [[-off, 0], [off, 0], [0, -off], [0, off]] as const) this.emit(b, dx, dy, this.outline);
      this.shadowPass = 0;
    }
    this.emit(b, 0, 0, null);
  }

  private emit(b: Batch, ox: number, oy: number, col: [number, number, number] | null): void {
    const f = font(this.font);
    const k = this.size / f.raster;
    const lh = f.lineH * k * this.lineHeight;
    const total = this.height;
    let y = (this.valign === 'middle' ? -total / 2 : this.valign === 'bottom' ? -total : 0) + oy - f.pad * k;
    const saveTint = this.tint;
    const saveFlash = this.flash;
    if (col) {
      this.tint = col;
      this.flash = 0;
    }
    for (const line of this.lines) {
      let x = (this.align === 'center' ? -line.w / 2 : this.align === 'right' ? -line.w : 0) + ox - f.pad * k;
      for (const ch of line.text) {
        const g = f.glyphs.get(ch) ?? f.glyphs.get('?')!;
        if (ch !== ' ') {
          const gh = (g.v1 - g.v0) * 1024 * k;
          b.quad(this, f.tex, x, y, x + g.w * k, y + gh, g.u0, g.v0, g.u1, g.v1);
        }
        x += g.adv * k;
      }
      y += lh;
    }
    this.tint = saveTint;
    this.flash = saveFlash;
    void this.shadowPass;
  }
}

export function rgb(c: number | string): [number, number, number] {
  const n = typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// ------------------------------------------------------------------ batch

const MAX_QUADS = 12000;
const MAX_TEX = 8;
const FLOATS = 2 + 2 + 2 + 4 + 4 + 4; // pos uv local color extra swap

const VERT = /* glsl */ `
attribute vec2 aPos;
attribute vec2 aUv;
attribute vec2 aLocal;
attribute vec4 aColor;
attribute vec4 aExtra;
attribute vec4 aSwap;
varying vec2 vUv;
varying vec2 vLocal;
varying vec4 vColor;
varying vec4 vExtra;
varying vec4 vSwap;
void main() {
  vUv = aUv;
  vLocal = aLocal;
  vColor = aColor;
  vExtra = aExtra;
  vSwap = aSwap;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex[${MAX_TEX}];
uniform float uTime;
varying vec2 vUv;
varying vec2 vLocal;
varying vec4 vColor;
varying vec4 vExtra;
varying vec4 vSwap;

vec4 sampleTex(float i, vec2 uv) {
  if (i < 0.5) return texture2D(uTex[0], uv);
  if (i < 1.5) return texture2D(uTex[1], uv);
  if (i < 2.5) return texture2D(uTex[2], uv);
  if (i < 3.5) return texture2D(uTex[3], uv);
  if (i < 4.5) return texture2D(uTex[4], uv);
  if (i < 5.5) return texture2D(uTex[5], uv);
  if (i < 6.5) return texture2D(uTex[6], uv);
  return texture2D(uTex[7], uv);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float hueMask(float h, float center, float width) {
  float d = abs(fract(h - center + 0.5) - 0.5);
  return 1.0 - smoothstep(width * 0.6, width, d);
}

void main() {
  vec4 t = sampleTex(vExtra.x, vUv);
  float mode = vExtra.z;
  if (mode > 0.5 && t.a > 0.001) {
    vec3 c = t.rgb / t.a; // un-premultiply
    vec3 hsv = rgb2hsv(c);
    if (mode < 1.5) {
      // brand key colour (magenta) -> swap colour, keep the light ramp
      float m = hueMask(hsv.x, 300.0 / 360.0, 0.09) * smoothstep(0.35, 0.55, hsv.y) * smoothstep(0.25, 0.4, hsv.z);
      vec3 target = vSwap.rgb * (0.35 + 0.85 * hsv.z);
      c = mix(c, target, m);
    } else if (mode < 2.5) {
      // PCB key colour (green) -> board colour
      float m = hueMask(hsv.x, 120.0 / 360.0, 0.12) * smoothstep(0.35, 0.6, hsv.y);
      vec3 target = vSwap.rgb * (0.25 + 0.9 * hsv.z);
      c = mix(c, target, m);
    } else if (mode < 3.5) {
      // RGB zone (cyan) -> rainbow cycle
      float m = hueMask(hsv.x, 182.0 / 360.0, 0.07) * smoothstep(0.35, 0.55, hsv.y) * smoothstep(0.4, 0.6, hsv.z);
      float hue = fract(uTime * 0.25 + vLocal.x * 0.6 + vLocal.y * 0.4);
      vec3 target = hsv2rgb(vec3(hue, 0.85, hsv.z));
      c = mix(c, target, m);
    } else if (mode < 4.5) {
      // circle mask (rotating fans)
      float r = length(vLocal - 0.5);
      float edge = vExtra.w;
      t.a *= 1.0 - smoothstep(edge - 0.02, edge, r);
    } else if (mode < 5.5) {
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, vec3(l) * 0.7, 0.85);
    }
    t.rgb = c * t.a;
  }
  vec4 col = t * vColor; // vColor is premultiplied (rgb * a)
  col.rgb += vExtra.y * col.a * (1.0 - col.rgb / max(col.a, 0.001)) ;
  gl_FragColor = col;
}`;

interface Drawable {
  wm: M;
  walpha: number;
  tint: [number, number, number];
  flash: number;
  mode: Mode;
  param: number;
  swap: [number, number, number];
}

export class Batch {
  readonly mesh: THREE.Mesh;
  readonly white: THREE.Texture;
  private geo: THREE.BufferGeometry;
  private data: Float32Array;
  private attr: THREE.InterleavedBuffer;
  private count = 0;
  private mats: THREE.ShaderMaterial[] = [];
  private groupTex: THREE.Texture[] = [];
  private groupStart = 0;
  private groups: { start: number; count: number; texs: THREE.Texture[] }[] = [];
  readonly uTime = { value: 0 };
  drawCalls = 0;

  constructor() {
    this.data = new Float32Array(MAX_QUADS * 4 * FLOATS);
    this.attr = new THREE.InterleavedBuffer(this.data, FLOATS);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    this.geo = new THREE.BufferGeometry();
    let o = 0;
    const add = (name: string, size: number) => {
      this.geo.setAttribute(name, new THREE.InterleavedBufferAttribute(this.attr, size, o));
      o += size;
    };
    add('aPos', 2);
    add('aUv', 2);
    add('aLocal', 2);
    add('aColor', 4);
    add('aExtra', 4);
    add('aSwap', 4);
    // three needs a "position" attribute for bounding computations; reuse aPos
    this.geo.setAttribute('position', new THREE.InterleavedBufferAttribute(this.attr, 2, 0));
    const idx = new Uint32Array(MAX_QUADS * 6);
    for (let i = 0; i < MAX_QUADS; i++) {
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    }
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const wd = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    wd.needsUpdate = true;
    this.white = wd;
    this.mesh = new THREE.Mesh(this.geo, []);
    this.mesh.frustumCulled = false;
  }

  private material(i: number): THREE.ShaderMaterial {
    let m = this.mats[i];
    if (!m) {
      m = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTex: { value: new Array(MAX_TEX).fill(this.white) }, uTime: this.uTime },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      });
      this.mats[i] = m;
    }
    return m;
  }

  begin(): void {
    this.count = 0;
    this.groups = [];
    this.groupTex = [];
    this.groupStart = 0;
  }

  private flushGroup(): void {
    if (this.count > this.groupStart) {
      this.groups.push({ start: this.groupStart, count: this.count - this.groupStart, texs: this.groupTex });
    }
    this.groupStart = this.count;
    this.groupTex = [];
  }

  quad(d: Drawable, tex: THREE.Texture, x0: number, y0: number, x1: number, y1: number, u0: number, v0: number, u1: number, v1: number): void {
    if (this.count >= MAX_QUADS) return;
    const a = d.walpha;
    if (a <= 0.001) return;
    let ti = this.groupTex.indexOf(tex);
    if (ti < 0) {
      if (this.groupTex.length >= MAX_TEX) this.flushGroup();
      this.groupTex.push(tex);
      ti = this.groupTex.length - 1;
    }
    const m = d.wm;
    const base = this.count * 4 * FLOATS;
    const pts: [number, number, number, number][] = [
      [x0, y0, u0, v0],
      [x1, y0, u1, v0],
      [x0, y1, u0, v1],
      [x1, y1, u1, v1],
    ];
    const locals = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const [r, g, bl] = d.tint;
    const mode = MODE_ID[d.mode];
    for (let i = 0; i < 4; i++) {
      const [lx, ly, u, v] = pts[i]!;
      const o = base + i * FLOATS;
      const D = this.data;
      D[o] = m[0] * lx + m[2] * ly + m[4];
      D[o + 1] = m[1] * lx + m[3] * ly + m[5];
      D[o + 2] = u;
      D[o + 3] = v;
      D[o + 4] = locals[i]![0]!;
      D[o + 5] = locals[i]![1]!;
      D[o + 6] = r * a;
      D[o + 7] = g * a;
      D[o + 8] = bl * a;
      D[o + 9] = a;
      D[o + 10] = ti;
      D[o + 11] = d.flash;
      D[o + 12] = mode;
      D[o + 13] = d.param;
      D[o + 14] = d.swap[0];
      D[o + 15] = d.swap[1];
      D[o + 16] = d.swap[2];
      D[o + 17] = 0;
    }
    this.count++;
  }

  end(): void {
    this.flushGroup();
    this.geo.clearGroups();
    const mats: THREE.ShaderMaterial[] = [];
    this.groups.forEach((g, i) => {
      const m = this.material(i);
      const arr = m.uniforms.uTex!.value as THREE.Texture[];
      for (let k = 0; k < MAX_TEX; k++) arr[k] = g.texs[k] ?? this.white;
      mats.push(m);
      this.geo.addGroup(g.start * 6, g.count * 6, i);
    });
    this.mesh.material = mats;
    this.attr.needsUpdate = true;
    this.attr.clearUpdateRanges();
    this.attr.addUpdateRange(0, this.count * 4 * FLOATS);
    this.geo.setDrawRange(0, this.count * 6);
    this.drawCalls = this.groups.length;
  }
}

/** Renders a node tree into the batch (painter's order, siblings sorted by z). */
export function renderTree(root: Node, b: Batch, dt: number, interactives: Node[]): void {
  const identity: M = [1, 0, 0, 1, 0, 0];
  const visit = (n: Node, pm: M, pa: number) => {
    if (!n.visible || n.destroyed) return;
    if (n.tick) n.tick(dt);
    if (n.destroyed || !n.visible) return;
    n.updateWorld(pm, pa);
    if (n instanceof Sprite) n.stepAnim(dt);
    if (n.walpha > 0.001) n.draw(b);
    if (n.interactive && n.interactive.enabled !== false) interactives.push(n);
    if (n.children.length) {
      const kids = n.children.some((c) => c.z !== 0) ? [...n.children].sort((a, c) => a.z - c.z) : n.children.slice();
      for (const c of kids) visit(c, n.wm, n.walpha);
    }
  };
  visit(root, identity, 1);
}

export { frame };
