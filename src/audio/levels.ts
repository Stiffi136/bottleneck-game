/**
 * Central level table for all audio (peak level per sound in dB, 0 dB = full scale
 * before the master gain). Tune loudness here only. Documented in docs/implementation-notes.md.
 */
export const LEVELS_DB = {
  // UI
  click: -26,
  hover: -38,
  select: -21,
  deselect: -23,
  deal: -27,
  error: -17,
  // scoring ladder
  tick: -29,
  perf: -15,
  clock: -16,
  xclock: -6,
  money: -16,
  // events
  slam: -9,
  snap: -10,
  thud: -13,
  throttle: -18,
  shutdown: -12,
  bsod: -8,
  win: -13,
  lose: -13,
  // shop / receipt
  cash: -12,
  coin: -16,
  printer: -31,
  pack: -15,
  frost: -26,
  // hardware
  beep: -14,
  boot: -15,
  // continuous
  fanMax: -23,
  music: -25,
} as const;

export type LevelKey = keyof typeof LEVELS_DB;

export const db = (x: number): number => Math.pow(10, x / 20);
export const lv = (k: LevelKey): number => db(LEVELS_DB[k]);

/** Fan level (0..1) in the workbench while the PC runs (POST ok). Bench uses 0.15..1 by temperature. */
export const FAN_IDLE = 0.1;
/** Maximum simultaneous voices; further sounds are dropped. */
export const MAX_VOICES = 40;
