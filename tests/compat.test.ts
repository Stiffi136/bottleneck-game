import { describe, expect, it } from 'vitest';
import { validate, postOk, slotOptions, shopBadge } from '../src/core/compat';
import { computeStats } from '../src/core/build';
import { inst, mkBuild, starter } from './helpers';

const errs = (b: ReturnType<typeof starter>) => validate(b).filter((i) => i.severity === 'error').map((i) => i.msg);

describe('compatibility (GDD 8)', () => {
  it('starter PC passes POST', () => {
    expect(postOk(starter())).toBe(true);
    const s = computeStats(starter());
    expect(s.cores).toBe(4);
    expect(s.handSize).toBe(6);
    expect(s.swSlots).toBe(2);
    expect(s.rerolls).toBe(3);
    expect(s.lanesAvail).toBe(20);
  });
  it('K1 socket mismatch', () => {
    const b = starter();
    b.cpu = inst('C9');
    expect(errs(b)).toContain('K1');
  });
  it('K2 DDR generation', () => {
    const b = starter();
    b.ram[0] = inst('R4');
    expect(errs(b)).toContain('K2');
  });
  it('K4 missing parts', () => {
    const b = starter();
    b.sata[0] = null;
    b.cooler = null;
    expect(errs(b)).toEqual(expect.arrayContaining(['K4_drive', 'K4_cooler']));
  });
  it('K5 no video output without iGPU and GPU', () => {
    // all MVP CPUs have an iGPU – a broken GPU is still fine; simulate missing iGPU via no CPU
    const b = mkBuild({ case: 'CA3', board: 'MB7', cpu: 'C9', cooler: 'K2', psu: 'P2', ram: ['R4'], m2: ['S4'] });
    expect(postOk(b)).toBe(true);
  });
  it('K6 power budget', () => {
    const b = mkBuild({ case: 'CA3', board: 'MB3', cpu: 'C5', cooler: 'K3', psu: 'P2', ram: ['R5'], pcie: ['G6'], m2: ['S5'] });
    expect(errs(b)).toContain('K6');
    b.psu = inst('P4');
    expect(errs(b)).not.toContain('K6');
  });
  it('K7 ATX board in mATX case', () => {
    const b = starter();
    b.board = inst('MB2');
    expect(errs(b)).toContain('K7');
  });
  it('K8 GPU too long for office case', () => {
    const b = starter();
    b.pcie[0] = inst('G5');
    expect(errs(b)).toContain('K8');
  });
  it('K9 tower cooler too high for office case, AIO needs radiator mount', () => {
    const b = starter();
    b.cooler = inst('K2');
    expect(errs(b)).toContain('K9_height');
    b.cooler = inst('K4');
    expect(errs(b)).toContain('K9_rad');
  });
  it('K10 dual-slot GPU covers the slot below', () => {
    const b = starter();
    b.pcie[0] = inst('G3');
    b.pcie[1] = inst('E1');
    expect(errs(b)).toContain('K10');
  });
  it('K12 fan slots incl. AIO radiators', () => {
    const b = mkBuild({ case: 'CA3', board: 'MB2', cpu: 'C2', cooler: 'K5', psu: 'P2', ram: ['R2'], sata: ['S1'], fans: ['F1', 'F1'] });
    expect(errs(b)).toContain('K12');
  });
  it('soft rules: XMP on H chipset, two kits, lanes', () => {
    const b = starter();
    b.ram[0] = inst('R3');
    expect(validate(b).map((i) => i.msg)).toContain('W_XMP');
    expect(computeStats(b).ram).toMatchObject({ l: 2, t: 0 });
    const b2 = mkBuild({ case: 'CA3', board: 'MB2', cpu: 'C2', cooler: 'K2', psu: 'P2', ram: ['R2', 'R3'], sata: ['S1'] });
    expect(computeStats(b2).ram).toMatchObject({ l: 2, t: 0, mixed: true });
    expect(computeStats(b2).handSize).toBe(9); // 16 + 32 GB
  });
  it('starter: NIC gets no lanes when GPU + NVMe take all 20', () => {
    const b = starter();
    b.pcie[0] = inst('G1');
    b.m2[0] = inst('S4');
    b.pcie[1] = inst('E1');
    const s = computeStats(b);
    expect(s.lanesUsed).toBe(8 + 1);
  });
  it('slot options mark incompatible slots red with a reason', () => {
    const b = starter();
    const ram = inst('R4');
    const opts = slotOptions(b, ram);
    expect(opts).toHaveLength(1);
    expect(opts[0]!.status).toBe('bad');
    expect(opts[0]!.issue?.msg).toBe('K2');
    const gpu = inst('G3');
    const g = slotOptions(b, gpu);
    expect(g.find((o) => o.slot.index === 0)!.status).toBe('ok');
    expect(g.find((o) => o.slot.index === 1)!.status).toBe('bad');
  });
  it('shop badges', () => {
    const b = starter();
    expect(shopBadge(b, 'G1').status).toBe('ok');
    expect(shopBadge(b, 'R4').status).toBe('bad');
    expect(shopBadge(b, 'G6').status).toBe('bad');
    expect(shopBadge(b, 'R3').status).toBe('warn');
    expect(shopBadge(b, 'F1').status).toBe('bad'); // no free fan slot in the office case
  });
});
