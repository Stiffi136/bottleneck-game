import type { BenchKind } from './types';

/**
 * Difficulty curve (GDD 15.1). The constants are tunable; see
 * docs/implementation-notes.md for the balancing history.
 */
export const CURVE = {
  start: 300,
  growth: 1.8, // per generation up to the acceleration point (GDD start value: 2.2)
  accelFrom: 8,
  accelStep: 0.4, // growth += accelStep per generation after accelFrom
};

/** Base score of a generation (unrounded). */
export function baseScore(gen: number): number {
  let b = CURVE.start;
  for (let g = 2; g <= gen; g++) {
    b *= g <= CURVE.accelFrom ? CURVE.growth : CURVE.growth + CURVE.accelStep * (g - CURVE.accelFrom);
  }
  return b;
}

/** Rounds to 2 significant digits (display and actual target). */
export function round2(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

export function isFinaleGen(gen: number): boolean {
  return gen % 8 === 0;
}

export function benchFactor(kind: BenchKind, gen: number): number {
  if (kind === 'office') return 1;
  if (kind === 'gaming') return 1.5;
  return isFinaleGen(gen) ? 3 : 2;
}

export function targetFor(gen: number, kind: BenchKind): number {
  return round2(baseScore(gen) * benchFactor(kind, gen));
}

export const BENCH_KINDS: readonly BenchKind[] = ['office', 'gaming', 'boss'];

/** GDD 7.1 */
export function rewardFor(kind: BenchKind): number {
  return kind === 'office' ? 3 : kind === 'gaming' ? 4 : 5;
}

/** GDD 7.1: +$1 per full $5, max +$5. */
export function interestFor(money: number): number {
  return Math.max(0, Math.min(5, Math.floor(money / 5)));
}

/** GDD 14.2 – tier weights of the hardware shelf [T1, T2, T3, T4]. */
export function tierWeights(gen: number): [number, number, number, number] {
  if (gen <= 1) return [70, 30, 0, 0];
  if (gen === 2) return [50, 40, 10, 0];
  if (gen === 3) return [30, 45, 20, 5];
  if (gen === 4) return [15, 40, 30, 15];
  return [10, 30, 35, 25];
}

/** Sell value (GDD 7.1). */
export function sellValue(price: number): number {
  if (price <= 0) return 1;
  return Math.max(1, Math.floor(price / 2));
}
