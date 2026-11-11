import * as THREE from 'three';
import { Batch, Node, renderTree, type PointerInfo } from './scene';
import { updateTweens } from './tween';

export interface Viewport {
  /** content size in virtual px */
  w: number;
  h: number;
  /** CSS px per virtual px */
  s: number;
  /** offset of the content area inside the window (virtual px) */
  ox: number;
  oy: number;
  /** full window in virtual px */
  fullW: number;
  fullH: number;
  portrait: boolean;
  dpr: number;
}

export interface Screen {
  root: Node;
  dom: HTMLElement;
  layout(vp: Viewport): void;
  update?(dt: number): void;
  enter?(): void;
  exit?(): void;
  onKey?(e: KeyboardEvent): void;
}

const PORTRAIT = { minW: 360, maxW: 400, minH: 640, maxH: 900 };
const LANDSCAPE = { minW: 640, maxW: 720, minH: 360, maxH: 400 };

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.OrthographicCamera;
  readonly scene = new THREE.Scene();
  readonly batch = new Batch();
  readonly root = new Node();
  /** behind everything, may extend into the letterbox */
  readonly bg = new Node();
  readonly world = new Node();
  readonly fx = new Node();
  readonly top = new Node();
  readonly ui: HTMLElement;
  vp: Viewport;
  private screen: Screen | null = null;
  private interactives: Node[] = [];
  private last = performance.now();
  private shakeT = 0;
  private shakeMag = 0;
  shakeEnabled = true;
  time = 0;
  private resizeListeners = new Set<(vp: Viewport) => void>();
  private frameListeners = new Set<(dt: number) => void>();
  fps = 60;

  constructor(host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x0b0b12, 1);
    this.renderer.domElement.id = 'gl';
    host.appendChild(this.renderer.domElement);
    this.ui = document.createElement('div');
    this.ui.id = 'ui';
    host.appendChild(this.ui);
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
    this.scene.add(this.batch.mesh);
    this.root.add(this.bg);
    this.root.add(this.world);
    this.root.add(this.fx);
    this.root.add(this.top);
    this.vp = this.computeViewport();
    this.applyViewport();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 50));
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    this.setupInput();
    requestAnimationFrame((t) => this.frame(t));
  }

  private safeInsets(): { l: number; r: number; t: number; b: number } {
    const probe = document.getElementById('safe-probe');
    if (!probe) return { l: 0, r: 0, t: 0, b: 0 };
    const cs = getComputedStyle(probe);
    return {
      l: parseFloat(cs.paddingLeft) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      t: parseFloat(cs.paddingTop) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
    };
  }

  computeViewport(): Viewport {
    const W = Math.max(1, window.innerWidth);
    const H = Math.max(1, window.innerHeight);
    const ins = this.safeInsets();
    const aw = Math.max(1, W - ins.l - ins.r);
    const ah = Math.max(1, H - ins.t - ins.b);
    const portrait = aw / ah < 1.05;
    const L = portrait ? PORTRAIT : LANDSCAPE;
    const s = Math.min(aw / L.minW, ah / L.minH);
    const w = Math.min(L.maxW, aw / s);
    const h = Math.min(L.maxH, ah / s);
    const fullW = W / s;
    const fullH = H / s;
    const ox = ins.l / s + (aw / s - w) / 2;
    const oy = ins.t / s + (ah / s - h) / 2;
    return { w, h, s, ox, oy, fullW, fullH, portrait, dpr: Math.min(3, window.devicePixelRatio || 1) };
  }

  private applyViewport(): void {
    const vp = this.vp;
    this.renderer.setPixelRatio(vp.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // camera covers the whole window; content origin at (ox, oy)
    this.camera.left = -vp.ox;
    this.camera.right = vp.fullW - vp.ox;
    this.camera.top = -vp.oy;
    this.camera.bottom = vp.fullH - vp.oy;
    this.camera.updateProjectionMatrix();
    const ui = this.ui;
    ui.style.width = `${vp.w}px`;
    ui.style.height = `${vp.h}px`;
    ui.style.left = `${vp.ox * vp.s}px`;
    ui.style.top = `${vp.oy * vp.s}px`;
    ui.style.transform = `scale(${vp.s})`;
    document.documentElement.style.setProperty('--s', String(vp.s));
    document.body.classList.toggle('portrait', vp.portrait);
    document.body.classList.toggle('landscape', !vp.portrait);
  }

  private onResize(): void {
    const next = this.computeViewport();
    const old = this.vp;
    this.vp = next;
    this.applyViewport();
    if (old.w !== next.w || old.h !== next.h || old.portrait !== next.portrait || old.s !== next.s) {
      this.screen?.layout(next);
      for (const l of this.resizeListeners) l(next);
    }
  }

  onResizeVp(fn: (vp: Viewport) => void): () => void {
    this.resizeListeners.add(fn);
    return () => this.resizeListeners.delete(fn);
  }

  onFrame(fn: (dt: number) => void): () => void {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  setScreen(next: Screen): void {
    const prev = this.screen;
    if (prev) {
      prev.exit?.();
      prev.root.destroy();
      prev.dom.remove();
    }
    this.screen = next;
    this.world.add(next.root);
    this.ui.appendChild(next.dom);
    next.layout(this.vp);
    next.enter?.();
  }

  get current(): Screen | null {
    return this.screen;
  }

  shake(mag: number, dur = 0.3): void {
    if (!this.shakeEnabled) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.fps = this.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
    this.time += dt;
    this.batch.uTime.value = this.time;
    updateTweens(dt);
    for (const l of this.frameListeners) l(dt);
    this.screen?.update?.(dt);
    // screen shake
    let sx = 0;
    let sy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.min(1, this.shakeT / 0.15);
      sx = (Math.random() * 2 - 1) * m;
      sy = (Math.random() * 2 - 1) * m;
      if (this.shakeT <= 0) this.shakeMag = 0;
    }
    this.world.x = sx;
    this.world.y = sy;
    this.fx.x = sx;
    this.fx.y = sy;
    this.ui.style.translate = sx || sy ? `${sx * this.vp.s}px ${sy * this.vp.s}px` : '';
    this.batch.begin();
    this.interactives = [];
    renderTree(this.root, this.batch, dt, this.interactives);
    this.batch.end();
    this.renderer.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------ input

  private toVirtual(e: PointerEvent): [number, number] {
    return [e.clientX / this.vp.s - this.vp.ox, e.clientY / this.vp.s - this.vp.oy];
  }

  private pick(x: number, y: number): Node | null {
    for (let i = this.interactives.length - 1; i >= 0; i--) {
      const n = this.interactives[i]!;
      if (n.destroyed) continue;
      const r = n.worldRect();
      if (!r) continue;
      const p = n.interactive?.pad ?? 0;
      if (x >= r.x - p && x <= r.x + r.w + p && y >= r.y - p && y <= r.y + r.h + p) return n;
    }
    return null;
  }

  hoverNode: Node | null = null;

  private setupInput(): void {
    const el = this.renderer.domElement;
    let down: { node: Node | null; x: number; y: number; id: number; dragging: boolean; long: boolean; touch: boolean; timer: number } | null = null;
    const info = (e: PointerEvent, sx = 0, sy = 0): PointerInfo => {
      const [x, y] = this.toVirtual(e);
      return { x, y, dx: x - sx, dy: y - sy, startX: sx, startY: sy, touch: e.pointerType !== 'mouse' };
    };
    el.addEventListener('pointerdown', (e) => {
      if (down) return;
      const [x, y] = this.toVirtual(e);
      const node = this.pick(x, y);
      el.setPointerCapture(e.pointerId);
      const touch = e.pointerType !== 'mouse';
      down = { node, x, y, id: e.pointerId, dragging: false, long: false, touch, timer: 0 };
      node?.interactive?.onDown?.(info(e, x, y));
      if (node?.interactive?.onLongPress) {
        const d = down;
        d.timer = window.setTimeout(() => {
          if (down === d && !d.dragging) {
            d.long = true;
            node.interactive?.onLongPress?.({ x, y, dx: 0, dy: 0, startX: x, startY: y, touch });
          }
        }, 450);
      }
    });
    el.addEventListener('pointermove', (e) => {
      const [x, y] = this.toVirtual(e);
      if (down && down.id === e.pointerId) {
        const dist = Math.hypot(x - down.x, y - down.y);
        if (!down.dragging && dist > 6 && down.node?.interactive?.onDragStart && !down.long) {
          down.dragging = true;
          clearTimeout(down.timer);
          down.node.interactive.onDragStart(info(e, down.x, down.y));
        } else if (dist > 8) clearTimeout(down.timer);
        if (down.dragging) down.node?.interactive?.onDrag?.(info(e, down.x, down.y));
        return;
      }
      if (e.pointerType === 'mouse') {
        const n = this.pick(x, y);
        if (n !== this.hoverNode) {
          const p = info(e, x, y);
          this.hoverNode?.interactive?.onHover?.(false, p);
          this.hoverNode = n;
          n?.interactive?.onHover?.(true, p);
          el.style.cursor = n?.interactive ? n.interactive.cursor ?? 'pointer' : 'default';
        }
      }
    });
    const up = (e: PointerEvent, cancel: boolean) => {
      if (!down || down.id !== e.pointerId) return;
      const d = down;
      down = null;
      clearTimeout(d.timer);
      const p = info(e, d.x, d.y);
      if (d.dragging) d.node?.interactive?.onDragEnd?.(p);
      else if (!cancel && !d.long && d.node) {
        d.node.interactive?.onUp?.(p);
        const [x, y] = this.toVirtual(e);
        if (Math.hypot(x - d.x, y - d.y) < 12 && this.pick(x, y) === d.node) d.node.interactive?.onTap?.(p);
      }
    };
    el.addEventListener('pointerup', (e) => up(e, false));
    el.addEventListener('pointercancel', (e) => up(e, true));
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.hoverNode && !down) {
        this.hoverNode.interactive?.onHover?.(false, info(e));
        this.hoverNode = null;
      }
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Converts virtual content coords to CSS px of the window. */
  toScreen(x: number, y: number): [number, number] {
    return [(x + this.vp.ox) * this.vp.s, (y + this.vp.oy) * this.vp.s];
  }
}
