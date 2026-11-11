import { fmt } from '../i18n';
import { RICH_ICON, parseRich, type RichSeg } from '../i18n/rich';
import { h, img } from './dom';

/** DOM nodes of one line: coloured spans with an 8-px icon; type names keep the normal text colour. */
function segNode(s: RichSeg): Node {
  if (!s.kind) return document.createTextNode(s.text);
  if (s.kind === 'type') return h('span', { class: 'rk-type' }, img(`card_typeicon8_${s.type}`, 'i8'), s.text);
  return h('span', { class: `rk rk-${s.kind}` }, img(RICH_ICON[s.kind], 'i8'), s.text);
}

/** Inline rich text (no line breaks; `\n` becomes " · "): `rich('{perf:+{n} Perf} per card', { n: 3 })`. */
export function rich(src: string, params: Record<string, string | number> = {}): HTMLElement {
  return h('span', {}, ...parseRich(fmt(src, params).replace(/\n/g, ' · ')).map(segNode));
}

/** Block rich text: every `\n` line (one effect each) becomes its own row. */
export function richLines(src: string, params: Record<string, string | number> = {}, cls = ''): HTMLElement {
  return h(
    'div',
    { class: `fxlines ${cls}` },
    ...fmt(src, params)
      .split('\n')
      .map((l) => h('div', { class: 'fxline' }, ...parseRich(l).map(segNode))),
  );
}
