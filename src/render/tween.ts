/** Minimal promise-based tween engine driven by the game loop. */

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} satisfies Record<string, Ease>;

interface Tween {
  target: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  dur: number;
  t: number;
  delay: number;
  ease: Ease;
  resolve: () => void;
  onUpdate?: (k: number) => void;
  dead: boolean;
}

interface Timer {
  t: number;
  resolve: () => void;
  dead: boolean;
  owner?: object;
}

const tweens: Tween[] = [];
const timers: Timer[] = [];
/** Global speed multiplier (settings: 1×/2×/4×). */
export const timeScale = { value: 1 };

export interface TweenOpts {
  dur?: number;
  delay?: number;
  ease?: Ease;
  onUpdate?: (k: number) => void;
  /** ignore the game speed setting */
  real?: boolean;
}

export function tween<T extends object>(target: T, to: Partial<Record<keyof T, number>>, opts: TweenOpts = {}): Promise<void> {
  return new Promise((resolve) => {
    const tw: Tween = {
      target: target as unknown as Record<string, number>,
      from: {},
      to: to as Record<string, number>,
      dur: Math.max(0.0001, opts.dur ?? 0.25),
      t: 0,
      delay: opts.delay ?? 0,
      ease: opts.ease ?? ease.outCubic,
      resolve,
      onUpdate: opts.onUpdate,
      dead: false,
    };
    tweens.push(tw);
  });
}

export function killTweens(target: object): void {
  for (const tw of tweens) {
    if (tw.target === target) {
      tw.dead = true;
      tw.resolve();
    }
  }
}

export function wait(sec: number, owner?: object): Promise<void> {
  return new Promise((resolve) => timers.push({ t: sec, resolve, dead: false, owner }));
}

export function cancelWaits(owner: object): void {
  for (const t of timers) if (t.owner === owner) t.dead = true;
}

export function updateTweens(dtReal: number): void {
  const dt = dtReal * timeScale.value;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]!;
    if (tw.dead) {
      tweens.splice(i, 1);
      continue;
    }
    if (tw.delay > 0) {
      tw.delay -= dt;
      if (tw.delay > 0) continue;
    }
    if (tw.t === 0) for (const k of Object.keys(tw.to)) tw.from[k] = tw.target[k]!;
    tw.t = Math.min(tw.dur, tw.t + dt);
    const k = tw.ease(tw.t / tw.dur);
    for (const key of Object.keys(tw.to)) tw.target[key] = tw.from[key]! + (tw.to[key]! - tw.from[key]!) * k;
    tw.onUpdate?.(k);
    if (tw.t >= tw.dur) {
      tweens.splice(i, 1);
      tw.resolve();
    }
  }
  for (let i = timers.length - 1; i >= 0; i--) {
    const t = timers[i]!;
    if (t.dead) {
      timers.splice(i, 1);
      continue;
    }
    t.t -= dt;
    if (t.t <= 0) {
      timers.splice(i, 1);
      t.resolve();
    }
  }
}

export function activeTweens(): number {
  return tweens.length;
}
