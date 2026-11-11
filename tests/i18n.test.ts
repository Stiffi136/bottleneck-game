import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { de } from '../src/i18n/de';
import { ALL_PARTS } from '../src/core/data/hardware';
import { RICH_KINDS, parseRich, plain, richRuns } from '../src/i18n/rich';
import { fmt, setLang } from '../src/i18n';

function keys(o: unknown, prefix = ''): string[] {
  if (typeof o !== 'object' || o === null) return [prefix];
  if (Array.isArray(o)) return [prefix + `[${o.length}]`];
  return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
  it('every part has a name in both languages', () => {
    for (const p of ALL_PARTS) {
      expect(en.parts[p.id], p.id).toBeTruthy();
      expect(de.parts[p.id], p.id).toBeTruthy();
    }
  });
  it('German has exactly the same keys as English', () => {
    expect(keys(de).sort()).toEqual(keys(en).sort());
  });
  it('card names: 10 per type', () => {
    for (const t of ['cpu', 'gpu', 'ram', 'io'] as const) {
      expect(en.cardNames[t]).toHaveLength(10);
      expect(de.cardNames[t]).toHaveLength(10);
    }
  });
  it('placeholders match between languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const flat = (o: unknown, p = ''): [string, string][] =>
      typeof o === 'string' ? [[p, o]] : typeof o === 'object' && o ? Object.entries(o).flatMap(([k, v]) => flat(v, `${p}.${k}`)) : [];
    const deMap = new Map(flat(de));
    for (const [k, v] of flat(en)) {
      if (k.startsWith('.parts')) continue;
      expect(ph(deMap.get(k) ?? ''), k).toBe(ph(v));
    }
  });

  it('rich markers: same marker kinds and line count in both languages, no stray braces', () => {
    const flat = (o: unknown, p = ''): [string, string][] =>
      typeof o === 'string' ? [[p, o]] : typeof o === 'object' && o ? Object.entries(o).flatMap(([k, v]) => flat(v, `${p}.${k}`)) : [];
    const deMap = new Map(flat(de));
    const kinds = (s: string) => (s.match(/\{(?:perf|clock|heat|cool|watt|money|type):/g) ?? []).sort().join(',');
    const lines = (s: string) => s.split('\n').length;
    let marked = 0;
    for (const [k, v] of flat(en)) {
      if (k.startsWith('.parts')) continue;
      const d = deMap.get(k) ?? '';
      expect(kinds(d), k).toBe(kinds(v));
      expect(lines(d), k).toBe(lines(v));
      // after filling placeholders every brace must belong to a marker
      const filled = fmt(v, { n: 1, l: 1, t: 1, ty: 'cpu', p: 'x', v: 1, src: 's', name: 'n', a: 1, b: 2, from: 35, peak: 60, to: 50, d: '−8' });
      const stripped = parseRich(filled).map((s) => s.text).join('');
      if (kinds(v)) {
        marked++;
        expect(stripped, k).not.toMatch(/[{}]/);
      }
    }
    expect(marked).toBeGreaterThan(60);
  });
  it('rich renderer helpers', () => {
    expect(RICH_KINDS).toContain('type');
    setLang('en');
    const src = '{perf:+8 Perf} per {type:cpu} card, {clock:×1.5 Clock}\n{heat:+1}';
    expect(plain(src)).toBe('+8 Perf per CPU card, ×1.5 Clock · +1');
    const r = richRuns('A {perf:+8} B {clock:×2}');
    expect(r.plain).toBe('A +8 B ×2');
    expect(r.runs.map((x) => r.plain.slice(x.a, x.b))).toEqual(['+8', '×2']);
    expect(fmt('{perf:+{n} Perf} per {type:{ty}} card', { n: 3, ty: 'gpu' })).toBe('{perf:+3 Perf} per {type:gpu} card');
    setLang('de');
    expect(plain('{type:io}-Karten')).toBe('I/O-Karten');
    setLang('en');
  });
});
