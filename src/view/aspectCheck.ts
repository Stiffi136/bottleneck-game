import { Node, Sprite, Text } from '../render/scene';

/**
 * Debug check: pixel-art sprites must never be distorted. For every sprite
 * below `root` the displayed aspect ratio (incl. all parent scales) is
 * compared with the natural ratio of its region (contentBBox / cell). A
 * deviation above `tol` is reported in the console. 9-slice sprites are
 * skipped (they stretch by design); so are sprites marked `stretchOk`
 * (plain colour bars).
 *
 * Runs only in dev builds (see callers); `window.__aspectCheck()` checks the
 * current screen on demand.
 */
export function checkAspect(root: Node, where: string, tol = 0.02): string[] {
  const bad: string[] = [];
  const walk = (n: Node) => {
    if (!n.visible) return;
    if (n instanceof Sprite && n.nine === 0 && !n.stretchOk) {
      const m = n.wm;
      const dw = Math.hypot(m[0], m[1]) * n.w;
      const dh = Math.hypot(m[2], m[3]) * n.h;
      const rr = n.regionRect;
      if (dw > 0.5 && dh > 0.5 && rr.w > 0 && rr.h > 0) {
        const dev = dw / dh / (rr.w / rr.h) - 1;
        if (Math.abs(dev) > tol) bad.push(`${n.frames[0]?.name ?? '?'} ${(dev * 100).toFixed(1)} % (${dw.toFixed(1)}×${dh.toFixed(1)}, natural ${rr.w.toFixed(0)}×${rr.h.toFixed(0)})`);
      }
    }
    for (const c of n.children) walk(c);
  };
  walk(root);
  if (bad.length) console.warn(`[aspect] ${where}: ${bad.length} distorted sprite(s)\n` + bad.join('\n'));
  return bad;
}

/** Dev only: checks `root` once after the next frames were rendered. */
export function checkAspectSoon(root: Node, where: string): void {
  if (!import.meta.env.DEV) return;
  window.setTimeout(() => checkAspect(root, where), 120);
}

if (import.meta.env.DEV) {
  (window as unknown as { __aspectCheck: () => string[] }).__aspectCheck = () => {
    const g = (window as unknown as { __game?: { engine: { current: { root: Node } | null } } }).__game;
    const root = g?.engine.current?.root;
    return root ? checkAspect(root, 'manual') : [];
  };
}

/**
 * Debug check: three.js text smaller than `min` virtual px (incl. parent
 * scales). `window.__textCheck()` lists them for the current screen.
 */
export function checkTextSize(root: Node, min = 9.5): string[] {
  const bad: string[] = [];
  const walk = (n: Node) => {
    if (!n.visible) return;
    if (n instanceof Text && n.text.trim() && n.walpha > 0.05) {
      const eff = n.size * Math.hypot(n.wm[0], n.wm[1]);
      if (eff < min - 0.01) bad.push(`${eff.toFixed(1)} "${n.text.replace(/\n/g, ' ').slice(0, 28)}"`);
    }
    for (const c of n.children) walk(c);
  };
  walk(root);
  return bad;
}

if (import.meta.env.DEV) {
  (window as unknown as { __textCheck: (min?: number) => string[] }).__textCheck = (min = 9.5) => {
    const g = (window as unknown as { __game?: { engine: { current: { root: Node } | null } } }).__game;
    const root = g?.engine.current?.root;
    return root ? checkTextSize(root, min) : [];
  };
}
