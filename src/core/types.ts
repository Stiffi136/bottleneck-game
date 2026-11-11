// Core types of BOTTLENECK. Pure data, no DOM, fully serialisable.

export type CardType = 'cpu' | 'gpu' | 'ram' | 'io';
export const CARD_TYPES: readonly CardType[] = ['cpu', 'gpu', 'ram', 'io'];

export type Enhancement = 'oc' | 'opt' | 'eff' | 'unst';
export const ENHANCEMENTS: readonly Enhancement[] = ['oc', 'opt', 'eff', 'unst'];

export interface Card {
  id: number;
  type: CardType;
  level: number; // 1..10
  enh?: Enhancement;
}

export type ProfileId =
  | 'single'
  | 'dual'
  | 'quadch'
  | 'hetero'
  | 'triple'
  | 'pipeline'
  | 'special'
  | 'fullstack'
  | 'quadcore'
  | 'optpipe';

// ---------------------------------------------------------------- hardware

export type Category = 'board' | 'cpu' | 'gpu' | 'ram' | 'drive' | 'psu' | 'cooler' | 'fan' | 'case' | 'exp';
export const CATEGORIES: readonly Category[] = ['board', 'cpu', 'gpu', 'ram', 'drive', 'psu', 'cooler', 'fan', 'case', 'exp'];
export type Tier = 0 | 1 | 2 | 3 | 4;
export type Socket = 'LGA-12' | 'LGA-17' | 'AMX-4' | 'AMX-5';
export type Chipset = 'H' | 'B' | 'Z' | 'X';
export type FormFactor = 'ITX' | 'mATX' | 'ATX' | 'EATX';
export type RamGen = 'DDR4' | 'DDR5';
export type GpuLen = 'S' | 'M' | 'L';

interface PartBase {
  id: string;
  tier: Tier;
  price: number; // 0 = starter part (sells for $1)
  tdp: number;
  rgb?: boolean;
  /** Atlas sprite of the shop/inventory icon. */
  icon: string;
}

export interface PcieSlotDef {
  size: 16 | 1; // physical size
  lanes: number; // electrical lanes
}

export interface BoardDef extends PartBase {
  cat: 'board';
  socket: Socket;
  chipset: Chipset;
  form: FormFactor;
  ramGen: RamGen;
  dimms: 2 | 4;
  pcie: PcieSlotDef[];
  m2: number;
  m2Gen5: number;
  sata: number;
  chipsetLanes: number;
  pcb: 'green' | 'black' | 'blue' | 'redblack';
}

export interface CpuDef extends PartBase {
  cat: 'cpu';
  brand: 'intellion' | 'amx';
  socket: Socket;
  cores: number;
  takt: number;
  lPerCard: number;
  heat: number;
  lanes: number;
  igpu: number; // L per GPU card of the iGPU, 0 = no iGPU
  ocable: boolean;
  special?: 'ecores' | 'turbo' | 'cache3d';
}

export interface GpuDef extends PartBase {
  cat: 'gpu';
  brand: 'veridia' | 'rubeon';
  l: number;
  t: number;
  heat: number;
  len: GpuLen;
  width: 1 | 2 | 3;
  lanes: number;
  dlss: boolean;
  special?: 'frugal' | 'vram' | 'pin12';
}

export interface RamDef extends PartBase {
  cat: 'ram';
  gen: RamGen;
  gbPerStick: number;
  l: number;
  t: number;
  xmp: boolean;
  look: 'plain' | 'hs' | 'rgb';
}

export type DriveKind = 'hdd' | 'sata' | 'nvme3' | 'nvme4' | 'nvme5';
export interface DriveDef extends PartBase {
  cat: 'drive';
  kind: DriveKind;
  iface: 'sata' | 'm2' | 'm2gen5';
  swSlots: number;
  l: number;
  reroll: number;
  lanes: number;
}

export interface PsuDef extends PartBase {
  cat: 'psu';
  watt: number;
  billMod: number;
  atx3: boolean;
  look: 'cheap' | 'standard' | 'premium';
}

export type CoolerKind = 'boxed' | 'tower' | 'dualtower' | 'aio240' | 'aio360';
export interface CoolerDef extends PartBase {
  cat: 'cooler';
  kind: CoolerKind;
  cooling: number;
  height: number; // mm, 0 for AIO
  radiator: 0 | 240 | 360;
  special?: 'norgb' | 'lcd';
}

export interface FanDef extends PartBase {
  cat: 'fan';
  cooling: number;
  takt: number;
}

export interface CaseDef extends PartBase {
  cat: 'case';
  maxForm: FormFactor;
  maxGpu: GpuLen;
  maxCooler: number;
  radiator: 0 | 240 | 360;
  fanSlots: number;
  builtinFans: string[]; // fan ids that come with the case and occupy slots
  airflow: number;
  special?: 'showcase';
  sprite: string;
}

export interface ExpDef extends PartBase {
  cat: 'exp';
  minLanes: 1 | 4 | 8; // needs a slot with at least this electrical width
  lanes: number;
  effect: 'nic' | 'sound' | 'capture';
}

export type PartDef = BoardDef | CpuDef | GpuDef | RamDef | DriveDef | PsuDef | CoolerDef | FanDef | CaseDef | ExpDef;

/** A concrete owned part. */
export interface PartInst {
  uid: number;
  id: string;
  oc: number; // 0..3
  limit: number; // silicon lottery 1..3
  limitKnown: boolean;
  broken?: boolean;
  paid: number;
}

export interface Build {
  board: PartInst | null;
  cpu: PartInst | null;
  cooler: PartInst | null;
  psu: PartInst | null;
  case: PartInst | null;
  ram: (PartInst | null)[]; // one entry per DIMM pair
  pcie: (PartInst | null)[]; // one entry per PCIe slot of the board
  m2: (PartInst | null)[];
  sata: (PartInst | null)[];
  fans: (PartInst | null)[]; // free fan slots of the case
}

export type SlotKind = 'board' | 'cpu' | 'cooler' | 'psu' | 'case' | 'ram' | 'pcie' | 'm2' | 'sata' | 'fan';
export interface SlotRef {
  kind: SlotKind;
  index: number; // 0 for single slots
}

// ---------------------------------------------------------------- software & co

export type Rarity = 'G' | 'S' | 'L';
export type SoftwareId =
  | 'sw1'
  | 'sw2'
  | 'sw3'
  | 'sw4'
  | 'sw5'
  | 'sw6'
  | 'sw7'
  | 'sw8'
  | 'sw9'
  | 'sw10'
  | 'sw11'
  | 'sw12'
  | 'sw15'
  | 'sw16'
  | 'sw19';

export interface SoftwareDef {
  id: SoftwareId;
  rarity: Rarity;
  price: number;
  icon: string;
  noSlot?: boolean;
}

export interface SoftwareInst {
  uid: number;
  id: SoftwareId;
  counter: number; // Zwangs-Update: bonus Takt; Shader-Cache: counter
  paid: number;
}

export type ToolId = 't1' | 't2' | 't3' | 't4' | 't5' | 't8' | 't9';
export interface ToolDef {
  id: ToolId;
  price: number;
  icon: string;
  /** number of cards to select (0 = none) */
  cards: number;
  benchOnly?: boolean;
}

export type BossId = 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b11' | 'f1';
export interface BossDef {
  id: BossId;
  minGen: number;
  factor: number;
  finale?: boolean;
  icon: string;
}

export type BenchKind = 'office' | 'gaming' | 'boss';
export type PackKind = 'workload' | 'driver' | 'tool' | 'software';
