/**
 * Simple heuristic bot used by the balancing simulation (npm run sim) and by
 * the browser self-test. It only uses public run actions.
 */
import { part } from '../core/data/hardware';
import { softwareDef } from '../core/data/content';
import { computeStats } from '../core/build';
import { postOk, shopBadge, slotOptions } from '../core/compat';
import { evaluatePlay, type ScoreCtx } from '../core/scoring';
import {
  activeSoftware,
  buyHardware,
  buyPack,
  buySoft,
  card,
  choosePack,
  collectReceipt,
  discardCards,
  freeSwSlots,
  goWorkbench,
  installPart,
  leaveWorkbench,
  ocAllowed,
  playCards,
  repairPart,
  brokenParts,
  rerollCost,
  rerollShop,
  scoreCtx,
  sellPart,
  setOc,
  stabilityTest,
  startBenchmark,
  statsOf,
  swIds,
  useTool,
  type RunState,
} from '../core/run';
import { installed } from '../core/build';
import type { Card, CardType } from '../core/types';
import { Rng } from '../core/rng';

function* subsets(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield acc.slice();
    return;
  }
  for (let i = start; i <= n - (k - acc.length); i++) {
    acc.push(i);
    yield* subsets(n, k, i + 1, acc);
    acc.pop();
  }
}

export interface PlayChoice {
  ids: number[];
  score: number;
  throttled: boolean;
}

/** Best play of the current hand (deterministic estimate). */
export function bestPlay(run: RunState): PlayChoice | null {
  const b = run.bench!;
  const ctx: ScoreCtx = scoreCtx(run);
  const hand = b.hand.map((id) => card(run, id));
  const maxK = Math.min(b.cores, hand.length);
  const minK = b.boss === 'b3' ? maxK : Math.max(1, maxK - 2);
  let best: PlayChoice | null = null;
  for (let k = maxK; k >= minK; k--) {
    for (const idx of subsets(hand.length, k)) {
      const cards = idx.map((i) => hand[i]!);
      const ev = evaluatePlay(ctx, cards);
      if (ev.heat.shutdown) continue;
      let s = ev.score;
      // keep some headroom: avoid throttling when the benchmark is not almost done
      if (ev.heat.after >= 80 && b.hands > 1) s *= 0.8;
      if (!best || s > best.score) best = { ids: cards.map((c) => c.id), score: s, throttled: ev.heat.throttled };
    }
  }
  return best;
}

export function botBenchmarkStep(run: RunState): void {
  const b = run.bench!;
  const best = bestPlay(run);
  const need = b.target - b.score;
  if (!best) {
    // everything shuts down: discard if possible, else play the single coolest card
    if (b.discards > 0) {
      discardCards(run, b.hand.slice(0, Math.min(5, b.hand.length)));
      return;
    }
    const tool = run.tools.indexOf('t3');
    if (tool >= 0) {
      useTool(run, tool);
      return;
    }
    playCards(run, [b.hand[0]!]);
    return;
  }
  const t3 = run.tools.indexOf('t3');
  if (t3 >= 0 && b.temp >= 70) {
    useTool(run, t3);
    return;
  }
  if (best.score * b.hands < need && b.discards > 0 && b.draw.length > 0) {
    const keep = new Set(best.ids);
    const toss = b.hand.filter((id) => !keep.has(id));
    const lowest = (toss.length ? toss : b.hand)
      .map((id) => card(run, id))
      .sort((x, y) => x.level - y.level)
      .slice(0, 5)
      .map((c) => c.id);
    if (lowest.length) {
      discardCards(run, lowest);
      return;
    }
  }
  playCards(run, best.ids);
}

// ---------------------------------------------------------------- shop

const CANON: Record<number, Array<[CardType, number]>> = {
  1: [['gpu', 8]],
  4: [['gpu', 7], ['cpu', 7], ['ram', 6], ['io', 8]],
  5: [['gpu', 5], ['cpu', 6], ['ram', 7], ['io', 8], ['gpu', 9]],
  6: [['gpu', 5], ['cpu', 6], ['ram', 7], ['io', 8], ['gpu', 9], ['cpu', 9]],
  7: [['gpu', 5], ['cpu', 6], ['ram', 7], ['io', 8], ['gpu', 9], ['cpu', 9], ['gpu', 3]],
  8: [['gpu', 5], ['cpu', 6], ['ram', 7], ['io', 8], ['gpu', 9], ['cpu', 9], ['gpu', 3], ['ram', 4]],
};

/** Heuristic value of the current build + software. */
export function buildValue(run: RunState, build = run.build): number {
  const opts = { software: swIds(run), pasteUses: run.pasteUses };
  if (!postOk(build, opts)) return -1;
  const stats = computeStats(build, opts);
  const k = Math.max(4, Math.min(8, stats.cores));
  const cards: Card[] = (CANON[k] ?? CANON[4]!).map(([type, level], i) => ({ id: 9000 + i, type, level }));
  const ctx: ScoreCtx = {
    build,
    stats,
    software: activeSoftware(run),
    driverLevels: run.drivers,
    boss: null,
    temp: 45,
    disabled: new Set(),
    cpuBrownout: false,
    captureSoFar: 0,
    freeSwSlots: freeSwSlots(run),
  };
  const ev = evaluatePlay(ctx, cards);
  let v = ev.score;
  const net = ev.heat.total - stats.cooling;
  if (net > 0) v *= Math.max(0.35, 1 - net / 40);
  if (ev.heat.shutdown) v *= 0.2;
  v *= 1 + (stats.handSize - 6) * 0.06;
  v *= 1 + stats.cooling * 0.01 + Math.min(stats.swSlots, 8) * 0.06;
  const cs = build.case ? part(build.case.id) : null;
  if (cs && cs.cat === 'case') v *= 1 + cs.tier * 0.04;
  return v;
}

function tryInstall(run: RunState, uid: number): boolean {
  const inst = run.storage.find((p) => p.uid === uid);
  if (!inst) return false;
  const base = buildValue(run);
  let best: { slot: Parameters<typeof installPart>[2]; v: number } | null = null;
  for (const o of slotOptions(run.build, inst, { software: swIds(run), pasteUses: run.pasteUses })) {
    if (o.status === 'bad') continue;
    const copy = structuredClone(run);
    const r = installPart(copy, uid, o.slot);
    if (!r.ok) continue;
    const v = buildValue(copy);
    if (v > base * 1.001 && (!best || v > best.v)) best = { slot: o.slot, v };
  }
  if (best) return installPart(run, uid, best.slot).ok;
  return false;
}

/** Tries all orders of installing storage parts (allows invalid intermediate steps). */
function assemble(run: RunState): void {
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (const p of [...run.storage]) if (tryInstall(run, p.uid)) improved = true;
    if (!improved) break;
  }
  // platform switch: board first, then the rest
  const boards = run.storage.filter((p) => part(p.id).cat === 'board');
  for (const bd of boards) {
    const copy = structuredClone(run);
    const opt = slotOptions(copy.build, bd).find((o) => o.slot.kind === 'board');
    if (!opt) continue;
    if (!installPart(copy, bd.uid, opt.slot).ok) continue;
    for (let pass = 0; pass < 3; pass++) {
      for (const p of [...copy.storage]) {
        for (const o of slotOptions(copy.build, p)) {
          if (o.status === 'bad') continue;
          const c2 = structuredClone(copy);
          if (!installPart(c2, p.uid, o.slot).ok) continue;
          const before = postOk(copy.build) ? buildValue(copy) : -1;
          if (buildValue(c2) > before || !postOk(copy.build)) {
            Object.assign(copy, c2);
            break;
          }
        }
      }
    }
    if (buildValue(copy) > buildValue(run)) Object.assign(run, copy);
  }
}

export function favouriteProfile(run: RunState): string {
  let best = '';
  let bestN = -1;
  for (const [p, n] of Object.entries(run.stats.profiles)) {
    const w = n + (run.drivers[p as keyof typeof run.drivers] ?? 1) * 3;
    if (w > bestN) {
      bestN = w;
      best = p;
    }
  }
  return best || 'hetero';
}

const env = (k: string, d: number): number => {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const v = p?.env?.[k];
  return v !== undefined ? Number(v) : d;
};
export const BOT = { reserve: env('BOT_RES', 0), perDollar: env('BOT_PD', 0.02), specReserve: env('BOT_SPEC', 10) };

export function botShop(run: RunState, rng: Rng): void {
  const s = run.shop!;
  // repair
  for (const p of brokenParts(run)) if (run.money >= 5) repairPart(run, p.uid);
  for (let round = 0; round < 3; round++) {
    // hardware
    for (let i = 0; i < s.hardware.length; i++) {
      const o = s.hardware[i];
      if (!o || o.price > run.money - (run.gen >= 2 ? BOT.reserve : 0)) continue;
      const badge = shopBadge(run.build, o.partId, { software: swIds(run), pasteUses: run.pasteUses });
      const d = part(o.partId);
      if (badge.status !== 'bad') {
        const copy = structuredClone(run);
        const r = buyHardware(copy, i);
        if (!r.ok) continue;
        if (!tryInstall(copy, r.inst.uid)) continue;
        const gain = buildValue(copy) / Math.max(1, buildValue(run));
        if ((gain - 1) / Math.max(1, o.price) >= BOT.perDollar) {
          const rr = buyHardware(run, i);
          if (rr.ok) tryInstall(run, rr.inst.uid);
        }
      } else if (
        run.storage.length < 2 &&
        d.tier >= 2 &&
        o.price <= run.money - BOT.specReserve &&
        ['board', 'cpu', 'ram', 'psu', 'case', 'gpu', 'cooler'].includes(d.cat)
      ) {
        buyHardware(run, i);
      }
    }
    assemble(run);
    // software / driver / tool
    const so = s.soft;
    if (so && so.price <= run.money) {
      if (so.kind === 'sw') {
        if (freeSwSlots(run) > 0 || softwareDef(so.id).noSlot) {
          const copy = structuredClone(run);
          if (buySoft(copy).ok && (buildValue(copy) / Math.max(1, buildValue(run)) - 1) / so.price >= BOT.perDollar * 0.5) buySoft(run);
        }
      } else if (so.kind === 'driver') {
        if (so.id === favouriteProfile(run)) buySoft(run);
      } else if (run.tools.length < 2 && run.money >= so.price + 4) buySoft(run);
    }
    // packs
    for (let i = 0; i < s.packs.length; i++) {
      const k = s.packs[i];
      if (!k || run.pack) continue;
      if (run.money < (k === 'software' ? 6 : 4) + (k === 'driver' ? 0 : 4)) continue;
      if (k === 'workload' && run.money < 12) continue;
      buyPack(run, i);
      const opts = run.pack!.options;
      let pick: number | null = null;
      if (k === 'driver') {
        const want = favouriteProfile(run);
        const j = opts.findIndex((o) => o.kind === 'driver' && o.id === want);
        if (j >= 0) pick = j;
        else {
          let bw = -1;
          opts.forEach((o, jj) => {
            if (o.kind !== 'driver') return;
            const w = (run.stats.profiles[o.id] ?? 0) + (run.drivers[o.id] ?? 1) * 3;
            if (w > bw) {
              bw = w;
              pick = jj;
            }
          });
          if (pick === null) pick = rng.int(opts.length);
        }
      }
      if (k === 'tool' && run.tools.length < 2) pick = 0;
      if (k === 'workload') {
        const rank = { opt: 3, unst: 4, oc: 2, eff: 1 } as const;
        let bestR = 0;
        opts.forEach((o, j) => {
          if (o.kind === 'card' && o.enh && rank[o.enh] > bestR) {
            bestR = rank[o.enh];
            pick = j;
          }
        });
      }
      if (k === 'software') {
        let bestV = buildValue(run);
        opts.forEach((_, j) => {
          const copy = structuredClone(run);
          if (choosePack(copy, j).ok) {
            const v = buildValue(copy);
            if (v > bestV) {
              bestV = v;
              pick = j;
            }
          }
        });
      }
      if (!choosePack(run, pick).ok) choosePack(run, null);
    }
    // use tools that do not need cards
    for (let t = run.tools.length - 1; t >= 0; t--) {
      if (run.tools[t] === 't1') useTool(run, t);
      else if (run.tools[t] === 't8' || run.tools[t] === 't9') useTool(run, t, { cards: run.shopCards.slice(0, 2) });
    }
    if (run.money > 18 && rerollCost(run) <= 3) rerollShop(run);
    else break;
  }
  // sell leftovers that are clearly obsolete, keep one slot free
  for (const p of [...run.storage]) {
    const d = part(p.id);
    if ((d.tier <= 1 && run.storage.length >= 2) || run.storage.length >= 3) sellPart(run, p.uid);
  }
}

export function botBios(run: RunState): void {
  for (const { inst } of installed(run.build)) {
    if (!ocAllowed(run, inst.uid)) continue;
    if (!inst.limitKnown && run.money >= 6) stabilityTest(run, inst.uid);
    const target = inst.limitKnown ? inst.limit : 1;
    const before = inst.oc;
    setOc(run, inst.uid, target);
    if (!postOk(run.build, { software: swIds(run), pasteUses: run.pasteUses })) setOc(run, inst.uid, before);
  }
}

/** Plays one complete run. Returns the reached generation. */
export function playRun(run: RunState, maxSteps = 20000): RunState {
  const rng = new Rng(run.rng ^ 0x5bd1e995);
  for (let step = 0; step < maxSteps; step++) {
    switch (run.phase) {
      case 'select':
        startBenchmark(run);
        break;
      case 'bench':
        botBenchmarkStep(run);
        break;
      case 'receipt':
        collectReceipt(run);
        break;
      case 'shop':
        botShop(run, rng);
        goWorkbench(run);
        break;
      case 'workbench': {
        assemble(run);
        botBios(run);
        const r = leaveWorkbench(run);
        if (!r.ok) throw new Error('bot produced invalid build: ' + JSON.stringify(r));
        break;
      }
      case 'gameover':
        return run;
    }
  }
  return run;
}

export { statsOf };
