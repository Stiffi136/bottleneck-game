import { BaseScreen, placeEl, type Box } from './base';
import { Node, Rect2, Sprite, Text } from '../../render/scene';
import { ItemCard, CardView } from '../../view/cards';
import { SwChip } from '../../view/hud';
import { button, h, hideTip, img, sheet, showTip, tip, toast } from '../dom';
import { L, fmt, money } from '../../i18n';
import {
  brokenParts,
  buyHardware,
  buyPack,
  buySoft,
  choosePack,
  freeSwSlots,
  goWorkbench,
  moveSoftware,
  repairCost,
  repairPart,
  rerollCost,
  rerollShop,
  sellPart,
  sellSoftware,
  statsOf,
  swIds,
  swSlotsUsed,
  type PackOption,
  type ShopSoft,
} from '../../core/run';
import { shopBadge, type Badge } from '../../core/compat';
import { part } from '../../core/data/hardware';
import { PACK_PRICES, profileDef, softwareDef, toolDef } from '../../core/data/content';
import { installed } from '../../core/build';
import { driverCard, issueText, packCard, partCard, partLines, partName, softwareCard, toolCard, cardCard } from '../describe';
import { sellValue } from '../../core/difficulty';
import { openDeck } from '../deckSheet';
import { openSettings } from '../settings';
import { openToolSheet } from '../toolSheet';
import { sfx } from '../../audio/sfx';
import { ease, tween, wait } from '../../render/tween';
import type { PackKind, PartInst } from '../../core/types';

export class ShopScreen extends BaseScreen {
  private packLayer: Node | null = null;
  private animatePack = false;

  build(): void {
    const g = this.g;
    const run = g.run!;
    const shop = run.shop!;
    g.setBg('shop');
    const t = L();
    const { w } = this.vp;
    const P = this.portrait;

    // header
    const head = h(
      'div',
      { style: 'display:flex;align-items:center;justify-content:space-between;gap:6px' },
      h('div', { class: 't-title shadow', style: 'font-size:13px' }, t.shop.title, h('span', { class: 'dim', style: 'font-size:9px;margin-left:6px' }, `${t.stat.gen} ${run.gen}`)),
      h(
        'div',
        { style: 'display:flex;gap:4px;align-items:center' },
        h('span', { class: 't-title c-gold shadow', style: 'font-size:14px;margin-right:4px' }, money(run.money)),
        button('', () => openDeck(), { color: 'gray', cls: 'iconbtn', icon: 'icon16_deck' }),
        button('', () => openSettings({ inRun: true }), { color: 'gray', cls: 'iconbtn', icon: 'icon16_einstellungen' }),
      ),
    );
    placeEl(head, { x: 8, y: 5, w: w - 16 });
    this.dom.append(head);
    if (run.pack) {
      void this.showPack(this.animatePack);
      this.animatePack = false;
      return;
    }
    // the shop name hangs on the sign of the background
    const sign = this.signRect();
    const title = head.firstElementChild as HTMLElement;
    title.style.cssText = `font-size:${P ? 13 : 12}px;text-align:center;line-height:1.1`;
    title.lastElementChild!.setAttribute('style', 'display:block;font-size:8px;margin-top:2px');
    title.remove();
    placeEl(title, { x: sign.x, y: sign.y + sign.h / 2 - 13, w: sign.w });
    this.dom.append(title);
    head.style.justifyContent = 'flex-end';
    this.buildCounter();
    void shop;
  }

  /**
   * Pixel rect of a region of the shop background, in art coords of the
   * current background (landscape 800×400, portrait 400×900; cover-fitted).
   */
  private bgRect(u0: number, v0: number, u1: number, v1: number): Box {
    const vp = this.vp;
    const [aw, ah] = vp.portrait ? [400, 900] : [800, 400];
    const k = Math.max(vp.fullW / aw, vp.fullH / ah);
    const cx = -vp.ox + vp.fullW / 2;
    const cy = -vp.oy + vp.fullH / 2;
    const x0 = cx + (u0 - aw / 2) * k;
    const y0 = cy + (v0 - ah / 2) * k;
    return { x: x0, y: y0, w: (u1 - u0) * k, h: (v1 - v0) * k };
  }

  private signRect(): Box {
    return this.portrait ? this.bgRect(87, 145, 312, 216) : this.bgRect(302, 81, 497, 132);
  }

  private statusLine(box: { x: number; y: number; w: number; h?: number }): HTMLElement {
    const run = this.g.run!;
    const st = statsOf(run);
    const stat = h('div', { class: 'glass', style: 'font-size:9px;padding:3px 6px;text-align:center' }, fmt(L().shop.statusLine, { cores: st.cores, hand: st.handSize, tdp: st.tdp, watt: st.watt, cool: st.cooling, sw: swSlotsUsed(run), slots: st.swSlots }));
    placeEl(stat, box);
    this.dom.append(stat);
    return stat;
  }

  private repairButton(x: number, y: number): void {
    const run = this.g.run!;
    const broken = brokenParts(run);
    if (!broken.length) return;
    const p = broken[0]!;
    const rb = button([img('icon16_werkbank'), fmt(L().ui.repair, { n: repairCost() })], () => {
      if (this.g.check(repairPart(run, p.uid))) {
        sfx.cash();
        this.g.save();
        this.rebuild();
      }
    }, { color: 'blue', cls: 'small' });
    placeEl(rb, { x, y });
    tip(rb, () => partCard(p.id, p));
    this.dom.append(rb);
  }

  private actionButtons(buttons: Box, vertical = false): void {
    const g = this.g;
    const run = g.run!;
    const t = L();
    const row = h('div', { style: `display:flex;gap:6px;height:100%;${vertical ? 'flex-direction:column' : ''}` });
    const reroll = button([img('icon16_neu_wuerfeln', 'ic'), fmt(t.shop.rerollN, { n: rerollCost(run) })], () => {
      if (g.check(rerollShop(run))) {
        sfx.deal();
        g.save();
        this.rebuild();
      }
    }, { color: 'blue', cls: 'big' });
    reroll.style.flex = '1';
    const next = button(t.shop.toWorkbench, () => {
      if (g.check(goWorkbench(run))) {
        g.save();
        g.route();
      }
    }, { color: 'green', cls: 'big' });
    next.style.flex = '1.3';
    row.append(reroll, next);
    placeEl(row, buttons);
    this.dom.append(row);
  }

  /**
   * Landscape: the offers stand on the shop counter of the background, their
   * price labels hang on the counter front. Inventory, build status and the
   * buttons fill the wall above the counter.
   */
  private buildCounter(): void {
    const run = this.g.run!;
    const shop = run.shop!;
    const t = L();
    const { w, h: H } = this.vp;
    const P = this.portrait;
    const top = 34;
    const surface = P ? this.bgRect(0, 570, 400, 607) : this.bgRect(48, 299, 752, 322);
    const standY = Math.min(surface.y + surface.h * 0.55, H - 150); // items stand here
    const frontY = Math.min(surface.y + surface.h + 2, standY + 14); // counter front panel
    const sign = this.signRect();
    let labelBottom = H - 4;
    if (P) {
      // inventory below the sign, status between inventory and counter, buttons at the bottom
      const buttons: Box = { x: 8, y: H - 48, w: w - 16, h: 42 };
      const invY = Math.max(top, sign.y + sign.h + 6);
      const inv: Box = { x: 6, y: invY, w: w - 12, h: Math.min(132, standY - 84 - invY) };
      this.panel(inv, 'dark');
      this.buildInventory(inv);
      const free = standY - 84 - (inv.y + inv.h);
      const statY = free >= 30 ? inv.y + inv.h + Math.min(10, free - 26) : buttons.y - 26;
      this.statusLine({ x: 8, y: statY, w: w - 16, h: 22 });
      this.repairButton(8, (free >= 30 ? statY + 26 : statY - 28));
      this.actionButtons(buttons);
      labelBottom = (free >= 30 ? buttons.y : statY) - 4;
    } else {
      // inventory (left shelf) and status + buttons (right shelf); the sign stays free
      const upper = Math.min(standY - 84, H - 160);
      const inv: Box = { x: 8, y: top, w: Math.max(190, sign.x - 14), h: upper - top };
      this.panel(inv, 'dark');
      this.buildInventory(inv);
      const sx = Math.max(inv.x + inv.w + 8, sign.x + sign.w + 6);
      const side: Box = { x: sx, y: top, w: w - 8 - sx, h: inv.h };
      const stat = this.statusLine({ x: side.x, y: side.y, w: side.w });
      stat.style.textAlign = 'left';
      this.repairButton(side.x, side.y + 36);
      const bh = Math.min(84, side.h - 66);
      this.actionButtons({ x: side.x, y: side.y + side.h - bh, w: side.w, h: bh }, true);
    }

    // offers on the counter
    const opts = { software: swIds(run), pasteUses: run.pasteUses };
    const cols = 5;
    const colW = (w - (P ? 8 : 16)) / cols;
    const colX = (i: number) => (P ? 4 : 8) + colW * i + colW / 2;
    const labelH = Math.max(40, labelBottom - frontY);
    const more = labelH >= 90; // room for stat lines under name and price
    const label = (i: number, ...kids: (HTMLElement | string | null)[]) => {
      const el = h('div', { class: 'glass pe counter-tag', style: 'display:flex;flex-direction:column;align-items:center;gap:1px;text-align:center;cursor:pointer;overflow:hidden;padding:2px 3px' }, ...kids);
      placeEl(el, { x: colX(i) - colW / 2 + 3, y: frontY, w: colW - 6, h: labelH });
      el.style.maxHeight = `${labelH}px`;
      el.style.height = 'auto';
      this.dom.append(el);
      return el;
    };
    const stand = (n: Node, i: number, h0: number) => {
      const shadow = new Rect2(colW * 0.5, 3, 0x000000, 0.35);
      shadow.pos(colX(i) - colW * 0.25, standY - 1);
      this.root.add(shadow);
      n.pos(colX(i), standY - h0 / 2);
      this.root.add(n);
    };
    const priceEl = (p: number) => h('div', { class: `t-title shadow ${run.money >= p ? 'c-gold' : 'c-bad'}`, style: 'font-size:11px' }, money(p));
    const soldOut = (i: number) => this.soldOut({ x: colX(i) - colW / 2, y: standY - 60, w: colW, h: 60 });

    shop.hardware.forEach((o, i) => {
      if (!o) return soldOut(i);
      const d = part(o.partId);
      const badge = shopBadge(run.build, o.partId, opts);
      const ic = new ItemCard('card_frame_hardware', d.icon, { tier: d.tier, rgb: !!d.rgb, w: 56, h: 75 });
      stand(ic, i, 75);
      const open = () => this.openHardware(i, badge);
      ic.interactive = { onTap: open, onHover: (inside) => this.hoverLift(ic, inside, partCard(o.partId)) };
      const el = label(
        i,
        h('div', { class: 't-title shadow', style: 'font-size:8px;line-height:1.15' }, partName(o.partId)),
        h('div', { style: 'display:flex;flex-wrap:wrap;gap:0 5px;align-items:center;justify-content:center' }, this.badgeEl(badge), priceEl(o.price)),
        ...(more ? [h('div', { class: 'dim', style: 'font-size:8px' }, t.cat[d.cat]), ...partLines(d).slice(0, labelH >= 130 ? 2 : 1).map((l) => h('div', { style: 'font-size:8px;line-height:1.12' }, l))] : []),
      );
      el.addEventListener('click', open);
    });
    {
      const so = shop.soft;
      if (!so) soldOut(2);
      else {
        const info = this.softInfo(so);
        const ic = new ItemCard(info.frameName, info.icon, { w: 56, h: 75 });
        stand(ic, 2, 75);
        const open = () => this.openSoft(so);
        ic.interactive = { onTap: open, onHover: (inside) => this.hoverLift(ic, inside, info.tipEl()) };
        const el = label(2, h('div', { class: 't-title shadow', style: 'font-size:8px;line-height:1.15' }, info.name), priceEl(so.price), more ? h('div', { style: 'font-size:8px;line-height:1.12' }, info.sub) : h('div', { class: 'dim', style: 'font-size:8px' }, t.ui.software));
        el.addEventListener('click', open);
      }
    }
    shop.packs.forEach((k, j) => {
      const i = 3 + j;
      if (!k) return soldOut(i);
      const sp = new Sprite(`booster_${{ workload: 'workload', driver: 'treiber', tool: 'werkzeug', software: 'software' }[k]}`, { region: 'content' });
      sp.fit(50, 62);
      stand(sp, i, sp.h);
      const open = () => this.openPackOffer(j, k);
      sp.interactive = { onTap: open, onHover: (inside) => this.hoverLift(sp, inside, packCard(k)) };
      const el = label(i, h('div', { class: 't-title shadow', style: 'font-size:8px;line-height:1.15' }, t.packs[k].name), priceEl(PACK_PRICES[k]), more ? h('div', { class: 'dim', style: 'font-size:8px;line-height:1.12' }, t.packs[k].desc) : null);
      el.addEventListener('click', open);
    });
  }

  /** Hover on a counter item: lift it a little and show its tooltip. */
  private hoverLift(n: Node, inside: boolean, tipEl: HTMLElement): void {
    const base = (n as Node & { baseY?: number }).baseY ?? n.y;
    (n as Node & { baseY?: number }).baseY = base;
    void tween(n, { y: inside ? base - 4 : base }, { dur: 0.12, ease: ease.outQuad });
    if (inside) showTip(tipEl, this.rectOf(n), n);
    else hideTip(n);
  }

  private rectOf(n: Node): Box {
    return n.worldRect() ?? { x: 0, y: 0, w: 0, h: 0 };
  }

  private soldOut(box: Box): void {
    const stamp = new Sprite('ui_sold_stamp', { region: 'content' });
    stamp.fit(64, 32).pos(box.x + box.w / 2, box.y + box.h / 2);
    stamp.rot = -0.15;
    this.root.add(stamp);
    const tx = new Text(L().ui.soldOut, { font: 'title', size: 9, align: 'center', valign: 'middle', color: 0xe8432d, shadow: null });
    tx.pos(stamp.x, stamp.y);
    tx.rot = -0.15;
    this.root.add(tx);
  }

  private badgeEl(b: Badge): HTMLElement {
    const t = L();
    const cls = b.status === 'ok' ? 'ok-badge' : b.status === 'warn' ? 'warn-badge' : 'bad-badge';
    const icon = b.status === 'ok' ? 'icon16_kompat_ok' : b.status === 'warn' ? 'icon16_kompat_warn' : 'icon16_kompat_nein';
    const el = h('div', { class: cls }, img(icon, 'i8'), t.badge[b.status]);
    if (b.issue) tip(el, () => issueText(b.issue!));
    return el;
  }

  private softInfo(so: ShopSoft): { frameName: string; icon: string; name: string; sub: string; tipEl: () => HTMLElement } {
    const t = L();
    const run = this.g.run!;
    if (so.kind === 'sw') {
      const d = softwareDef(so.id);
      return {
        frameName: `card_frame_software_${d.rarity.toLowerCase()}`,
        icon: d.icon,
        name: t.software[so.id].name,
        sub: fmt(t.software[so.id].desc, { n: so.id === 'sw10' ? 2 : 0 }),
        tipEl: () => softwareCard(so.id),
      };
    }
    if (so.kind === 'driver') {
      const lv = run.drivers[so.id] ?? 1;
      return {
        frameName: 'card_frame_treiber',
        icon: profileDef(so.id).icon,
        name: fmt(t.driver.name, { p: t.profiles[so.id].name, v: `${lv + 1}.0` }),
        sub: fmt(t.driver.desc, { p: t.profiles[so.id].name, n: lv + 1 }),
        tipEl: () => driverCard(so.id, lv),
      };
    }
    return { frameName: 'card_frame_tool', icon: toolDef(so.id).icon, name: t.tools[so.id].name, sub: t.tools[so.id].desc, tipEl: () => toolCard(so.id) };
  }

  private buildInventory(box: Box): void {
    const run = this.g.run!;
    const t = L();
    const P = this.portrait;
    let y = box.y + 8;
    const x0 = box.x + 8;
    // tools
    const toolsLabel = h('div', { class: 't-title dim', style: 'font-size:7.5px' }, t.ui.tools);
    placeEl(toolsLabel, { x: x0, y });
    this.dom.append(toolsLabel);
    const swLabelX = P ? x0 + 76 : x0;
    const rowY = y + 12;
    for (let i = 0; i < 2; i++) {
      const sx = x0 + 15 + i * 32;
      const slot = new Sprite('ui_slot_empty_tool', { region: 'content' });
      slot.size(28, 28).pos(sx, rowY + 14);
      this.root.add(slot);
      const id = run.tools[i];
      if (id) {
        const ic = new Sprite(toolDef(id).icon, { region: 'content' });
        ic.fit(24, 24).pos(sx, rowY + 14);
        ic.interactive = { onTap: () => openToolSheet(i, () => this.rebuild()), onHover: (inside) => (inside ? showTip(toolCard(id), this.rectOf(ic), ic) : hideTip(ic)), pad: 3 };
        this.root.add(ic);
      }
    }
    // software
    const st = statsOf(run);
    const swY = P ? y : rowY + 34;
    const swLabel = h('div', { class: 't-title dim', style: 'font-size:7.5px' }, `${t.ui.software} ${swSlotsUsed(run)}/${st.swSlots}`);
    placeEl(swLabel, { x: swLabelX, y: swY });
    this.dom.append(swLabel);
    const avail = box.x + box.w - 8 - swLabelX;
    const n = Math.max(1, Math.max(st.swSlots, run.software.length));
    const size = Math.min(30, (avail - 2 * (n - 1)) / n);
    let i = 0;
    for (const s of run.software) {
      const chip = new SwChip(s.id, size);
      chip.pos(swLabelX + size / 2 + i * (size + 2), swY + 12 + size / 2 + 1);
      if (s.id === 'sw10' || s.id === 'sw12') chip.counter.text = `+${s.counter}`;
      const idx = i;
      chip.interactive = {
        onTap: () => this.openOwnedSoftware(s.uid, idx),
        onHover: (inside) => (inside ? showTip(softwareCard(s.id, s), this.rectOf(chip), chip) : hideTip(chip)),
      };
      this.root.add(chip);
      i++;
    }
    for (; i < st.swSlots; i++) {
      const e = new Sprite('ui_slot_empty_software_mini', { region: 'content' });
      e.size(size, size).pos(swLabelX + size / 2 + i * (size + 2), swY + 12 + size / 2 + 1);
      e.alpha = 0.55;
      this.root.add(e);
    }
    // storage
    y = (P ? rowY + 38 : swY + 12 + size + 8);
    const stLabel = h('div', { class: 't-title dim', style: 'font-size:7.5px' }, fmt(t.wb.storageN, { n: run.storage.length }));
    placeEl(stLabel, { x: x0, y });
    this.dom.append(stLabel);
    const slotSize = P ? 40 : Math.min(40, (box.w - 24) / 3);
    for (let k = 0; k < 3; k++) {
      const cx = x0 + slotSize / 2 + k * (slotSize + 6);
      const cy = y + 12 + slotSize / 2;
      const slot = new Sprite('ui_slot_empty_lager', { region: 'content' });
      slot.size(slotSize, slotSize).pos(cx, cy);
      this.root.add(slot);
      const p = run.storage[k];
      if (!p) continue;
      const d = part(p.id);
      const ic = new Sprite(d.icon, { region: 'content' });
      ic.fit(slotSize - 6, slotSize - 6).pos(cx, cy);
      if (d.rgb) ic.mode = 'rgb';
      ic.interactive = { onTap: () => this.openStored(p), onHover: (inside) => (inside ? showTip(partCard(p.id, p), this.rectOf(ic), ic) : hideTip(ic)) };
      this.root.add(ic);
    }
    // installed summary (portrait has room)
    if (P) {
      const sumY = y + 12 + slotSize + 8;
      if (sumY + 30 < box.y + box.h) {
        const parts = installed(run.build).filter((x) => ['cpu', 'gpu', 'ram', 'board'].includes(part(x.inst.id).cat));
        const line = h('div', { style: 'font-size:8.5px;line-height:1.25' }, h('span', { class: 't-title dim', style: 'font-size:7.5px' }, t.ui.yourBuild + ': '), parts.map((x) => partName(x.inst.id)).join(' · '));
        placeEl(line, { x: x0, y: sumY, w: box.w - 16 });
        this.dom.append(line);
      }
    }
  }

  // ------------------------------------------------------------ sheets

  private openHardware(i: number, badge: Badge): void {
    const run = this.g.run!;
    const o = run.shop!.hardware[i];
    if (!o) return;
    const t = L();
    const d = part(o.partId);
    const cur = installed(run.build).filter((x) => part(x.inst.id).cat === d.cat);
    sheet((close) => [
      partCard(o.partId),
      h('div', { style: 'margin-top:4px' }, this.badgeEl(badge), badge.issue ? h('div', { class: badge.status === 'bad' ? 'c-bad' : 'c-warn', style: 'font-size:9.5px' }, issueText(badge.issue)) : null),
      h('div', { style: 'margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,.1)' },
        ...(cur.length
          ? cur.slice(0, 2).map((x) => h('div', { style: 'font-size:9px;opacity:.85;margin-bottom:3px' }, h('div', { class: 'dim' }, fmt(t.shop.compare, { name: partName(x.inst.id) })), ...partLines(part(x.inst.id), x.inst).slice(0, 3).map((l) => h('div', {}, l))))
          : [h('div', { class: 'dim', style: 'font-size:9px' }, t.shop.nothingInstalled)]),
      ),
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        button(`${t.ui.buy} ${money(o.price)}`, () => {
          if (this.buyHw(i)) close();
        }, { color: 'blue', disabled: run.money < o.price }),
        button(t.ui.buyInstall, () => {
          const inst = this.buyHw(i);
          if (inst) {
            close();
            if (this.g.check(goWorkbench(run))) {
              this.g.save();
              this.g.pendingInstall = inst.uid;
              this.g.route();
            }
          }
        }, { color: 'green', disabled: run.money < o.price || badge.status === 'bad' }),
      ),
    ]);
  }

  private buyHw(i: number): PartInst | null {
    const run = this.g.run!;
    const r = buyHardware(run, i);
    if (!this.g.check(r)) return null;
    sfx.cash();
    this.g.save();
    toast(partName(r.inst.id), 'good', 1400);
    this.rebuild();
    return r.inst;
  }

  private openSoft(so: ShopSoft): void {
    const run = this.g.run!;
    const t = L();
    const info = this.softInfo(so);
    const full = so.kind === 'sw' && !softwareDef(so.id).noSlot && freeSwSlots(run) <= 0;
    sheet((close) => [
      info.tipEl(),
      full ? h('div', { class: 'c-warn', style: 'margin-top:4px' }, t.errors.noSwSlot) : null,
      so.kind === 'tool' && run.tools.length >= 2 ? h('div', { class: 'c-warn', style: 'margin-top:4px' }, t.toolUi.full) : null,
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        button(`${t.ui.buy} ${money(so.price)}`, () => {
          if (this.g.check(buySoft(run))) {
            sfx.cash();
            this.g.save();
            close();
            this.rebuild();
          }
        }, { color: 'green', disabled: run.money < so.price }),
      ),
    ]);
  }

  private openOwnedSoftware(uid: number, idx: number): void {
    const run = this.g.run!;
    const s = run.software.find((x) => x.uid === uid);
    if (!s) return;
    const t = L();
    sheet((close) => [
      softwareCard(s.id, s),
      h(
        'div',
        { class: 'actions' },
        button(t.ui.left, () => {
          moveSoftware(run, uid, Math.max(0, idx - 1));
          this.g.save();
          close();
          this.rebuild();
        }, { color: 'gray', disabled: idx === 0 }),
        button(t.ui.right, () => {
          moveSoftware(run, uid, Math.min(run.software.length - 1, idx + 1));
          this.g.save();
          close();
          this.rebuild();
        }, { color: 'gray', disabled: idx >= run.software.length - 1 }),
        button(fmt(t.ui.sellFor, { n: sellValue(s.paid || softwareDef(s.id).price) }), () => {
          if (this.g.check(sellSoftware(run, uid))) {
            sfx.coin();
            this.g.save();
            close();
            this.rebuild();
          }
        }, { color: 'red' }),
        button(t.ui.close, close, { color: 'blue' }),
      ),
    ]);
  }

  private openStored(p: PartInst): void {
    const run = this.g.run!;
    const t = L();
    sheet((close) => [
      partCard(p.id, p),
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        button(fmt(t.ui.sellFor, { n: sellValue(p.paid) }), () => {
          if (this.g.check(sellPart(run, p.uid))) {
            sfx.coin();
            this.g.save();
            close();
            this.rebuild();
          }
        }, { color: 'red' }),
        button(t.ui.install, () => {
          close();
          if (this.g.check(goWorkbench(run))) {
            this.g.pendingInstall = p.uid;
            this.g.save();
            this.g.route();
          }
        }, { color: 'green' }),
      ),
    ]);
  }

  private openPackOffer(i: number, k: PackKind): void {
    const run = this.g.run!;
    const t = L();
    sheet((close) => [
      packCard(k),
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        button(`${t.shop.openPack} ${money(PACK_PRICES[k])}`, () => {
          if (this.g.check(buyPack(run, i))) {
            close();
            this.g.save();
            this.animatePack = true;
            this.rebuild();
          }
        }, { color: 'green', disabled: run.money < PACK_PRICES[k] }),
      ),
    ]);
  }

  /**
   * Pack opening: the booster drops in, shakes, tears open with a flash and
   * the options fly out of it and flip over; then the player picks one.
   */
  private async showPack(animate = true): Promise<void> {
    const run = this.g.run!;
    const pk = run.pack;
    if (!pk) return;
    const t = L();
    const { w, h: H } = this.vp;
    const P = this.portrait;
    this.packLayer?.destroy();
    const layer = new Node();
    layer.z = 100;
    this.packLayer = layer;
    this.root.add(layer);
    const panelH = P ? 300 : 250;
    const dim = new Sprite('ui_panel_dark', { region: 'content', ax: 0, ay: 0, nine: 7.5, nineScale: 0.8 });
    dim.size(w - 12, panelH).pos(6, (H - panelH) / 2);
    layer.add(dim);
    const cx = w / 2;
    const cy = H / 2 - 20;
    const gone = () => layer.destroyed || this.packLayer !== layer;
    if (animate) {
      dim.alpha = 0;
      void tween(dim, { alpha: 1 }, { dur: 0.15 });
      // 1. booster drops in
      const pack = new Sprite(`booster_${{ workload: 'workload', driver: 'treiber', tool: 'werkzeug', software: 'software' }[pk.kind]}`, { region: 'content' });
      pack.fit(84, 104).pos(cx, cy - 60);
      pack.scale(0.4);
      pack.alpha = 0;
      layer.add(pack);
      await tween(pack, { y: cy, sx: 1, sy: 1, alpha: 1 }, { dur: 0.3, ease: ease.outBack });
      if (gone()) return;
      // 2. shake with growing force
      sfx.pack();
      const shake = { k: 0 };
      pack.tick = () => {
        const tt = performance.now() / 1000;
        pack.rot = Math.sin(tt * 38) * 0.12 * shake.k;
        pack.x = cx + Math.sin(tt * 53) * 3 * shake.k;
      };
      await tween(shake, { k: 1 }, { dur: 0.45, ease: ease.inQuad });
      if (gone()) return;
      this.g.fx.sparks(cx, cy - 30, 6, 0xffd23f, 70);
      // 3. tear open: flash, rip effect, sparks
      pack.tick = null;
      const flash = new Rect2(w + 40, H + 40, 0xffffff, 0.75);
      flash.pos(-20, -20);
      flash.z = 300;
      layer.add(flash);
      void tween(flash, { alpha: 0 }, { dur: 0.35 }).then(() => flash.destroy());
      void tween(pack, { sx: 1.35, sy: 1.35, alpha: 0 }, { dur: 0.18 }).then(() => pack.destroy());
      const rip = this.g.fx.oneShot('fx_pack_open', cx, cy - 10, { fps: 14, scale: 2.6 });
      rip.z = 200;
      this.g.engine.shake(2.5, 0.2);
      this.g.fx.sparks(cx, cy, 16, 0xffd23f, 160);
      this.g.fx.sparks(cx, cy, 10, 0xf4f4fa, 120);
      this.g.fx.confetti(cx, cy, 14, 160);
      await wait(0.3);
      if (gone()) return;
    }
    const title = h('div', { class: 't-title shadow c-gold', style: 'font-size:12px;text-align:center;z-index:6' }, `${t.packs[pk.kind].name} · ${t.shop.packTitle}`);
    placeEl(title, { x: 10, y: dim.y + 8, w: w - 20 });
    this.dom.append(title);
    const n = pk.options.length;
    const step = Math.min(110, (w - 40) / n);
    const nodes: Node[] = [];
    // 4. options fly out of the pack and flip over (scale x 0 → 1)
    const flights = pk.options.map((o, i) => {
      const x = cx + (i - (n - 1) / 2) * step;
      const node = this.optionNode(o);
      node.pos(cx, cy);
      nodes.push(node);
      layer.add(node);
      node.interactive = {
        onTap: () => this.pickOption(i),
        onHover: (inside) => (inside ? showTip(this.optionInfo(o), this.rectOf(node), node) : hideTip(node)),
      };
      if (!animate) {
        node.pos(x, cy).scale(1.25);
        return Promise.resolve();
      }
      node.sx = 0.05;
      node.sy = 0.5;
      node.alpha = 0;
      const delay = i * 0.12;
      window.setTimeout(() => sfx.deal(i), delay * 1000);
      return tween(node, { x, y: cy - 14, sy: 1.1, alpha: 1 }, { dur: 0.28, delay, ease: ease.outQuad })
        .then(() => tween(node, { y: cy, sx: 1.25, sy: 1.25 }, { dur: 0.22, ease: ease.outBack }));
    });
    await Promise.all(flights);
    if (gone()) return;
    pk.options.forEach((o, i) => {
      const x = cx + (i - (n - 1) / 2) * step;
      const lab = h('div', { class: 'pe', style: 'font-size:9px;text-align:center;line-height:1.15;z-index:6;cursor:pointer' }, this.optionLabel(o));
      lab.addEventListener('click', () => this.pickOption(i));
      placeEl(lab, { x: x - step / 2 + 4, y: cy + 52, w: step - 8 });
      this.dom.append(lab);
    });
    const skip = button(t.ui.skip, () => this.pickOption(null), { color: 'gray' });
    skip.style.zIndex = '6';
    placeEl(skip, { x: w / 2 - 50, y: dim.y + dim.h - 40, w: 100 });
    this.dom.append(skip);
    void nodes;
  }

  private pickOption(i: number | null): void {
    const run = this.g.run!;
    if (!this.g.check(choosePack(run, i))) return;
    if (i !== null) sfx.coin();
    hideTip();
    this.g.save();
    this.rebuild();
  }

  private optionNode(o: PackOption): Node {
    switch (o.kind) {
      case 'card': {
        const cv = new CardView({ id: -1, type: o.type, level: o.level, enh: o.enh });
        cv.setShowName(this.vp.s >= 1.5);
        return cv;
      }
      case 'driver':
        return new ItemCard('card_frame_treiber', profileDef(o.id).icon);
      case 'tool':
        return new ItemCard('card_frame_tool', toolDef(o.id).icon);
      case 'sw': {
        const d = softwareDef(o.id);
        return new ItemCard(`card_frame_software_${d.rarity.toLowerCase()}`, d.icon);
      }
    }
  }

  private optionLabel(o: PackOption): string {
    const t = L();
    switch (o.kind) {
      case 'card':
        return `${t.cardTypes[o.type]} ${o.level}${o.enh ? ' · ' + t.enh[o.enh].name : ''}`;
      case 'driver':
        return fmt(t.driver.name, { p: t.profiles[o.id].name, v: `${(this.g.run!.drivers[o.id] ?? 1) + 1}.0` });
      case 'tool':
        return t.tools[o.id].name;
      case 'sw':
        return t.software[o.id].name;
    }
  }

  private optionInfo(o: PackOption): HTMLElement {
    switch (o.kind) {
      case 'card':
        return cardCard({ id: -1, type: o.type, level: o.level, enh: o.enh });
      case 'driver':
        return driverCard(o.id, this.g.run!.drivers[o.id] ?? 1);
      case 'tool':
        return toolCard(o.id);
      case 'sw':
        return softwareCard(o.id);
    }
  }

  refresh(): void {
    this.rebuild();
  }
}
