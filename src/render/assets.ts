import * as THREE from 'three';

/**
 * Loads the HD atlases from assets/hd (read-only source, imported by Vite).
 * Frame sizes in "art px" = atlas px / hdScale. The real sprite bounds come
 * from `contentBBox` – layouts use those, not the nominal cell sizes.
 */

interface RawFrame {
  frame: { x: number; y: number; w: number; h: number };
  contentBBox?: { x: number; y: number; w: number; h: number };
}
interface RawSheet {
  frames: Record<string, RawFrame>;
  animations?: Record<string, string[]>;
  meta: { image: string; size: { w: number; h: number }; hdScale?: number };
}

const jsonMods = import.meta.glob<RawSheet>(['../../assets/hd/*.json', '!../../assets/hd/manifest.json'], {
  eager: true,
  import: 'default',
});
const imgMods = import.meta.glob<string>('../../assets/hd/*.webp', { eager: true, query: '?url', import: 'default' });

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Frame {
  name: string;
  sheet: string;
  tex: THREE.Texture;
  img: HTMLImageElement | HTMLCanvasElement;
  /** frame rect in atlas pixels */
  px: Rect;
  /** content rect in atlas pixels (absolute) */
  content: Rect;
  /** cell size in art px */
  w: number;
  h: number;
  /** content rect relative to the cell, in art px */
  bb: Rect;
  scale: number; // atlas px per art px
  atlasW: number;
  atlasH: number;
}

const frames = new Map<string, Frame>();
const animations = new Map<string, string[]>();
const images = new Map<string, HTMLImageElement>();
const textures = new Map<string, THREE.Texture>();

function sheetName(path: string): string {
  return path.split('/').pop()!.replace(/\.(json|webp)$/, '');
}

/**
 * Loads via fetch -> Blob -> object URL: a blob: image is same-origin, so neither the WebGL upload
 * nor canvas.toDataURL (frameURL) can taint, with or without CORS headers.
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`image failed (${resp.status}): ${url}`);
  const objUrl = URL.createObjectURL(await resp.blob());
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = objUrl;
    await img.decode();
    return img;
  } catch {
    throw new Error('image decode failed: ' + url);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

export function makeTexture(img: TexImageSource | HTMLCanvasElement, mip = false): THREE.Texture {
  const t = new THREE.Texture(img as HTMLImageElement);
  t.colorSpace = THREE.NoColorSpace;
  t.premultiplyAlpha = true;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mip;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

export async function loadAssets(onProgress?: (p: number) => void): Promise<void> {
  const entries = Object.entries(jsonMods);
  let done = 0;
  await Promise.all(
    entries.map(async ([path, json]) => {
      const name = sheetName(path);
      const imgPath = Object.keys(imgMods).find((p) => sheetName(p) === name);
      if (!imgPath) return;
      const img = await loadImage(imgMods[imgPath]!);
      images.set(name, img);
      // Mipmaps (WebGL2 supports NPOT) keep strongly downscaled sprites clean.
      const tex = makeTexture(img, true);
      textures.set(name, tex);
      const scale = json.meta.hdScale ?? 4;
      for (const [fname, f] of Object.entries(json.frames)) {
        const bb = f.contentBBox ?? { x: 0, y: 0, w: f.frame.w, h: f.frame.h };
        frames.set(fname, {
          name: fname,
          sheet: name,
          tex,
          img,
          px: f.frame,
          content: { x: f.frame.x + bb.x, y: f.frame.y + bb.y, w: bb.w, h: bb.h },
          w: f.frame.w / scale,
          h: f.frame.h / scale,
          bb: { x: bb.x / scale, y: bb.y / scale, w: bb.w / scale, h: bb.h / scale },
          scale,
          atlasW: img.width,
          atlasH: img.height,
        });
      }
      for (const [an, list] of Object.entries(json.animations ?? {})) animations.set(an, list);
      done++;
      onProgress?.(done / entries.length);
    }),
  );
}

export function frame(name: string): Frame {
  const f = frames.get(name);
  if (!f) throw new Error('missing frame ' + name);
  return f;
}

export function hasFrame(name: string): boolean {
  return frames.has(name);
}

/** Frames of an animation (or the single frame). */
export function anim(name: string): Frame[] {
  const list = animations.get(name);
  if (list) return list.map(frame);
  if (frames.has(name)) return [frame(name)];
  if (frames.has(name + '_0')) {
    const out: Frame[] = [];
    for (let i = 0; frames.has(`${name}_${i}`); i++) out.push(frame(`${name}_${i}`));
    return out;
  }
  throw new Error('missing animation ' + name);
}

/** Union of the content boxes of an animation (art px, relative to the cell). */
export function animBounds(name: string): Rect {
  const fs = anim(name);
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const f of fs) {
    x0 = Math.min(x0, f.bb.x);
    y0 = Math.min(y0, f.bb.y);
    x1 = Math.max(x1, f.bb.x + f.bb.w);
    y1 = Math.max(y1, f.bb.y + f.bb.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const urlCache = new Map<string, string>();
/** Data URL of a frame's content box (for DOM <img> and CSS border-image). */
export function frameURL(name: string, mode: 'content' | 'cell' = 'content'): string {
  const key = name + ':' + mode;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const f = frame(name);
  const r = mode === 'content' ? f.content : f.px;
  const c = document.createElement('canvas');
  c.width = Math.max(1, r.w);
  c.height = Math.max(1, r.h);
  c.getContext('2d')!.drawImage(f.img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  let url = '';
  try {
    url = c.toDataURL('image/png');
  } catch {
    /* tainted canvas (no CORS): UI sprites missing, game stays playable */
  }
  urlCache.set(key, url);
  return url;
}

export function sheetImage(name: string): HTMLImageElement | undefined {
  return images.get(name);
}
