import { en, type Dict } from './en';
import { de } from './de';

export type Lang = 'en' | 'de';
export const LANGS: Record<Lang, Dict> = { en, de };

let current: Dict = en;
let currentLang: Lang = 'en';
const listeners = new Set<() => void>();

export function setLang(lang: Lang): void {
  currentLang = lang;
  current = LANGS[lang] ?? en;
  document.documentElement.lang = lang;
  for (const l of listeners) l();
}

export function lang(): Lang {
  return currentLang;
}

/** The active dictionary, fully typed: `L().ui.play`. */
export function L(): Dict {
  return current;
}

export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Replaces {name} placeholders. */
export function fmt(s: string, params: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v === undefined) return `{${k}}`;
    return typeof v === 'number' ? num(v) : v;
  });
}

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = current.locale + JSON.stringify(opts);
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(current.locale, opts);
    nfCache.set(key, f);
  }
  return f;
}

/** Locale number format (1,234 / 1.234). Decimals only when needed. */
export function num(n: number, maxFrac = 1): string {
  if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
  return nf({ maximumFractionDigits: Number.isInteger(n) ? 0 : maxFrac }).format(n);
}

/** Compact number for big scores: 12,345 → 12,345; 1,234,567 → 1.23M (en) / 1,23 Mio. (de). */
export function big(n: number): string {
  if (Math.abs(n) < 1e6) return num(Math.floor(n));
  if (Math.abs(n) >= 1e15) return n.toExponential(2).replace('e+', 'e');
  return nf({ notation: 'compact', maximumSignificantDigits: 3 }).format(n);
}

export function money(n: number): string {
  return n < 0 ? `−$${num(-n)}` : `$${num(n)}`;
}
