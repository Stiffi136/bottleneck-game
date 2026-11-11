import { describe, expect, it } from 'vitest';
import { evaluatePlay, computeHeat } from '../src/core/scoring';
import { computeStats } from '../src/core/build';
import { c, ctx, mkBuild, starter, sw } from './helpers';

describe('score formula (GDD 6.4 / 6.5)', () => {
  it('example 1: starter PC, Heterogen = 58 x 4 = 232', () => {
    const b = starter();
    const ev = evaluatePlay(ctx(b), [c('gpu', 7), c('cpu', 7), c('ram', 3), c('io', 9)]);
    expect(ev.profile).toBe('hetero');
    expect(ev.l).toBe(58);
    expect(ev.t).toBe(4);
    expect(ev.score).toBe(232);
    expect(ev.heat.total).toBe(6);
    expect(computeStats(b).cooling).toBe(8);
    expect(computeStats(b).tdp).toBe(103);
  });

  it('example 2: mid-range build, Pipeline Lv.2 = 154 x 64 = 9856', () => {
    const b = mkBuild({
      case: 'CA3', board: 'MB7', cpu: 'C9', cooler: 'K5', psu: 'P2', ram: ['R5'],
      pcie: [['G4', 1], null, 'E1'], m2: ['S5'], fans: ['F1'],
    });
    const stats = computeStats(b);
    expect(stats.tdp).toBe(408);
    expect(stats.cooling).toBe(22);
    expect(stats.handSize).toBe(8);
    const list = sw('sw2', 'sw1', 'sw3');
    const cards = [c('cpu', 5), c('gpu', 6), c('gpu', 7), c('ram', 8), c('io', 9), c('cpu', 9)];
    const ev = evaluatePlay(ctx(b, { swList: list, drivers: { pipeline: 2 } }), cards);
    expect(ev.profile).toBe('pipeline');
    expect(ev.l).toBe(154);
    expect(ev.t).toBe(64);
    expect(ev.score).toBe(9856);
    expect(ev.heat.total).toBe(20);
  });

  it('throttling halves Takt at >= 85 °C', () => {
    const b = starter();
    const cards = [c('cpu', 2), c('cpu', 3)];
    const cool = evaluatePlay(ctx(b), cards);
    const hot = evaluatePlay(ctx(b, { temp: 80 }), cards);
    expect(hot.heat.throttled).toBe(true);
    expect(hot.t).toBe(cool.t / 2);
  });

  it('shutdown at >= 100 °C', () => {
    const h = computeHeat(ctx(starter(), { temp: 95 }), [c('cpu', 1), c('cpu', 2)]);
    expect(h.shutdown).toBe(true);
  });

  it('enhancements: oc +3 T, opt +20 L, eff +5 L and 0 heat, unst x2 T', () => {
    const b = starter();
    const base = evaluatePlay(ctx(b), [c('ram', 5)]);
    expect(evaluatePlay(ctx(b), [c('ram', 5, 'oc')]).t).toBe(base.t + 3);
    expect(evaluatePlay(ctx(b), [c('ram', 5, 'opt')]).l).toBe(base.l + 20);
    const eff = evaluatePlay(ctx(b), [c('ram', 5, 'eff')]);
    expect(eff.l).toBe(base.l + 5);
    expect(eff.heat.total).toBe(0);
    // unst doubles the running Takt at the card (profile 1 → 2), then +1 CPU base
    expect(evaluatePlay(ctx(b), [c('ram', 5, 'unst')]).t).toBe(3);
  });

  it('boss Krysis: only GPU cards trigger hardware', () => {
    const b = starter();
    const ev = evaluatePlay(ctx(b, { boss: 'b1' }), [c('cpu', 7)]);
    expect(ev.l).toBe(5 + 7); // no CPU +2
    const g = evaluatePlay(ctx(b, { boss: 'b1' }), [c('gpu', 7)]);
    expect(g.l).toBe(5 + 7 + 2);
  });

  it('boss Shader compilation: first card is not scored', () => {
    const ev = evaluatePlay(ctx(starter(), { boss: 'b11' }), [c('cpu', 7), c('gpu', 7)]);
    expect(ev.profile).toBe('single');
    expect(ev.scored).toEqual([1]);
  });

  it('boss heat multipliers (Prime96 x2, Fellmark GPU x3)', () => {
    const cards = [c('cpu', 1), c('gpu', 2)];
    expect(computeHeat(ctx(starter(), { boss: 'b2' }), cards).total).toBe(8);
    expect(computeHeat(ctx(starter(), { boss: 'b6' }), cards).total).toBe(6);
  });

  it('finale Cyberpunk: no GPU card = 0', () => {
    const ev = evaluatePlay(ctx(starter(), { boss: 'f1' }), [c('cpu', 7), c('cpu', 7)]);
    expect(ev.score).toBe(0);
  });

  it('software: Stresstest x2 at >= 70 °C, Overlay adds temperature', () => {
    const b = starter();
    const list = sw('sw6', 'sw15');
    const ev = evaluatePlay(ctx(b, { swList: list, temp: 66 }), [c('cpu', 1)]);
    expect(ev.heat.after).toBe(69);
    expect(ev.t).toBe(2);
    const ev2 = evaluatePlay(ctx(b, { swList: list, temp: 67 }), [c('cpu', 1)]);
    expect(ev2.t).toBe(4);
    expect(ev2.l).toBe(5 + 1 + 2 + 70);
  });

  it('lane throttling halves GPU bonus (GPU in x16(x4) slot)', () => {
    const b = mkBuild({ case: 'CA3', board: 'MB2', cpu: 'C2', cooler: 'K2', psu: 'P2', ram: ['R2'], pcie: [null, null, null, 'G3'], sata: ['S1'] });
    const ev = evaluatePlay(ctx(b), [c('gpu', 1)]);
    expect(ev.l).toBe(5 + 1 + 3.5);
    expect(ev.score).toBe(Math.floor(9.5 * (1 + 0.5 + 2)));
  });

  it('e-cores: 6th to 8th card produce no heat', () => {
    const b = mkBuild({ case: 'CA3', board: 'MB5', cpu: 'C4', cooler: 'K2', psu: 'P2', ram: ['R2'], sata: ['S1'] });
    const cards = [1, 2, 3, 4, 5, 6].map((l) => c('cpu', l));
    expect(computeHeat(ctx(b), cards).total).toBe(5 * 4);
  });

  it('Nachbrenner doubles OC bonus and OC heat', () => {
    const b = mkBuild({ case: 'CA3', board: 'MB2', cpu: 'C2', cooler: 'K2', psu: 'P3', ram: ['R2'], pcie: [null, ['G3', 2]], sata: ['S1'] });
    const plain = evaluatePlay(ctx(b), [c('gpu', 1)]);
    expect(plain.l).toBe(5 + 1 + 7 + 6);
    expect(plain.heat.total).toBe(4 + 2);
    const nb = evaluatePlay(ctx(b, { swList: sw('sw7') }), [c('gpu', 1)]);
    expect(nb.l).toBe(5 + 1 + 7 + 12);
    expect(nb.heat.total).toBe(4 + 4);
  });
});
