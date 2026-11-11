import * as THREE from 'three';
import { makeTexture } from './assets';
import digitsUrl from '@fontsource/jersey-15/files/jersey-15-latin-400-normal.woff2?url';

/**
 * Runtime bitmap font: renders the glyphs of a (pixel) web font once into a
 * canvas atlas (with mipmaps) so text can be drawn as quads in the sprite
 * batch – crisp at any scale, umlauts included, nothing baked into sprites.
 */

export type FontId = 'body' | 'title' | 'mono';

/**
 * Digits and number signs for the body font. In Pixelify Sans "8" looks like "S" and "5" like "S", so
 * these code points come from Jersey 15 (SIL OFL 1.1) – digits and number signs only, NO letters (P5: "B" used
 * to come from Jersey too and stood taller than "H" next to it). The face only covers this unicode-range and
 * stands in front of Pixelify Sans in the stack, for the DOM (`--font-body` in style.css) and the bitmap font
 * alike. `size-adjust` 112.5 % makes the digit height equal to the Pixelify capitals (cap ascent 36/56 px
 * at 125 % it was 40/56, i.e. 11 % too tall); the baseline is shared, so words and numbers sit on one line.
 */
export const DIGIT_FAMILY = 'BN Digits';
const DIGIT_RANGE = 'U+0024-0025, U+002B-002E, U+0030-0039, U+00B1, U+00D7, U+2212';

function registerDigitFont(): void {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  const face = new FontFace(DIGIT_FAMILY, `url(${digitsUrl}) format("woff2")`, {
    unicodeRange: DIGIT_RANGE,
    weight: '100 900',
    display: 'block',
    sizeAdjust: '112.5%',
  } as FontFaceDescriptors);
  document.fonts.add(face);
}
registerDigitFont();

export const FONT_FAMILY: Record<FontId, string> = {
  body: `"${DIGIT_FAMILY}", "Pixelify Sans", system-ui, sans-serif`,
  title: `"${DIGIT_FAMILY}", "Silkscreen", "Pixelify Sans", monospace`, // Silkscreen: 0 and O almost alike -> digits from Jersey 15 (same cap height at 112.5 %)
  mono: '"VT323", monospace',
};
const FONT_WEIGHT: Record<FontId, string> = { body: '500', title: '400', mono: '400' };

const RASTER = 56; // glyph raster size in atlas px
const PAD = 3;

export interface Glyph {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  w: number; // cell width (atlas px)
  adv: number; // advance (atlas px)
}

export interface BitmapFont {
  id: FontId;
  tex: THREE.Texture;
  glyphs: Map<string, Glyph>;
  lineH: number; // atlas px
  ascent: number;
  raster: number;
  pad: number;
}

const CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  'ÄÖÜäöüßéèêàáâçñ°×÷−–—…←→↑↓€£¥©®±²³µ·«»„“”‘’•▶◀▲▼↻⚡✔✖⚠≈≥≤∞';

const fonts = new Map<FontId, BitmapFont>();

export async function loadFonts(): Promise<void> {
  const ids: FontId[] = ['body', 'title', 'mono'];
  await Promise.all(
    ids.map((id) => document.fonts.load(`${FONT_WEIGHT[id]} ${RASTER}px ${FONT_FAMILY[id]}`, CHARS).catch(() => [])),
  );
  for (const id of ids) fonts.set(id, buildFont(id));
}

function buildFont(id: FontId): BitmapFont {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.font = `${FONT_WEIGHT[id]} ${RASTER}px ${FONT_FAMILY[id]}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  const m = ctx.measureText('ÄgjÅ|8');
  const ascent = Math.ceil(m.actualBoundingBoxAscent ?? RASTER * 0.8);
  const descent = Math.ceil(m.actualBoundingBoxDescent ?? RASTER * 0.25);
  const cellH = ascent + descent + PAD * 2;
  const glyphs = new Map<string, Glyph>();
  let x = 0;
  let y = 0;
  for (const ch of CHARS) {
    const adv = ctx.measureText(ch).width;
    const cellW = Math.ceil(adv) + PAD * 2;
    if (x + cellW > size) {
      x = 0;
      y += cellH;
    }
    ctx.fillText(ch, x + PAD, y + PAD + ascent);
    glyphs.set(ch, { u0: x / size, v0: y / size, u1: (x + cellW) / size, v1: (y + cellH) / size, w: cellW, adv });
    x += cellW + 1;
  }
  const tex = makeTexture(c, true);
  return { id, tex, glyphs, lineH: cellH - PAD * 2, ascent, raster: RASTER, pad: PAD };
}

export function font(id: FontId): BitmapFont {
  const f = fonts.get(id);
  if (!f) throw new Error('font not loaded ' + id);
  return f;
}

export function measure(id: FontId, text: string, sizePx: number): number {
  const f = font(id);
  const k = sizePx / f.raster;
  let w = 0;
  for (const ch of text) w += (f.glyphs.get(ch) ?? f.glyphs.get('?')!).adv;
  return w * k;
}
