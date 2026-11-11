import { describe, expect, it } from 'vitest';
import { cardHeat, forecastHeat, newRun, playCards, startBenchmark, statsOf, scoreCtx, type RunState } from '../src/core/run';
import { computeHeat, coolDown, IDLE_TEMP, SHUTDOWN_TEMP, THROTTLE_TEMP } from '../src/core/scoring';
import { computeStats, coolingSources } from '../src/core/build';
import type { BossId, Enhancement, SoftwareId } from '../src/core/types';
import { mkBuild } from './helpers';

interface Setup {
  seed?: string;
  temp?: number;
  boss?: BossId;
  sw?: SoftwareId[];
  paste?: number;
  enh?: Enhancement[]; // enhancements for the first deck cards drawn
  build?: Parameters<typeof mkBuild>[0];
  cooling?: number; // override of the benchmark cooling (e.g. boss heatwave)
}

function setup(o: Setup): RunState {
  const run = newRun(o.seed ?? 'FC');
  if (o.build) run.build = mkBuild(o.build);
  run.pasteUses = o.paste ?? 0;
  run.software = (o.sw ?? []).map((id, i) => ({ uid: 9000 + i, id, counter: 0, paid: 0 }));
  startBenchmark(run);
  const b = run.bench!;
  if (o.temp !== undefined) b.temp = o.temp;
  if (o.boss) b.boss = o.boss;
  if (o.cooling !== undefined) b.cooling = o.cooling;
  (o.enh ?? []).forEach((e, i) => {
    const c = run.deck.find((x) => x.id === b.hand[i])!;
    c.enh = e;
  });
  return run;
}

/** Forecast first, then really play: peak, end value, throttling and crash must match. */
function check(run: RunState, n: number, from = 0) {
  const ids = run.bench!.hand.slice(from, from + n);
  const before = run.bench!.temp;
  const fc = forecastHeat(run, ids)!;
  expect(fc).not.toBeNull();
  expect(fc.start).toBe(before);
  const r = playCards(run, ids);
  expect(r.ok).toBe(true);
  if (!r.ok) return fc;
  const out = r.out;
  expect(fc.peak).toBe(out.tempPeak);
  expect(fc.add).toBe(out.eval.heat.total);
  expect(fc.throttled).toBe(out.eval.heat.throttled);
  expect(fc.crash).toBe(out.shutdown);
  expect(fc.afterCooling).toBe(out.tempAfter);
  expect(fc.peak - fc.afterCooling).toBe(fc.cooled);
  return fc;
}

describe('forecastHeat = real result of playCards', () => {
  it('starter PC: 1 to 5 cards from idle', () => {
    for (let n = 1; n <= 4; n++) check(setup({ seed: `S${n}` }), n);
  });

  it('several plays in a row (temperature carries over)', () => {
    const run = setup({ seed: 'SEQ' });
    for (let i = 0; i < 3; i++) {
      const hand = run.bench!.hand;
      check(run, Math.min(3, hand.length));
      if (run.bench!.result) break;
    }
  });

  it('strong cooling (Krake 360 LCD + Mesh + fans, FanCurve, thermal paste)', () => {
    const run = setup({
      build: { case: 'CA3', board: 'MB3', cpu: 'C5', cooler: 'K5', psu: 'P3', ram: ['R5'], m2: ['S5'], fans: ['F1', 'F2'] },
      sw: ['sw5'],
      paste: 2,
      temp: 60,
    });
    const st = statsOf(run);
    expect(st.cooling).toBe(run.bench!.cooling);
    expect(st.cooling).toBeGreaterThan(20);
    const fc = check(run, 4);
    expect(fc.cooled).toBeGreaterThan(8);
  });

  it('cooling never goes below idle', () => {
    const run = setup({ temp: IDLE_TEMP, cooling: 50 });
    const fc = check(run, 1);
    expect(fc.afterCooling).toBe(IDLE_TEMP);
    expect(fc.cooled).toBe(fc.peak - IDLE_TEMP);
  });

  it('enhancements: Efficient (0 heat), Overclocked (+1), Krypto-Miner and Undervolt software', () => {
    check(setup({ seed: 'E1', enh: ['eff', 'eff', 'oc'] }), 3);
    check(setup({ seed: 'E2', enh: ['oc', 'oc', 'oc', 'oc'], sw: ['sw16'] }), 4);
    check(setup({ seed: 'E3', sw: ['sw11'], build: { case: 'CA3', board: 'MB3', cpu: 'C4', cooler: 'K4', psu: 'P3', ram: ['R4'], pcie: ['G4'], m2: ['S4'] } }), 4);
  });

  it('boss heat multipliers (B2 x2, B6 GPU x3, F1 x1.5) and heatwave start', () => {
    const gpuBuild = { case: 'CA3', board: 'MB3', cpu: 'C4', cooler: 'K4', psu: 'P3', ram: ['R4'], pcie: ['G4'], m2: ['S4'] };
    check(setup({ boss: 'b2', build: gpuBuild }), 4);
    check(setup({ boss: 'b6', build: gpuBuild }), 4);
    check(setup({ boss: 'f1', build: gpuBuild }), 4);
    check(setup({ boss: 'b7', temp: 60, cooling: 4 }), 3);
  });

  it('throttling from 85 °C, emergency shutdown from 100 °C (no cooling then)', () => {
    const hot = setup({ temp: 84 });
    const fc = check(hot, 3);
    expect(fc.throttled).toBe(true);
    expect(fc.peak).toBeGreaterThanOrEqual(THROTTLE_TEMP);

    const crash = setup({ temp: 98 });
    const f2 = check(crash, 4);
    expect(f2.crash).toBe(true);
    expect(f2.peak).toBeGreaterThanOrEqual(SHUTDOWN_TEMP);
    expect(f2.afterCooling).toBe(f2.peak);
    expect(f2.cooled).toBe(0);
  });

  it('empty selection / no benchmark gives no forecast', () => {
    const run = setup({});
    expect(forecastHeat(run, [])).toBeNull();
    expect(forecastHeat(newRun('NB'), [1])).toBeNull();
  });

  it('is pure: calling it changes nothing', () => {
    const run = setup({});
    const snap = JSON.stringify(run);
    forecastHeat(run, run.bench!.hand.slice(0, 3));
    expect(JSON.stringify(run)).toBe(snap);
  });
});

describe('cooling sources and card heat', () => {
  it('sources add up exactly to computeStats().cooling', () => {
    const builds = [
      { case: 'CA1', board: 'MB1', cpu: 'C1', cooler: 'K1', psu: 'P1', ram: ['R1'], sata: ['S1'] },
      { case: 'CA3', board: 'MB3', cpu: 'C5', cooler: 'K3', psu: 'P3', ram: ['R5'], m2: ['S5'], fans: ['F1'] },
      { case: 'CA4', board: 'MB3', cpu: 'C5', cooler: 'K5', psu: 'P3', ram: ['R5'], m2: ['S5'], fans: ['F2'] },
    ];
    for (const spec of builds) {
      const b = mkBuild(spec);
      for (const opts of [{}, { software: ['sw5' as SoftwareId], pasteUses: 3 }]) {
        const src = coolingSources(b, opts);
        expect(src.reduce((n, x) => n + x.value, 0)).toBe(computeStats(b, opts).cooling);
        expect(src.every((x) => x.value !== 0)).toBe(true);
      }
    }
    expect(coolingSources(mkBuild(builds[0]!), { software: ['sw5'], pasteUses: 2 }).map((s) => s.kind)).toEqual(expect.arrayContaining(['cooler', 'sw5', 'paste']));
  });

  it('no-RGB bonus of the double tower is a source of its own', () => {
    const b = mkBuild({ case: 'CA3', board: 'MB3', cpu: 'C5', cooler: 'K3', psu: 'P3', ram: ['R5'], m2: ['S5'] });
    expect(coolingSources(b).map((s) => s.kind)).toContain('norgb');
  });

  it('cardHeat equals the per-card heat of computeHeat (also without a benchmark)', () => {
    const run = setup({ seed: 'CH', enh: ['oc', 'eff'] });
    for (const id of run.bench!.hand) {
      const c = run.deck.find((x) => x.id === id)!;
      expect(cardHeat(run, c)).toBe(computeHeat(scoreCtx(run), [c]).perCard[0]);
    }
    const idle = newRun('IDLE');
    expect(cardHeat(idle, idle.deck[0]!)).toBeGreaterThanOrEqual(0);
  });

  it('coolDown clamps at idle', () => {
    expect(coolDown(60, 8)).toBe(52);
    expect(coolDown(36, 8)).toBe(IDLE_TEMP);
  });
});
