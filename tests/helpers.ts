import { emptyBuild, reflow, computeStats } from '../src/core/build';
import type { Build, Card, CardType, PartInst, SoftwareId, SoftwareInst, BossId, ProfileId } from '../src/core/types';
import type { ScoreCtx } from '../src/core/scoring';

let uid = 1000;
export function inst(id: string, oc = 0): PartInst {
  return { uid: uid++, id, oc, limit: 3, limitKnown: false, paid: 0 };
}

export interface BuildSpec {
  case: string;
  board: string;
  cpu: string;
  cooler: string;
  psu: string;
  ram?: string[];
  pcie?: (string | null | [string, number])[];
  m2?: string[];
  sata?: string[];
  fans?: string[];
  cpuOc?: number;
}

export function mkBuild(s: BuildSpec): Build {
  const b = emptyBuild();
  b.case = inst(s.case);
  b.board = inst(s.board);
  reflow(b);
  b.cpu = inst(s.cpu, s.cpuOc ?? 0);
  b.cooler = inst(s.cooler);
  b.psu = inst(s.psu);
  (s.ram ?? []).forEach((r, i) => (b.ram[i] = inst(r)));
  (s.pcie ?? []).forEach((p, i) => {
    if (!p) return;
    b.pcie[i] = Array.isArray(p) ? inst(p[0], p[1]) : inst(p);
  });
  (s.m2 ?? []).forEach((r, i) => (b.m2[i] = inst(r)));
  (s.sata ?? []).forEach((r, i) => (b.sata[i] = inst(r)));
  (s.fans ?? []).forEach((r, i) => (b.fans[i] = inst(r)));
  return b;
}

export const starter = (): Build =>
  mkBuild({ case: 'CA1', board: 'MB1', cpu: 'C1', cooler: 'K1', psu: 'P1', ram: ['R1'], sata: ['S1'] });

let cid = 1;
export function c(type: CardType, level: number, enh?: Card['enh']): Card {
  return { id: cid++, type, level, ...(enh ? { enh } : {}) };
}

export function sw(...ids: SoftwareId[]): SoftwareInst[] {
  return ids.map((id) => ({ uid: uid++, id, counter: id === 'sw10' ? 2 : 0, paid: 0 }));
}

export function ctx(build: Build, opts: Partial<ScoreCtx> & { swList?: SoftwareInst[]; drivers?: Partial<Record<ProfileId, number>>; boss?: BossId | null } = {}): ScoreCtx {
  const software = opts.swList ?? [];
  return {
    build,
    stats: computeStats(build, { software: software.map((s) => s.id) }),
    software,
    driverLevels: opts.drivers ?? {},
    boss: opts.boss ?? null,
    temp: opts.temp ?? 35,
    disabled: opts.disabled ?? new Set(),
    cpuBrownout: opts.cpuBrownout ?? false,
    captureSoFar: opts.captureSoFar ?? 0,
    freeSwSlots: opts.freeSwSlots ?? 0,
  };
}
