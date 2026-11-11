import { BaseScreen, placeEl, type Box } from './base';
import { Node, Rect2, Sprite, Text } from '../../render/scene';
import { PcView } from '../../view/pcView';
import { checkAspectSoon } from '../../view/aspectCheck';
import { button, h, hideTip, img, sheet, showTip, statChip, tip, toast } from '../dom';
import { L, fmt, money } from '../../i18n';
import {
  backToShop,
  installPart,
  leaveWorkbench,
  postIssues,
  sellPart,
  statsOf,
  swIds,
  swSlotsUsed,
  uninstallPart,
} from '../../core/run';
import { slotOptions, type Issue, type SlotOption } from '../../core/compat';
import { part } from '../../core/data/hardware';
import { installed, findSlotOf } from '../../core/build';
import type { PartInst, SlotRef } from '../../core/types';
import { heatTip, issueText, partCard, partName } from '../describe';
import { openBios } from '../bios';
import { LED_ORDER, openPostError } from '../postDialog';
import { openDeck } from '../deckSheet';
import { openSettings } from '../settings';
import { sfx } from '../../audio/sfx';
import { ease, tween, wait } from '../../render/tween';
import { sellValue } from '../../core/difficulty';
import { STORAGE_SLOTS } from '../../core/data/content';
import { hexToRgb } from '../../render/fx';


const runningBlinks = new WeakMap<Node, () => void>();
const CABLE_KEY = 'bottleneck.cables';
function cablesOn(): boolean {
  try {
    return localStorage.getItem(CABLE_KEY) !== '0';
  } catch {
    return true;
  }
}
function setCables(on: boolean): void {
  try {
    localStorage.setItem(CABLE_KEY, on ? '1' : '0');
  } catch {
    /* private mode: ignore */
  }
}

export class WorkbenchScreen extends BaseScreen {
  private pc = new PcView();
  private caseArea!: Box;
  private storageNodes: { node: Sprite; inst: PartInst; x: number; y: number }[] = [];
  private sel: number | null = null;
  private options: SlotOption[] = [];
  slotList: HTMLElement | null = null;
  private leds: Sprite[] = [];
  private busy = false;
  private ghost: Sprite | null = null;

  override enter(): void {
    super.enter();
    const p = this.g.pendingInstall;
    this.g.pendingInstall = null;
    if (p !== null && this.g.run!.storage.some((s) => s.uid === p)) this.select(p);
  }

  build(): void {
    const g = this.g;
    const run = g.run!;
    g.setBg('esd');
    const t = L();
    const { w, h: H } = this.vp;
    const P = this.portrait;
    this.storageNodes = [];
    this.leds = [];
    this.slotList = null;

    // regions
    let stats: Box;
    let storage: Box;
    let buttons: Box;
    let status: Box;
    let leds: Box;
    if (P) {
      stats = { x: 4, y: 4, w: w - 8, h: 52 };
      buttons = { x: 6, y: H - 48, w: w - 12, h: 42 };
      storage = { x: 6, y: buttons.y - 66, w: w - 12, h: 62 };
      status = { x: 6, y: storage.y - 30, w: w - 12, h: 28 };
      leds = { x: w - 118, y: storage.y + 8, w: 112, h: 46 };
      this.caseArea = { x: 4, y: stats.y + stats.h + 4, w: w - 8, h: status.y - (stats.y + stats.h + 4) - 2 };
    } else {
      const caseW = Math.min(w * 0.46, (H - 8) * (260 / 320));
      this.caseArea = { x: 4, y: 4, w: caseW, h: H - 8 };
      const rx = caseW + 12;
      const rw = w - rx - 6;
      stats = { x: rx, y: 4, w: rw, h: 60 };
      status = { x: rx, y: 70, w: rw, h: 34 };
      storage = { x: rx, y: 110, w: rw, h: 56 };
      leds = { x: rx + rw - 110, y: H - 96, w: 106, h: 40 };
      buttons = { x: rx, y: H - 46, w: rw, h: 40 };
    }

    // PC view
    this.pc = new PcView();
    this.pc.cables = cablesOn();
    this.pc.rebuildFrom(run.build);
    const k = Math.min(this.caseArea.w / this.pc.cw, this.caseArea.h / this.pc.ch);
    this.pc.scale(k);
    this.pc.pos(this.caseArea.x + (this.caseArea.w - this.pc.cw * k) / 2, this.caseArea.y + (this.caseArea.h - this.pc.ch * k) / 2);
    this.root.add(this.pc);
    this.makePartsInteractive();

    // stats
    const st = statsOf(run);
    const load = st.watt ? st.tdp / st.watt : 1;
    const wattFrame = new Sprite('ui_wattbar_frame', { region: 'content' });
    const barW = P ? 120 : Math.min(150, stats.w - 70);
    wattFrame.size(barW, barW * (46 / 496));
    const fill = new Sprite(`ui_wattbar_fill_${load < 0.7 ? 0 : load <= 0.9 ? 1 : 2}`, { region: 'content', ax: 0 });
    fill.fit(barW * 0.86, 99); // natural aspect
    fill.cropR = Math.min(1, load);
    const wattNode = new Node();
    wattNode.add(wattFrame);
    fill.x = -barW * 0.41;
    wattNode.add(fill);
    wattNode.pos(stats.x + barW / 2 + 2, stats.y + 8);
    this.root.add(wattNode);
    const wattTxt = h('div', { class: `t-title shadow ${load > 1 ? 'c-bad' : load > 0.9 ? 'c-warn' : ''}`, style: 'font-size:9.5px' }, `${st.tdp}/${st.watt} W`);
    placeEl(wattTxt, { x: stats.x + barW + 8, y: stats.y + 2 });
    const coolChip = statChip('icon8_kuehlung', `${st.cooling}`);
    tip(coolChip, heatTip);
    const chips = h(
      'div',
      { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:2px 7px;font-size:9.5px' },
      coolChip,
      statChip('icon8_lanes', `${st.lanesUsed}/${st.lanesAvail}`),
      statChip('icon8_kerne', `${t.stat.cores} ${st.cores}`),
      statChip('icon16_handgroesse', `${t.stat.hand} ${st.handSize}`),
      statChip('icon16_softwareslot', `${swSlotsUsed(run)}/${st.swSlots}`),
      statChip('icon8_neuprio', `${st.rerolls}`),
      h('span', { class: 'c-gold t-title' }, money(run.money)),
    );
    placeEl(chips, { x: stats.x, y: stats.y + (P ? 38 : 18), w: stats.w });
    const menuBtns = h('div', { style: 'display:flex;gap:12px' }, button('', () => openDeck(), { color: 'gray', cls: 'iconbtn', icon: 'icon16_deck' }), button('', () => openSettings({ inRun: true }), { color: 'gray', cls: 'iconbtn', icon: 'icon16_einstellungen' }));
    placeEl(menuBtns, { x: stats.x + stats.w - 76, y: stats.y });
    if (!P) placeEl(menuBtns, { x: stats.x + stats.w - 76, y: stats.y + 32 });
    // cables are cosmetic: toggle
    const cab = button(t.wbx.cables, () => {
      setCables(!cablesOn());
      this.rebuild();
    }, { color: cablesOn() ? 'green' : 'gray', cls: 'small', title: t.wbx.cablesTip });
    cab.style.minWidth = '58px';
    cab.style.height = cab.style.minHeight = '32px'; // same box as the icon buttons next to it
    placeEl(cab, { x: stats.x + stats.w - 76 - 12 - 58, y: P ? stats.y : stats.y + 32 });
    this.dom.append(wattTxt, chips, menuBtns, cab);

    // POST status line
    const issues = postIssues(run);
    const err = issues.find((i) => i.severity === 'error');
    const warns = issues.filter((i) => i.severity === 'warn');
    const statusEl = h(
      'div',
      { class: 'glass', style: 'font-size:9.5px;padding:2px 5px;line-height:1.2;overflow:hidden' },
      err
        ? h('span', { class: 'c-bad' }, img('icon16_kompat_nein', 'i8'), ' ' + issueText(err))
        : h('span', { class: 'c-ok' }, img('icon16_kompat_ok', 'i8'), ' ' + t.wb.postOk),
      warns.length ? h('span', { class: 'c-warn' }, ' · ', img('icon16_kompat_warn', 'i8'), ' ' + issueText(warns[0]!)) : null,
    );
    placeEl(statusEl, status);
    statusEl.style.height = `${status.h}px`;
    this.dom.append(statusEl);

    // storage tray
    this.panel(storage, 'dark');
    const sl = h('div', { class: 't-title dim', style: 'font-size:9.5px' }, fmt(t.wb.storageN, { n: run.storage.length }));
    placeEl(sl, { x: storage.x + 7, y: storage.y + 3 });
    this.dom.append(sl);
    const ss = 38;
    for (let i = 0; i < 3; i++) {
      const x = storage.x + 10 + ss / 2 + i * (ss + 6);
      const y = storage.y + 12 + ss / 2 - 2;
      const slot = new Sprite('ui_slot_empty_lager', { region: 'content' });
      slot.size(ss, ss).pos(x, y);
      this.root.add(slot);
      const p = run.storage[i];
      if (!p) continue;
      const d = part(p.id);
      const ic = new Sprite(d.icon, { region: 'content' });
      ic.fit(ss - 6, ss - 6).pos(x, y);
      if (d.rgb) ic.mode = 'rgb';
      if (this.sel === p.uid) {
        ic.flash = 0.25;
        // square selection frame: 9-slice glow (the card highlight art is not square)
        const hl = new Sprite('slot_glow', { region: 'anim', nine: 3, nineScale: 1 });
        hl.size(ss + 6, ss + 6).pos(x, y).play(6);
        hl.tint = [1, 0.85, 0.3];
        this.root.add(hl);
      }
      this.root.add(ic);
      this.storageNodes.push({ node: ic, inst: p, x, y });
      ic.interactive = {
        onTap: () => this.select(this.sel === p.uid ? null : p.uid),
        onHover: (inside) => (inside ? showTip(partCard(p.id, p), this.rectOf(ic), ic) : hideTip(ic)),
        onLongPress: () => this.openStored(p),
        onDragStart: () => this.dragStart(p, ic),
        onDrag: (e) => this.dragMove(e.x, e.y),
        onDragEnd: (e) => void this.dragEnd(e.x, e.y),
      };
    }
    if (!run.storage.length) {
      const hint = h('div', { class: 'dim', style: 'font-size:9.5px;line-height:1.15' }, t.wb.clickPart);
      placeEl(hint, { x: storage.x + 150, y: storage.y + 8, w: storage.w - 160 });
      if (P) {
        hint.style.left = `${storage.x + 146}px`;
        hint.style.width = `${Math.max(60, leds.x - storage.x - 148)}px`;
      }
      this.dom.append(hint);
    }

    // POST LEDs
    LED_ORDER.forEach((led, i) => {
      const x = leds.x + 14 + i * 28;
      const s = new Sprite(`fx_post_led_${i * 2}`, { region: 'content' });
      s.fit(10, 10).pos(x, leds.y + 14);
      this.root.add(s);
      this.leds.push(s);
      const lab = new Text(t.led[led], { font: 'body', size: 9.5, align: 'center', valign: 'middle', color: 0x9b9bb4 });
      lab.pos(x, leds.y + 27);
      this.root.add(lab);
    });

    // buttons
    const row = h('div', { class: 'lr', style: 'display:flex;gap:5px;height:100%' });
    const back = button(['◀ ', t.ui.shop], () => {
      if (g.check(backToShop(run))) {
        g.save();
        g.route();
      }
    }, { color: 'blue' });
    const bios = button(t.ui.bios, () => openBios(() => this.rebuild()), { color: 'gray', icon: 'icon16_bios' });
    const post = button(t.wb.postRun, () => void this.runPost(), { color: err ? 'red' : 'green', cls: 'big' });
    post.style.flex = '1';
    row.append(back, bios, post);
    placeEl(row, buttons);
    this.dom.append(row);

    if (this.sel !== null) this.showSlotList();
    checkAspectSoon(this.root, 'workbench');
    void Rect2;
  }

  private rectOf(n: Node): Box {
    return n.worldRect() ?? { x: 0, y: 0, w: 0, h: 0 };
  }

  /** Case coords → screen (virtual) coords. */
  private caseToScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.pc.x + x * this.pc.sx, y: this.pc.y + y * this.pc.sy };
  }

  private makePartsInteractive(): void {
    const run = this.g.run!;
    for (const { inst } of installed(run.build)) {
      const n = this.pc.partNode(inst.uid);
      if (!n) continue;
      const d = part(inst.id);
      if (d.cat === 'case' || d.cat === 'board') continue; // via slot list / detail
      n.interactive = {
        onTap: () => (this.sel !== null ? this.tapSlotAt(inst.uid) : this.openInstalled(inst)),
        onHover: (inside) => (inside ? showTip(partCard(inst.id, inst), this.rectOf(n), n) : hideTip(n)),
        pad: 1,
      };
    }
    // board & case: hit areas on the PCB
    if (run.build.board) {
      const bn = this.pc.partNode(run.build.board.uid);
      if (bn) {
        bn.z = -1;
        bn.interactive = { onTap: () => (this.sel !== null ? this.tapSlotAt(run.build.board!.uid) : this.openInstalled(run.build.board!)) };
      }
    }
  }

  private tapSlotAt(uid: number): void {
    const run = this.g.run!;
    const slot = findSlotOf(run.build, uid);
    if (!slot) return;
    const o = this.options.find((x) => x.slot.kind === slot.kind && x.slot.index === slot.index);
    if (o) void this.tryInstall(o);
  }

  // ------------------------------------------------------------ selection

  private select(uid: number | null): void {
    this.sel = uid;
    const run = this.g.run!;
    const inst = run.storage.find((p) => p.uid === uid);
    this.options = inst ? slotOptions(run.build, inst, { software: swIds(run), pasteUses: run.pasteUses }) : [];
    if (uid !== null) sfx.select();
    this.rebuild();
  }

  private showSlotList(): void {
    const run = this.g.run!;
    const inst = run.storage.find((p) => p.uid === this.sel);
    if (!inst) return;
    const t = L();
    const color = { ok: 0x3fbf5f, warn: 0xffd23f, bad: 0xe8432d } as const;
    this.pc.setGlows(this.options.map((o) => ({ slot: o.slot, color: color[o.status], status: o.status })));
    // glows are interactive targets too
    for (const o of this.options) {
      const r = this.pc.slotRect(o.slot);
      if (!r) continue;
      const hit = new Node();
      hit.hit = { x: r.x, y: r.y, w: r.w, h: r.h };
      hit.interactive = { onTap: () => void this.tryInstall(o), pad: 2 };
      this.pc.glowLayer.add(hit);
    }
    const P = this.portrait;
    const list = h('div', { class: 'glass scroll pe', style: `padding:${P ? 4 : 3}px 5px;display:flex;flex-direction:column;gap:${P ? 4 : 2}px;max-height:100%` });
    list.append(h('div', { class: 't-title', style: 'font-size:9.5px;color:var(--gold-l)' }, `${partName(inst.id)} · ${t.wb.pickSlot}`));
    // parts that leave the build besides the occupant (e.g. on a board swap)
    const extra = (o: SlotOption) => o.displaced.filter((p) => p.uid !== o.occupant?.uid);
    if (!this.options.length) list.append(h('div', { class: 'c-warn', style: 'font-size:9.5px' }, t.wb.noSlot));
    for (const o of this.options) {
      const label = this.slotLabel(o.slot);
      const st = o.status;
      const b = button(
        [
          img(st === 'ok' ? 'icon16_kompat_ok' : st === 'warn' ? 'icon16_kompat_warn' : 'icon16_kompat_nein', 'ic'),
          h(
            'span',
            { style: 'font-family:var(--font-body);font-size:9.5px;white-space:normal;text-align:left;flex:1' },
            label + (o.occupant ? ` · ${fmt(t.slot.occupied, { name: partName(o.occupant.id) })}` : ''),
            o.issue ? h('div', { class: st === 'bad' ? 'c-bad' : 'c-warn', style: 'font-size:9.5px' }, issueText(o.issue)) : null,
            extra(o).length ? h('div', { class: 'dim', style: 'font-size:9.5px' }, `${t.wbx.toStorage}: ${extra(o).map((p) => partName(p.id)).join(', ')}`) : null,
          ),
        ],
        () => void this.tryInstall(o),
        { color: st === 'ok' ? 'green' : st === 'warn' ? 'gray' : 'gray' },
      );
      b.style.justifyContent = 'flex-start';
      if (st === 'bad') b.style.opacity = '0.7';
      list.append(b);
    }
    const tools = h('div', { class: 'lr', style: 'display:flex;gap:6px;margin-top:2px' });
    tools.append(button(t.ui.cancel, () => this.select(null), { color: 'gray', cls: P ? '' : 'small' }));
    tools.append(button(fmt(t.ui.sellFor, { n: sellValue(inst.paid) }), () => {
      if (this.g.check(sellPart(run, inst.uid))) {
        sfx.coin();
        this.g.save();
        this.select(null);
      }
    }, { color: 'red', cls: P ? '' : 'small' }));
    for (const b of Array.from(tools.children) as HTMLElement[]) b.style.flex = '1';
    list.append(tools);
    const area = P
      ? { x: 8, y: this.caseArea.y + this.caseArea.h * 0.2, w: this.vp.w - 16, h: this.caseArea.h * 0.8 }
      : { x: this.caseArea.x + this.caseArea.w + 8, y: 167, w: this.vp.w - this.caseArea.w - 20, h: this.vp.h - 167 - 47 };
    placeEl(list, area);
    list.style.height = 'auto';
    list.style.maxHeight = `${area.h}px`;
    if (P) {
      list.style.top = 'auto';
      list.style.bottom = `${this.vp.h - (area.y + area.h)}px`;
    }
    this.slotList = list;
    this.dom.append(list);
    // sub-pixel / button-shadow overshoot must not produce a scrollbar; only real overflow scrolls
    if (list.scrollHeight - list.clientHeight <= 8) list.style.overflowY = 'hidden';
    if (P) {
      // portrait: shrink the case so the list does not cover its lower half
      const lh = list.offsetHeight;
      const ca = this.caseArea;
      const free = ca.h - lh - 6;
      const k0 = this.pc.sx;
      const k = Math.min(k0, free / this.pc.ch);
      if (lh > 0 && k < k0 && k > 0.3) {
        this.pc.scale(k);
        this.pc.pos(ca.x + (ca.w - this.pc.cw * k) / 2, ca.y + (free - this.pc.ch * k) / 2 + 2);
      }
    }
  }

  private slotLabel(s: SlotRef): string {
    const t = L();
    const bd = this.g.run!.build.board ? part(this.g.run!.build.board.id) : null;
    switch (s.kind) {
      case 'ram':
        return fmt(t.slot.ram, { a: s.index * 2 + 1, b: s.index * 2 + 2 });
      case 'pcie': {
        const sd = bd && bd.cat === 'board' ? bd.pcie[s.index] : undefined;
        if (!sd) return `PCIe #${s.index + 1}`;
        return fmt(sd.lanes < sd.size ? t.slot.pcieLanes : t.slot.pcie, { size: sd.size, lanes: sd.lanes, n: s.index + 1 });
      }
      case 'm2':
        return fmt(bd && bd.cat === 'board' && s.index < bd.m2Gen5 ? t.slot.m2gen5 : t.slot.m2, { n: s.index + 1 });
      case 'sata':
        return fmt(t.slot.sata, { n: s.index + 1 });
      case 'fan':
        return fmt(t.slot.fan, { n: s.index + 1 });
      default:
        return t.slot[s.kind];
    }
  }

  private async tryInstall(o: SlotOption): Promise<void> {
    if (this.busy || this.sel === null) return;
    const run = this.g.run!;
    if (o.status === 'bad') {
      if (o.issue) toast(issueText(o.issue), 'bad');
      const r = this.pc.slotRect(o.slot);
      if (r) {
        const p = this.caseToScreen(r.x + r.w / 2, r.y + r.h / 2);
        this.g.fx.burst(p.x, p.y, 'spark', 0.8);
      }
      return;
    }
    const uid = this.sel;
    const over = this.storageOverflow(o);
    if (over > 0) {
      this.openStorageFull(o);
      return;
    }
    const from = this.storageNodes.find((s) => s.inst.uid === uid);
    const res = installPart(run, uid, o.slot);
    if (!this.g.check(res)) return;
    this.busy = true;
    hideTip();
    // fly animation
    const r = this.pc.slotRect(o.slot);
    const target = r ? this.caseToScreen(r.x + r.w / 2, r.y + r.h / 2) : { x: this.vp.w / 2, y: this.vp.h / 2 };
    if (from) {
      const ghost = new Sprite(part(from.inst.id).icon, { region: 'content' });
      ghost.fit(34, 34).pos(from.x, from.y);
      ghost.z = 100;
      this.root.add(ghost);
      await tween(ghost, { x: target.x, y: target.y - 10, sx: 1.25, sy: 1.25 }, { dur: 0.28, ease: ease.inOutQuad });
      await tween(ghost, { y: target.y, sx: 0.9, sy: 0.9, alpha: 0.3 }, { dur: 0.08, ease: ease.inQuad });
      ghost.destroy();
    }
    this.sel = null;
    this.options = [];
    this.g.save();
    this.rebuild();
    // snap effect
    sfx.snap();
    this.g.engine.shake(1.5, 0.12);
    this.g.fx.burst(target.x, target.y, 'click', 1);
    const n = this.pc.partNode(uid);
    if (n) {
      const by = n.y;
      n.y = by - 3;
      void tween(n, { y: by }, { dur: 0.18, ease: ease.outBounce });
      if (n instanceof Sprite) {
        n.flash = 0.8;
        const o2 = { f: 0.8 };
        void tween(o2, { f: 0 }, { dur: 0.35, onUpdate: () => (n.flash = o2.f) });
      }
    }
    if (res.displaced.length) toast(`${L().ui.storage}: ${res.displaced.map((p) => partName(p.id)).join(', ')}`, 'info');
    this.busy = false;
  }

  /** How many parts too many would land in storage with this placement. */
  private storageOverflow(o: SlotOption): number {
    const run = this.g.run!;
    const fromStorage = run.storage.some((p) => p.uid === this.sel);
    return run.storage.length - (fromStorage ? 1 : 0) + o.displaced.length - STORAGE_SLOTS;
  }

  /**
   * Board/case swap with a full storage: shows which parts would come out and
   * lets the player sell stored parts right here; installs once it fits.
   */
  private openStorageFull(o: SlotOption): void {
    const run = this.g.run!;
    const t = L();
    const sel = this.sel;
    const body = h('div', {});
    const handle = sheet((close) => [
      h('h3', { class: 'c-warn' }, t.wbx.fullTitle),
      body,
      h('div', { class: 'actions' }, button(t.ui.cancel, close, { color: 'gray' })),
    ]);
    const render = () => {
      const need = this.storageOverflow(o);
      if (need <= 0) {
        handle.close();
        void this.tryInstall(o);
        return;
      }
      body.replaceChildren(
        h('div', { style: 'font-size:10px;line-height:1.25;white-space:normal' }, fmt(t.wbx.fullText, { d: o.displaced.length, n: need })),
        h('div', { class: 'dim', style: 'font-size:9.5px;margin:3px 0 5px' }, `${t.wbx.toStorage}: ${o.displaced.map((p) => partName(p.id)).join(', ')}`),
        ...run.storage
          .filter((p) => p.uid !== sel)
          .map((p) =>
            h(
              'div',
              { style: 'display:flex;align-items:center;gap:6px;margin-bottom:3px' },
              img(part(p.id).icon, 'i16'),
              h('span', { style: 'flex:1;font-size:9.5px' }, partName(p.id)),
              button(fmt(t.ui.sellFor, { n: sellValue(p.paid) }), () => {
                if (this.g.check(sellPart(run, p.uid))) {
                  sfx.coin();
                  this.g.save();
                  this.rebuild();
                  render();
                }
              }, { color: 'red', cls: 'small' }),
            ),
          ),
      );
    };
    render();
  }

  // ------------------------------------------------------------ drag & drop

  private dragStart(p: PartInst, ic: Sprite): void {
    if (this.sel !== p.uid) {
      this.sel = p.uid;
      const run = this.g.run!;
      this.options = slotOptions(run.build, p, { software: swIds(run), pasteUses: run.pasteUses });
      const color = { ok: 0x3fbf5f, warn: 0xffd23f, bad: 0xe8432d } as const;
      this.pc.setGlows(this.options.map((o) => ({ slot: o.slot, color: color[o.status], status: o.status })));
    }
    hideTip();
    this.ghost = new Sprite(part(p.id).icon, { region: 'content' });
    this.ghost.fit(36, 36).pos(ic.x, ic.y);
    this.ghost.alpha = 0.85;
    this.ghost.z = 200;
    this.root.add(this.ghost);
    ic.alpha = 0.35;
  }

  private dragMove(x: number, y: number): void {
    if (this.ghost) this.ghost.pos(x, y);
  }

  private async dragEnd(x: number, y: number): Promise<void> {
    this.ghost?.destroy();
    this.ghost = null;
    const lx = (x - this.pc.x) / this.pc.sx;
    const ly = (y - this.pc.y) / this.pc.sy;
    const hit = this.options
      .map((o) => ({ o, r: this.pc.slotRect(o.slot)! }))
      .filter(({ r }) => r && lx >= r.x - 4 && lx <= r.x + r.w + 4 && ly >= r.y - 4 && ly <= r.y + r.h + 4)
      .sort((a, b) => a.r.w * a.r.h - b.r.w * b.r.h)[0];
    if (hit) await this.tryInstall(hit.o);
    else this.rebuild();
  }

  // ------------------------------------------------------------ sheets

  private openInstalled(inst: PartInst): void {
    const run = this.g.run!;
    const t = L();
    const d = part(inst.id);
    const canRemove = d.cat !== 'board' && d.cat !== 'case';
    const oc = d.cat === 'cpu' || d.cat === 'gpu' || d.cat === 'ram';
    sheet((close) => [
      partCard(inst.id, inst, inst.oc ? [h('div', { class: 'c-warn' }, `OC ${inst.oc}`)] : []),
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        oc ? button(t.ui.bios, () => {
          close();
          openBios(() => this.rebuild());
        }, { color: 'blue', icon: 'icon16_bios' }) : null,
        canRemove
          ? button(t.wb.removeToStorage, () => {
              if (this.g.check(uninstallPart(run, inst.uid))) {
                sfx.thud();
                this.g.save();
                close();
                this.rebuild();
              }
            }, { color: 'red', disabled: run.storage.length >= 3 })
          : null,
      ),
    ]);
  }

  private openStored(p: PartInst): void {
    hideTip();
    showTip(partCard(p.id, p), this.rectOf(this.storageNodes.find((s) => s.inst.uid === p.uid)!.node), p);
    setTimeout(() => hideTip(p), 2000);
  }

  // ------------------------------------------------------------ POST

  private async runPost(): Promise<void> {
    if (this.busy) return;
    const run = this.g.run!;
    const t = L();
    this.busy = true;
    this.select(null);
    this.busy = true;
    const issues = postIssues(run);
    const err: Issue | undefined = issues.find((i) => i.severity === 'error');
    const failAt = err ? LED_ORDER.indexOf(err.led) : 99;
    sfx.beep();
    for (let i = 0; i < 4; i++) {
      const led = this.leds[i]!;
      led.setFrame(`fx_post_led_${i * 2 + 1}`);
      led.flash = 0.6;
      void tween(led, { flash: 0 }, { dur: 0.25 });
      this.g.fx.sparks(led.x, led.y, 3, [0xe8432d, 0xffd23f, 0xf4f4fa, 0x3fbf5f][i]!, 30);
      sfx.tick(i * 3);
      await wait(0.32);
      if (i === failAt) {
        // failure: this LED stays lit and blinks
        led.tick = () => (led.flash = Math.floor(performance.now() / 180) % 2 ? 0.7 : 0);
        this.g.engine.shake(2, 0.2);
        for (const uid of err!.uids) {
          const n = this.pc.partNode(uid);
          const r = n?.worldRect();
          if (r) this.g.fx.burst(r.x + r.w / 2, r.y + r.h / 2, 'spark', 1.2);
          this.blinkPart(uid);
        }
        const red = new Rect2(this.caseArea.w, this.caseArea.h, 0xe8432d, 0.0);
        red.pos(this.caseArea.x, this.caseArea.y);
        this.root.add(red);
        await tween(red, { alpha: 0.25 }, { dur: 0.1 });
        void tween(red, { alpha: 0 }, { dur: 0.4 }).then(() => red.destroy());
        openPostError(run.build, err!, issues);
        this.busy = false;
        return;
      }
      led.setFrame(`fx_post_led_${i * 2}`);
    }
    // success: all LEDs off, BOOT green
    this.leds[3]!.setFrame('fx_post_led_7');
    sfx.boot();
    this.g.fx.confetti(this.caseArea.x + this.caseArea.w / 2, this.caseArea.y + this.caseArea.h / 2, 18, 120);
    this.pc.fanSpeed = 3;
    await wait(0.7);
    const r = leaveWorkbench(run);
    this.busy = false;
    if (!this.g.check(r)) return;
    this.g.save();
    toast(t.wb.postOk, 'good', 1500);
    this.g.route();
  }

  /** Failed part blinks red for a few seconds (POST error). */
  private blinkPart(uid: number): void {
    const n = this.pc.partNode(uid);
    if (!n) return;
    const sprites: Sprite[] = [];
    const walk = (x: Node) => {
      if (x instanceof Sprite) sprites.push(x);
      x.children.forEach(walk);
    };
    walk(n);
    // a blink still running on this node: restore its original colours/tick first
    runningBlinks.get(n)?.();
    const base = sprites.map((s) => [...s.tint] as [number, number, number]);
    let t = 0;
    const prev = n.tick;
    const stop = () => {
      sprites.forEach((s, i) => (s.tint = base[i]!));
      n.tick = prev;
      runningBlinks.delete(n);
    };
    runningBlinks.set(n, stop);
    n.tick = (dt) => {
      prev?.(dt);
      t += dt;
      const on = t < 3.5 && Math.floor(t / 0.25) % 2 === 0;
      sprites.forEach((s, i) => (s.tint = on ? [1, 0.35, 0.3] : base[i]!));
      if (t >= 3.5) stop();
    };
  }

  refresh(): void {
    this.rebuild();
  }

  override exit(): void {
    super.exit();
    void hexToRgb;
  }
}
