import { Rng, hashSeed } from './rng';
import { ALL_PARTS, isShopPart, part, partOf } from './data/hardware';
import {
  BOSSES,
  DRIVER_PRICE,
  PACK_PRICES,
  PASTE_MAX_USES,
  PROFILE_IDS,
  SOFTWARE,
  STORAGE_SLOTS,
  TOOLS,
  TOOL_SLOTS,
  softwareDef,
  toolDef,
} from './data/content';
import {
  computeStats,
  cpuOcAllowed,
  emptyBuild,
  findSlotOf,
  gpuInst,
  installed,
  ramOcAllowed,
  reflow,
  setSlot,
  type BuildStats,
} from './build';
import { postOk, shopBadge, simulatePlace, slotOptions, validate, type Issue } from './compat';
import { BENCH_KINDS, interestFor, isFinaleGen, rewardFor, sellValue, targetFor, tierWeights } from './difficulty';
import { IDLE_TEMP, brownout, evaluatePlay, type PlayEval, type ScoreCtx } from './scoring';
import type {
  BenchKind,
  BossId,
  Build,
  Card,
  CardType,
  Category,
  Enhancement,
  PackKind,
  PartInst,
  ProfileId,
  SlotRef,
  SoftwareId,
  SoftwareInst,
  ToolId,
} from './types';
import { CARD_TYPES, ENHANCEMENTS } from './types';

export const SAVE_VERSION = 1;
export const MIN_DECK = 10;

export type Phase = 'select' | 'bench' | 'receipt' | 'shop' | 'workbench' | 'gameover';

export interface BenchState {
  kind: BenchKind;
  boss: BossId | null;
  target: number;
  score: number;
  hands: number;
  discards: number;
  temp: number;
  maxTemp: number;
  handSize: number;
  cores: number;
  cooling: number;
  draw: number[];
  hand: number[];
  pile: number[];
  capture: number;
  disabled: number[];
  cpuBrownout: boolean;
  startEvents: ('update' | 'melt' | 'brownout' | 'heatwave')[];
  result: null | 'won' | 'lost';
  lossReason?: LossReason;
  plays: number;
}

export type LossReason = 'target' | 'shutdown' | 'empty';

export type ReceiptKey = 'reward' | 'hands' | 'interest' | 'krypto' | 'capture' | 'bill' | 'debt';
export interface Receipt {
  kind: BenchKind;
  lines: { key: ReceiptKey; amount: number; info?: boolean; n?: number }[];
  total: number;
  moneyBefore: number;
  moneyAfter: number;
  debtAfter: number;
}

export type ShopSoft =
  | { kind: 'sw'; id: SoftwareId; price: number }
  | { kind: 'driver'; id: ProfileId; price: number }
  | { kind: 'tool'; id: ToolId; price: number };

export interface ShopState {
  hardware: ({ partId: string; price: number } | null)[];
  soft: ShopSoft | null;
  packs: (PackKind | null)[];
  rerollsUsed: number;
}

export type PackOption =
  | { kind: 'card'; type: CardType; level: number; enh?: Enhancement }
  | { kind: 'driver'; id: ProfileId }
  | { kind: 'tool'; id: ToolId }
  | { kind: 'sw'; id: SoftwareId };

export interface PackOpen {
  kind: PackKind;
  options: PackOption[];
}

export interface RunStats {
  bestPlay: number;
  plays: number;
  benchesWon: number;
  moneyEarned: number;
  bluescreens: number;
  maxTemp: number;
  bought: Record<string, number>;
  profiles: Partial<Record<ProfileId, number>>;
}

export interface GameOver {
  reason: LossReason;
  gen: number;
  kind: BenchKind;
  boss: BossId | null;
  score: number;
  target: number;
}

export interface RunState {
  v: number;
  seed: string;
  rng: number;
  nextUid: number;
  gen: number;
  benchIndex: number;
  bosses: Record<number, BossId>;
  usedBosses: BossId[];
  money: number;
  debt: number;
  deck: Card[];
  build: Build;
  storage: PartInst[];
  software: SoftwareInst[];
  tools: ToolId[];
  drivers: Partial<Record<ProfileId, number>>;
  pasteUses: number;
  phase: Phase;
  bench: BenchState | null;
  receipt: Receipt | null;
  shop: ShopState | null;
  pack: PackOpen | null;
  shopCards: number[];
  stats: RunStats;
  gameOver: GameOver | null;
}

export type ErrKey =
  | 'noMoney'
  | 'storageFull'
  | 'noSwSlot'
  | 'toolsFull'
  | 'notAllowed'
  | 'post'
  | 'badSlot'
  | 'pasteMax'
  | 'deckMin'
  | 'cardsCount'
  | 'mustPlayAll'
  | 'softlock'
  | 'owned';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; err: ErrKey; issue?: Issue };
const fail = (err: ErrKey, issue?: Issue): { ok: false; err: ErrKey; issue?: Issue } => ({ ok: false, err, issue });

// ---------------------------------------------------------------- helpers

export function withRng<T>(run: RunState, fn: (r: Rng) => T): T {
  const r = new Rng(run.rng);
  const res = fn(r);
  run.rng = r.state;
  return res;
}

function newInst(run: RunState, id: string, paid: number, limit = 3): PartInst {
  return { uid: run.nextUid++, id, oc: 0, limit, limitKnown: false, paid };
}

export function card(run: RunState, id: number): Card {
  const c = run.deck.find((x) => x.id === id);
  if (!c) throw new Error(`card ${id} not in deck`);
  return c;
}

export function swIds(run: RunState): SoftwareId[] {
  return activeSoftware(run).map((s) => s.id);
}

export function statsOf(run: RunState, build: Build = run.build): BuildStats {
  return computeStats(build, { software: swIds(run), pasteUses: run.pasteUses });
}

export function swSlotsUsed(run: RunState): number {
  return run.software.filter((s) => !softwareDef(s.id).noSlot).length;
}

/** Software beyond the available slots is inactive. */
export function activeSoftware(run: RunState): SoftwareInst[] {
  const slots = computeStats(run.build, { pasteUses: run.pasteUses }).swSlots;
  let used = 0;
  return run.software.filter((s) => {
    if (softwareDef(s.id).noSlot) return true;
    used++;
    return used <= slots;
  });
}

export function freeSwSlots(run: RunState): number {
  return Math.max(0, statsOf(run).swSlots - swSlotsUsed(run));
}

export function starterDeck(): Card[] {
  const deck: Card[] = [];
  let id = 1;
  for (const type of CARD_TYPES) for (let lv = 1; lv <= 10; lv++) deck.push({ id: id++, type, level: lv });
  return deck;
}

export function starterBuild(run: RunState): Build {
  const b = emptyBuild();
  b.case = newInst(run, 'CA1', 0);
  b.board = newInst(run, 'MB1', 0);
  reflow(b);
  b.cpu = newInst(run, 'C1', 0);
  b.cooler = newInst(run, 'K1', 0);
  b.psu = newInst(run, 'P1', 0);
  b.ram[0] = newInst(run, 'R1', 0);
  b.sata[0] = newInst(run, 'S1', 0);
  return b;
}

export function newRun(seed: string): RunState {
  const run: RunState = {
    v: SAVE_VERSION,
    seed,
    rng: hashSeed(seed),
    nextUid: 1,
    gen: 1,
    benchIndex: 0,
    bosses: {},
    usedBosses: [],
    money: 4,
    debt: 0,
    deck: starterDeck(),
    build: emptyBuild(),
    storage: [],
    software: [],
    tools: [],
    drivers: {},
    pasteUses: 0,
    phase: 'select',
    bench: null,
    receipt: null,
    shop: null,
    pack: null,
    shopCards: [],
    stats: { bestPlay: 0, plays: 0, benchesWon: 0, moneyEarned: 0, bluescreens: 0, maxTemp: IDLE_TEMP, bought: {}, profiles: {} },
    gameOver: null,
  };
  run.build = starterBuild(run);
  ensureBoss(run, 1);
  return run;
}

function ensureBoss(run: RunState, gen: number): BossId {
  const have = run.bosses[gen];
  if (have) return have;
  let boss: BossId;
  if (isFinaleGen(gen)) boss = 'f1';
  else {
    const all = BOSSES.filter((b) => !b.finale && b.minGen <= gen).map((b) => b.id);
    let pool = all.filter((b) => !run.usedBosses.includes(b));
    if (pool.length === 0) pool = all;
    boss = withRng(run, (r) => r.pick(pool));
    run.usedBosses.push(boss);
  }
  run.bosses[gen] = boss;
  return boss;
}

export interface BenchInfo {
  kind: BenchKind;
  target: number;
  reward: number;
  boss: BossId | null;
  done: boolean;
  current: boolean;
}

export function generationBenches(run: RunState): BenchInfo[] {
  const boss = ensureBoss(run, run.gen);
  return BENCH_KINDS.map((kind, i) => ({
    kind,
    target: targetFor(run.gen, kind),
    reward: rewardFor(kind),
    boss: kind === 'boss' ? boss : null,
    done: i < run.benchIndex,
    current: i === run.benchIndex,
  }));
}

// ---------------------------------------------------------------- benchmark

export function startBenchmark(run: RunState): Result {
  if (run.phase !== 'select') return fail('notAllowed');
  const info = generationBenches(run)[run.benchIndex]!;
  const stats = statsOf(run);
  const boss = info.boss;
  const bench: BenchState = {
    kind: info.kind,
    boss,
    target: info.target,
    score: 0,
    hands: 4,
    discards: stats.rerolls,
    temp: IDLE_TEMP,
    maxTemp: IDLE_TEMP,
    handSize: stats.handSize,
    cores: stats.cores,
    cooling: stats.cooling,
    draw: [],
    hand: [],
    pile: [],
    capture: 0,
    disabled: [],
    cpuBrownout: false,
    startEvents: [],
    result: null,
    plays: 0,
  };
  if (boss === 'b4') bench.handSize = Math.max(1, bench.handSize - 2);
  if (boss === 'b5') {
    bench.hands -= 1;
    bench.discards = Math.max(0, bench.discards - 1);
  }
  if (boss === 'b7') {
    bench.temp = 60;
    bench.cooling = Math.floor(bench.cooling * 0.75);
    bench.startEvents.push('heatwave');
  }
  if (boss === 'b8') {
    const bo = brownout(run.build, stats);
    bench.disabled = bo.disabled;
    bench.cpuBrownout = bo.cpuThrottled;
    bench.startEvents.push('brownout');
  }
  withRng(run, (r) => {
    // 12-pin connector (G6 without ATX 3.0 PSU)
    const g = gpuInst(run.build);
    const psu = run.build.psu ? partOf(run.build.psu.id, 'psu') : null;
    if (g && !g.broken && partOf(g.id, 'gpu').special === 'pin12' && !psu?.atx3 && r.chance(1 / 8)) {
      g.broken = true;
      bench.startEvents.push('melt');
    }
    for (const s of activeSoftware(run)) {
      if (s.id === 'sw10' && r.chance(1 / 5) && bench.hands > 1) {
        bench.hands -= 1;
        bench.startEvents.push('update');
      }
    }
    bench.draw = r.shuffle(run.deck.map((c) => c.id));
  });
  bench.maxTemp = bench.temp;
  run.bench = bench;
  run.phase = 'bench';
  drawUp(bench);
  return { ok: true };
}

function drawUp(b: BenchState): number[] {
  const drawn: number[] = [];
  while (b.hand.length < b.handSize && b.draw.length) {
    const id = b.draw.pop()!;
    b.hand.push(id);
    drawn.push(id);
  }
  return drawn;
}

export function scoreCtx(run: RunState): ScoreCtx {
  const b = run.bench!;
  const sw = activeSoftware(run);
  return {
    build: run.build,
    stats: statsOf(run),
    software: sw,
    driverLevels: run.drivers,
    boss: b.boss,
    temp: b.temp,
    disabled: new Set(b.disabled),
    cpuBrownout: b.cpuBrownout,
    captureSoFar: b.capture,
    freeSwSlots: freeSwSlots(run),
  };
}

/** Preview of a selection (profile, heat; score only if the option is on). */
export function previewPlay(run: RunState, ids: readonly number[]): PlayEval | null {
  if (!run.bench || ids.length === 0) return null;
  const ordered = run.bench.hand.filter((id) => ids.includes(id)).map((id) => card(run, id));
  return evaluatePlay(scoreCtx(run), ordered);
}

export function requiredCards(run: RunState): number | null {
  const b = run.bench;
  if (!b || b.boss !== 'b3') return null;
  return Math.min(b.cores, b.hand.length);
}

export interface PlayOutcome {
  cards: Card[];
  eval: PlayEval;
  score: number; // what was added
  shutdown: boolean;
  bluescreen: number | null; // uid of the unstable part
  destroyed: number[];
  drawn: number[];
  tempBefore: number;
  tempPeak: number;
  tempAfter: number;
  money: number;
}

export function playCards(run: RunState, ids: readonly number[]): Result<{ out: PlayOutcome }> {
  const b = run.bench;
  if (run.phase !== 'bench' || !b || b.result) return fail('notAllowed');
  const sel = b.hand.filter((id) => ids.includes(id));
  if (sel.length === 0 || sel.length !== ids.length || sel.length > b.cores) return fail('cardsCount');
  const req = requiredCards(run);
  if (req !== null && sel.length !== req) return fail('mustPlayAll');
  if (b.hands <= 0) return fail('notAllowed');

  const cards = sel.map((id) => card(run, id));
  const ctx = scoreCtx(run);
  const ev = evaluatePlay(ctx, cards);
  const tempBefore = b.temp;
  const out: PlayOutcome = {
    cards: cards.map((c) => ({ ...c })),
    eval: ev,
    score: 0,
    shutdown: false,
    bluescreen: null,
    destroyed: [],
    drawn: [],
    tempBefore,
    tempPeak: ev.heat.after,
    tempAfter: 0,
    money: 0,
  };
  b.hands -= 1;
  b.plays += 1;
  run.stats.plays += 1;
  b.temp = ev.heat.after;
  b.maxTemp = Math.max(b.maxTemp, b.temp);
  run.stats.maxTemp = Math.max(run.stats.maxTemp, b.temp);
  b.hand = b.hand.filter((id) => !sel.includes(id));

  if (ev.heat.shutdown) {
    out.shutdown = true;
  } else {
    withRng(run, (r) => {
      // stability check of unstable overclocks (GDD 9)
      if (!swIds(run).includes('sw16')) {
        for (const { inst } of installed(run.build)) {
          const d = part(inst.id);
          const oc = d.cat === 'cpu' || d.cat === 'gpu' || d.cat === 'ram' ? inst.oc : 0;
          const eff = d.cat === 'cpu' ? (cpuOcAllowed(run.build) ? oc : 0) : d.cat === 'ram' ? (ramOcAllowed(run.build, inst) ? oc : 0) : oc;
          if (eff > inst.limit && r.chance(1 / 4)) {
            out.bluescreen = inst.uid;
            inst.limitKnown = true;
            run.stats.bluescreens++;
            break;
          }
        }
      }
      if (out.bluescreen === null) {
        out.score = ev.score;
        out.money = ev.money;
        // Instabil cards may break
        for (const i of ev.scored) {
          const c = cards[i]!;
          if (c.enh === 'unst' && r.chance(1 / 4)) out.destroyed.push(c.id);
        }
      }
    });
  }

  if (out.bluescreen === null && !out.shutdown) {
    b.score += out.score;
    b.capture += out.money;
    run.money += out.money;
    run.stats.moneyEarned += out.money;
    run.stats.bestPlay = Math.max(run.stats.bestPlay, out.score);
    run.stats.profiles[ev.profile] = (run.stats.profiles[ev.profile] ?? 0) + 1;
    for (const s of activeSoftware(run)) if (s.id === 'sw12') s.counter += ev.gpuCards;
  }
  // played cards → discard pile, destroyed cards leave the deck
  for (const id of sel) {
    if (out.destroyed.includes(id)) run.deck = run.deck.filter((c) => c.id !== id);
    else b.pile.push(id);
  }
  if (!out.shutdown) b.temp = Math.max(IDLE_TEMP, b.temp - b.cooling);
  out.tempAfter = b.temp;

  if (out.shutdown) {
    lose(run, 'shutdown');
  } else if (b.score >= b.target) {
    b.result = 'won';
    finishBenchmark(run);
  } else if (b.hands <= 0) {
    lose(run, 'target');
  } else {
    out.drawn = drawUp(b);
    if (b.hand.length === 0) lose(run, 'empty');
  }
  return { ok: true, out };
}

export function discardCards(run: RunState, ids: readonly number[]): Result<{ drawn: number[] }> {
  const b = run.bench;
  if (run.phase !== 'bench' || !b || b.result) return fail('notAllowed');
  if (b.discards <= 0) return fail('notAllowed');
  const sel = b.hand.filter((id) => ids.includes(id));
  if (sel.length === 0 || sel.length > 5 || sel.length !== ids.length) return fail('cardsCount');
  b.discards -= 1;
  b.hand = b.hand.filter((id) => !sel.includes(id));
  b.pile.push(...sel);
  b.temp = Math.max(IDLE_TEMP, b.temp - 3);
  const drawn = drawUp(b);
  if (b.hand.length === 0) lose(run, 'empty');
  return { ok: true, drawn };
}

export function reorderHand(run: RunState, order: readonly number[]): Result {
  const b = run.bench;
  if (!b) return fail('notAllowed');
  if (order.length !== b.hand.length || !order.every((id) => b.hand.includes(id))) return fail('notAllowed');
  b.hand = [...order];
  return { ok: true };
}

export function sortHand(run: RunState, by: 'level' | 'type'): Result {
  const b = run.bench;
  if (!b) return fail('notAllowed');
  const ti = (t: CardType) => CARD_TYPES.indexOf(t);
  b.hand.sort((x, y) => {
    const a = card(run, x);
    const c = card(run, y);
    return by === 'level' ? c.level - a.level || ti(a.type) - ti(c.type) : ti(a.type) - ti(c.type) || c.level - a.level;
  });
  return { ok: true };
}

function lose(run: RunState, reason: LossReason): void {
  const b = run.bench!;
  b.result = 'lost';
  b.lossReason = reason;
  run.gameOver = { reason, gen: run.gen, kind: b.kind, boss: b.boss, score: b.score, target: b.target };
  run.phase = 'gameover';
}

function finishBenchmark(run: RunState): void {
  const b = run.bench!;
  run.stats.benchesWon++;
  const stats = statsOf(run);
  const lines: Receipt['lines'] = [];
  const moneyBefore = run.money;
  lines.push({ key: 'reward', amount: rewardFor(b.kind) });
  if (b.hands > 0) lines.push({ key: 'hands', amount: b.hands, n: b.hands });
  const interest = interestFor(run.money);
  if (interest > 0) lines.push({ key: 'interest', amount: interest });
  const krypto = activeSoftware(run).filter((s) => s.id === 'sw11').length * 2;
  if (krypto) lines.push({ key: 'krypto', amount: krypto });
  if (b.capture) lines.push({ key: 'capture', amount: b.capture, info: true });
  if (b.kind === 'boss' && stats.billPerGen > 0) lines.push({ key: 'bill', amount: -stats.billPerGen });
  if (run.debt > 0) lines.push({ key: 'debt', amount: -run.debt });
  const total = lines.filter((l) => !l.info).reduce((s, l) => s + l.amount, 0);
  let money = run.money + total;
  let debt = 0;
  if (money < 0) {
    debt = -money;
    money = 0;
  }
  run.stats.moneyEarned += Math.max(0, total);
  run.money = money;
  run.debt = debt;
  // Zwangs-Update grows after every benchmark
  for (const s of run.software) if (s.id === 'sw10') s.counter += 1;
  run.receipt = { kind: b.kind, lines, total, moneyBefore, moneyAfter: money, debtAfter: debt };
  run.phase = 'receipt';
}

/** Receipt → shop. Advances the benchmark pointer. */
export function collectReceipt(run: RunState): Result {
  if (run.phase !== 'receipt') return fail('notAllowed');
  run.receipt = null;
  run.bench = null;
  // all broken flags stay; GPU melt persists until repaired
  if (run.benchIndex >= 2) {
    run.gen += 1;
    run.benchIndex = 0;
    ensureBoss(run, run.gen);
  } else {
    run.benchIndex += 1;
  }
  run.shop = generateShop(run);
  run.pack = null;
  drawShopCards(run);
  run.phase = 'shop';
  return { ok: true };
}

// ---------------------------------------------------------------- shop

const UNIQUE: ReadonlySet<Category> = new Set<Category>(['board', 'cpu', 'gpu', 'psu', 'cooler', 'case']);

function ownedIds(run: RunState): Set<string> {
  const s = new Set<string>();
  for (const { inst } of installed(run.build)) s.add(inst.id);
  for (const p of run.storage) s.add(p.id);
  return s;
}

function rollHardware(run: RunState, r: Rng, exclude: Set<string>): string | null {
  const owned = ownedIds(run);
  const pool = ALL_PARTS.filter((p) => isShopPart(p) && !exclude.has(p.id) && !(UNIQUE.has(p.cat) && owned.has(p.id)));
  const w = tierWeights(run.gen);
  const tiers = [1, 2, 3, 4].filter((t) => w[t - 1]! > 0 && pool.some((p) => p.tier === t));
  if (!tiers.length) return null;
  const tier = r.weighted(tiers, (t) => w[t - 1]!);
  return r.pick(pool.filter((p) => p.tier === tier)).id;
}

function rollSoftware(run: RunState, r: Rng, sChance: number): SoftwareId | null {
  const owned = new Set(run.software.map((s) => s.id));
  const pool = SOFTWARE.filter((s) => !owned.has(s.id));
  if (!pool.length) return null;
  const wantS = r.chance(sChance);
  const pref = pool.filter((s) => (wantS ? s.rarity !== 'G' : s.rarity === 'G'));
  return r.pick(pref.length ? pref : pool).id;
}

function rollShopSoft(run: RunState, r: Rng): ShopSoft | null {
  if (r.chance(0.7)) {
    const id = rollSoftware(run, r, 0.28);
    if (id) return { kind: 'sw', id, price: softwareDef(id).price };
  }
  if (r.chance(0.5)) return { kind: 'driver', id: r.pick(PROFILE_IDS), price: DRIVER_PRICE };
  const t = r.pick(TOOLS);
  return { kind: 'tool', id: t.id, price: t.price };
}

const PACK_WEIGHTS: Record<PackKind, number> = { workload: 35, driver: 25, tool: 25, software: 15 };

export function generateShop(run: RunState): ShopState {
  return withRng(run, (r) => {
    const hw = rollHardwareShelf(run, r);
    const packs: PackKind[] = [];
    for (let i = 0; i < 2; i++) packs.push(r.weighted(Object.keys(PACK_WEIGHTS) as PackKind[], (k) => PACK_WEIGHTS[k]));
    return { hardware: hw, soft: rollShopSoft(run, r), packs, rerollsUsed: 0 };
  });
}

function rollHardwareShelf(run: RunState, r: Rng): ShopState['hardware'] {
  const ex = new Set<string>();
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const id = rollHardware(run, r, ex);
    if (id) {
      ids.push(id);
      ex.add(id);
    }
  }
  // Smart shop: at least one offer fits the current build
  const opts = { software: swIds(run), pasteUses: run.pasteUses };
  const fits = (id: string) => shopBadge(run.build, id, opts).status !== 'bad';
  if (ids.length && !ids.some(fits)) {
    const owned = ownedIds(run);
    const w = tierWeights(run.gen);
    const pool = ALL_PARTS.filter(
      (p) => isShopPart(p) && w[p.tier - 1]! > 0 && !ids.includes(p.id) && !(UNIQUE.has(p.cat) && owned.has(p.id)) && fits(p.id),
    );
    if (pool.length) ids[ids.length - 1] = r.weighted(pool, (p) => w[p.tier - 1]!).id;
  }
  return ids.map((id) => ({ partId: id, price: part(id).price }));
}

export function rerollCost(run: RunState): number {
  return 2 + (run.shop?.rerollsUsed ?? 0);
}

export function rerollShop(run: RunState): Result {
  const s = run.shop;
  if (!s || run.phase !== 'shop') return fail('notAllowed');
  const cost = rerollCost(run);
  if (run.money < cost) return fail('noMoney');
  run.money -= cost;
  s.rerollsUsed++;
  withRng(run, (r) => {
    s.hardware = rollHardwareShelf(run, r);
    s.soft = rollShopSoft(run, r);
  });
  return { ok: true };
}

function rollLimit(r: Rng): number {
  const x = r.next();
  return x < 0.3 ? 1 : x < 0.8 ? 2 : 3;
}

export function buyHardware(run: RunState, index: number): Result<{ inst: PartInst }> {
  const s = run.shop;
  const offer = s?.hardware[index];
  if (!s || !offer) return fail('notAllowed');
  if (run.money < offer.price) return fail('noMoney');
  if (run.storage.length >= STORAGE_SLOTS) return fail('storageFull');
  run.money -= offer.price;
  const inst = withRng(run, (r) => newInst(run, offer.partId, offer.price, rollLimit(r)));
  run.storage.push(inst);
  s.hardware[index] = null;
  run.stats.bought[offer.partId] = (run.stats.bought[offer.partId] ?? 0) + 1;
  return { ok: true, inst };
}

export function buySoft(run: RunState): Result {
  const s = run.shop;
  const o = s?.soft;
  if (!s || !o) return fail('notAllowed');
  if (run.money < o.price) return fail('noMoney');
  if (o.kind === 'sw') {
    const r = addSoftware(run, o.id, o.price);
    if (!r.ok) return r;
  } else if (o.kind === 'tool') {
    if (run.tools.length >= TOOL_SLOTS) return fail('toolsFull');
    run.tools.push(o.id);
  } else {
    run.drivers[o.id] = (run.drivers[o.id] ?? 1) + 1;
  }
  run.money -= o.price;
  run.stats.bought[o.id] = (run.stats.bought[o.id] ?? 0) + 1;
  s.soft = null;
  return { ok: true };
}

function addSoftware(run: RunState, id: SoftwareId, paid: number): Result {
  if (run.software.some((s) => s.id === id)) return fail('owned');
  if (!softwareDef(id).noSlot && freeSwSlots(run) <= 0) return fail('noSwSlot');
  run.software.push({ uid: run.nextUid++, id, counter: id === 'sw10' ? 2 : 0, paid });
  return { ok: true };
}

export function buyPack(run: RunState, index: number): Result {
  const s = run.shop;
  const kind = s?.packs[index];
  if (!s || !kind || run.pack) return fail('notAllowed');
  const price = PACK_PRICES[kind];
  if (run.money < price) return fail('noMoney');
  run.money -= price;
  s.packs[index] = null;
  run.pack = { kind, options: withRng(run, (r) => rollPack(run, r, kind)) };
  run.stats.bought['pack_' + kind] = (run.stats.bought['pack_' + kind] ?? 0) + 1;
  return { ok: true };
}

function rollPack(run: RunState, r: Rng, kind: PackKind): PackOption[] {
  switch (kind) {
    case 'workload':
      return [0, 1, 2].map(() => ({
        kind: 'card' as const,
        type: r.pick(CARD_TYPES),
        level: r.range(1, 10),
        enh: r.chance(0.3) ? r.pick(ENHANCEMENTS) : undefined,
      }));
    case 'driver':
      return r.shuffle([...PROFILE_IDS]).slice(0, 3).map((id) => ({ kind: 'driver' as const, id }));
    case 'tool':
      return r.shuffle(TOOLS.map((t) => t.id)).slice(0, 3).map((id) => ({ kind: 'tool' as const, id }));
    case 'software': {
      const out: PackOption[] = [];
      const owned = new Set(run.software.map((s) => s.id));
      const pool = SOFTWARE.filter((s) => !owned.has(s.id));
      const rare = r.shuffle(pool.filter((s) => s.rarity !== 'G'));
      const common = r.shuffle(pool.filter((s) => s.rarity === 'G'));
      for (let i = 0; i < 2; i++) {
        const src = r.chance(0.5) ? (rare.length ? rare : common) : common.length ? common : rare;
        const sw = src.shift();
        if (sw) out.push({ kind: 'sw', id: sw.id });
      }
      return out;
    }
  }
}

/** Choose an option of the opened pack (null = skip). */
export function choosePack(run: RunState, index: number | null): Result {
  const p = run.pack;
  if (!p) return fail('notAllowed');
  if (index !== null) {
    const o = p.options[index];
    if (!o) return fail('notAllowed');
    switch (o.kind) {
      case 'card': {
        const id = Math.max(0, ...run.deck.map((c) => c.id)) + 1;
        run.deck.push({ id, type: o.type, level: o.level, ...(o.enh ? { enh: o.enh } : {}) });
        break;
      }
      case 'driver':
        run.drivers[o.id] = (run.drivers[o.id] ?? 1) + 1;
        break;
      case 'tool':
        if (run.tools.length >= TOOL_SLOTS) return fail('toolsFull');
        run.tools.push(o.id);
        break;
      case 'sw': {
        const r = addSoftware(run, o.id, Math.floor(softwareDef(o.id).price / 2));
        if (!r.ok) return r;
        break;
      }
    }
  }
  run.pack = null;
  return { ok: true };
}

export function discardTool(run: RunState, index: number): Result {
  if (index < 0 || index >= run.tools.length) return fail('notAllowed');
  run.tools.splice(index, 1);
  return { ok: true };
}

export function sellSoftware(run: RunState, uid: number): Result<{ amount: number }> {
  if (run.phase !== 'shop' && run.phase !== 'workbench') return fail('notAllowed');
  const i = run.software.findIndex((s) => s.uid === uid);
  if (i < 0) return fail('notAllowed');
  const amount = sellValue(run.software[i]!.paid || softwareDef(run.software[i]!.id).price);
  run.software.splice(i, 1);
  run.money += amount;
  return { ok: true, amount };
}

export function moveSoftware(run: RunState, uid: number, to: number): Result {
  const i = run.software.findIndex((s) => s.uid === uid);
  if (i < 0 || to < 0 || to >= run.software.length) return fail('notAllowed');
  const [s] = run.software.splice(i, 1);
  run.software.splice(to, 0, s!);
  return { ok: true };
}

const MANDATORY: ReadonlySet<Category> = new Set<Category>(['board', 'cpu', 'ram', 'drive', 'psu', 'cooler', 'case']);

export function canSellPart(run: RunState, uid: number): Result {
  const inst = run.storage.find((p) => p.uid === uid);
  if (!inst) return fail('notAllowed');
  const cat = part(inst.id).cat;
  // Softlock protection (GDD 8): with a broken build, mandatory parts may not be sold
  if (MANDATORY.has(cat) && !postOk(run.build, { software: swIds(run), pasteUses: run.pasteUses })) return fail('softlock');
  return { ok: true };
}

export function sellPart(run: RunState, uid: number): Result<{ amount: number }> {
  if (run.phase !== 'shop' && run.phase !== 'workbench') return fail('notAllowed');
  const can = canSellPart(run, uid);
  if (!can.ok) return can;
  const i = run.storage.findIndex((p) => p.uid === uid);
  const inst = run.storage[i]!;
  const amount = sellValue(inst.paid);
  run.storage.splice(i, 1);
  run.money += amount;
  return { ok: true, amount };
}

export function repairCost(): number {
  return 5;
}

export function brokenParts(run: RunState): PartInst[] {
  return [...installed(run.build).map((x) => x.inst), ...run.storage].filter((p) => p.broken);
}

export function repairPart(run: RunState, uid: number): Result {
  const p = brokenParts(run).find((x) => x.uid === uid);
  if (!p) return fail('notAllowed');
  if (run.money < repairCost()) return fail('noMoney');
  run.money -= repairCost();
  p.broken = false;
  return { ok: true };
}

export function goWorkbench(run: RunState): Result {
  if (run.phase !== 'shop' || run.pack) return fail('notAllowed');
  run.phase = 'workbench';
  return { ok: true };
}

export function backToShop(run: RunState): Result {
  if (run.phase !== 'workbench' || !run.shop) return fail('notAllowed');
  run.phase = 'shop';
  return { ok: true };
}

// ---------------------------------------------------------------- workbench

function statOpts(run: RunState) {
  return { software: swIds(run), pasteUses: run.pasteUses };
}

/** Installs a part from storage (or moves an installed part) into a slot. */
export function installPart(run: RunState, uid: number, slot: SlotRef): Result<{ displaced: PartInst[] }> {
  const fromStorage = run.storage.find((p) => p.uid === uid);
  const inst = fromStorage ?? installed(run.build).find((x) => x.inst.uid === uid)?.inst;
  if (!inst) return fail('notAllowed');
  const opt = slotOptions(run.build, inst, statOpts(run)).find((o) => o.slot.kind === slot.kind && o.slot.index === slot.index);
  if (!opt) return fail('badSlot');
  if (opt.status === 'bad') return fail('badSlot', opt.issue);
  const sim = simulatePlace(run.build, inst, slot);
  const storageAfter = run.storage.length - (fromStorage ? 1 : 0) + sim.displaced.length;
  if (storageAfter > STORAGE_SLOTS) return fail('storageFull');
  run.build = sim.build;
  if (fromStorage) run.storage = run.storage.filter((p) => p.uid !== uid);
  run.storage.push(...sim.displaced);
  return { ok: true, displaced: sim.displaced };
}

export function uninstallPart(run: RunState, uid: number): Result {
  const slot = findSlotOf(run.build, uid);
  if (!slot) return fail('notAllowed');
  if (slot.kind === 'board' || slot.kind === 'case') return fail('notAllowed');
  if (run.storage.length >= STORAGE_SLOTS) return fail('storageFull');
  const inst = installed(run.build).find((x) => x.inst.uid === uid)!.inst;
  setSlot(run.build, slot, null);
  run.storage.push(inst);
  return { ok: true };
}

export function postIssues(run: RunState): Issue[] {
  return validate(run.build, statOpts(run));
}

export function leaveWorkbench(run: RunState): Result<{ issues: Issue[] }> {
  if (run.phase !== 'workbench') return fail('notAllowed');
  const issues = postIssues(run);
  const err = issues.find((i) => i.severity === 'error');
  if (err) return fail('post', err);
  run.shop = null;
  run.pack = null;
  run.shopCards = [];
  run.phase = 'select';
  return { ok: true, issues };
}

// ---------------------------------------------------------------- BIOS

export function ocAllowed(run: RunState, uid: number): boolean {
  if (swIds(run).includes('sw16')) return false;
  const it = installed(run.build).find((x) => x.inst.uid === uid);
  if (!it) return false;
  const d = part(it.inst.id);
  if (d.cat === 'cpu') return cpuOcAllowed(run.build);
  if (d.cat === 'ram') return ramOcAllowed(run.build, it.inst);
  return d.cat === 'gpu';
}

export function setOc(run: RunState, uid: number, level: number): Result {
  if (run.phase !== 'workbench' && run.phase !== 'shop') return fail('notAllowed');
  if (!ocAllowed(run, uid)) return fail('notAllowed');
  const inst = installed(run.build).find((x) => x.inst.uid === uid)!.inst;
  inst.oc = Math.max(0, Math.min(3, Math.round(level)));
  return { ok: true };
}

export function stabilityTest(run: RunState, uid: number): Result {
  const inst = installed(run.build).find((x) => x.inst.uid === uid)?.inst;
  if (!inst || inst.limitKnown) return fail('notAllowed');
  if (run.money < 1) return fail('noMoney');
  run.money -= 1;
  inst.limitKnown = true;
  return { ok: true };
}

// ---------------------------------------------------------------- tools

export function drawShopCards(run: RunState): void {
  run.shopCards = withRng(run, (r) => r.shuffle(run.deck.map((c) => c.id)).slice(0, 6));
}

export interface ToolUse {
  cards?: number[];
  type?: CardType;
}

export function toolTargets(run: RunState): number[] {
  if (run.phase === 'bench' && run.bench) return run.bench.hand;
  return run.shopCards.filter((id) => run.deck.some((c) => c.id === id));
}

export function useTool(run: RunState, index: number, use: ToolUse = {}): Result<{ newCards: number[] }> {
  const id = run.tools[index];
  if (!id) return fail('notAllowed');
  const t = toolDef(id);
  const inBench = run.phase === 'bench' && !!run.bench && !run.bench.result;
  if (!inBench && run.phase !== 'shop' && run.phase !== 'workbench') return fail('notAllowed');
  if (t.benchOnly && !inBench) return fail('notAllowed');
  const targets = toolTargets(run);
  const sel = (use.cards ?? []).filter((c) => targets.includes(c));
  if (t.cards > 0 && (sel.length === 0 || sel.length > t.cards || sel.length !== (use.cards ?? []).length)) return fail('cardsCount');
  const newCards: number[] = [];
  switch (id) {
    case 't1':
      if (run.pasteUses >= PASTE_MAX_USES) return fail('pasteMax');
      run.pasteUses++;
      if (run.bench) run.bench.cooling += 2;
      break;
    case 't2':
      if (!use.type) return fail('notAllowed');
      for (const c of sel) card(run, c).type = use.type;
      break;
    case 't3':
      run.bench!.temp = Math.max(IDLE_TEMP, run.bench!.temp - 25);
      break;
    case 't4':
      if (run.deck.length - sel.length < MIN_DECK) return fail('deckMin');
      run.deck = run.deck.filter((c) => !sel.includes(c.id));
      if (run.bench) run.bench.hand = run.bench.hand.filter((c) => !sel.includes(c));
      break;
    case 't5': {
      const src = card(run, sel[0]!);
      const nid = Math.max(0, ...run.deck.map((c) => c.id)) + 1;
      run.deck.push({ ...src, id: nid });
      newCards.push(nid);
      if (inBench) run.bench!.hand.push(nid);
      break;
    }
    case 't8':
      for (const c of sel) card(run, c).enh = 'oc';
      break;
    case 't9':
      for (const c of sel) card(run, c).enh = 'eff';
      break;
  }
  run.tools.splice(index, 1);
  if (!inBench && t.cards > 0) drawShopCards(run);
  return { ok: true, newCards };
}

// ---------------------------------------------------------------- misc

export function deckCounts(run: RunState): { total: number; drawLeft: number } {
  return { total: run.deck.length, drawLeft: run.bench ? run.bench.draw.length : run.deck.length };
}

export function cardTypeIndex(t: CardType): number {
  return CARD_TYPES.indexOf(t);
}
