import type { CardType } from '../core/types';
import { L, fmt } from './index';

/**
 * Rich text for i18n strings: key values are marked up as `{kind:text}` and drawn in a colour (DOM: span + 8-px icon,
 * three.js: coloured glyphs). Markers may contain `{placeholders}`: `fmt()` fills them first, then the markers are parsed.
 *
 *   {perf:+{n} Perf}   Perf (blue)      {clock:×1.5 Clock}  Clock (red)
 *   {heat:+3 °C heat}  heat (orange)    {cool:−8 cooling}   cooling (cyan)
 *   {watt:550 W}       power (yellow)   {money:+$2}         money (gold)
 *   {type:cpu}         card type: icon in the type colour + neutral type name (CPU / GPU / RAM / I/O)
 *
 * `\n` inside a string starts a new line (one effect per line).
 */
export type RichKind = 'perf' | 'clock' | 'heat' | 'cool' | 'watt' | 'money' | 'type';

export const RICH_KINDS: readonly RichKind[] = ['perf', 'clock', 'heat', 'cool', 'watt', 'money', 'type'];

/** Text colours on the dark UI background (all ≥ 6:1 against #0e0e1c). Also used by the CSS classes `.rk-*`. */
export const RICH_COLOR: Record<Exclude<RichKind, 'type'>, number> = {
  perf: 0x8cc4ff,
  clock: 0xff6a55,
  heat: 0xffa43a,
  cool: 0x5fe8e0,
  watt: 0xffd23f,
  money: 0xffe28a,
};

/** 8-px sprite of a kind (`type` uses the sprite of its card type). */
export const RICH_ICON: Record<Exclude<RichKind, 'type'>, string> = {
  perf: 'icon8_leistung',
  clock: 'icon8_takt',
  heat: 'icon8_hitze',
  cool: 'icon8_kuehlung',
  watt: 'icon8_watt',
  money: 'icon8_geld',
};

export const TYPE_COLOR: Record<CardType, number> = { cpu: 0x3a7bf0, gpu: 0x3fbf5f, ram: 0xf2b233, io: 0xa05cf0 };

export interface RichSeg {
  text: string;
  kind?: RichKind;
  /** for `kind: 'type'` */
  type?: CardType;
}

const MARK = /\{(perf|clock|heat|cool|watt|money|type):([^{}]*)\}/g;
export const hasMarkup = (s: string): boolean => s.includes('{') && /\{(?:perf|clock|heat|cool|watt|money|type):/.test(s);

/** Splits one line into plain and marked segments. */
export function parseRich(src: string): RichSeg[] {
  const out: RichSeg[] = [];
  let last = 0;
  MARK.lastIndex = 0;
  for (let m = MARK.exec(src); m; m = MARK.exec(src)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    const kind = m[1] as RichKind;
    if (kind === 'type') {
      const ty = m[2] as CardType;
      out.push({ kind, type: ty, text: L().cardTypes[ty] ?? m[2]! });
    } else out.push({ kind, text: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** Text without markers (toasts, `title` attributes). Lines are joined with " · ". */
export function plain(src: string, params: Record<string, string | number> = {}): string {
  return parseRich(fmt(src, params))
    .map((s) => s.text)
    .join('')
    .split('\n')
    .join(' · ');
}

/** For the bitmap text: plain string and colour runs (indices into the plain string; type names stay neutral, icons are DOM only). */
export function richRuns(src: string): { plain: string; runs: { a: number; b: number; color: number }[] } {
  let text = '';
  const runs: { a: number; b: number; color: number }[] = [];
  for (const s of parseRich(src)) {
    if (s.kind && s.kind !== 'type') runs.push({ a: text.length, b: text.length + s.text.length, color: RICH_COLOR[s.kind] });
    text += s.text;
  }
  return { plain: text, runs };
}
