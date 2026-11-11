/**
 * Dev-only test tools (P5), available as window.__st / __audit / __all:
 *  - `__st(name, lang?)`  jumps to a screen with a fresh run
 *                         (title | select | bench | receipt | shop | workbench | gameover)
 *  - `__audit()`          DOM: touch targets < 44 px, font < 9.5 px, overflowing texts
 *  - `__all(langs?)`      runs all of that over all screens; also lists three.js text < 9.5 vpx
 *                         (`__textCheck`) and distorted sprites (`__aspectCheck`)
 * Not part of the production build (guarded by import.meta.env.DEV in main.ts).
 */
import { game } from '../game/game';
import * as R from '../core/run';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type W = Window & Record<string, unknown>;

async function st(name: string, lang?: 'en' | 'de'): Promise<void> {
  const g = game;
  if (lang) {
    g.settings.lang = lang;
    g.applySettings();
  }
  if (name === 'title') {
    g.run = null;
    g.show('title');
    return;
  }
  g.run = R.newRun('shot1');
  if (name === 'select') return g.route();
  R.startBenchmark(g.run);
  if (name === 'bench') return g.route();
  const run = g.run;
  const b = run.bench!;
  if (name === 'gameover') {
    b.result = 'lost';
    b.lossReason = 'target';
    run.gameOver = { reason: 'target' as const, gen: run.gen, kind: b.kind, boss: b.boss, score: b.score, target: b.target };
    run.phase = 'gameover';
    return g.route();
  }
  b.score = b.target - 1;
  R.playCards(run, [b.hand[0]!]);
  if (name === 'receipt') return g.route();
  R.collectReceipt(run);
  if (name === 'shop') return g.route();
  R.goWorkbench(run);
  g.route();
}

interface Audit {
  overlap: string[];
  small: string[];
  tiny: string[];
  over: string[];
}

function audit(): Audit {
  const scope = document.querySelector<HTMLElement>('.sheet') ?? document.getElementById('ui')!; // an open sheet covers the screen
  const out: Audit = { small: [], tiny: [], over: [], overlap: [] };
  const hits: Array<{ x0: number; y0: number; x1: number; y1: number; tag: string }> = [];
  const s = game.engine.vp.s;
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>('*'))) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
    const tag = (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ').join('.') : el.tagName) + ':' + (el.textContent ?? '').trim().slice(0, 24);
    if (own) {
      const fs = parseFloat(cs.fontSize) * game.engine.vp.s;
      if (fs < 9.5 * Math.min(1, game.engine.vp.s) - 0.01 || parseFloat(cs.fontSize) < 9.5 - 0.01) out.tiny.push(`${parseFloat(cs.fontSize)} ${tag}`);
      // text (or children) sticking out of the element box (the ::after hit extender is not part of the range)
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const cr = rg.getBoundingClientRect();
      if (cr.width > 0 && (cr.right > r.right + 1.5 || cr.left < r.left - 1.5 || cr.bottom > r.bottom + 1.5 || cr.top < r.top - 1.5)) out.over.push(`${(cr.right - r.right).toFixed(0)}/${(cr.bottom - r.bottom).toFixed(0)} ${tag}`);
    }
    if (el.tagName === 'BUTTON' || el.classList.contains('hit') || el.tagName === 'INPUT') {
      // effective hit box: .btn::after extends to 44 vpx
      const ext = el.classList.contains('btn') ? 44 * s : 0;
      const w = Math.max(r.width, ext);
      const hh = Math.max(r.height, ext);
      if (w < 43.5 || hh < 43.5) out.small.push(`${r.width.toFixed(0)}x${r.height.toFixed(0)} ${tag}`);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (!el.closest('.sheet') || true) hits.push({ x0: cx - w / 2, y0: cy - hh / 2, x1: cx + w / 2, y1: cy + hh / 2, tag });
    }
  }
  // overlapping hit areas of different buttons: a tap could hit the wrong one
  // (only reported when the visible buttons themselves are closer than 4 px)
  for (let i = 0; i < hits.length; i++)
    for (let j = i + 1; j < hits.length; j++) {
      const a = hits[i]!;
      const b = hits[j]!;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 1 && oy > 1) out.overlap.push(`${ox.toFixed(0)}x${oy.toFixed(0)} ${a.tag} | ${b.tag}`);
    }
  return out;
}

async function all(langs: Array<'en' | 'de'> = ['en'], screens = ['title', 'select', 'bench', 'receipt', 'shop', 'workbench', 'gameover']) {
  const w = window as unknown as W & { __textCheck: () => string[]; __aspectCheck: () => string[] };
  const res: Record<string, unknown> = {};
  for (const l of langs)
    for (const n of screens) {
      await st(n, l);
      await sleep(1700);
      const a = audit();
      res[`${l}:${n}`] = { ...a, text: w.__textCheck(), aspect: w.__aspectCheck() };
    }
  return res;
}

Object.assign(window, { __st: st, __audit: audit, __all: all });
