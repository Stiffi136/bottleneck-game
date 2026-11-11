import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { de } from '../src/i18n/de';
import { ALL_PARTS } from '../src/core/data/hardware';

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
});
