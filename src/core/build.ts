import { part, partOf, handSizeForGb, kitGb } from './data/hardware';
import { MAX_SW_SLOTS } from './data/content';
import type {
  BoardDef,
  Build,
  CaseDef,
  CoolerDef,
  CpuDef,
  GpuDef,
  PartDef,
  PartInst,
  PsuDef,
  RamDef,
  SlotKind,
  SlotRef,
  SoftwareId,
} from './types';

export function emptyBuild(): Build {
  return { board: null, cpu: null, cooler: null, psu: null, case: null, ram: [], pcie: [], m2: [], sata: [], fans: [] };
}

export function def(inst: PartInst): PartDef {
  return part(inst.id);
}

export const boardOf = (b: Build): BoardDef | null => (b.board ? partOf(b.board.id, 'board') : null);
export const cpuOf = (b: Build): CpuDef | null => (b.cpu ? partOf(b.cpu.id, 'cpu') : null);
export const caseOf = (b: Build): CaseDef | null => (b.case ? partOf(b.case.id, 'case') : null);
export const psuOf = (b: Build): PsuDef | null => (b.psu ? partOf(b.psu.id, 'psu') : null);
export const coolerOf = (b: Build): CoolerDef | null => (b.cooler ? partOf(b.cooler.id, 'cooler') : null);

export function gpuInst(b: Build): PartInst | null {
  for (const p of b.pcie) if (p && part(p.id).cat === 'gpu') return p;
  return null;
}
export function gpuOf(b: Build): GpuDef | null {
  const g = gpuInst(b);
  return g ? partOf(g.id, 'gpu') : null;
}

export function ramKits(b: Build): PartInst[] {
  return b.ram.filter((r): r is PartInst => !!r);
}
export function drives(b: Build): PartInst[] {
  return [...b.m2, ...b.sata].filter((r): r is PartInst => !!r);
}
export function exps(b: Build): PartInst[] {
  return b.pcie.filter((p): p is PartInst => !!p && part(p.id).cat === 'exp');
}
export function fans(b: Build): PartInst[] {
  return b.fans.filter((r): r is PartInst => !!r);
}

/** Every installed part with its slot. */
export function installed(b: Build): { inst: PartInst; slot: SlotRef }[] {
  const out: { inst: PartInst; slot: SlotRef }[] = [];
  const single: SlotKind[] = ['case', 'board', 'psu', 'cpu', 'cooler'];
  for (const k of single) {
    const p = b[k as 'case'];
    if (p) out.push({ inst: p, slot: { kind: k, index: 0 } });
  }
  const multi: SlotKind[] = ['ram', 'pcie', 'm2', 'sata', 'fan'];
  for (const kind of multi) {
    const arr = slotArray(b, kind);
    arr.forEach((p, i) => {
      if (p) out.push({ inst: p, slot: { kind, index: i } });
    });
  }
  return out;
}

export function slotArray(b: Build, kind: SlotKind): (PartInst | null)[] {
  switch (kind) {
    case 'ram':
      return b.ram;
    case 'pcie':
      return b.pcie;
    case 'm2':
      return b.m2;
    case 'sata':
      return b.sata;
    case 'fan':
      return b.fans;
    default:
      return [b[kind]];
  }
}

export function getSlot(b: Build, s: SlotRef): PartInst | null {
  if (s.kind === 'ram' || s.kind === 'pcie' || s.kind === 'm2' || s.kind === 'sata' || s.kind === 'fan') {
    return slotArray(b, s.kind)[s.index] ?? null;
  }
  return b[s.kind];
}

export function setSlot(b: Build, s: SlotRef, p: PartInst | null): void {
  switch (s.kind) {
    case 'ram':
    case 'pcie':
    case 'm2':
    case 'sata':
    case 'fan': {
      const arr = slotArray(b, s.kind);
      if (s.index < 0 || s.index >= arr.length) throw new Error(`slot ${s.kind}#${s.index} out of range`);
      arr[s.index] = p;
      return;
    }
    default:
      b[s.kind] = p;
  }
}

export function findSlotOf(b: Build, uid: number): SlotRef | null {
  for (const it of installed(b)) if (it.inst.uid === uid) return it.slot;
  return null;
}

/** Free fan slots of a case (builtin fans already subtracted). */
export function caseFreeFanSlots(c: CaseDef): number {
  return c.fanSlots - c.builtinFans.length;
}

/**
 * Re-sizes the slot arrays after the board or case changed. Parts that no
 * longer have a slot are returned (caller moves them to storage).
 */
export function reflow(b: Build): PartInst[] {
  const out: PartInst[] = [];
  const board = boardOf(b);
  const fit = (arr: (PartInst | null)[], n: number, keepIndex: boolean): (PartInst | null)[] => {
    const res: (PartInst | null)[] = new Array(n).fill(null);
    if (keepIndex) {
      arr.forEach((p, i) => {
        if (!p) return;
        if (i < n && !res[i]) res[i] = p;
        else {
          const free = res.findIndex((x) => !x);
          if (free >= 0) res[free] = p;
          else out.push(p);
        }
      });
    } else {
      let i = 0;
      for (const p of arr) {
        if (!p) continue;
        if (i < n) res[i++] = p;
        else out.push(p);
      }
    }
    return res;
  };
  b.ram = fit(b.ram, board ? board.dimms / 2 : 0, false);
  b.pcie = fit(b.pcie, board ? board.pcie.length : 0, true);
  b.m2 = fit(b.m2, board ? board.m2 : 0, true);
  b.sata = fit(b.sata, board ? board.sata : 0, true);
  const c = caseOf(b);
  b.fans = fit(b.fans, c ? caseFreeFanSlots(c) : 0, true);
  // GPUs must be in a x16-sized slot; move/drop otherwise
  if (board) {
    b.pcie.forEach((p, i) => {
      if (!p) return;
      const d = part(p.id);
      if (d.cat === 'gpu' && board.pcie[i]!.size !== 16) {
        b.pcie[i] = null;
        const target = board.pcie.findIndex((s, j) => s.size === 16 && !b.pcie[j]);
        if (target >= 0) b.pcie[target] = p;
        else out.push(p);
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------- lanes

export type LaneStatus = 'ok' | 'throttled' | 'none';
export interface LaneInfo {
  need: number;
  got: number;
  status: LaneStatus;
}

export function allocateLanes(b: Build): { avail: number; used: number; devices: Map<number, LaneInfo> } {
  const board = boardOf(b);
  const cpu = cpuOf(b);
  const avail = (cpu?.lanes ?? 0) + (board?.chipsetLanes ?? 0);
  let remaining = avail;
  const devices = new Map<number, LaneInfo>();
  const give = (inst: PartInst, need: number, slotLanes: number) => {
    const got = Math.max(0, Math.min(need, slotLanes, remaining));
    remaining -= got;
    devices.set(inst.uid, { need, got, status: got >= need ? 'ok' : got > 0 ? 'throttled' : 'none' });
  };
  if (!board) return { avail, used: 0, devices };
  // priority: GPU → M.2 → other slots top to bottom
  b.pcie.forEach((p, i) => {
    if (p && part(p.id).cat === 'gpu') give(p, partOf(p.id, 'gpu').lanes, board.pcie[i]!.lanes);
  });
  b.m2.forEach((p) => {
    if (p) give(p, partOf(p.id, 'drive').lanes, 4);
  });
  b.pcie.forEach((p, i) => {
    if (p && part(p.id).cat === 'exp') give(p, partOf(p.id, 'exp').lanes, board.pcie[i]!.lanes);
  });
  return { avail, used: avail - remaining, devices };
}

// ---------------------------------------------------------------- stats

export interface StatOpts {
  software?: readonly SoftwareId[];
  pasteUses?: number;
}

export interface RamEffect {
  l: number;
  t: number;
  ocL: number;
  xmpPenalty: boolean;
  mixed: boolean;
}

export interface BuildStats {
  cores: number;
  handSize: number;
  rerolls: number;
  swSlots: number;
  cooling: number;
  tdp: number;
  watt: number;
  lanesAvail: number;
  lanesUsed: number;
  ramGb: number;
  rgbCount: number;
  video: boolean;
  billPerGen: number;
  ram: RamEffect;
  lanes: Map<number, LaneInfo>;
  partTdp: Map<number, number>;
}

export function cpuOcAllowed(b: Build): boolean {
  const cpu = cpuOf(b);
  const board = boardOf(b);
  if (!cpu || !board || !cpu.ocable) return false;
  if (cpu.brand === 'intellion') return board.chipset === 'Z' || board.chipset === 'X';
  return board.chipset === 'B' || board.chipset === 'X' || board.chipset === 'Z';
}

export function ramOcAllowed(b: Build, kit: PartInst): boolean {
  const board = boardOf(b);
  const r = partOf(kit.id, 'ram');
  return !!board && r.xmp && board.chipset !== 'H';
}

/** Effective OC level of a part (respects chipset locks and Undervolt). */
export function effectiveOc(b: Build, inst: PartInst, sw: readonly SoftwareId[] = []): number {
  if (sw.includes('sw16')) return 0;
  const d = part(inst.id);
  if (d.cat === 'cpu') return cpuOcAllowed(b) ? inst.oc : 0;
  if (d.cat === 'ram') return ramOcAllowed(b, inst) ? inst.oc : 0;
  if (d.cat === 'gpu') return inst.oc;
  return 0;
}

export function rgbParts(b: Build): number {
  let n = 0;
  for (const { inst } of installed(b)) if (part(inst.id).rgb) n++;
  const c = caseOf(b);
  if (c) for (const f of c.builtinFans) if (part(f).rgb) n++;
  return n;
}

export function ramEffect(b: Build, sw: readonly SoftwareId[] = []): RamEffect {
  const kits = ramKits(b);
  const board = boardOf(b);
  if (kits.length === 0) return { l: 0, t: 0, ocL: 0, xmpPenalty: false, mixed: false };
  const defs = kits.map((k) => partOf(k.id, 'ram'));
  // weakest kit decides
  let weakest = 0;
  defs.forEach((d, i) => {
    const w = defs[weakest]!;
    if (d.l < w.l || (d.l === w.l && d.t < w.t)) weakest = i;
  });
  const d = defs[weakest]!;
  let l = d.l;
  let t = d.t;
  const mixed = kits.length > 1;
  if (mixed) l -= 1;
  const xmpPenalty = defs.some((x) => x.xmp) && board?.chipset === 'H';
  if (xmpPenalty) {
    l -= 2;
    t -= 1;
  }
  const ocL = Math.min(...kits.map((k) => effectiveOc(b, k, sw)));
  return { l: Math.max(0, l), t: Math.max(0, t), ocL, xmpPenalty, mixed };
}

export function partTdp(b: Build, inst: PartInst, sw: readonly SoftwareId[] = []): number {
  const d = part(inst.id);
  const uv = sw.includes('sw16') ? 0.8 : 1;
  if (d.cat === 'cpu') return d.tdp * (1 + 0.2 * effectiveOc(b, inst, sw)) * uv;
  if (d.cat === 'gpu') return d.tdp * (1 + 0.15 * effectiveOc(b, inst, sw)) * uv;
  return d.tdp;
}

export function computeStats(b: Build, opts: StatOpts = {}): BuildStats {
  const sw = opts.software ?? [];
  const cpu = cpuOf(b);
  const gpu = gpuOf(b);
  const gpuI = gpuInst(b);
  const c = caseOf(b);
  const cooler = coolerOf(b);
  const psu = psuOf(b);

  const partTdpMap = new Map<number, number>();
  let tdp = 0;
  for (const { inst } of installed(b)) {
    const w = partTdp(b, inst, sw);
    partTdpMap.set(inst.uid, w);
    tdp += w;
  }
  if (c) for (const f of c.builtinFans) tdp += part(f).tdp;
  tdp = Math.round(tdp);

  const ramGb = ramKits(b).reduce((s, k) => s + kitGb(partOf(k.id, 'ram')), 0);
  let handSize = handSizeForGb(ramGb);
  if (gpu?.special === 'vram' && !gpuI?.broken) handSize += 1;

  const drvDefs = drives(b).map((d) => partOf(d.id, 'drive'));
  const rerolls = 3 + (drvDefs.length ? Math.max(...drvDefs.map((d) => d.reroll)) : 0);
  const swSlots = Math.min(MAX_SW_SLOTS, drvDefs.reduce((s, d) => s + d.swSlots, 0));

  const rgb = rgbParts(b);
  let cooling = (cooler?.cooling ?? 0) + (c?.airflow ?? 0);
  if (cooler?.special === 'norgb' && rgb === 0) cooling += 3;
  for (const f of fans(b)) cooling += partOf(f.id, 'fan').cooling;
  if (c) for (const f of c.builtinFans) cooling += partOf(f, 'fan').cooling;
  for (const s of sw) if (s === 'sw5') cooling += 4;
  cooling += 2 * (opts.pasteUses ?? 0);

  const lanes = allocateLanes(b);
  const video = !!(cpu && cpu.igpu > 0) || !!(gpu && !gpuI?.broken && lanes.devices.get(gpuI!.uid)?.status !== 'none');

  let bill = Math.floor(tdp / 100) + (psu?.billMod ?? 0);
  if (gpu?.special === 'frugal') bill -= 1;
  bill = Math.max(0, bill);

  return {
    cores: Math.min(8, cpu?.cores ?? 0),
    handSize,
    rerolls: Math.max(0, rerolls),
    swSlots,
    cooling,
    tdp,
    watt: psu?.watt ?? 0,
    lanesAvail: lanes.avail,
    lanesUsed: lanes.used,
    ramGb,
    rgbCount: rgb,
    video,
    billPerGen: bill,
    ram: ramEffect(b, sw),
    lanes: lanes.devices,
    partTdp: partTdpMap,
  };
}

export type { RamDef };
