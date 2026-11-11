import type {
  BoardDef,
  CaseDef,
  Category,
  CoolerDef,
  CpuDef,
  DriveDef,
  ExpDef,
  FanDef,
  GpuDef,
  PartDef,
  PsuDef,
  RamDef,
} from '../types';

// All numbers from docs/game-design.md chapter 10 (MVP parts only).

export const BOARDS: BoardDef[] = [
  {
    id: 'MB1', cat: 'board', tier: 0, price: 0, tdp: 25, icon: 'icon_mb_1', socket: 'LGA-12', chipset: 'H', form: 'mATX',
    ramGen: 'DDR4', dimms: 2, pcie: [{ size: 16, lanes: 16 }, { size: 1, lanes: 1 }], m2: 1, m2Gen5: 0, sata: 4,
    chipsetLanes: 4, pcb: 'green',
  },
  {
    id: 'MB2', cat: 'board', tier: 1, price: 5, tdp: 30, icon: 'icon_mb_2', socket: 'LGA-12', chipset: 'B', form: 'ATX',
    ramGen: 'DDR4', dimms: 4,
    pcie: [{ size: 1, lanes: 1 }, { size: 16, lanes: 16 }, { size: 1, lanes: 1 }, { size: 16, lanes: 4 }],
    m2: 2, m2Gen5: 0, sata: 6, chipsetLanes: 8, pcb: 'black',
  },
  {
    id: 'MB3', cat: 'board', tier: 3, price: 9, tdp: 35, icon: 'icon_mb_3', socket: 'LGA-17', chipset: 'Z', form: 'ATX',
    ramGen: 'DDR5', dimms: 4,
    pcie: [{ size: 16, lanes: 16 }, { size: 1, lanes: 1 }, { size: 16, lanes: 4 }, { size: 1, lanes: 1 }],
    m2: 3, m2Gen5: 1, sata: 6, chipsetLanes: 12, pcb: 'black',
  },
  {
    id: 'MB5', cat: 'board', tier: 2, price: 5, tdp: 25, icon: 'icon_mb_5', socket: 'LGA-17', chipset: 'B', form: 'mATX',
    ramGen: 'DDR4', dimms: 4, pcie: [{ size: 16, lanes: 16 }, { size: 1, lanes: 1 }, { size: 1, lanes: 1 }],
    m2: 2, m2Gen5: 0, sata: 4, chipsetLanes: 8, pcb: 'blue',
  },
  {
    id: 'MB7', cat: 'board', tier: 2, price: 7, tdp: 30, icon: 'icon_mb_7', socket: 'AMX-5', chipset: 'B', form: 'mATX',
    ramGen: 'DDR5', dimms: 4, pcie: [{ size: 16, lanes: 16 }, { size: 1, lanes: 1 }, { size: 16, lanes: 4 }],
    m2: 2, m2Gen5: 0, sata: 4, chipsetLanes: 8, pcb: 'redblack',
  },
];

export const CPUS: CpuDef[] = [
  { id: 'C1', cat: 'cpu', brand: 'intellion', tier: 0, price: 0, tdp: 65, icon: 'icon_cpu_1', socket: 'LGA-12', cores: 4, takt: 1, lPerCard: 2, heat: 3, lanes: 16, igpu: 2, ocable: false },
  { id: 'C2', cat: 'cpu', brand: 'intellion', tier: 1, price: 6, tdp: 65, icon: 'icon_cpu_2', socket: 'LGA-12', cores: 6, takt: 2, lPerCard: 4, heat: 3, lanes: 20, igpu: 2, ocable: false },
  { id: 'C3', cat: 'cpu', brand: 'intellion', tier: 2, price: 10, tdp: 125, icon: 'icon_cpu_3', socket: 'LGA-12', cores: 8, takt: 3, lPerCard: 5, heat: 5, lanes: 20, igpu: 2, ocable: true },
  { id: 'C4', cat: 'cpu', brand: 'intellion', tier: 2, price: 10, tdp: 125, icon: 'icon_cpu_4', socket: 'LGA-17', cores: 6, takt: 4, lPerCard: 6, heat: 4, lanes: 20, igpu: 2, ocable: true, special: 'ecores' },
  { id: 'C5', cat: 'cpu', brand: 'intellion', tier: 4, price: 18, tdp: 253, icon: 'icon_cpu_5', socket: 'LGA-17', cores: 8, takt: 6, lPerCard: 8, heat: 8, lanes: 20, igpu: 2, ocable: true, special: 'turbo' },
  { id: 'C8', cat: 'cpu', brand: 'amx', tier: 2, price: 8, tdp: 65, icon: 'icon_cpu_8', socket: 'AMX-5', cores: 6, takt: 3, lPerCard: 5, heat: 3, lanes: 24, igpu: 1, ocable: true },
  { id: 'C9', cat: 'cpu', brand: 'amx', tier: 3, price: 15, tdp: 120, icon: 'icon_cpu_9', socket: 'AMX-5', cores: 8, takt: 4, lPerCard: 6, heat: 4, lanes: 24, igpu: 1, ocable: false, special: 'cache3d' },
];

export const GPUS: GpuDef[] = [
  { id: 'G1', cat: 'gpu', brand: 'veridia', tier: 1, price: 3, tdp: 30, icon: 'icon_gpu_1', l: 3, t: 0, heat: 1, len: 'S', width: 1, lanes: 4, dlss: false },
  { id: 'G2', cat: 'gpu', brand: 'rubeon', tier: 1, price: 6, tdp: 130, icon: 'icon_gpu_2', l: 6, t: 1, heat: 3, len: 'M', width: 2, lanes: 8, dlss: false, special: 'frugal' },
  { id: 'G3', cat: 'gpu', brand: 'veridia', tier: 2, price: 7, tdp: 170, icon: 'icon_gpu_3', l: 7, t: 1, heat: 4, len: 'M', width: 2, lanes: 16, dlss: true },
  { id: 'G4', cat: 'gpu', brand: 'veridia', tier: 3, price: 11, tdp: 200, icon: 'icon_gpu_4', l: 10, t: 2, heat: 4, len: 'M', width: 2, lanes: 16, dlss: true },
  { id: 'G5', cat: 'gpu', brand: 'rubeon', tier: 3, price: 15, tdp: 355, icon: 'icon_gpu_5', l: 14, t: 2, heat: 6, len: 'L', width: 3, lanes: 16, dlss: false, special: 'vram' },
  { id: 'G6', cat: 'gpu', brand: 'veridia', tier: 4, price: 22, tdp: 450, icon: 'icon_gpu_6', l: 20, t: 3, heat: 8, len: 'L', width: 3, lanes: 16, dlss: true, special: 'pin12' },
];

export const RAMS: RamDef[] = [
  { id: 'R1', cat: 'ram', tier: 0, price: 0, tdp: 6, icon: 'icon_ram_1', gen: 'DDR4', gbPerStick: 4, l: 1, t: 0, xmp: false, look: 'plain' },
  { id: 'R2', cat: 'ram', tier: 1, price: 4, tdp: 6, icon: 'icon_ram_2', gen: 'DDR4', gbPerStick: 8, l: 3, t: 0, xmp: false, look: 'hs' },
  { id: 'R3', cat: 'ram', tier: 2, price: 7, tdp: 6, icon: 'icon_ram_3', gen: 'DDR4', gbPerStick: 16, l: 4, t: 1, xmp: true, look: 'hs' },
  { id: 'R4', cat: 'ram', tier: 2, price: 6, tdp: 8, icon: 'icon_ram_4', gen: 'DDR5', gbPerStick: 16, l: 4, t: 1, xmp: false, look: 'plain' },
  { id: 'R5', cat: 'ram', tier: 3, price: 9, tdp: 8, icon: 'icon_ram_5', gen: 'DDR5', gbPerStick: 16, l: 6, t: 1, xmp: true, look: 'hs' },
  { id: 'R6', cat: 'ram', tier: 4, price: 13, tdp: 10, icon: 'icon_ram_6', gen: 'DDR5', gbPerStick: 32, l: 7, t: 2, xmp: true, look: 'rgb', rgb: true },
];

export const DRIVES: DriveDef[] = [
  { id: 'S1', cat: 'drive', tier: 0, price: 0, tdp: 3, icon: 'icon_drive_1', kind: 'sata', iface: 'sata', swSlots: 2, l: 2, reroll: 0, lanes: 0 },
  { id: 'S2', cat: 'drive', tier: 1, price: 2, tdp: 7, icon: 'icon_drive_2', kind: 'hdd', iface: 'sata', swSlots: 3, l: 1, reroll: -1, lanes: 0 },
  { id: 'S3', cat: 'drive', tier: 1, price: 4, tdp: 3, icon: 'icon_drive_3', kind: 'sata', iface: 'sata', swSlots: 3, l: 3, reroll: 0, lanes: 0 },
  { id: 'S4', cat: 'drive', tier: 2, price: 5, tdp: 5, icon: 'icon_drive_4', kind: 'nvme3', iface: 'm2', swSlots: 3, l: 4, reroll: 1, lanes: 4 },
  { id: 'S5', cat: 'drive', tier: 3, price: 9, tdp: 7, icon: 'icon_drive_5', kind: 'nvme4', iface: 'm2', swSlots: 4, l: 6, reroll: 1, lanes: 4 },
];

export const PSUS: PsuDef[] = [
  { id: 'P1', cat: 'psu', tier: 0, price: 0, tdp: 0, icon: 'icon_psu_1', watt: 400, billMod: 1, atx3: false, look: 'cheap' },
  { id: 'P2', cat: 'psu', tier: 1, price: 4, tdp: 0, icon: 'icon_psu_2', watt: 550, billMod: 0, atx3: false, look: 'standard' },
  { id: 'P3', cat: 'psu', tier: 2, price: 7, tdp: 0, icon: 'icon_psu_3', watt: 750, billMod: -1, atx3: false, look: 'standard' },
  { id: 'P4', cat: 'psu', tier: 3, price: 11, tdp: 0, icon: 'icon_psu_4', watt: 1000, billMod: -2, atx3: true, look: 'premium' },
];

export const COOLERS: CoolerDef[] = [
  { id: 'K1', cat: 'cooler', tier: 0, price: 0, tdp: 2, icon: 'icon_cooler_1', kind: 'boxed', cooling: 6, height: 60, radiator: 0 },
  { id: 'K2', cat: 'cooler', tier: 1, price: 3, tdp: 2, icon: 'icon_cooler_2', kind: 'tower', cooling: 10, height: 155, radiator: 0 },
  { id: 'K3', cat: 'cooler', tier: 2, price: 7, tdp: 3, icon: 'icon_cooler_3', kind: 'dualtower', cooling: 15, height: 165, radiator: 0, special: 'norgb' },
  { id: 'K4', cat: 'cooler', tier: 2, price: 6, tdp: 6, icon: 'icon_cooler_4', kind: 'aio240', cooling: 13, height: 0, radiator: 240 },
  { id: 'K5', cat: 'cooler', tier: 3, price: 11, tdp: 8, icon: 'icon_cooler_5', kind: 'aio360', cooling: 18, height: 0, radiator: 360, special: 'lcd', rgb: true },
];

export const FANS: FanDef[] = [
  { id: 'F1', cat: 'fan', tier: 1, price: 1, tdp: 2, icon: 'icon_fan_1', cooling: 1, takt: 0 },
  { id: 'F2', cat: 'fan', tier: 1, price: 2, tdp: 3, icon: 'icon_fan_2', cooling: 1, takt: 1, rgb: true },
];

export const CASES: CaseDef[] = [
  { id: 'CA1', cat: 'case', tier: 0, price: 0, tdp: 0, icon: 'icon_case_1', maxForm: 'mATX', maxGpu: 'M', maxCooler: 140, radiator: 0, fanSlots: 1, builtinFans: ['F1'], airflow: 1, sprite: 'case_office' },
  { id: 'CA3', cat: 'case', tier: 1, price: 5, tdp: 0, icon: 'icon_case_3', maxForm: 'ATX', maxGpu: 'L', maxCooler: 165, radiator: 360, fanSlots: 4, builtinFans: [], airflow: 3, sprite: 'case_mesh' },
  { id: 'CA4', cat: 'case', tier: 3, price: 9, tdp: 0, icon: 'icon_case_4', maxForm: 'ATX', maxGpu: 'L', maxCooler: 170, radiator: 360, fanSlots: 6, builtinFans: ['F2', 'F2', 'F2'], airflow: 1, special: 'showcase', sprite: 'case_glass' },
];

export const EXPS: ExpDef[] = [
  { id: 'E1', cat: 'exp', tier: 1, price: 4, tdp: 3, icon: 'icon_exp_1', minLanes: 1, lanes: 1, effect: 'nic' },
  { id: 'E3', cat: 'exp', tier: 2, price: 5, tdp: 5, icon: 'icon_exp_3', minLanes: 1, lanes: 1, effect: 'sound' },
  { id: 'E4', cat: 'exp', tier: 2, price: 6, tdp: 7, icon: 'icon_exp_4', minLanes: 4, lanes: 4, effect: 'capture' },
];

export const ALL_PARTS: PartDef[] = [...BOARDS, ...CPUS, ...GPUS, ...RAMS, ...DRIVES, ...PSUS, ...COOLERS, ...FANS, ...CASES, ...EXPS];

const BY_ID = new Map<string, PartDef>(ALL_PARTS.map((p) => [p.id, p]));

export function part(id: string): PartDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown part ${id}`);
  return p;
}

export function partOf<C extends Category>(id: string, cat: C): Extract<PartDef, { cat: C }> {
  const p = part(id);
  if (p.cat !== cat) throw new Error(`Part ${id} is ${p.cat}, expected ${cat}`);
  return p as Extract<PartDef, { cat: C }>;
}

export const FORM_ORDER: Record<string, number> = { ITX: 0, mATX: 1, ATX: 2, EATX: 3 };
export const GPU_LEN_ORDER: Record<string, number> = { S: 0, M: 1, L: 2 };
export const GPU_LEN_MM: Record<string, number> = { S: 170, M: 280, L: 340 };
/** Physical length of a GPU in mm (for messages). */
export const GPU_REAL_MM: Record<string, number> = { G1: 150, G2: 240, G3: 242, G4: 267, G5: 287, G6: 336 };

/** Ram capacity of a kit in GB. */
export function kitGb(r: RamDef): number {
  return r.gbPerStick * 2;
}

/** Hand size from total RAM (GDD 7.5). */
export function handSizeForGb(gb: number): number {
  if (gb >= 96) return 10;
  if (gb >= 48) return 9;
  if (gb >= 32) return 8;
  if (gb >= 16) return 7;
  return 6;
}

/** Hardware that is never offered in the shop (starter parts). */
export function isShopPart(p: PartDef): boolean {
  return p.tier > 0 && p.price > 0;
}
