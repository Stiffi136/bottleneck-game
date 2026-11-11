/**
 * Heuristic bot used by the balancing simulation (npm run sim), the power
 * analysis (scripts/power.ts) and the browser self-test (autoplay). It only
 * uses public run actions; it never looks at hidden random results (pack
 * contents, shuffled draw pile).
 *
 * Structure:
 *  - play search: bestPlay() enumerates card subsets (×-cards last, B11 gets a
 *    sacrifice card in front), botBenchmarkStep() plays, discards or uses tools.
 *  - valuation: power() = mean score of the best play over sampled hands of the
 *    real deck (common random numbers, heat carried over 3 plays). All
 *    purchases are compared by log(power after / power before) per dollar.
 *  - shop: one greedy loop over all offers (hardware incl. platform plans,
 *    software, driver, packs, reroll) with an interest-aware cost.
 *  - workbench: assemble() installs storage parts greedily (also board/case
 *    switches), botBios() picks the best known-safe OC levels.
 */
import { BOARDS, CPUS, part, partOf } from '../core/data/hardware';
import { PROFILE_IDS, SOFTWARE, softwareDef, TOOLS } from '../core/data/content';
import { computeStats, installed, caseOf, boardOf, cpuOf, ramKits } from '../core/build';
import { postOk, slotOptions, validate } from '../core/compat';
import { brownout, evaluatePlay, IDLE_TEMP, type ScoreCtx } from '../core/scoring';
import { interestFor, sellValue, targetFor } from '../core/difficulty';
import {
  activeSoftware,
  brokenParts,
  buyHardware,
  buyPack,
  buySoft,
  canSellPart,
  card,
  choosePack,
  collectReceipt,
  discardCards,
  freeSwSlots,
  generationBenches,
  goWorkbench,
  installPart,
  leaveWorkbench,
  ocAllowed,
  playCards,
  reorderHand,
  repairCost,
  repairPart,
  rerollCost,
  rerollShop,
  sellPart,
  sellSoftware,
  setOc,
  stabilityTest,
  startBenchmark,
  statsOf,
  swIds,
  useTool,
  type PackOption,
  type RunState,
} from '../core/run';
import type { BossId, Card, CardType, Enhancement, PartInst, ProfileId, SoftwareId, ToolId } from '../core/types';
import { Rng, hashSeed } from '../core/rng';

const env = (k: string, d: number): number => {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const v = p?.env?.[k];
  return v !== undefined && v !== '' ? Number(v) : d;
};

const DEBUG = env('BOT_DEBUG', 0) > 0;

/** Tunable bot parameters (env overrides for experiments: BOT_THETA, BOT_SAMPLES, …). */
export const BOT = {
  /** minimum log-power gain per (interest-adjusted) dollar for a normal buy */
  theta: env('BOT_THETA', 0.025),
  /** sampled hands per power estimate */
  samples: env('BOT_SAMPLES', 12),
  /** interest lost by spending counts this many benchmarks */
  interestHorizon: env('BOT_IH', 2),
  /** expected plays that reach the target (power × this ≈ benchmark score) */
  playsPerBench: env('BOT_PPB', 3.2),
  /** expected own power growth until the next generation's boss */
  lookGrowth: env('BOT_LOOK', 1.5),
  /** money above the interest cap ($25) is spent more freely (θ × this) */
  surplus: env('BOT_SURPLUS', 0.35),
  /** value of a free software slot (up to 2) as power factor */
  slotValue: env('BOT_SLOT', 0.08),
  /** platform plans (buy now, complete later) only below this pressure */
  planPressure: env('BOT_PLAN', 1.0),
  /** max. rerolls per shop */
  rerolls: env('BOT_REROLLS', 2),
};

// ---------------------------------------------------------------- play search

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

/** Order inside a play: ×Takt cards (Instabil) last, so they also double the +Takt of the other cards. */
function orderCards(cards: Card[]): Card[] {
  return [...cards.filter((c) => c.enh !== 'unst'), ...cards.filter((c) => c.enh === 'unst')];
}

/** Rough value of a single card (for discards and sacrifices). */
function cardWorth(c: Card): number {
  return c.level + (c.enh === 'unst' ? 30 : c.enh === 'opt' ? 20 : c.enh === 'oc' ? 12 : c.enh === 'eff' ? 6 : 0);
}

interface Found {
  cards: Card[];
  score: number;
  after: number;
  heat: number;
  throttled: boolean;
  profile: ProfileId;
  profileCards: number[];
}

/**
 * Best play of `hand` for a context. `kMax`..`kMin` cards; `sacrifice` (boss
 * B11) puts the least valuable remaining card in front of the scored cards.
 */
function searchPlay(ctx: ScoreCtx, hand: Card[], kMax: number, kMin: number, sacrifice: boolean, exact = false): Found | null {
  let best: Found | null = null;
  const consider = (cards: Card[]) => {
    const ev = evaluatePlay(ctx, cards);
    if (ev.heat.shutdown) return;
    if (!best || ev.score > best.score) {
      best = {
        cards,
        score: ev.score,
        after: ev.heat.after,
        heat: ev.heat.total,
        throttled: ev.heat.throttled,
        profile: ev.profile,
        profileCards: ev.profileCards,
      };
    }
  };
  for (let k = kMax; k >= kMin; k--) {
    if (sacrifice) {
      // k cards are played, the first one is lost
      for (const idx of subsets(hand.length, k - 1)) {
        const set = new Set(idx);
        const rest = hand.filter((_, i) => !set.has(i));
        const scored = orderCards(idx.map((i) => hand[i]!));
        if (!rest.length) {
          if (k - 1 >= 1 && !exact) consider(scored);
          continue;
        }
        const sac = rest.reduce((a, b) => (cardWorth(b) < cardWorth(a) ? b : a));
        consider([sac, ...scored]);
      }
    } else {
      for (const idx of subsets(hand.length, k)) consider(orderCards(idx.map((i) => hand[i]!)));
    }
    if (exact) break;
  }
  return best;
}

export interface PlayChoice {
  ids: number[];
  score: number;
  throttled: boolean;
  profileIds: number[];
}

function benchCtx(run: RunState): ScoreCtx {
  const b = run.bench!;
  const opts = { software: swIds(run), pasteUses: run.pasteUses };
  return {
    build: run.build,
    stats: computeStats(run.build, opts),
    software: activeSoftware(run),
    driverLevels: run.drivers,
    boss: b.boss,
    temp: b.temp,
    disabled: new Set(b.disabled),
    cpuBrownout: b.cpuBrownout,
    captureSoFar: b.capture,
    freeSwSlots: freeSwSlots(run),
  };
}

/** Best play of the current hand (deterministic, heat-aware). */
export function bestPlay(run: RunState): PlayChoice | null {
  const b = run.bench!;
  const ctx = benchCtx(run);
  const hand = b.hand.map((id) => card(run, id));
  const maxK = Math.min(b.cores, hand.length);
  const exact = b.boss === 'b3';
  const minK = exact ? maxK : Math.max(1, maxK - 3);
  const sacrifice = b.boss === 'b11' && maxK >= 2;
  // heat-aware: evaluate candidates and penalise plays that leave the PC too hot
  let best: (PlayChoice & { adj: number }) | null = null;
  const need = b.target - b.score;
  for (let k = maxK; k >= minK; k--) {
    const f = searchPlay(ctx, hand, k, k, sacrifice, true);
    if (!f) continue;
    let adj = f.score;
    const next = Math.max(IDLE_TEMP, f.after - b.cooling);
    // the next play would start hot: throttling (or worse) is likely
    if (b.hands > 1 && f.score < need && next + f.heat >= 85) adj *= next + f.heat >= 100 ? 0.6 : 0.8;
    if (!best || adj > best.adj) {
      best = { ids: f.cards.map((c) => c.id), score: f.score, throttled: f.throttled, profileIds: f.profileCards, adj };
    }
  }
  return best;
}

function toolIndex(run: RunState, id: ToolId): number {
  return run.tools.indexOf(id);
}

/** One decision in a benchmark: tool, discard or play. */
export function botBenchmarkStep(run: RunState): void {
  const b = run.bench!;
  // tools that help right now
  const t5 = toolIndex(run, 't5');
  if (t5 >= 0) {
    const top = b.hand.map((id) => card(run, id)).sort((x, y) => cardWorth(y) - cardWorth(x))[0];
    if (top && useTool(run, t5, { cards: [top.id] }).ok) return;
  }
  const t3 = toolIndex(run, 't3');
  if (t3 >= 0 && b.temp >= 65 && b.hands >= 1) {
    useTool(run, t3);
    return;
  }
  const best = bestPlay(run);
  const need = b.target - b.score;
  if (!best) {
    // every selection shuts the PC down: cool down by discarding, else the coolest card
    if (b.discards > 0) {
      discardCards(run, b.hand.slice(0, Math.min(5, b.hand.length)));
      return;
    }
    playCards(run, [b.hand[0]!]);
    return;
  }
  if (best.score * b.hands < need && b.discards > 0 && b.draw.length > 0) {
    const toss = discardChoice(run, best);
    if (toss.length) {
      discardCards(run, toss);
      return;
    }
  }
  const order = [...best.ids, ...b.hand.filter((id) => !best.ids.includes(id))];
  reorderHand(run, order);
  playCards(run, best.ids);
}

/** Cards to discard: everything that is not part of the profile, lowest value first (max 5). */
export function discardChoice(run: RunState, best: PlayChoice): number[] {
  const b = run.bench!;
  const keep = new Set(best.profileIds);
  const cards = b.hand.map((id) => card(run, id));
  return cards
    .filter((c) => !keep.has(c.id) && cardWorth(c) < 25)
    .sort((x, y) => cardWorth(x) - cardWorth(y))
    .slice(0, 5)
    .map((c) => c.id);
}

// ---------------------------------------------------------------- valuation

interface Power {
  /** mean score of the best play per sampled hand (−1: build does not POST) */
  mean: number;
  profiles: Partial<Record<ProfileId, number>>;
}

const memo = new Map<string, Power>();
let memoGen = -1;
let memoSeed = '';

function stateKey(run: RunState, extra = ''): string {
  const b = installed(run.build)
    .map((x) => `${x.slot.kind}${x.slot.index}:${x.inst.id}:${x.inst.oc}:${x.inst.broken ? 1 : 0}`)
    .join(',');
  const sw = run.software.map((s) => `${s.id}:${s.counter}`).join(',');
  const dr = PROFILE_IDS.map((p) => run.drivers[p] ?? 1).join('');
  const deck = run.deck.map((c) => `${c.type[0]}${c.level}${c.enh ?? ''}`).join('');
  return `${b}|${sw}|${dr}|${run.pasteUses}|${deck}|${extra}`;
}

function shuffledHands(run: RunState, handSize: number, n: number): Card[][] {
  const rng = new Rng(hashSeed(run.seed) ^ (run.gen * 7919 + run.benchIndex * 104729));
  const deck = run.deck;
  const hs = Math.min(handSize, deck.length);
  const out: Card[][] = [];
  const idx = deck.map((_, i) => i);
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < hs; i++) {
      const j = i + rng.int(idx.length - i);
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    out.push(idx.slice(0, hs).map((i) => deck[i]!));
  }
  return out;
}

/**
 * Average score of the best play over sampled hands. Heat is carried over three
 * consecutive plays (like a benchmark) so cooling and heat-based software count.
 * `swap` replaces the least valuable card of every sampled hand (card valuation).
 */
export function power(run: RunState, swap?: Card): Power {
  const normal = rawPower(run, null, swap);
  const boss = run.bosses[run.gen] ?? null;
  if (!boss || normal.mean <= 0) return normal;
  // the boss of this generation is known: value builds that also survive it
  const vs = rawPower(run, boss, swap);
  return { mean: Math.sqrt(normal.mean * Math.max(1, vs.mean)), profiles: normal.profiles };
}

/** Power without boss rules (for analysis). */
export function normalPower(run: RunState): number {
  return rawPower(run, null).mean;
}

function rawPower(run: RunState, boss: BossId | null, swap?: Card): Power {
  if (run.seed !== curSeed) {
    curSeed = run.seed;
    junkSet.clear();
    specBought.clear();
  }
  if (run.gen !== memoGen || run.seed !== memoSeed) {
    memo.clear();
    memoGen = run.gen;
    memoSeed = run.seed;
  }
  const key = stateKey(run, (swap ? `${swap.type}${swap.level}${swap.enh ?? ''}` : '') + (boss ?? ''));
  const hit = memo.get(key);
  if (hit) return hit;
  const opts = { software: swIds(run), pasteUses: run.pasteUses };
  const res: Power = { mean: -1, profiles: {} };
  if (postOk(run.build, opts)) {
    const stats = computeStats(run.build, opts);
    const ctx: ScoreCtx = {
      build: run.build,
      stats,
      software: activeSoftware(run),
      driverLevels: run.drivers,
      boss,
      temp: IDLE_TEMP,
      disabled: new Set(),
      cpuBrownout: false,
      captureSoFar: 0,
      freeSwSlots: freeSwSlots(run),
    };
    let cooling = stats.cooling;
    let startTemp = IDLE_TEMP;
    if (boss === 'b7') {
      startTemp = 60;
      cooling = Math.floor(cooling * 0.75);
    }
    if (boss === 'b8') {
      const bo = brownout(run.build, stats);
      ctx.disabled = new Set(bo.disabled);
      ctx.cpuBrownout = bo.cpuThrottled;
    }
    const hands = shuffledHands(run, Math.max(1, stats.handSize - (boss === 'b4' ? 2 : 0)), BOT.samples);
    const sacrifice = boss === 'b11';
    let total = 0;
    let temp = startTemp;
    hands.forEach((hand0, s) => {
      let hand = hand0;
      if (swap) {
        const worst = hand.reduce((a, c) => (cardWorth(c) < cardWorth(a) ? c : a));
        hand = hand.map((c) => (c === worst ? { ...swap, id: -1 } : c));
      }
      if (s % 3 === 0) temp = startTemp;
      ctx.temp = temp;
      const k = Math.min(stats.cores, hand.length);
      let f = searchPlay(ctx, hand, k, k, sacrifice && k >= 2);
      if ((!f || f.throttled) && boss !== 'b3' && k > 1) {
        const g = searchPlay(ctx, hand, k - 1, Math.max(1, k - 2), sacrifice && k >= 3);
        if (g && (!f || g.score > f.score)) f = g;
      }
      if (f) {
        total += f.score;
        temp = Math.max(IDLE_TEMP, f.after - cooling);
        res.profiles[f.profile] = (res.profiles[f.profile] ?? 0) + 1;
      }
    });
    let mean = total / hands.length;
    // things the sampled play does not see: discards, room for more software
    mean *= 1 + 0.03 * stats.rerolls;
    mean *= 1 + BOT.slotValue * Math.min(2, freeSwSlots(run));
    // room for stronger parts (power supply) and a lower electricity bill
    mean *= 1 + 0.12 * Math.max(0, Math.min(1, (stats.watt - stats.tdp) / 250));
    mean *= 1 - 0.02 * stats.billPerGen;
    res.mean = Math.max(1, mean);
  }
  memo.set(key, res);
  return res;
}

function logGain(after: number, before: number): number {
  if (after <= 0) return -Infinity;
  return Math.log(after / Math.max(1, before));
}

// ---------------------------------------------------------------- assembly

/** Quality of a (possibly broken) build for the greedy installer. */
function objective(run: RunState): number {
  const opts = { software: swIds(run), pasteUses: run.pasteUses };
  const errs = validate(run.build, opts).filter((i) => i.severity === 'error').length;
  if (errs) return -1000 * errs;
  return power(run).mean;
}

/** Parts displaced by an install (seed#uid); they are sold or dropped. */
const junkSet = new Set<string>();
let curSeed = '';
const junk = {
  has: (p: PartInst) => junkSet.has(`${curSeed}#${p.uid}`),
  add: (p: PartInst) => junkSet.add(`${curSeed}#${p.uid}`),
};

/** Removes displaced parts: sold in a real run, deleted in a hypothetical one. */
function dropJunk(run: RunState, hypo: boolean): void {
  for (const p of [...run.storage]) {
    if (!junk.has(p)) continue;
    if (hypo) run.storage = run.storage.filter((x) => x !== p);
    else if (canSellPart(run, p.uid).ok) sellPart(run, p.uid);
  }
}

function installBest(run: RunState, hypo: boolean, allowWorse: boolean): boolean {
  const base = objective(run);
  let best: { uid: number; slot: Parameters<typeof installPart>[2]; v: number } | null = null;
  const opts = { software: swIds(run), pasteUses: run.pasteUses };
  for (const p of run.storage) {
    if (junk.has(p)) continue;
    for (const o of slotOptions(run.build, p, opts)) {
      if (o.status === 'bad') continue;
      const c = structuredClone(run);
      const r = installPart(c, p.uid, o.slot);
      if (!r.ok) continue;
      const v = objective(c);
      if ((allowWorse || v > base * 1.002 + (base < 0 ? 1 : 0)) && (!best || v > best.v)) best = { uid: p.uid, slot: o.slot, v };
    }
  }
  if (!best || (!allowWorse && best.v <= base)) return false;
  const r = installPart(run, best.uid, best.slot);
  if (!r.ok) return false;
  for (const d of r.displaced) junk.add(d);
  dropJunk(run, hypo);
  return true;
}

function greedy(run: RunState, hypo: boolean): void {
  for (let i = 0; i < 8; i++) if (!installBest(run, hypo, false)) break;
}

/**
 * Installs storage parts greedily; board/case/PSU switches are tried as a
 * forced first step followed by the greedy completion. Commits only builds
 * that pass the POST and beat the current one.
 */
export function assemble(run: RunState, hypo = false): void {
  greedy(run, hypo);
  const containers = run.storage.filter((p) => ['board', 'case', 'psu'].includes(part(p.id).cat) && !junk.has(p));
  for (const ct of containers) {
    const c = structuredClone(run);
    const inst = c.storage.find((p) => p.uid === ct.uid);
    if (!inst) continue;
    const opt = slotOptions(c.build, inst, { software: swIds(c), pasteUses: c.pasteUses }).find((o) => o.status !== 'bad');
    if (!opt) continue;
    const r = installPart(c, inst.uid, opt.slot);
    if (!r.ok) continue;
    for (const d of r.displaced) junk.add(d);
    for (let i = 0; i < 8; i++) {
      if (!installBest(c, true, objective(c) < 0)) break;
    }
    if (objective(c) > Math.max(0, objective(run))) {
      if (hypo) Object.assign(run, c);
      else replay(run, c);
    }
  }
  dropJunk(run, hypo);
}

/** Applies the build of `plan` to the real run with legal actions only. */
function replay(run: RunState, plan: RunState): void {
  const c = structuredClone(run);
  const want = installed(plan.build);
  // containers first, then everything else
  want.sort((a, b) => Number(!['board', 'case', 'psu'].includes(a.slot.kind)) - Number(!['board', 'case', 'psu'].includes(b.slot.kind)));
  for (let pass = 0; pass < 3; pass++) {
    for (const w of want) {
      const cur = installed(c.build).find((x) => x.inst.uid === w.inst.uid);
      if (cur && cur.slot.kind === w.slot.kind && cur.slot.index === w.slot.index) continue;
      const r = installPart(c, w.inst.uid, w.slot);
      if (r.ok) {
        for (const d of r.displaced) junk.add(d);
        dropJunk(c, false);
      }
    }
  }
  if (objective(c) > Math.max(0, objective(run))) Object.assign(run, c);
}

// ---------------------------------------------------------------- hypothetical platform plans

const DDR_RAM: Record<string, string> = { DDR4: 'R2', DDR5: 'R4' };

/** Parts that would make `id` usable (rule-based; cheapest sensible completion). */
function completions(run: RunState, id: string): string[][] {
  const d = part(id);
  const board = boardOf(run.build);
  const cpu = cpuOf(run.build);
  const cs = caseOf(run.build);
  const ramGen = ramKits(run.build).length ? partOf(ramKits(run.build)[0]!.id, 'ram').gen : null;
  const caseFor = (form: string) => (cs && cs.maxForm === 'mATX' && form === 'ATX' ? ['CA3'] : []);
  const out: string[][] = [];
  if (d.cat === 'cpu') {
    for (const bd of BOARDS.filter((x) => x.socket === d.socket && x.price > 0)) {
      out.push([bd.id, ...(bd.ramGen !== ramGen ? [DDR_RAM[bd.ramGen]!] : []), ...caseFor(bd.form)]);
    }
  } else if (d.cat === 'board') {
    const cpus = cpu && cpu.socket === d.socket ? [] : [CPUS.filter((x) => x.socket === d.socket && x.price > 0).sort((a, b) => a.price - b.price)[0]!.id];
    out.push([...cpus, ...(d.ramGen !== ramGen ? [DDR_RAM[d.ramGen]!] : []), ...caseFor(d.form)]);
  } else if (d.cat === 'ram') {
    if (board && board.ramGen !== d.gen) {
      for (const bd of BOARDS.filter((x) => x.ramGen === d.gen && cpu && x.socket === cpu.socket && x.price > 0)) out.push([bd.id, ...caseFor(bd.form)]);
    }
  } else if (d.cat !== 'psu') {
    out.push([], ['CA3']);
  }
  if (d.cat === 'cpu') out.push([]);
  // a stronger power supply is the most common missing piece
  const withPsu = d.cat === 'psu' ? out : out.flatMap((set) => [set, [...set, 'P3'], [...set, 'P4']]);
  const owned = new Set([...installed(run.build).map((x) => x.inst.id), ...run.storage.map((p) => p.id)]);
  const seen = new Set<string>();
  return withPsu
    .map((set) => set.filter((x) => !owned.has(x)))
    .filter((set) => {
      const k = set.join(',');
      if (!set.length || set.length > 3 || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** Power of the build when `extra` parts were also available (hypothetical). */
function withParts(run: RunState, ids: string[]): RunState {
  const c = structuredClone(run);
  c.storage = c.storage.filter((p) => !junk.has(p));
  for (const id of ids) c.storage.push({ uid: c.nextUid++, id, oc: 0, limit: 1, limitKnown: false, paid: part(id).price });
  // hypothetical storage may exceed the real limit; installs drop the displaced parts
  assemble(c, true);
  return c;
}

// ---------------------------------------------------------------- shop

interface Option {
  label: string;
  cost: number;
  gain: number;
  /** true: buy even if the gain per dollar is small (fixes, free value) */
  apply: () => void;
}

/** Plans for parts in storage that do not fit yet (uid → generation bought). */
const specBought = new Map<string, number>();
const specKey = (run: RunState, uid: number) => `${run.seed}#${uid}`;

function pressure(run: RunState, p: number): number {
  // target of the hardest remaining benchmark of this generation vs. expected benchmark score
  const benches = generationBenches(run).filter((b) => !b.done);
  const tgt = Math.max(...benches.map((b) => b.target), targetFor(run.gen, 'office'));
  // look ahead: the next boss, assuming the bot keeps growing a bit until then
  const ahead = targetFor(run.gen + 1, 'boss') / BOT.lookGrowth;
  return Math.max(tgt, ahead) / Math.max(1, p * BOT.playsPerBench);
}

function effCost(run: RunState, cost: number): number {
  if (cost <= 0) return 0.5;
  const lost = interestFor(run.money) - interestFor(Math.max(0, run.money - cost));
  return cost + lost * BOT.interestHorizon;
}

function cardGain(run: RunState, c: Card, base: number): number {
  const with_ = power(run, c).mean;
  const deckN = run.deck.length + 1;
  const hs = statsOf(run).handSize;
  const share = Math.min(1, hs / deckN);
  return Math.log(1 + share * Math.max(0, with_ - base) / Math.max(1, base));
}

function softwareOptions(run: RunState, id: SoftwareId, price: number, base: number, buy: () => void, label: string): Option[] {
  const out: Option[] = [];
  const def = softwareDef(id);
  if (run.software.some((s) => s.id === id)) return out;
  if (def.noSlot || freeSwSlots(run) > 0) {
    const c = structuredClone(run);
    c.software.push({ uid: -1, id, counter: id === 'sw10' ? 2 : 0, paid: price });
    let g = logGain(power(c).mean, base);
    if (id === 'sw11') g += 0.012 * 6; // +$2 per benchmark
    out.push({ label, cost: price, gain: g, apply: buy });
  } else {
    // replace the weakest software
    let worst: { uid: number; v: number; refund: number } | null = null;
    for (const s of run.software) {
      const c = structuredClone(run);
      c.software = c.software.filter((x) => x.uid !== s.uid);
      const v = power(c).mean;
      if (!worst || v > worst.v) worst = { uid: s.uid, v, refund: sellValue(s.paid || softwareDef(s.id).price) };
    }
    if (worst) {
      const c = structuredClone(run);
      c.software = c.software.filter((x) => x.uid !== worst!.uid);
      c.software.push({ uid: -1, id, counter: id === 'sw10' ? 2 : 0, paid: price });
      const g = logGain(power(c).mean, base);
      const uid = worst.uid;
      out.push({
        label: label + '+replace',
        cost: Math.max(0, price - worst.refund),
        gain: g,
        apply: () => {
          sellSoftware(run, uid);
          buy();
        },
      });
    }
  }
  return out;
}

function driverGain(run: RunState, id: ProfileId, base: number): number {
  const c = structuredClone(run);
  c.drivers[id] = (c.drivers[id] ?? 1) + 1;
  return logGain(power(c).mean, base);
}

/** Expected best of `pick` options drawn without replacement from `values` (uniform). */
function expectedBest(values: number[], pick: number): number {
  const v = [...values].sort((a, b) => b - a);
  const n = v.length;
  if (n <= pick) return v[0] ?? 0;
  const comb = (a: number, b: number) => {
    if (b < 0 || b > a) return 0;
    let r = 1;
    for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1);
    return r;
  };
  let e = 0;
  for (let i = 0; i < n; i++) e += v[i]! * (comb(n - 1 - i, pick - 1) / comb(n, pick));
  return e;
}

function relevantProfiles(pw: Power): ProfileId[] {
  const total = Object.values(pw.profiles).reduce((a, b) => a + (b ?? 0), 0) || 1;
  return PROFILE_IDS.filter((p) => (pw.profiles[p] ?? 0) / total >= 0.08);
}

function bestCardType(_run: RunState): CardType {
  // GPU cards are needed for the finale and usually have the strongest hardware bonus
  return 'gpu';
}

function packOption(run: RunState, i: number, base: number, pw: Power): Option | null {
  const kind = run.shop!.packs[i];
  if (!kind) return null;
  const price = kind === 'software' ? 6 : 4;
  if (run.money < price || run.pack) return null;
  let gain = 0;
  if (kind === 'driver') {
    const rel = relevantProfiles(pw);
    const vals = PROFILE_IDS.map((p) => (rel.includes(p) ? driverGain(run, p, base) : 0));
    gain = expectedBest(vals, 3);
  } else if (kind === 'software') {
    if (freeSwSlots(run) <= 0) return null;
    const owned = new Set(run.software.map((s) => s.id));
    const vals = SOFTWARE.filter((s) => !owned.has(s.id)).map((s) => {
      const c = structuredClone(run);
      c.software.push({ uid: -1, id: s.id, counter: s.id === 'sw10' ? 2 : 0, paid: 0 });
      return Math.max(0, logGain(power(c).mean, base));
    });
    gain = expectedBest(vals, 2);
  } else if (kind === 'workload') {
    const t = bestCardType(run);
    const g = (enh?: Enhancement) => cardGain(run, { id: -1, type: t, level: 7, ...(enh ? { enh } : {}) }, base);
    const gu = g('unst') * 0.6; // may break
    const go = g('opt');
    const gc = g('oc');
    const ge = g('eff');
    // three options, 30 % enhanced each (uniform), pick the best
    const p = 1 - Math.pow(1 - 0.075, 3);
    const ranked = [gu, go, gc, ge].sort((a, b) => b - a);
    let rest = 1;
    for (const v of ranked) {
      gain += rest * p * v;
      rest *= 1 - p;
    }
  } else if (kind === 'tool') {
    if (run.tools.length >= 2) return null;
    const vals = TOOLS.map((t) => toolValue(run, t.id, base));
    gain = expectedBest(vals, 3);
  }
  return { label: 'pack_' + kind, cost: price, gain, apply: () => openPack(run, i, base) };
}

function toolValue(run: RunState, id: ToolId, base: number): number {
  const t: CardType = bestCardType(run);
  switch (id) {
    case 't1': {
      if (run.pasteUses >= 3) return 0;
      const c = structuredClone(run);
      c.pasteUses++;
      return logGain(power(c).mean, base);
    }
    case 't8':
      return 2 * Math.max(0, cardGain(run, { id: -1, type: t, level: 7, enh: 'oc' }, base) - cardGain(run, { id: -1, type: t, level: 7 }, base));
    case 't5': {
      const top = [...run.deck].sort((a, b) => cardWorth(b) - cardWorth(a))[0]!;
      return cardGain(run, top, base);
    }
    case 't3':
      return 0.01;
    default:
      return 0;
  }
}

function openPack(run: RunState, i: number, base: number): void {
  if (!buyPack(run, i).ok) return;
  const opts = run.pack!.options;
  let pick: number | null = null;
  let bestV = 0;
  opts.forEach((o, j) => {
    const v = optionValue(run, o, base);
    if (v > bestV) {
      bestV = v;
      pick = j;
    }
  });
  if (!choosePack(run, pick).ok) choosePack(run, null);
}

function optionValue(run: RunState, o: PackOption, base: number): number {
  switch (o.kind) {
    case 'driver':
      return driverGain(run, o.id, base);
    case 'sw': {
      if (freeSwSlots(run) <= 0 && !softwareDef(o.id).noSlot) return 0;
      const c = structuredClone(run);
      c.software.push({ uid: -1, id: o.id, counter: o.id === 'sw10' ? 2 : 0, paid: 0 });
      return logGain(power(c).mean, base);
    }
    case 'card':
      return cardGain(run, { id: -1, type: o.type, level: o.level, ...(o.enh ? { enh: o.enh } : {}) }, base) * (o.enh === 'unst' ? 0.6 : 1);
    case 'tool':
      return run.tools.length < 2 ? toolValue(run, o.id, base) + 0.001 : 0;
  }
}

function hardwareOptions(run: RunState, base: number, safe: boolean): Option[] {
  const s = run.shop!;
  const out: Option[] = [];
  s.hardware.forEach((o, i) => {
    if (!o || o.price > run.money || run.storage.filter((p) => !junk.has(p)).length >= 3) return;
    // direct use (together with what is in storage)
    const c = structuredClone(run);
    const r = buyHardware(c, i);
    if (!r.ok) return;
    assemble(c, true);
    const used = installed(c.build).some((x) => x.inst.uid === r.inst.uid);
    if (used) {
      out.push({
        label: o.partId,
        cost: o.price,
        gain: logGain(power(c).mean, base),
        apply: () => {
          const rr = buyHardware(run, i);
          if (rr.ok) {
            assemble(run);
            if (!installed(run.build).some((x) => x.inst.uid === rr.inst.uid)) specBought.set(specKey(run, rr.inst.uid), run.gen);
          }
        },
      });
      return;
    }
    // platform plan: buy now, complete later
    if (!safe || run.storage.filter((p) => !junk.has(p)).length >= 2) return;
    let bestPlan: { gain: number; extra: number } | null = null;
    for (const set of completions(run, o.partId)) {
      const hyp = withParts(run, [o.partId, ...set]);
      const extra = set.reduce((a, id) => a + part(id).price, 0);
      const g = logGain(power(hyp).mean, base);
      if (g > 0 && (!bestPlan || g / (o.price + extra) > bestPlan.gain / (o.price + bestPlan.extra))) bestPlan = { gain: g, extra };
    }
    if (bestPlan) {
      out.push({
        label: o.partId + '(plan)',
        cost: o.price + bestPlan.extra,
        gain: bestPlan.gain * 0.7,
        apply: () => {
          const rr = buyHardware(run, i);
          if (rr.ok) specBought.set(specKey(run, rr.inst.uid), run.gen);
        },
      });
    }
  });
  return out;
}

function softOption(run: RunState, base: number): Option[] {
  const so = run.shop!.soft;
  if (!so || so.price > run.money) return [];
  if (so.kind === 'sw') return softwareOptions(run, so.id, so.price, base, () => buySoft(run), so.id);
  if (so.kind === 'driver') return [{ label: 'drv_' + so.id, cost: so.price, gain: driverGain(run, so.id, base), apply: () => buySoft(run) }];
  if (run.tools.length >= 2) return [];
  return [{ label: so.id, cost: so.price, gain: toolValue(run, so.id, base), apply: () => buySoft(run) }];
}

/** Uses tools that work outside of benchmarks. */
function useShopTools(run: RunState): void {
  for (let t = run.tools.length - 1; t >= 0; t--) {
    const id = run.tools[t]!;
    const cards = run.shopCards.map((cid) => run.deck.find((c) => c.id === cid)).filter((c): c is Card => !!c);
    if (id === 't1' && run.pasteUses < 3) useTool(run, t);
    else if (id === 't8' || id === 't9') {
      const pick = cards.filter((c) => !c.enh).sort((a, b) => b.level - a.level).slice(0, 2);
      if (pick.length) useTool(run, t, { cards: pick.map((c) => c.id) });
    } else if (id === 't4' && run.deck.length > 30) {
      const pick = cards.filter((c) => !c.enh).sort((a, b) => a.level - b.level).slice(0, 2);
      if (pick.length) useTool(run, t, { cards: pick.map((c) => c.id) });
    } else if (id === 't2') {
      run.tools.splice(t, 1); // the bot has no use for it
    }
  }
}

export interface ShopLog {
  bought: string[];
}

export function botShop(run: RunState, _rng?: Rng, log?: ShopLog): void {
  const s = run.shop!;
  if (run.pack) choosePack(run, null);
  for (const p of brokenParts(run)) if (run.money >= repairCost()) repairPart(run, p.uid);
  // forget plans that did not work out
  for (const p of [...run.storage]) {
    const k = specKey(run, p.uid);
    const since = specBought.get(k);
    const installedNow = installed(run.build).some((x) => x.inst.uid === p.uid);
    if (installedNow) specBought.delete(k);
    else if ((since === undefined || run.gen - since >= 3) && canSellPart(run, p.uid).ok) {
      sellPart(run, p.uid);
      specBought.delete(k);
    }
  }
  assemble(run);
  for (let step = 0; step < 12; step++) {
    const pw = power(run);
    const base = pw.mean;
    const pr = pressure(run, base);
    const safe = pr < BOT.planPressure;
    // under pressure every gain counts; with a comfortable margin save for interest
    const theta = BOT.theta * (pr > 1 ? 0.25 : pr > 0.7 ? 0.6 : 1);
    const opts: Option[] = [...hardwareOptions(run, base, safe), ...softOption(run, base)];
    s.packs.forEach((_, i) => {
      const o = packOption(run, i, base, pw);
      if (o) opts.push(o);
    });
    let best: { o: Option; score: number } | null = null;
    for (const o of opts) {
      if (o.cost > run.money || !(o.gain > 0)) continue;
      const score = o.gain / effCost(run, o.cost);
      const th = theta * (run.money - o.cost >= 25 ? BOT.surplus : 1);
      if (score >= th && (!best || score / th > best.score)) best = { o, score: score / th };
    }
    if (DEBUG)
      console.log(
        `  G${run.gen}.${run.benchIndex} $${run.money} P=${base.toFixed(0)} pr=${pr.toFixed(2)} θ=${theta.toFixed(3)} ` +
          opts.map((o) => `${o.label}:${o.cost}:${(o.gain / effCost(run, o.cost)).toFixed(3)}`).join(' '),
      );
    if (best) {
      log?.bought.push(best.o.label);
      best.o.apply();
      useShopTools(run);
      continue;
    }
    // nothing worth it: reroll if money is plentiful
    const rc = rerollCost(run);
    if (s.rerollsUsed < BOT.rerolls && run.money - rc >= (pr > 1 ? 6 : 27)) {
      rerollShop(run);
      continue;
    }
    break;
  }
  useShopTools(run);
}

// ---------------------------------------------------------------- BIOS

export function botBios(run: RunState): void {
  for (const { inst } of installed(run.build)) {
    if (!ocAllowed(run, inst.uid)) continue;
    if (!inst.limitKnown && run.money >= 3) stabilityTest(run, inst.uid);
    const max = inst.limitKnown ? inst.limit : 1;
    let bestLv = inst.oc;
    let bestV = -Infinity;
    for (let lv = 0; lv <= max; lv++) {
      setOc(run, inst.uid, lv);
      const v = objective(run);
      if (v > bestV) {
        bestV = v;
        bestLv = lv;
      }
    }
    setOc(run, inst.uid, bestLv);
  }
}

// ---------------------------------------------------------------- run

/** Plays one complete run. */
export function playRun(run: RunState, maxSteps = 20000): RunState {
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
        botShop(run);
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
