import type { BossDef, BossId, ProfileId, SoftwareDef, SoftwareId, ToolDef, ToolId } from '../types';

export interface ProfileDef {
  id: ProfileId;
  rank: number;
  l: number;
  t: number;
  incL: number;
  incT: number;
  icon: string;
}

/** GDD 6.1 */
export const PROFILES: ProfileDef[] = [
  { id: 'single', rank: 1, l: 5, t: 1, incL: 10, incT: 1, icon: 'icon_treiber_einzeltask' },
  { id: 'dual', rank: 2, l: 10, t: 2, incL: 15, incT: 1, icon: 'icon_treiber_dualchannel' },
  { id: 'quadch', rank: 3, l: 20, t: 2, incL: 20, incT: 1, icon: 'icon_treiber_quadchannel' },
  { id: 'hetero', rank: 4, l: 25, t: 3, incL: 20, incT: 2, icon: 'icon_treiber_heterogen' },
  { id: 'triple', rank: 5, l: 30, t: 3, incL: 20, incT: 2, icon: 'icon_treiber_triplebuffer' },
  { id: 'pipeline', rank: 6, l: 30, t: 4, incL: 30, incT: 3, icon: 'icon_treiber_pipeline' },
  { id: 'special', rank: 7, l: 35, t: 4, incL: 15, incT: 2, icon: 'icon_treiber_spezialisiert' },
  { id: 'fullstack', rank: 8, l: 40, t: 4, incL: 25, incT: 2, icon: 'icon_treiber_fullstack' },
  { id: 'quadcore', rank: 9, l: 60, t: 7, incL: 30, incT: 3, icon: 'icon_treiber_quadcore' },
  { id: 'optpipe', rank: 10, l: 100, t: 8, incL: 40, incT: 4, icon: 'icon_treiber_optpipeline' },
];
export const PROFILE_IDS: ProfileId[] = PROFILES.map((p) => p.id);

export function profileDef(id: ProfileId): ProfileDef {
  return PROFILES.find((p) => p.id === id)!;
}

export function profileValues(id: ProfileId, level: number): { l: number; t: number } {
  const p = profileDef(id);
  const lv = Math.max(1, level);
  return { l: p.l + (lv - 1) * p.incL, t: p.t + (lv - 1) * p.incT };
}

/** GDD 11 (MVP subset) */
export const SOFTWARE: SoftwareDef[] = [
  { id: 'sw1', rarity: 'G', price: 3, icon: 'icon_sw_1' },
  { id: 'sw2', rarity: 'G', price: 4, icon: 'icon_sw_2' },
  { id: 'sw3', rarity: 'S', price: 6, icon: 'icon_sw_3' },
  { id: 'sw4', rarity: 'G', price: 4, icon: 'icon_sw_4' },
  { id: 'sw5', rarity: 'G', price: 3, icon: 'icon_sw_5' },
  { id: 'sw6', rarity: 'S', price: 6, icon: 'icon_sw_6' },
  { id: 'sw7', rarity: 'S', price: 5, icon: 'icon_sw_7' },
  { id: 'sw8', rarity: 'G', price: 4, icon: 'icon_sw_8' },
  { id: 'sw9', rarity: 'S', price: 5, icon: 'icon_sw_9', noSlot: true },
  { id: 'sw10', rarity: 'G', price: 4, icon: 'icon_sw_10' },
  { id: 'sw11', rarity: 'G', price: 4, icon: 'icon_sw_11' },
  { id: 'sw12', rarity: 'S', price: 6, icon: 'icon_sw_12' },
  { id: 'sw15', rarity: 'G', price: 4, icon: 'icon_sw_15' },
  { id: 'sw16', rarity: 'S', price: 5, icon: 'icon_sw_16' },
  { id: 'sw19', rarity: 'G', price: 3, icon: 'icon_sw_19' },
];

export function softwareDef(id: SoftwareId): SoftwareDef {
  return SOFTWARE.find((s) => s.id === id)!;
}

/** GDD 12.2 (MVP subset) */
export const TOOLS: ToolDef[] = [
  { id: 't1', price: 3, icon: 'icon_tool_1', cards: 0 },
  { id: 't2', price: 3, icon: 'icon_tool_2', cards: 2 },
  { id: 't3', price: 3, icon: 'icon_tool_3', cards: 0, benchOnly: true },
  { id: 't4', price: 3, icon: 'icon_tool_4', cards: 2 },
  { id: 't5', price: 3, icon: 'icon_tool_5', cards: 1 },
  { id: 't8', price: 3, icon: 'icon_tool_8', cards: 2 },
  { id: 't9', price: 3, icon: 'icon_tool_9', cards: 2 },
];

export function toolDef(id: ToolId): ToolDef {
  return TOOLS.find((t) => t.id === id)!;
}

export const DRIVER_PRICE = 3;
export const PASTE_MAX_USES = 3;
export const TOOL_SLOTS = 2;
export const STORAGE_SLOTS = 3;
export const MAX_SW_SLOTS = 8;

/** GDD 16 (MVP subset) */
export const BOSSES: BossDef[] = [
  { id: 'b1', minGen: 1, factor: 2, icon: 'boss_b1' },
  { id: 'b2', minGen: 2, factor: 2, icon: 'boss_b2' },
  { id: 'b3', minGen: 1, factor: 2, icon: 'boss_b3' },
  { id: 'b4', minGen: 1, factor: 2, icon: 'boss_b4' },
  { id: 'b5', minGen: 1, factor: 2, icon: 'boss_b5' },
  { id: 'b6', minGen: 2, factor: 2, icon: 'boss_b6' },
  { id: 'b7', minGen: 3, factor: 2, icon: 'boss_b7' },
  { id: 'b8', minGen: 3, factor: 2, icon: 'boss_b8' },
  { id: 'b11', minGen: 2, factor: 2, icon: 'boss_b11' },
  { id: 'f1', minGen: 8, factor: 3, finale: true, icon: 'boss_f1' },
];

export function bossDef(id: BossId): BossDef {
  return BOSSES.find((b) => b.id === id)!;
}

export const PACK_PRICES = { workload: 4, driver: 4, tool: 4, software: 6 } as const;
