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
 */

interface CaseLayout {
  board: { x: number; y: number; scale: number };
  fans: { x: number; y: number; size: number }[]; // builtin first, then free slots
  radiator: { x: number; y: number } | null;
  psu: { x: number; y: number };
  bays: { x: number; y: number }[];
}

export const CASE_LAYOUT: Record<string, CaseLayout> = {
  CA1: {
    board: { x: 34, y: 74, scale: 0.8 },
    fans: [{ x: 21, y: 86, size: 26 }],
    radiator: null,
    psu: { x: 122, y: 268 },
    bays: [
      { x: 197, y: 37 },
      { x: 197, y: 63 },
      { x: 197, y: 89 },
      { x: 212, y: 150 },
      { x: 212, y: 178 },
      { x: 212, y: 206 },
    ],
  },
  CA3: {
    board: { x: 40, y: 66, scale: 0.85 },
    fans: [
      { x: 28, y: 90, size: 30 },
      { x: 230, y: 72, size: 40 },
      { x: 230, y: 142, size: 40 },
      { x: 230, y: 210, size: 40 },
    ],
    radiator: { x: 122, y: 25 },
    psu: { x: 78, y: 272 },
    bays: [
      { x: 168, y: 262 },
      { x: 208, y: 262 },
      { x: 168, y: 286 },
      { x: 208, y: 286 },
      { x: 128, y: 286 },
      { x: 128, y: 262 },
    ],
  },
  CA4: {
    board: { x: 36, y: 70, scale: 0.85 },
    fans: [
      { x: 232, y: 75, size: 40 },
      { x: 232, y: 142, size: 40 },
      { x: 232, y: 210, size: 40 },
      { x: 63, y: 30, size: 38 },
      { x: 130, y: 30, size: 38 },
      { x: 196, y: 30, size: 38 },
    ],
    radiator: { x: 130, y: 30 },
    psu: { x: 78, y: 272 },
    bays: [
      { x: 168, y: 262 },
      { x: 208, y: 262 },
      { x: 168, y: 286 },
      { x: 208, y: 286 },
      { x: 128, y: 286 },
      { x: 128, y: 262 },
    ],
  },
};

const PCB_COLOR: Record<string, number> = { green: 0x2e8a48, black: 0x34343f, blue: 0x2a4a9a, redblack: 0x3a2a30 };
const BRAND_COLOR: Record<string, number> = { veridia: 0x3fbf5f, rubeon: 0xe8432d };

// board-space constants (art px, before board scale)
const PCIE_Y0 = 96;
const PCIE_PITCH = 14;
const SLOT_X = 22;
const SOCKET = { x: 58, y: 46 };

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
    // fans (builtin + free slots)
    const builtin = cs?.builtinFans ?? [];
    const freeN = cs ? caseFreeFanSlots(cs) : 0;
    L.fans.forEach((pos, i) => {
      if (i < builtin.length) {
        this.add(this.fanNode(builtin[i]!, pos.size)).pos(pos.x, pos.y);
      } else {
        const fi = i - builtin.length;
        if (fi >= freeN) return;
        const inst = b.fans[fi];
        if (inst) {
          const n = this.fanNode(inst.id, pos.size);
          n.pos(pos.x, pos.y);
          this.add(n);
          this.partNodes.set(inst.uid, n);
        }
        this.slotGeoms.push({ slot: { kind: 'fan', index: fi }, rect: { x: pos.x - pos.size / 2, y: pos.y - pos.size / 2, w: pos.size, h: pos.size } });
      }
    });
    // PSU
    const psuRect = { x: L.psu.x - 38, y: L.psu.y - 20, w: 76, h: 40 };
    if (b.psu) {
      const pd = partOf(b.psu.id, 'psu');
      const s = new Sprite(`psu_${pd.look}`, { region: 'content' });
      s.fit(76, 42).pos(L.psu.x, L.psu.y);
      this.add(s);
      this.partNodes.set(b.psu.uid, s);
    }
    this.slotGeoms.push({ slot: { kind: 'psu', index: 0 }, rect: psuRect });
    // SATA drives in bays
    b.sata.forEach((inst, i) => {
      const pos = L.bays[i] ?? L.bays[L.bays.length - 1]!;
      if (inst) {
        const d = partOf(inst.id, 'drive');
        const s = new Sprite(d.kind === 'hdd' ? 'drive_hdd' : 'drive_sata_ssd', { region: 'anim' });
        s.fit(36, 24).pos(pos.x, pos.y);
        if (d.kind === 'hdd') {
          s.tick = () => {
            s.frameIndex = Math.random() < 0.04 ? 1 : 0;
          };
        }
        this.add(s);
        this.partNodes.set(inst.uid, s);
      }
      this.slotGeoms.push({ slot: { kind: 'sata', index: i }, rect: { x: pos.x - 18, y: pos.y - 12, w: 36, h: 24 } });
    });
    // board
    this.add(this.board);
    this.board.pos(L.board.x, L.board.y).scale(L.board.scale);
    this.buildBoard(b, L);
    // radiator (AIO)
    if (b.cooler && L.radiator) {
      const cd = partOf(b.cooler.id, 'cooler');
      if (cd.radiator) {
        const r = new Sprite(cd.radiator === 360 ? 'radiator_360' : 'radiator_240', { region: 'content' });
        r.fit(cd.radiator === 360 ? 120 : 84, 34).pos(L.radiator.x, L.radiator.y);
        this.add(r);
        this.addRadiatorFans(r, cd.radiator === 360 ? 3 : 2, !!cd.rgb);
      }
    }
    this.add(this.glowLayer);
  }

  private fanNode(id: string, size: number): Node {
    const d = part(id);
    const n = new Node();
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
    this.fanSpinners.push({ s: spin, speed: 9 + Math.random() * 3 });
    return n;
  }

  private addRadiatorFans(r: Sprite, n: number, rgb: boolean): void {
    for (let i = 0; i < n; i++) {
      const fx = r.x - r.w / 2 + (r.w / n) * (i + 0.5) - (n === 3 ? 1.5 : 2);
      const s = new Sprite(rgb ? 'case_fan_0' : 'icon_fan_1', { region: 'content' });
      s.fit(r.h * 0.82, r.h * 0.82).pos(fx, r.y);
      s.mode = 'circle';
      s.param = 0.38;
      if (rgb) s.mode = 'circle';
      this.add(s);
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
    // PCIe slots + cards (cards hang below their slot)
    const cards: { inst: PartInst; i: number }[] = [];
    bd.pcie.forEach((sd, i) => {
      const y = PCIE_Y0 + i * PCIE_PITCH;
      const s = add(sd.size === 16 ? 'slot_pcie_x16' : 'slot_pcie_x1', SLOT_X, y, sd.size === 16 ? 56 : 17, 8, { ax: 0 });
      if (sd.size === 16 && sd.lanes < 16) s.tint = [0.75, 0.75, 0.85];
      const inst = b.pcie[i];
      if (inst) cards.push({ inst, i });
      this.slotGeoms.push({ slot: { kind: 'pcie', index: i }, rect: this.boardRect(SLOT_X - 2, y - 6, sd.size === 16 ? 60 : 24, 12) });
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
    // cards last (they cover slots below)
    for (const { inst, i } of cards) {
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

  private cardNode(inst: PartInst, slotY: number): Node {
    const d = part(inst.id);
    const n = new Node();
    if (d.cat === 'gpu') {
      const g = partOf(inst.id, 'gpu');
      const name = g.len === 'S' ? 'gpu_s' : g.len === 'M' ? 'gpu_m_0' : 'gpu_l_0';
      const s = new Sprite(name, { region: 'content', ax: 0, ay: 0 });
      const w = g.len === 'S' ? 112 : g.len === 'M' ? 176 : 216;
      s.size(w, (w * s.natH) / s.natW);
      const contact = g.len === 'S' ? 0.15 : g.len === 'M' ? 0.18 : 0.17;
      // hang below the slot: flip vertically, contacts at the top
      s.sy = -1;
      s.pos(SLOT_X - contact * w + 3, slotY + s.h + 1);
      if (g.len !== 'S') {
        s.mode = 'brand';
        s.swap = hexToRgb(BRAND_COLOR[g.brand] ?? 0x3fbf5f);
      }
      if (inst.broken) s.tint = [0.55, 0.45, 0.45];
      n.add(s);
      // rotating fans (frame 0 + code rotation, the frames do not rotate cleanly)
      const fans = g.len === 'M' ? [0.34, 0.727] : g.len === 'L' ? [0.3, 0.554, 0.8] : [];
      const fy = g.len === 'M' ? 0.417 : 0.453;
      for (const fx of fans) {
        const spin = new Sprite(name, { region: 'content' });
        const rr = s.regionRect;
        const rad = 0.41 * rr.h;
        spin.regionRect = { x: rr.x + fx * rr.w - rad, y: rr.y + fy * rr.h - rad, w: rad * 2, h: rad * 2 };
        const k = s.w / rr.w;
        spin.size(rad * 2 * k, rad * 2 * k);
        spin.sy = -1;
        spin.pos(s.x + fx * s.w, s.y - fy * s.h);
        spin.mode = 'circle';
        spin.param = 0.47;
        spin.swap = s.swap;
        n.add(spin);
        if (!inst.broken) this.fanSpinners.push({ s: spin, speed: 7 + Math.random() });
      }
    } else {
      const e = partOf(inst.id, 'exp');
      const name = e.effect === 'nic' ? 'exp_nic' : e.effect === 'sound' ? 'exp_sound' : 'exp_capture';
      const s = new Sprite(name, { region: 'content', ax: 0, ay: 0 });
      const w = e.effect === 'nic' ? 40 : 50;
      s.size(w, (w * s.natH) / s.natW);
      const contact = e.effect === 'nic' ? 0.45 : 0.33;
      s.sy = -1;
      s.pos(SLOT_X - contact * w + 2, slotY + s.h + 1);
      n.add(s);
    }
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
  setGlows(list: { slot: SlotRef; color: number }[]): void {
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
    }
  }

  override tick = (dt: number): void => {
    for (const f of this.fanSpinners) f.s.rot += dt * f.speed * this.fanSpeed;
  };
}
