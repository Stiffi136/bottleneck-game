import { Node, Rect2, Sprite } from '../render/scene';
import type { Rect } from '../render/assets';
import { part, partOf } from '../core/data/hardware';
import { boardOf, caseOf, caseFreeFanSlots } from '../core/build';
import type { Build, PartInst, SlotRef } from '../core/types';
import { hexToRgb } from '../render/fx';

/**
 * Data-driven view of the open PC: case interior, mainboard with slots and
 * all installed parts. Coordinates are "case art px"; the whole node is
 * scaled to fit the screen. Positions of parts derive from the real sprite
 * bounds (contentBBox), not from nominal sizes.
 *
 * Alignment rules (measured from the case art, see CASE_LAYOUT):
 * - The board's rear edge sits at the inner edge of the case's slot-bracket
 *   column; the board scale makes the PCIe pitch equal to the bracket pitch,
 *   so PCIe slot i lines up with case bracket i.
 * - Expansion cards are anchored by their own bracket on the case brackets.
 *   All cards share one uniform scale (CARD_SCALE) chosen so that the real
 *   art height of a GPU matches the slots it occupies (1/2/3-slot cards).
 * - Pixel art is never distorted: every sprite keeps its natural aspect
 *   ratio (fit() or size() from contentBBox). Wall fans are shown frontal and
 *   smaller; the rotating blades are a circle-masked copy of frame 0.
 *   In dev builds src/view/aspectCheck.ts reports any deviation > 2 %.
 */

interface FanPos {
  x: number;
  y: number;
  /** diameter (art px), frontal view */
  size: number;
}

interface CaseLayout {
  /** slot-bracket column: inner (board side) x, top of bracket 0, pitch */
  brackets: { x: number; y: number; pitch: number };
  boardScale: number;
  fans: FanPos[]; // builtin first, then free slots
  /** top-mounted AIO radiator (frontal, natural aspect); `covers` = fan positions it takes (index in fans) */
  radiator: { y: number; r360: { x: number; w: number; covers: number[] }; r240: { x: number; w: number; covers: number[] } } | null;
  psu: { x: number; y: number };
  bays: { x: number; y: number; w: number; h: number }[];
  /** parts of the case art drawn in front of the board (e.g. a drive cage) */
  front: Rect[];
}

const SHROUD_BAYS = [
  { x: 142, y: 262, w: 34, h: 22 },
  { x: 180, y: 262, w: 34, h: 22 },
  { x: 218, y: 262, w: 34, h: 22 },
  { x: 142, y: 285, w: 34, h: 22 },
  { x: 180, y: 285, w: 34, h: 22 },
  { x: 218, y: 285, w: 34, h: 22 },
];

export const CASE_LAYOUT: Record<string, CaseLayout> = {
  // office tower 240×300: 3× 5.25" bays top right, PSU chamber at the bottom
  CA1: {
    brackets: { x: 35, y: 152, pitch: 13.2 },
    boardScale: 0.85,
    fans: [{ x: 21, y: 87, size: 22 }],
    radiator: null,
    psu: { x: 61, y: 265 },
    bays: [
      { x: 198, y: 35, w: 46, h: 17 },
      { x: 198, y: 60, w: 46, h: 17 },
      { x: 198, y: 85, w: 46, h: 17 },
      { x: 127, y: 266, w: 36, h: 24 },
      { x: 165, y: 266, w: 36, h: 24 },
      { x: 203, y: 266, w: 36, h: 24 },
    ],
    front: [{ x: 153, y: 18, w: 80, h: 96 }],
  },
  // mesh airflow 260×320: rear fan, 3 front fans, top mesh for a radiator
  CA3: {
    brackets: { x: 44, y: 150, pitch: 11.95 },
    boardScale: 0.85,
    fans: [
      { x: 28, y: 85, size: 22 },
      { x: 232, y: 72, size: 32 },
      { x: 232, y: 141, size: 32 },
      { x: 232, y: 210, size: 32 },
    ],
    radiator: { y: 34, r360: { x: 122, w: 150, covers: [] }, r240: { x: 108, w: 110, covers: [] } },
    psu: { x: 64, y: 273 },
    bays: SHROUD_BAYS,
    front: [],
  },
  // glass showcase 260×320: 3 front fans built in, 3 top fan places
  CA4: {
    brackets: { x: 37, y: 152, pitch: 11.87 },
    boardScale: 0.85,
    fans: [
      { x: 233, y: 75, size: 32 },
      { x: 233, y: 142, size: 32 },
      { x: 233, y: 209, size: 32 },
      { x: 65, y: 33, size: 28 },
      { x: 131, y: 33, size: 28 },
      { x: 196, y: 33, size: 28 },
    ],
    radiator: { y: 33, r360: { x: 130, w: 160, covers: [3, 4, 5] }, r240: { x: 163, w: 110, covers: [4, 5] } },
    psu: { x: 62, y: 273 },
    bays: SHROUD_BAYS,
    front: [],
  },
};

const PCB_COLOR: Record<string, number> = { green: 0x2e8a48, black: 0x34343f, blue: 0x2a4a9a, redblack: 0x3a2a30 };
const BRAND_COLOR: Record<string, number> = { veridia: 0x3fbf5f, rubeon: 0xe8432d };

// board-space constants (art px, before board scale)
const PCIE_Y0 = 96;
const PCIE_PITCH = 14;
/**
 * Uniform scale of all expansion-card art (aspect kept). 0.7 makes the real
 * art height of a GPU equal to the slots it occupies: L 58×0.7 ≈ 3 slots,
 * M 38×0.7 ≈ 2, S 19×0.7 ≈ 1 (pitch 14). Lengths stay proportional (S:M:L ≈ GDD mm).
 */
const CARD_SCALE = 0.7;
/** left edge of an expansion card (its bracket) relative to the board edge */
const CARD_X = -9;
/** PCIe slot start: the contacts of all cards begin ~12 px right of their bracket */
const SLOT_X = CARD_X + 12;
/** slot widths; heights follow from the natural aspect (fit) */
const SLOT_X16_W = 56;
const SLOT_X1_W = 18;
const SOCKET = { x: 58, y: 46 };

/** GPU art: contact start (fraction of content width), fan centres. */
const GPU_ART = {
  S: { name: 'gpu_s', w: 112, ar: 76 / 448, fans: [] as number[], fy: 0 },
  M: { name: 'gpu_m_0', w: 176, ar: 151 / 704, fans: [0.338, 0.731], fy: 0.434 },
  L: { name: 'gpu_l_0', w: 216, ar: 232 / 865, fans: [0.288, 0.553, 0.8], fy: 0.473 },
} as const;



export interface SlotGeom {
  slot: SlotRef;
  rect: Rect; // in case coords
}

export class PcView extends Node {
  /** case art size */
  cw = 260;
  ch = 320;
  private board = new Node();
  private slotGeoms: SlotGeom[] = [];
  private partNodes = new Map<number, Node>();
  private glows: Node[] = [];
  readonly glowLayer = new Node();
  readonly fanSpinners: { s: Sprite; speed: number }[] = [];
  fanSpeed = 1;
  /** draw power cables and AIO tubes (cosmetic, can be switched off) */
  cables = true;

  rebuildFrom(b: Build): void {
    this.removeAll();
    this.slotGeoms = [];
    this.partNodes.clear();
    this.fanSpinners.length = 0;
    this.board = new Node();
    this.glowLayer.removeAll();
    const cs = caseOf(b);
    const L = CASE_LAYOUT[cs?.id ?? 'CA3']!;
    // case
    if (cs) {
      const c = new Sprite(cs.sprite, { region: 'cell', ax: 0, ay: 0 });
      this.cw = c.natW;
      this.ch = c.natH;
      this.add(c);
      if (b.case) this.partNodes.set(b.case.uid, c);
    }
    this.slotGeoms.push({ slot: { kind: 'case', index: 0 }, rect: { x: 0, y: 0, w: this.cw, h: this.ch } });
    // radiator (AIO) takes fan places
    const cooler = b.cooler ? partOf(b.cooler.id, 'cooler') : null;
    const rad = cooler?.radiator && L.radiator ? (cooler.radiator === 360 ? L.radiator.r360 : L.radiator.r240) : null;
    // fans (builtin + free slots); free slots skip places under the radiator
    const builtin = cs?.builtinFans ?? [];
    const freeN = cs ? caseFreeFanSlots(cs) : 0;
    L.fans.slice(0, builtin.length).forEach((pos, i) => this.add(this.fanNode(builtin[i]!, pos)));
    const freePos = L.fans.slice(builtin.length).map((p, i) => ({ p, i: i + builtin.length }));
    const order = [...freePos.filter((f) => !rad?.covers.includes(f.i)), ...freePos.filter((f) => rad?.covers.includes(f.i))];
    for (let fi = 0; fi < freeN; fi++) {
      const pos = order[fi]?.p;
      if (!pos) continue;
      const inst = b.fans[fi];
      if (inst) {
        const n = this.fanNode(inst.id, pos);
        this.add(n);
        this.partNodes.set(inst.uid, n);
      }
      const w = pos.size;
      const h = pos.size;
      this.slotGeoms.push({ slot: { kind: 'fan', index: fi }, rect: { x: pos.x - w / 2, y: pos.y - h / 2, w, h } });
    }
    // PSU (bottom, rear)
    const psuRect = { x: L.psu.x - 38, y: L.psu.y - 20, w: 76, h: 40 };
    if (b.psu) {
      const pd = partOf(b.psu.id, 'psu');
      const s = new Sprite(`psu_${pd.look}`, { region: 'content' });
      s.fit(76, 42).pos(L.psu.x, L.psu.y);
      this.add(s);
      this.partNodes.set(b.psu.uid, s);
    }
    this.slotGeoms.push({ slot: { kind: 'psu', index: 0 }, rect: psuRect });
    // board
    const bs = L.boardScale;
    this.add(this.board);
    this.board.pos(L.brackets.x, L.brackets.y - (PCIE_Y0 + 1) * bs).scale(bs);
    this.buildBoard(b, L);
    // case parts in front of the board (drive cage)
    for (const r of L.front) {
      if (!cs) break;
      const f = new Sprite(cs.sprite, { region: 'cell', ax: 0, ay: 0 });
      f.regionRect = { ...r };
      f.size(r.w, r.h).pos(r.x, r.y);
      this.add(f);
    }
    // cables in front of the board, behind drives (they vanish into the shroud)
    if (this.cables) this.addCables(b, L, cooler?.radiator && L.radiator && rad ? { x: rad.x - rad.w / 2 + 12, y: L.radiator.y + 8 } : null);
    // SATA drives in bays
    b.sata.forEach((inst, i) => {
      const pos = L.bays[i] ?? L.bays[L.bays.length - 1]!;
      if (inst) {
        const d = partOf(inst.id, 'drive');
        const s = new Sprite(d.kind === 'hdd' ? 'drive_hdd' : 'drive_sata_ssd', { region: 'anim' });
        s.fit(pos.w, pos.h).pos(pos.x, pos.y);
        if (d.kind === 'hdd') {
          s.tick = () => {
            s.frameIndex = Math.random() < 0.04 ? 1 : 0;
          };
        }
        this.add(s);
        this.partNodes.set(inst.uid, s);
      }
      this.slotGeoms.push({ slot: { kind: 'sata', index: i }, rect: { x: pos.x - pos.w / 2, y: pos.y - pos.h / 2, w: pos.w, h: pos.h } });
    });
    // radiator (AIO, top)
    if (cooler?.radiator && L.radiator && rad) {
      const n = new Node();
      n.pos(rad.x, L.radiator.y);
      const r = new Sprite(cooler.radiator === 360 ? 'radiator_360' : 'radiator_240', { region: 'content' });
      r.fit(rad.w, 999);
      n.add(r);
      this.addRadiatorFans(n, r, cooler.radiator === 360 ? 3 : 2, !!cooler.rgb);
      this.add(n);
    }
    this.add(this.glowLayer);
  }

  /**
   * Cosmetic cabling: 24-pin from the board edge into the grommet, EPS up
   * through the top grommet, PCIe power from the GPU end down to the PSU
   * shroud and the AIO tubes from the pump to the radiator.
   */
  private addCables(b: Build, L: CaseLayout, radEnd: { x: number; y: number } | null): void {
    const bd = boardOf(b);
    if (!bd) return;
    const bs = this.board.sx;
    const H = bd.form === 'ATX' || bd.form === 'EATX' ? 200 : 160;
    const floor = L.psu.y - 22; // top of the PSU shroud / chamber
    const right = this.board.x + 160 * bs;
    const SLEEVE = 0x1c1c26;
    if (b.psu) {
      const a = this.toCase(151, 52);
      this.cable([{ x: a.x - 2, y: a.y }, { x: right + 7, y: a.y }], 6, SLEEVE); // into the grommet
      const e = this.toCase(18, 8);
      this.cable([e, { x: e.x, y: this.board.y - 7 }], 3.5, SLEEVE);
      // GPU power
      b.pcie.forEach((p, i) => {
        if (!p) return;
        const d = part(p.id);
        if (d.cat !== 'gpu' || d.len === 'S') return;
        const g = GPU_ART[d.len];
        const h = g.w * g.ar * CARD_SCALE;
        const end = this.toCase(CARD_X + g.w * CARD_SCALE * 0.9, PCIE_Y0 + i * PCIE_PITCH + 1 + h);
        const yMax = this.board.y + H * bs;
        this.cable([end, { x: end.x, y: Math.max(end.y + 4, Math.min(yMax + 4, floor - 6)) }, { x: end.x - 6, y: floor + 4 }], 4, SLEEVE);
      });
    }
    if (radEnd && b.cooler) {
      const p = this.toCase(SOCKET.x - 6, SOCKET.y - 12);
      for (const dx of [0, 5]) this.cable([{ x: p.x + dx, y: p.y }, { x: p.x + dx, y: radEnd.y + 10 }, { x: radEnd.x + dx, y: radEnd.y }], 3, 0x23232e);
    }
  }

  /** A thick polyline with a highlight stripe (sleeved cable / tube). */
  private cable(pts: { x: number; y: number }[], w: number, color: number): void {
    const n = new Node();
    const seg = (a: { x: number; y: number }, c: { x: number; y: number }, width: number, col: number, alpha: number, off: number) => {
      const len = Math.hypot(c.x - a.x, c.y - a.y);
      const r = new Rect2(len + width, width, col, alpha);
      r.ax = 0;
      r.ay = 0.5;
      r.rot = Math.atan2(c.y - a.y, c.x - a.x);
      r.pos(a.x - Math.cos(r.rot) * width * 0.5 - Math.sin(r.rot) * off, a.y - Math.sin(r.rot) * width * 0.5 + Math.cos(r.rot) * off);
      n.add(r);
    };
    for (let i = 1; i < pts.length; i++) seg(pts[i - 1]!, pts[i]!, w, 0x0a0a10, 1, 0);
    for (let i = 1; i < pts.length; i++) seg(pts[i - 1]!, pts[i]!, w - 1.2, color, 1, 0);
    for (let i = 1; i < pts.length; i++) seg(pts[i - 1]!, pts[i]!, Math.max(0.8, w * 0.22), 0x5a5a70, 0.8, -w * 0.18);
    this.add(n);
  }

  private fanNode(id: string, pos: FanPos): Node {
    const d = part(id);
    const n = new Node();
    n.pos(pos.x, pos.y);
    const size = pos.size;
    const frameName = d.rgb ? 'case_fan_0' : 'icon_fan_1';
    const base = new Sprite(frameName, { region: 'content' });
    base.fit(size, size);
    if (d.rgb) base.mode = 'rgb';
    n.add(base);
    // rotating blades: circular-masked copy of the same sprite
    const spin = new Sprite(frameName, { region: 'content' });
    spin.fit(size, size);
    spin.mode = 'circle';
    spin.param = d.rgb ? 0.36 : 0.4;
    n.add(spin);
    n.hit = { x: -size / 2, y: -size / 2, w: size, h: size };
    this.fanSpinners.push({ s: spin, speed: 9 + Math.random() * 3 });
    return n;
  }

  private addRadiatorFans(n: Node, r: Sprite, count: number, rgb: boolean): void {
    // Painted fan centres/diameters measured in the radiator art (fractions of its contentBBox).
    // The art has the tube fittings on the right, so the fans are NOT evenly spread over the width.
    const RAD_FANS: Record<number, { cx: number[]; cy: number; d: number }> = {
      3: { cx: [0.175, 0.449, 0.7225], cy: 0.451, d: 0.244 },
      2: { cx: [0.258, 0.632], cy: 0.496, d: 0.381 },
    };
    const m = RAD_FANS[count];
    for (let i = 0; i < count; i++) {
      const fx = -r.w / 2 + r.w * m.cx[i];
      const fy = -r.h / 2 + r.h * m.cy;
      const size = r.w * m.d;
      const s = new Sprite(rgb ? 'case_fan_0' : 'icon_fan_1', { region: 'content' });
      s.fit(size, size).pos(fx, fy);
      s.mode = 'circle';
      s.param = 0.38;
      n.add(s);
      this.fanSpinners.push({ s, speed: 8 + Math.random() * 2 });
    }
  }

  private toCase(bx: number, by: number): { x: number; y: number } {
    return { x: this.board.x + bx * this.board.sx, y: this.board.y + by * this.board.sy };
  }

  private boardRect(x: number, y: number, w: number, h: number): Rect {
    const p = this.toCase(x, y);
    return { x: p.x, y: p.y, w: w * this.board.sx, h: h * this.board.sy };
  }

  private buildBoard(b: Build, L: CaseLayout): void {
    const bd = boardOf(b);
    const B = this.board;
    if (!bd) {
      this.slotGeoms.push({ slot: { kind: 'board', index: 0 }, rect: this.boardRect(0, 0, 160, 160) });
      return;
    }
    const atx = bd.form === 'ATX' || bd.form === 'EATX';
    const pcb = new Sprite(atx ? 'mb_pcb_atx' : 'mb_pcb_matx', { region: 'cell', ax: 0, ay: 0 });
    pcb.size(160, atx ? 200 : 160);
    pcb.mode = 'pcb';
    pcb.swap = hexToRgb(PCB_COLOR[bd.pcb] ?? 0x2e8a48);
    B.add(pcb);
    if (b.board) this.partNodes.set(b.board.uid, pcb);
    const H = atx ? 200 : 160;
    this.slotGeoms.push({ slot: { kind: 'board', index: 0 }, rect: this.boardRect(0, 0, 160, H) });
    const premium = bd.chipset === 'Z' || bd.chipset === 'X';
    const add = (name: string, x: number, y: number, w?: number, h?: number, opts: { ax?: number; ay?: number; region?: 'content' | 'cell' | 'anim' } = {}) => {
      const s = new Sprite(name, { region: opts.region ?? 'content', ax: opts.ax ?? 0.5, ay: opts.ay ?? 0.5 });
      if (w && h) s.fit(w, h);
      s.pos(x, y);
      B.add(s);
      return s;
    };
    // decorations
    add('io_shield', 9, 34, 20, 40);
    add('hs_vrm_top', SOCKET.x, 16, 50, 11);
    add('hs_vrm_side', 26, SOCKET.y + 2, 12, 34);
    add('hdr_eps8', 18, 8, 12, 6);
    add('hdr_atx24', 151, 52, 9, 30);
    add(premium ? 'hs_chipset_premium' : 'hs_chipset_budget', 132, H - 28, 26, 26);
    for (let k = 0; k < Math.ceil(bd.sata / 2); k++) add('slot_sata', 152, 92 + k * 13, 10, 12);
    add('hdr_fan', 90, 6, 6, 4);
    // socket
    add(bd.socket.startsWith('AMX') ? 'slot_socket_amx' : 'slot_socket_lga', SOCKET.x, SOCKET.y, 28, 30);
    this.slotGeoms.push({ slot: { kind: 'cpu', index: 0 }, rect: this.boardRect(SOCKET.x - 15, SOCKET.y - 15, 30, 30) });
    // DIMMs
    const dimX0 = bd.dimms === 4 ? 98 : 106;
    for (let i = 0; i < bd.dimms; i++) {
      add(bd.ramGen === 'DDR5' ? 'slot_dimm_ddr5' : 'slot_dimm_ddr4', dimX0 + i * 9, 50, 8, 84);
    }
    b.ram.forEach((kit, k) => {
      const x0 = dimX0 + k * 2 * 9;
      if (kit) {
        const rd = partOf(kit.id, 'ram');
        const name = rd.look === 'rgb' ? 'ram_stick_rgb' : rd.look === 'hs' ? 'ram_stick_hs' : 'ram_stick_plain';
        const n = new Node();
        for (let j = 0; j < 2; j++) {
          const s = new Sprite(name, { region: rd.look === 'rgb' ? 'anim' : 'content' });
          s.fit(9, 82).pos(x0 + j * 9, 50);
          if (rd.look === 'rgb') s.mode = 'rgb';
          n.add(s);
        }
        n.hit = { x: x0 - 5, y: 9, w: 18, h: 82 };
        B.add(n);
        this.partNodes.set(kit.uid, n);
      }
      this.slotGeoms.push({ slot: { kind: 'ram', index: k }, rect: this.boardRect(x0 - 5, 8, 18, 84) });
    });
    // M.2
    const m2Y = atx ? [86, 160, 176] : [86, 150];
    for (let i = 0; i < bd.m2; i++) {
      const y = m2Y[i] ?? 86 + i * 14;
      const s = add('slot_m2', 84, y, 52, 9);
      if (i < bd.m2Gen5) s.tint = [1.0, 0.85, 0.5];
      const inst = b.m2[i];
      if (inst) {
        const d = partOf(inst.id, 'drive');
        const m = add(d.kind === 'nvme3' ? 'm2_ssd' : 'm2_ssd_heatsink', 84, y, 50, 13);
        this.partNodes.set(inst.uid, m);
      }
      this.slotGeoms.push({ slot: { kind: 'm2', index: i }, rect: this.boardRect(58, y - 6, 52, 12) });
    }
    // PCIe slots + cards (cards hang below their slot, their bracket on the case brackets)
    const cards: { inst: PartInst; i: number }[] = [];
    bd.pcie.forEach((sd, i) => {
      const y = PCIE_Y0 + i * PCIE_PITCH;
      const s = add(sd.size === 16 ? 'slot_pcie_x16' : 'slot_pcie_x1', SLOT_X, y, undefined, undefined, { ax: 0 });
      s.fit(sd.size === 16 ? SLOT_X16_W : SLOT_X1_W, 99);
      if (sd.size === 16 && sd.lanes < 16) s.tint = [0.75, 0.75, 0.85];
      const inst = b.pcie[i];
      if (inst) cards.push({ inst, i });
      this.slotGeoms.push({ slot: { kind: 'pcie', index: i }, rect: this.boardRect(SLOT_X - 2, y - 6, (sd.size === 16 ? SLOT_X16_W : SLOT_X1_W) + 4, 12) });
    });
    // CPU / cooler
    if (b.cpu) {
      const cd = partOf(b.cpu.id, 'cpu');
      const ihs = add(cd.brand === 'amx' ? 'cpu_ihs_amx' : 'cpu_ihs_intellion', SOCKET.x, SOCKET.y, 22, 22);
      this.partNodes.set(b.cpu.uid, ihs);
    }
    const coolerRect = this.boardRect(SOCKET.x - 22, SOCKET.y - 24, 44, 48);
    if (b.cooler) {
      const kd = partOf(b.cooler.id, 'cooler');
      let s: Sprite;
      switch (kd.kind) {
        case 'boxed':
          s = add('cooler_boxed_0', SOCKET.x, SOCKET.y, 40, 40);
          this.spinCooler(s, 0.36);
          break;
        case 'tower':
          s = add('cooler_tower_0', SOCKET.x, SOCKET.y - 2, 46, 54);
          this.spinCooler(s, 0.3, 0.0, -0.06);
          break;
        case 'dualtower':
          s = add('cooler_dualtower_0', SOCKET.x + 2, SOCKET.y - 2, 60, 56);
          this.spinCooler(s, 0.22, -0.11, -0.04);
          break;
        default:
          s = add(kd.special === 'lcd' ? 'aio_pump_lcd' : 'aio_pump', SOCKET.x, SOCKET.y, 30, 26, { region: kd.special === 'lcd' ? 'anim' : 'content' });
          if (kd.special === 'lcd') s.play(4);
          if (kd.rgb) s.mode = 'rgb';
      }
      this.partNodes.set(b.cooler.uid, s);
    }
    this.slotGeoms.push({ slot: { kind: 'cooler', index: 0 }, rect: coolerRect });
    // cards last (they cover the slots below); lower slots on top so that an
    // upper card's bottom edge never hides the contacts of the card below
    for (const { inst, i } of cards.sort((a, b2) => a.i - b2.i)) {
      const n = this.cardNode(inst, PCIE_Y0 + i * PCIE_PITCH);
      B.add(n);
      this.partNodes.set(inst.uid, n);
    }
    void L;
  }

  private spinCooler(s: Sprite, radius: number, ox = 0, oy = 0): void {
    // overlay a rotating, circle-masked copy of the fan area
    const spin = new Sprite(s.frames[0]!.name, { region: 'content' });
    const rr = s.regionRect;
    const side = radius * 2 * Math.min(s.w, s.h); // display px
    const rs = (side * rr.w) / s.w; // region px
    spin.regionRect = { x: rr.x + (0.5 + ox) * rr.w - rs / 2, y: rr.y + (0.5 + oy) * rr.h - rs / 2, w: rs, h: rs };
    spin.size(side, side);
    spin.pos(s.x + s.w * ox, s.y + s.h * oy);
    spin.mode = 'circle';
    spin.param = 0.48;
    s.parent!.add(spin);
    this.fanSpinners.push({ s: spin, speed: 10 });
  }

  /**
   * An expansion card "folded open" below its slot: contacts at the top,
   * bracket at the left on the case brackets. The art is mirrored vertically
   * and scaled uniformly by CARD_SCALE (aspect kept, no squash).
   */
  private cardNode(inst: PartInst, slotY: number): Node {
    const d = part(inst.id);
    const n = new Node();
    const c = new Node(); // mirrored, uniformly scaled card space (art orientation)
    n.add(c);
    let w: number;
    let natH: number;
    let s: Sprite;
    if (d.cat === 'gpu') {
      const g = partOf(inst.id, 'gpu');
      const art = GPU_ART[g.len];
      s = new Sprite(art.name, { region: 'content', ax: 0, ay: 0 });
      w = art.w;
      natH = (w * s.natH) / s.natW;
      s.size(w, natH);
      if (g.len !== 'S') {
        s.mode = 'brand';
        s.swap = hexToRgb(BRAND_COLOR[g.brand] ?? 0x3fbf5f);
      }
      if (inst.broken) s.tint = [0.55, 0.45, 0.45];
      c.add(s);
      // rotating fans: frame 0 + code rotation (the sheet frames do not rotate cleanly)
      for (const fx of art.fans) {
        const spin = new Sprite(art.name, { region: 'content' });
        const rr = s.regionRect;
        const rad = 0.41 * rr.h;
        spin.regionRect = { x: rr.x + fx * rr.w - rad, y: rr.y + art.fy * rr.h - rad, w: rad * 2, h: rad * 2 };
        const k = w / rr.w;
        spin.size(rad * 2 * k, rad * 2 * k);
        spin.pos(fx * w, art.fy * natH);
        spin.mode = 'circle';
        spin.param = 0.47;
        if (inst.broken) spin.tint = s.tint;
        c.add(spin);
        if (!inst.broken) this.fanSpinners.push({ s: spin, speed: 7 + Math.random() });
      }
    } else {
      const e = partOf(inst.id, 'exp');
      const name = e.effect === 'nic' ? 'exp_nic' : e.effect === 'sound' ? 'exp_sound' : 'exp_capture';
      s = new Sprite(name, { region: 'content', ax: 0, ay: 0 });
      w = e.effect === 'nic' ? 40 : 50;
      natH = (w * s.natH) / s.natW;
      s.size(w, natH);
      c.add(s);
    }
    const h = natH * CARD_SCALE;
    c.sx = CARD_SCALE;
    c.sy = -CARD_SCALE;
    c.pos(CARD_X, slotY + 1 + h);
    n.hit = { x: CARD_X, y: slotY + 1, w: w * CARD_SCALE, h };
    return n;
  }

  slots(): SlotGeom[] {
    return this.slotGeoms;
  }

  slotRect(slot: SlotRef): Rect | null {
    return this.slotGeoms.find((g) => g.slot.kind === slot.kind && g.slot.index === slot.index)?.rect ?? null;
  }

  partNode(uid: number): Node | null {
    return this.partNodes.get(uid) ?? null;
  }

  /** Highlights slots: green ok, yellow warn, red bad, white selected. */
  /** `status` adds a shape (✔ / ⚠ / ✖) so that the state is not told by colour alone. */
  setGlows(list: { slot: SlotRef; color: number; status?: 'ok' | 'warn' | 'bad' }[]): void {
    this.glowLayer.removeAll();
    this.glows = [];
    for (const it of list) {
      const r = this.slotRect(it.slot);
      if (!r) continue;
      const g = new Sprite('slot_glow', { region: 'anim', ax: 0, ay: 0, nine: 3, nineScale: 1 });
      g.size(r.w + 4, r.h + 4).pos(r.x - 2, r.y - 2);
      g.tint = hexToRgb(it.color);
      g.play(6);
      const fill = new Rect2(r.w, r.h, it.color, 0.16);
      fill.pos(r.x, r.y);
      this.glowLayer.add(fill);
      this.glowLayer.add(g);
      this.glows.push(g);
      if (it.status) {
        const ic = new Sprite(it.status === 'ok' ? 'icon16_kompat_ok' : it.status === 'warn' ? 'icon16_kompat_warn' : 'icon16_kompat_nein', { region: 'content' });
        ic.fit(Math.min(12, r.w), Math.min(12, r.h)).pos(r.x + r.w / 2, r.y + r.h / 2);
        this.glowLayer.add(ic);
      }
    }
  }

  override tick = (dt: number): void => {
    for (const f of this.fanSpinners) f.s.rot += dt * f.speed * this.fanSpeed;
  };
}
