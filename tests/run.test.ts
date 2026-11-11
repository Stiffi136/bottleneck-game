import { describe, expect, it } from 'vitest';
import {
  newRun, startBenchmark, playCards, discardCards, collectReceipt, buyHardware, installPart, leaveWorkbench, goWorkbench,
  sellPart, rerollShop, rerollCost, buyPack, choosePack, generationBenches, statsOf, useTool,
} from '../src/core/run';
import { baseScore, interestFor, round2, targetFor, tierWeights, sellValue } from '../src/core/difficulty';

describe('difficulty curve (GDD 15.1)', () => {
  it('matches the target table', () => {
    const table: [number, number, number, number][] = [
      [1, 300, 450, 600], [2, 660, 990, 1300], [3, 1500, 2200, 2900], [4, 3200, 4800, 6400],
      [5, 7000, 11000, 14000], [6, 15000, 23000, 31000], [7, 34000, 51000, 68000], [8, 75000, 110000, 220000],
      [9, 190000, 290000, 390000], [10, 580000, 880000, 1200000], [11, 2000000, 3000000, 4000000],
      [12, 7500000, 11000000, 15000000], [13, 32000000, 48000000, 63000000], [14, 150000000, 220000000, 290000000],
    ];
    for (const [g, o, ga, bo] of table) {
      expect([targetFor(g, 'office'), targetFor(g, 'gaming'), targetFor(g, 'boss')]).toEqual([o, ga, bo]);
    }
  });
  it('growth accelerates after gen 8', () => {
    expect(baseScore(10) / baseScore(9)).toBeCloseTo(3.0);
    expect(round2(1234)).toBe(1200);
  });
  it('tier weights sum to 100', () => {
    for (let g = 1; g < 10; g++) expect(tierWeights(g).reduce((a, b) => a + b)).toBe(100);
  });
});

describe('economy (GDD 7.1)', () => {
  it('interest and sell values', () => {
    expect(interestFor(4)).toBe(0);
    expect(interestFor(14)).toBe(2);
    expect(interestFor(99)).toBe(5);
    expect(sellValue(0)).toBe(1);
    expect(sellValue(11)).toBe(5);
    expect(sellValue(1)).toBe(1);
  });
});

function winBenchmark(run: ReturnType<typeof newRun>) {
  startBenchmark(run);
  run.bench!.target = 1; // force a quick win
  const r = playCards(run, [run.bench!.hand[0]!]);
  expect(r.ok).toBe(true);
}

describe('run flow', () => {
  it('is deterministic for a seed', () => {
    const a = newRun('SEED1');
    const b = newRun('SEED1');
    startBenchmark(a);
    startBenchmark(b);
    expect(a.bench!.hand).toEqual(b.bench!.hand);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
  it('starts with $4, 40 cards and a valid starter PC', () => {
    const r = newRun('X');
    expect(r.money).toBe(4);
    expect(r.deck).toHaveLength(40);
    expect(statsOf(r).handSize).toBe(6);
    expect(generationBenches(r).map((b) => b.target)).toEqual([300, 450, 600]);
  });
  it('benchmark: draw, play, discard, receipt and reward', () => {
    const run = newRun('FLOW');
    startBenchmark(run);
    const b = run.bench!;
    expect(b.hand).toHaveLength(6);
    expect(b.hands).toBe(4);
    const d = discardCards(run, b.hand.slice(0, 2));
    expect(d.ok).toBe(true);
    expect(b.discards).toBe(2);
    expect(b.hand).toHaveLength(6);
    b.target = 1;
    const res = playCards(run, b.hand.slice(0, 2));
    expect(res.ok).toBe(true);
    expect(run.phase).toBe('receipt');
    // reward 3 + 3 unused hands, no interest with $4
    expect(run.receipt!.total).toBe(6);
    expect(run.money).toBe(10);
    collectReceipt(run);
    expect(run.phase).toBe('shop');
    expect(run.benchIndex).toBe(1);
    expect(run.shop!.hardware.length).toBe(2);
  });
  it('rejects too many cards and enforces Kinobank', () => {
    const run = newRun('CORES');
    startBenchmark(run);
    const r = playCards(run, run.bench!.hand.slice(0, 5));
    expect(r.ok).toBe(false);
  });
  it('game over when hands run out', () => {
    const run = newRun('LOSE');
    startBenchmark(run);
    run.bench!.target = 1e12;
    for (let i = 0; i < 4; i++) playCards(run, [run.bench!.hand[0]!]);
    expect(run.phase).toBe('gameover');
    expect(run.gameOver!.reason).toBe('target');
  });
  it('shop: buy, install, POST, reroll cost, packs, sell', () => {
    const run = newRun('SHOP');
    winBenchmark(run);
    collectReceipt(run);
    run.money = 100;
    run.shop!.hardware[0] = { partId: 'G1', price: 3 };
    const bought = buyHardware(run, 0);
    expect(bought.ok).toBe(true);
    expect(run.money).toBe(97);
    expect(run.storage).toHaveLength(1);
    goWorkbench(run);
    const uid = run.storage[0]!.uid;
    expect(installPart(run, uid, { kind: 'pcie', index: 1 }).ok).toBe(false); // x1 slot
    expect(installPart(run, uid, { kind: 'pcie', index: 0 }).ok).toBe(true);
    expect(run.storage).toHaveLength(0);
    expect(leaveWorkbench(run).ok).toBe(true);
    expect(run.phase).toBe('select');
    // next shop
    winBenchmark(run);
    collectReceipt(run);
    run.money = 100;
    expect(rerollCost(run)).toBe(2);
    rerollShop(run);
    expect(rerollCost(run)).toBe(3);
    expect(run.money).toBe(98);
    run.shop!.packs[0] = 'driver';
    expect(buyPack(run, 0).ok).toBe(true);
    const opt = run.pack!.options[0]!;
    expect(choosePack(run, 0).ok).toBe(true);
    if (opt.kind === 'driver') expect(run.drivers[opt.id]).toBe(2);
    run.shop!.hardware[0] = { partId: 'P2', price: 4 };
    buyHardware(run, 0);
    const sold = sellPart(run, run.storage[0]!.uid);
    expect(sold.ok && sold.amount).toBe(2);
  });
  it('POST blocks leaving the workbench with a broken build', () => {
    const run = newRun('POST');
    winBenchmark(run);
    collectReceipt(run);
    goWorkbench(run);
    run.build.sata[0] = null;
    const r = leaveWorkbench(run);
    expect(r.ok).toBe(false);
  });
  it('storage holds max 3 parts', () => {
    const run = newRun('STORE');
    winBenchmark(run);
    collectReceipt(run);
    run.money = 100;
    for (let i = 0; i < 3; i++) {
      run.shop!.hardware[0] = { partId: 'F1', price: 1 };
      expect(buyHardware(run, 0).ok).toBe(true);
    }
    run.shop!.hardware[0] = { partId: 'F1', price: 1 };
    expect(buyHardware(run, 0)).toMatchObject({ ok: false, err: 'storageFull' });
  });
  it('electricity bill after the boss and debt', () => {
    const run = newRun('BILL');
    winBenchmark(run); collectReceipt(run); goWorkbench(run); leaveWorkbench(run);
    winBenchmark(run); collectReceipt(run); goWorkbench(run); leaveWorkbench(run);
    run.money = 0;
    startBenchmark(run);
    run.bench!.target = 1;
    run.bench!.hands = 1;
    playCards(run, [run.bench!.hand[0]!]);
    const bill = run.receipt!.lines.find((l) => l.key === 'bill');
    expect(bill?.amount).toBe(-2); // 103 W → 1 + P1 modifier 1
    expect(run.money).toBe(3);
    collectReceipt(run);
    expect(run.gen).toBe(2);
  });
  it('tools: thermal paste raises cooling, Format C keeps a minimum deck', () => {
    const run = newRun('TOOLS');
    winBenchmark(run); collectReceipt(run);
    run.tools = ['t1', 't4'];
    expect(useTool(run, 0).ok).toBe(true);
    expect(statsOf(run).cooling).toBe(10);
    const ids = run.shopCards.slice(0, 2);
    expect(useTool(run, 0, { cards: ids }).ok).toBe(true);
    expect(run.deck).toHaveLength(38);
  });
});
