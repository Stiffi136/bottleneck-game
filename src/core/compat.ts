import { FORM_ORDER, GPU_LEN_MM, GPU_LEN_ORDER, GPU_REAL_MM, part, partOf } from './data/hardware';
import {
  boardOf,
  caseFreeFanSlots,
  caseOf,
  computeStats,
  coolerOf,
  cpuOf,
  drives,
  fans,
  findSlotOf,
  getSlot,
  psuOf,
  ramKits,
  reflow,
  setSlot,
  type StatOpts,
} from './build';
import type { Build, Category, PartInst, SlotKind, SlotRef } from './types';

export type CompatMsg =
  | 'K1'
  | 'K2'
  | 'K3'
  | 'K4_board'
  | 'K4_cpu'
  | 'K4_ram'
  | 'K4_drive'
  | 'K4_psu'
  | 'K4_cooler'
  | 'K4_case'
  | 'K5'
  | 'K6'
  | 'K7'
  | 'K8'
  | 'K9_height'
  | 'K9_rad'
  | 'K10'
  | 'K11_m2'
  | 'K11_sata'
  | 'K12'
  | 'SLOT_SHORT'
  | 'SLOT_LANES'
  | 'MULTIGPU'
  | 'W_LANES'
  | 'W_NOLANES'
  | 'W_XMP'
  | 'W_MIXED'
  | 'W_BROKEN';

export type Led = 'cpu' | 'dram' | 'vga' | 'boot';

export interface Issue {
  msg: CompatMsg;
  severity: 'error' | 'warn';
  led: Led;
  uids: number[];
  params: Record<string, string | number>;
}

/** Errors that mean "this part physically does not fit here". */
const PHYSICAL: ReadonlySet<CompatMsg> = new Set<CompatMsg>([
  'K1',
  'K2',
  'K7',
  'K8',
  'K9_height',
  'K9_rad',
  'K10',
  'K11_m2',
  'K11_sata',
  'K12',
  'SLOT_SHORT',
  'SLOT_LANES',
  'MULTIGPU',
]);

/** Full POST check (GDD 8). */
export function validate(b: Build, opts: StatOpts = {}): Issue[] {
  const out: Issue[] = [];
  const err = (msg: CompatMsg, led: Led, uids: number[] = [], params: Issue['params'] = {}) =>
    out.push({ msg, severity: 'error', led, uids, params });
  const warn = (msg: CompatMsg, led: Led, uids: number[] = [], params: Issue['params'] = {}) =>
    out.push({ msg, severity: 'warn', led, uids, params });

  const board = boardOf(b);
  const cpu = cpuOf(b);
  const cs = caseOf(b);
  const psu = psuOf(b);
  const cooler = coolerOf(b);
  const stats = computeStats(b, opts);

  // K4 – mandatory parts
  if (!b.case) err('K4_case', 'boot');
  if (!board) err('K4_board', 'cpu');
  if (!cpu) err('K4_cpu', 'cpu');
  if (!cooler) err('K4_cooler', 'cpu');
  if (!psu) err('K4_psu', 'cpu');
  if (board && ramKits(b).length === 0) err('K4_ram', 'dram');
  if (board && drives(b).length === 0) err('K4_drive', 'boot');

  // K1 socket
  if (cpu && board && cpu.socket !== board.socket) {
    err('K1', 'cpu', [b.cpu!.uid], { cpu: cpu.socket, board: board.socket });
  }
  // K2 RAM generation
  if (board) {
    for (const k of ramKits(b)) {
      const r = partOf(k.id, 'ram');
      if (r.gen !== board.ramGen) err('K2', 'dram', [k.uid], { ram: r.gen, board: board.ramGen });
    }
  }
  // K5 video output
  if (cpu && board && !stats.video) err('K5', 'vga', [b.cpu!.uid]);
  // K6 power
  if (psu && stats.tdp > psu.watt) err('K6', 'cpu', [b.psu!.uid], { tdp: stats.tdp, watt: psu.watt });
  // K7 form factor
  if (cs && board && FORM_ORDER[board.form]! > FORM_ORDER[cs.maxForm]!) {
    err('K7', 'boot', [b.board!.uid], { board: board.form, case: cs.maxForm });
  }
  // PCIe: K8, K10, slot sizes, multi GPU
  if (board) {
    let gpus = 0;
    b.pcie.forEach((p, i) => {
      if (!p) return;
      const d = part(p.id);
      const slot = board.pcie[i]!;
      if (d.cat === 'gpu') {
        gpus++;
        if (gpus > 1) err('MULTIGPU', 'vga', [p.uid]);
        if (slot.size !== 16) err('SLOT_SHORT', 'vga', [p.uid]);
        if (cs && GPU_LEN_ORDER[d.len]! > GPU_LEN_ORDER[cs.maxGpu]!) {
          err('K8', 'vga', [p.uid], { len: GPU_REAL_MM[d.id] ?? GPU_LEN_MM[d.len]!, max: GPU_LEN_MM[cs.maxGpu]! });
        }
        for (let j = i + 1; j < i + d.width && j < b.pcie.length; j++) {
          const covered = b.pcie[j];
          if (covered) err('K10', 'vga', [covered.uid, p.uid], { slot: j + 1 });
        }
        if (p.broken) {
          if (stats.video) warn('W_BROKEN', 'vga', [p.uid]);
        }
      } else if (d.cat === 'exp') {
        if (d.minLanes > slot.lanes) err('SLOT_LANES', 'boot', [p.uid], { need: d.minLanes, slot: slot.lanes });
      }
    });
  }
  // K9 cooler
  if (cooler && cs) {
    if (cooler.radiator === 0 && cooler.height > cs.maxCooler) {
      err('K9_height', 'cpu', [b.cooler!.uid], { h: cooler.height, max: cs.maxCooler });
    }
    if (cooler.radiator > 0 && cs.radiator < cooler.radiator) {
      err('K9_rad', 'cpu', [b.cooler!.uid], { rad: cooler.radiator });
    }
  }
  // K11 drive interfaces
  b.m2.forEach((p) => {
    if (p && partOf(p.id, 'drive').iface === 'sata') err('K11_sata', 'boot', [p.uid]);
  });
  b.sata.forEach((p) => {
    if (p && partOf(p.id, 'drive').iface !== 'sata') err('K11_m2', 'boot', [p.uid]);
  });
  // K12 fan slots
  if (cs) {
    const free = caseFreeFanSlots(cs);
    const rad = cooler ? cooler.radiator / 120 : 0;
    const used = fans(b).length + rad;
    if (used > free) {
      const uids = cooler && cooler.radiator ? [b.cooler!.uid] : fans(b).map((f) => f.uid);
      err('K12', 'boot', uids, { need: used, free });
    }
  }
  // soft rules
  for (const [uid, info] of stats.lanes) {
    if (info.status === 'throttled') warn('W_LANES', 'boot', [uid], { got: info.got, need: info.need });
    if (info.status === 'none') warn('W_NOLANES', 'boot', [uid], { need: info.need });
  }
  if (stats.ram.xmpPenalty) warn('W_XMP', 'dram', ramKits(b).map((k) => k.uid));
  if (stats.ram.mixed) warn('W_MIXED', 'dram', ramKits(b).map((k) => k.uid));
  return out;
}

export function postOk(b: Build, opts: StatOpts = {}): boolean {
  return !validate(b, opts).some((i) => i.severity === 'error');
}

const issueKey = (i: Issue) => `${i.msg}:${[...i.uids].sort().join(',')}`;

export function cloneBuild(b: Build): Build {
  return JSON.parse(JSON.stringify(b)) as Build;
}

/** Slot kinds a part category can go into. */
export function slotKindsFor(cat: Category, partId: string): SlotKind[] {
  switch (cat) {
    case 'board':
      return ['board'];
    case 'cpu':
      return ['cpu'];
    case 'cooler':
      return ['cooler'];
    case 'psu':
      return ['psu'];
    case 'case':
      return ['case'];
    case 'ram':
      return ['ram'];
    case 'gpu':
    case 'exp':
      return ['pcie'];
    case 'fan':
      return ['fan'];
    case 'drive':
      return partOf(partId, 'drive').iface === 'sata' ? ['sata'] : ['m2'];
  }
}

export function slotsOfKind(b: Build, kind: SlotKind): SlotRef[] {
  switch (kind) {
    case 'ram':
    case 'pcie':
    case 'm2':
    case 'sata':
    case 'fan': {
      const arr = kind === 'fan' ? b.fans : b[kind];
      return arr.map((_, i) => ({ kind, index: i }));
    }
    default:
      return [{ kind, index: 0 }];
  }
}

export interface Placement {
  build: Build;
  displaced: PartInst[];
}

/** Simulates placing `inst` into `slot` (moving it if it is installed already). */
export function simulatePlace(b: Build, inst: PartInst, slot: SlotRef): Placement {
  const nb = cloneBuild(b);
  const displaced: PartInst[] = [];
  const from = findSlotOf(nb, inst.uid);
  if (from) setSlot(nb, from, null);
  const occupant = getSlot(nb, slot);
  if (occupant) {
    if (from && part(occupant.id).cat === part(inst.id).cat && from.kind === slot.kind) setSlot(nb, from, occupant);
    else displaced.push(occupant);
  }
  setSlot(nb, slot, JSON.parse(JSON.stringify(inst)) as PartInst);
  if (slot.kind === 'board' || slot.kind === 'case') displaced.push(...reflow(nb));
  return { build: nb, displaced };
}

export type SlotStatus = 'ok' | 'warn' | 'bad';
export interface SlotOption {
  slot: SlotRef;
  status: SlotStatus;
  issue?: Issue;
  occupant: PartInst | null;
  displaced: PartInst[];
}

const CONTAINERS: ReadonlySet<SlotKind> = new Set<SlotKind>(['board', 'case', 'psu']);

export function slotOptions(b: Build, inst: PartInst, opts: StatOpts = {}): SlotOption[] {
  const d = part(inst.id);
  const base = new Set(validate(b, opts).map(issueKey));
  const res: SlotOption[] = [];
  const cur = findSlotOf(b, inst.uid);
  for (const kind of slotKindsFor(d.cat, d.id)) {
    for (const slot of slotsOfKind(b, kind)) {
      if (cur && cur.kind === slot.kind && cur.index === slot.index) continue;
      const occupant = getSlot(b, slot);
      const sim = simulatePlace(b, inst, slot);
      const issues = validate(sim.build, opts);
      const mine = issues.filter((i) => i.uids.includes(inst.uid));
      const physical = mine.find((i) => i.severity === 'error' && PHYSICAL.has(i.msg));
      const newErrors = issues.filter((i) => i.severity === 'error' && !base.has(issueKey(i)));
      let status: SlotStatus = 'ok';
      let issue: Issue | undefined;
      if (physical && !CONTAINERS.has(slot.kind)) {
        status = 'bad';
        issue = physical;
      } else if (newErrors.length) {
        status = 'warn';
        issue = newErrors.find((i) => i.uids.includes(inst.uid)) ?? newErrors[0];
      } else {
        const w = mine.find((i) => i.severity === 'warn');
        if (w) {
          status = 'warn';
          issue = w;
        }
      }
      res.push({ slot, status, issue, occupant, displaced: sim.displaced });
    }
  }
  return res;
}

export interface Badge {
  status: SlotStatus;
  issue?: Issue;
  slot?: SlotRef;
}

/** Shop compatibility badge (GDD 14.1): would this part work in the current build? */
export function shopBadge(b: Build, partId: string, opts: StatOpts = {}): Badge {
  const d = part(partId);
  const tmp: PartInst = { uid: -999, id: partId, oc: 0, limit: 3, limitKnown: false, paid: 0 };
  let best: Badge | null = null;
  const rank = { ok: 0, warn: 1, bad: 2 } as const;
  for (const kind of slotKindsFor(d.cat, d.id)) {
    for (const slot of slotsOfKind(b, kind)) {
      const sim = simulatePlace(b, tmp, slot);
      const issues = validate(sim.build, opts);
      const errors = issues.filter((i) => i.severity === 'error');
      let cand: Badge;
      if (errors.length) {
        cand = { status: 'bad', issue: errors.find((i) => i.uids.includes(tmp.uid)) ?? errors[0], slot };
      } else {
        const w = issues.find((i) => i.severity === 'warn' && i.uids.includes(tmp.uid));
        cand = w ? { status: 'warn', issue: w, slot } : { status: 'ok', slot };
      }
      // prefer free slots over swapping when equal
      const occupied = !!getSlot(b, slot);
      if (
        !best ||
        rank[cand.status] < rank[best.status] ||
        (rank[cand.status] === rank[best.status] && !occupied && best.slot && !!getSlot(b, best.slot))
      ) {
        best = cand;
      }
    }
  }
  if (!best) {
    const msg: CompatMsg = d.cat === 'fan' ? 'K12' : d.cat === 'ram' ? 'K3' : d.cat === 'drive' ? 'K11_m2' : 'K10';
    return { status: 'bad', issue: { msg, severity: 'error', led: 'boot', uids: [], params: { need: 1, free: 0 } } };
  }
  return best;
}
