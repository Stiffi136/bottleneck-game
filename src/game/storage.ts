import { SAVE_VERSION, type RunState } from '../core/run';
import type { Lang } from '../i18n';

export interface Settings {
  lang: Lang;
  volume: number;
  muted: boolean;
  fan: boolean;
  music: boolean;
  speed: 1 | 2 | 4;
  scorePreview: boolean;
  shake: boolean;
  crt: boolean;
  lefty: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  volume: 0.7,
  muted: false,
  fan: true,
  music: true,
  speed: 1,
  scorePreview: false,
  shake: true,
  crt: false,
  lefty: false,
};

const K_SETTINGS = 'bottleneck.settings.v1';
const K_RUN = 'bottleneck.run.v1';
const K_BEST = 'bottleneck.best.v1';

function read<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked – the game still works */
  }
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(K_SETTINGS) ?? {};
  const merged = { ...DEFAULT_SETTINGS, ...s };
  if (merged.lang !== 'en' && merged.lang !== 'de') merged.lang = 'en';
  if (![1, 2, 4].includes(merged.speed)) merged.speed = 1;
  return merged;
}

export function saveSettings(s: Settings): void {
  write(K_SETTINGS, s);
}

export function loadRun(): RunState | null {
  const r = read<RunState>(K_RUN);
  if (!r || r.v !== SAVE_VERSION || !r.build || !Array.isArray(r.deck)) return null;
  if (r.phase === 'gameover') return null;
  return r;
}

export function saveRun(r: RunState | null): void {
  if (!r || r.phase === 'gameover') {
    try {
      localStorage.removeItem(K_RUN);
    } catch {
      /* ignore */
    }
    return;
  }
  write(K_RUN, r);
}

export interface BestEntry {
  gen: number;
  seed: string;
  best: number;
  date: number;
}

export function loadBest(): BestEntry[] {
  return read<BestEntry[]>(K_BEST) ?? [];
}

/** Adds a finished run; returns true if it is a new record. */
export function addBest(e: BestEntry): boolean {
  const list = loadBest();
  const record = list.length === 0 || e.gen > Math.max(...list.map((x) => x.gen));
  list.push(e);
  list.sort((a, b) => b.gen - a.gen || b.best - a.best);
  write(K_BEST, list.slice(0, 5));
  return record;
}
