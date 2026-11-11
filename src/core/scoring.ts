import { partOf } from './data/hardware';
import { profileValues } from './data/content';
import { detectProfile } from './profiles';
import {
  caseOf,
  coolerOf,
  cpuOf,
  drives,
  effectiveOc,
  exps,
  fans,
  gpuInst,
  ramKits,
  type BuildStats,
} from './build';
import type { BossId, Build, Card, CardType, ProfileId, SoftwareId, SoftwareInst } from './types';

export type Src =
  | { kind: 'profile' }
  | { kind: 'card' }
  | { kind: 'part'; uid: number; id: string }
  | { kind: 'builtin'; id: string } // case builtin fans
  | { kind: 'sw'; uid: number; id: SoftwareId }
  | { kind: 'heat' }
  | { kind: 'boss' };

export type ScoreEvent =
  | { k: 'profile'; l: number; t: number }
  | { k: 'cardStart'; card: number }
  | { k: 'L'; add: number; l: number; src: Src; card?: number }
  | { k: 'T'; add: number; t: number; src: Src; card?: number }
  | { k: 'xT'; mul: number; t: number; src: Src; card?: number }
  | { k: 'money'; add: number; src: Src; card?: number }
  | { k: 'counter'; uid: number; value: number; card?: number }
  | { k: 'cardEnd'; card: number }
  | { k: 'global' }
  | { k: 'nullify'; reason: 'f1' };

export interface ScoreCtx {
  build: Build;
  stats: BuildStats;
  software: readonly SoftwareInst[];
  driverLevels: Partial<Record<ProfileId, number>>;
  boss: BossId | null;
  temp: number; // temperature before this play
  disabled: ReadonlySet<number>; // brownout
  cpuBrownout: boolean;
  captureSoFar: number;
  freeSwSlots: number;
}

export interface HeatResult {
  perCard: number[];
  total: number;
  after: number;
  throttled: boolean;
  shutdown: boolean;
}

export interface PlayEval {
  profile: ProfileId;
  profileLevel: number;
  profileCards: number[];
  scored: number[]; // indices of scored cards
  heat: HeatResult;
  events: ScoreEvent[];
  l: number;
  t: number;
  score: number;
  money: number;
  gpuCards: number;
  nullified: boolean;
}

export const IDLE_TEMP = 35;
export const THROTTLE_TEMP = 85;
export const SHUTDOWN_TEMP = 100;

const has = (sw: readonly SoftwareInst[], id: SoftwareId) => sw.some((s) => s.id === id);

/** Lane / brownout / broken factor of a part (1, 0.5 or 0). */
function factor(ctx: ScoreCtx, uid: number): number {
  if (ctx.disabled.has(uid)) return 0;
  const lane = ctx.stats.lanes.get(uid);
  if (!lane) return 1;
  return lane.status === 'ok' ? 1 : lane.status === 'throttled' ? 0.5 : 0;
}

function functionalGpu(ctx: ScoreCtx) {
  const g = gpuInst(ctx.build);
  if (!g || g.broken || factor(ctx, g.uid) === 0) return null;
  return { inst: g, def: partOf(g.id, 'gpu') };
}

/** Heat of each played card and the resulting temperature (GDD 7.3, 5.2). */
export function computeHeat(ctx: ScoreCtx, cards: readonly Card[]): HeatResult {
  const b = ctx.build;
  const sw = ctx.software;
  const swIds = sw.map((s) => s.id);
  const ocHeat = has(sw, 'sw7') ? 2 : 1;
  const cpu = cpuOf(b);
  const cpuOc = b.cpu ? effectiveOc(b, b.cpu, swIds) : 0;
  const gpu = functionalGpu(ctx);
  const gpuOc = gpu ? effectiveOc(b, gpu.inst, swIds) : 0;
  const krypto = sw.filter((s) => s.id === 'sw11').length;
  const perCard = cards.map((c, i) => {
    let h: number;
    switch (c.type) {
      case 'cpu':
        h = (cpu?.heat ?? 3) + cpuOc * ocHeat;
        break;
      case 'gpu':
        h = gpu ? gpu.def.heat + gpuOc * ocHeat : 1;
        h += 2 * krypto;
        break;
      default:
        h = 1;
    }
    if (c.enh === 'oc') h += 1;
    if (has(sw, 'sw16')) h = Math.max(0, h - 1);
    if (ctx.boss === 'b2') h *= 2;
    if (ctx.boss === 'b6' && c.type === 'gpu') h *= 3;
    if (ctx.boss === 'f1') h *= 1.5;
    if (c.enh === 'eff') h = 0;
    if (cpu?.special === 'ecores' && i >= 5) h = 0;
    return h;
  });
  const total = Math.ceil(perCard.reduce((s, h) => s + h, 0));
  const after = ctx.temp + total;
  return { perCard, total, after, throttled: after >= THROTTLE_TEMP, shutdown: after >= SHUTDOWN_TEMP };
}

/**
 * Evaluates one play (GDD 6.2/6.3). Pure: no randomness. The benchmark layer
 * applies shutdown/bluescreen/instability on top.
 */
export function evaluatePlay(ctx: ScoreCtx, cards: readonly Card[]): PlayEval {
  const b = ctx.build;
  const sw = ctx.software;
  const swIds = sw.map((s) => s.id);
  const heat = computeHeat(ctx, cards);
  const temp = heat.after;
  const events: ScoreEvent[] = [];

  // B11: first card is not scored and does not count for the profile
  const scoredIdx = cards.map((_, i) => i).filter((i) => !(ctx.boss === 'b11' && i === 0));
  const scoredCards = scoredIdx.map((i) => cards[i]!);
  const prof = detectProfile(scoredCards);
  const level = ctx.driverLevels[prof.id] ?? 1;
  const pv = profileValues(prof.id, level);
  let L = pv.l;
  let T = pv.t;
  events.push({ k: 'profile', l: L, t: T });

  const addL = (add: number, src: Src, card?: number) => {
    if (!add) return;
    L += add;
    events.push({ k: 'L', add, l: L, src, card });
  };
  const addT = (add: number, src: Src, card?: number) => {
    if (!add) return;
    T += add;
    events.push({ k: 'T', add, t: T, src, card });
  };
  const mulT = (mul: number, src: Src, card?: number) => {
    if (mul === 1) return;
    T *= mul;
    events.push({ k: 'xT', mul, t: T, src, card });
  };

  const ocMult = has(sw, 'sw7') ? 2 : 1;
  const cpu = cpuOf(b);
  const cpuOc = b.cpu ? effectiveOc(b, b.cpu, swIds) : 0;
  const gpu = functionalGpu(ctx);
  const gpuOc = gpu ? effectiveOc(b, gpu.inst, swIds) : 0;
  const ram = ctx.stats.ram;
  const kits = ramKits(b).filter((k) => factor(ctx, k.uid) > 0);
  const drvs = drives(b);
  const expCards = exps(b);
  const showcase = caseOf(b)?.special === 'showcase';
  const rgbMul = showcase ? 2 : 1;
  const krysis = ctx.boss === 'b1';
  let money = 0;
  let gpuCards = 0;
  const partSrc = (uid: number, id: string): Src => ({ kind: 'part', uid, id });

  const ioBonus = (ci: number) => {
    for (const d of drvs) {
      const f = factor(ctx, d.uid);
      if (f) addL(partOf(d.id, 'drive').l * f, partSrc(d.uid, d.id), ci);
    }
    for (const e of expCards) {
      const ed = partOf(e.id, 'exp');
      const f = factor(ctx, e.uid);
      if (ed.effect === 'nic' && f) addT(2 * f, partSrc(e.uid, e.id), ci);
    }
  };

  for (const ci of scoredIdx) {
    const c = cards[ci]!;
    events.push({ k: 'cardStart', card: ci });
    // 1. level
    addL(c.level, { kind: 'card' }, ci);
    // 2. enhancement
    if (c.enh === 'oc') addT(3, { kind: 'card' }, ci);
    if (c.enh === 'opt') addL(20, { kind: 'card' }, ci);
    if (c.enh === 'eff') addL(5, { kind: 'card' }, ci);
    if (c.enh === 'unst') mulT(2, { kind: 'card' }, ci);
    // 3. hardware trigger of the card type
    if (!krysis || c.type === 'gpu') {
      hardwareTrigger(c.type, ci);
    }
    if (c.type === 'gpu') gpuCards++;
    // 4. software per card (left to right)
    for (const s of sw) {
      const src: Src = { kind: 'sw', uid: s.uid, id: s.id };
      if (s.id === 'sw2' && c.type === 'cpu') addT(2, src, ci);
      if (s.id === 'sw4' && c.type === 'ram' && !krysis) ioBonus(ci);
      if (s.id === 'sw12' && c.type === 'gpu') {
        events.push({ k: 'counter', uid: s.uid, value: s.counter + gpuCards, card: ci });
      }
    }
    events.push({ k: 'cardEnd', card: ci });
  }

  function hardwareTrigger(type: CardType, ci: number) {
    switch (type) {
      case 'cpu':
        if (cpu && b.cpu) addL(cpu.lPerCard + cpuOc * ocMult, partSrc(b.cpu.uid, b.cpu.id), ci);
        break;
      case 'gpu': {
        if (gpu) {
          const f = factor(ctx, gpu.inst.uid);
          addL((gpu.def.l + 3 * gpuOc * ocMult) * f, partSrc(gpu.inst.uid, gpu.inst.id), ci);
          addT(gpu.def.t * f, partSrc(gpu.inst.uid, gpu.inst.id), ci);
        } else if (cpu && b.cpu && cpu.igpu > 0) {
          addL(cpu.igpu, partSrc(b.cpu.uid, b.cpu.id), ci);
        }
        if (cpu?.special === 'cache3d' && b.cpu) addT(2, partSrc(b.cpu.uid, b.cpu.id), ci);
        for (const e of expCards) {
          const ed = partOf(e.id, 'exp');
          if (ed.effect === 'capture' && factor(ctx, e.uid) > 0 && ctx.captureSoFar + money < 3) {
            money += 1;
            events.push({ k: 'money', add: 1, src: partSrc(e.uid, e.id), card: ci });
          }
        }
        break;
      }
      case 'ram':
        if (kits.length) {
          const k = kits[0]!;
          addL(ram.l + ram.ocL * ocMult, partSrc(k.uid, k.id), ci);
          addT(ram.t, partSrc(k.uid, k.id), ci);
        }
        break;
      case 'io':
        ioBonus(ci);
        break;
    }
  }

  events.push({ k: 'global' });
  // 3. hardware global: board → CPU base clock → cooler → case → fans → expansion cards
  if (cpu && b.cpu) {
    addT(cpu.takt + cpuOc * ocMult, partSrc(b.cpu.uid, b.cpu.id));
    if (cpu.special === 'turbo') addT(Math.max(0, Math.floor((temp - 50) / 10)), partSrc(b.cpu.uid, b.cpu.id));
  }
  const cooler = coolerOf(b);
  if (cooler?.special === 'lcd' && b.cooler && factor(ctx, b.cooler.uid)) addT(2, partSrc(b.cooler.uid, b.cooler.id));
  const cs = caseOf(b);
  if (cs) {
    for (const f of cs.builtinFans) {
      const fd = partOf(f, 'fan');
      if (fd.takt) addT(fd.takt * (fd.rgb ? rgbMul : 1), { kind: 'builtin', id: f });
    }
  }
  for (const f of fans(b)) {
    const fd = partOf(f.id, 'fan');
    if (fd.takt && factor(ctx, f.uid)) addT(fd.takt * (fd.rgb ? rgbMul : 1), partSrc(f.uid, f.id));
  }
  for (const e of expCards) {
    const ed = partOf(e.id, 'exp');
    const f = factor(ctx, e.uid);
    if (ed.effect === 'sound' && f && cards.length === 5) addT(6 * f, partSrc(e.uid, e.id));
  }

  // 4. software global (left to right)
  const dlss = !!gpu?.def.dlss;
  for (const s of sw) {
    const src: Src = { kind: 'sw', uid: s.uid, id: s.id };
    switch (s.id) {
      case 'sw1':
        addT(4, src);
        break;
      case 'sw3':
        if (gpuCards > 0) mulT(dlss ? 2 : 1.5, src);
        break;
      case 'sw6':
        if (temp >= 70) mulT(2, src);
        break;
      case 'sw8':
        addT(2 * ctx.stats.rgbCount * rgbMul, src);
        break;
      case 'sw9':
        addT(3 * ctx.freeSwSlots, src);
        break;
      case 'sw10':
        addT(s.counter, src);
        break;
      case 'sw12':
        addL(s.counter + gpuCards, src);
        break;
      case 'sw15':
        addL(temp, src);
        break;
      case 'sw19':
        if (prof.id === 'pipeline' || prof.id === 'optpipe') addL(40, src);
        break;
      default:
        break;
    }
  }

  // 5. throttling
  if (heat.throttled) mulT(0.5, { kind: 'heat' });
  if (ctx.cpuBrownout && b.cpu) mulT(0.5, { kind: 'boss' });

  let nullified = false;
  if (ctx.boss === 'f1' && gpuCards === 0) {
    nullified = true;
    events.push({ k: 'nullify', reason: 'f1' });
  }

  const score = nullified ? 0 : Math.floor(L * T + 1e-9);
  return {
    profile: prof.id,
    profileLevel: level,
    profileCards: prof.cardIds,
    scored: scoredIdx,
    heat,
    events,
    l: L,
    t: T,
    score,
    money,
    gpuCards,
    nullified,
  };
}

/** Parts that the brownout boss switches off (GDD B8). */
export function brownout(b: Build, stats: BuildStats): { disabled: number[]; cpuThrottled: boolean } {
  const watt = stats.watt * 0.6;
  let tdp = stats.tdp;
  const cand = [...stats.partTdp.entries()]
    .filter(([uid]) => {
      const inst = [b.cpu, b.cooler, ...b.pcie, ...b.m2, ...b.sata, ...b.ram, ...b.fans].find((p) => p?.uid === uid);
      return !!inst;
    })
    .sort((a, b2) => b2[1] - a[1]);
  const disabled: number[] = [];
  let cpuThrottled = false;
  for (const [uid, w] of cand) {
    if (tdp <= watt) break;
    if (b.cpu?.uid === uid) {
      cpuThrottled = true;
      tdp -= w / 2;
    } else {
      disabled.push(uid);
      tdp -= w;
    }
  }
  return { disabled, cpuThrottled };
}

