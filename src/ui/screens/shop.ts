import { BaseScreen, placeEl, type Box } from './base';
import { Node, Sprite, Text } from '../../render/scene';
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
    const { w, h: H } = this.vp;
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

    // regions
    let hw: Box[];
    let soft: Box;
    let packs: Box;
    let inv: Box;
    let status: Box;
    const buttons: Box = { x: 8, y: H - 48, w: w - 16, h: 42 };
    if (P) {
      const top = 40;
      const tileW = (w - 20) / 2;
      hw = [
        { x: 6, y: top, w: tileW, h: 100 },
        { x: 14 + tileW, y: top, w: tileW, h: 100 },
      ];
      soft = { x: 6, y: top + 108, w: tileW, h: 100 };
      packs = { x: 14 + tileW, y: top + 108, w: tileW, h: 100 };
      inv = { x: 6, y: top + 216, w: w - 12, h: 132 };
      status = { x: 8, y: H - 48 - 26, w: w - 16, h: 22 };
    } else {
      const colW = (w - 32) / 3;
      hw = [
        { x: 8, y: 34, w: colW, h: 108 },
        { x: 8, y: 148, w: colW, h: 108 },
      ];
      soft = { x: 16 + colW, y: 34, w: colW, h: 108 };
      packs = { x: 16 + colW, y: 148, w: colW, h: 108 };
      inv = { x: 24 + colW * 2, y: 34, w: colW, h: 222 };
      status = { x: 8, y: H - 48 - 46, w: w - 16, h: 22 };
    }
    const opts = { software: swIds(run), pasteUses: run.pasteUses };

    // hardware offers
    shop.hardware.forEach((o, i) => {
      const box = hw[i]!;
      this.panel(box, 'dark');
      const label = h('div', { class: 't-title dim', style: 'font-size:7.5px' }, t.ui.hardware);
      placeEl(label, { x: box.x + 7, y: box.y + 4 });
      this.dom.append(label);
      if (!o) {
        this.soldOut(box);
        return;
      }
      const d = part(o.partId);
      const badge = shopBadge(run.build, o.partId, opts);
      const cardBox = { x: box.x + 8 + 30, y: box.y + box.h / 2 + 4 };
      const ic = new ItemCard('card_frame_hardware', d.icon, { tier: d.tier, rgb: !!d.rgb, w: 56, h: 75 });
      ic.pos(cardBox.x, cardBox.y);
      this.root.add(ic);
      this.idle(ic, i);
      const open = () => this.openHardware(i, badge);
      ic.interactive = { onTap: open, onHover: (inside) => (inside ? showTip(partCard(o.partId), this.rectOf(ic), ic) : hideTip(ic)) };
      const lines = partLines(d).slice(0, 2);
      const txt = h(
        'div',
        { class: 'pe', style: 'display:flex;flex-direction:column;gap:1px;font-size:9px;line-height:1.1;cursor:pointer' },
        h('div', { class: 't-title shadow', style: 'font-size:8.5px;line-height:1.15' }, partName(o.partId)),
        h('div', { class: 'dim', style: 'font-size:8px' }, t.cat[d.cat]),
        ...lines.map((l) => h('div', { style: 'font-size:8.5px' }, l)),
        this.badgeEl(badge),
        h('div', { class: `t-title ${run.money >= o.price ? 'c-gold' : 'c-bad'}`, style: 'font-size:11px;margin-top:1px' }, money(o.price)),
      );
      txt.addEventListener('click', open);
      placeEl(txt, { x: box.x + 72, y: box.y + 14, w: box.w - 78, h: box.h - 18 });
      txt.style.overflow = 'hidden';
      this.dom.append(txt);
    });

    // software shelf
    this.panel(soft, 'dark');
    {
      const label = h('div', { class: 't-title dim', style: 'font-size:7.5px' }, t.ui.software);
      placeEl(label, { x: soft.x + 7, y: soft.y + 4 });
      this.dom.append(label);
      const so = shop.soft;
      if (!so) this.soldOut(soft);
      else {
        const { frameName, icon, name, sub, tipEl } = this.softInfo(so);
        const ic = new ItemCard(frameName, icon, { w: 56, h: 75 });
        ic.pos(soft.x + 38, soft.y + soft.h / 2 + 4);
        this.root.add(ic);
        this.idle(ic, 3);
        const open = () => this.openSoft(so);
        ic.interactive = { onTap: open, onHover: (inside) => (inside ? showTip(tipEl(), this.rectOf(ic), ic) : hideTip(ic)) };
        const txt = h(
          'div',
          { class: 'pe', style: 'display:flex;flex-direction:column;gap:1px;cursor:pointer' },
          h('div', { class: 't-title shadow', style: 'font-size:8.5px' }, name),
          h('div', { style: 'font-size:8.5px;line-height:1.12' }, sub),
          h('div', { class: `t-title ${run.money >= so.price ? 'c-gold' : 'c-bad'}`, style: 'font-size:11px;margin-top:1px' }, money(so.price)),
        );
        txt.addEventListener('click', open);
        placeEl(txt, { x: soft.x + 72, y: soft.y + 14, w: soft.w - 78, h: soft.h - 18 });
        txt.style.overflow = 'hidden';
        this.dom.append(txt);
      }
    }

    // packs
    this.panel(packs, 'dark');
    {
      const label = h('div', { class: 't-title dim', style: 'font-size:7.5px' }, t.ui.offers);
      placeEl(label, { x: packs.x + 7, y: packs.y + 4 });
      this.dom.append(label);
      shop.packs.forEach((k, i) => {
        const cx = packs.x + packs.w * (i === 0 ? 0.28 : 0.72);
        const cy = packs.y + packs.h / 2 - 2;
        if (!k) {
          const s = h('div', { class: 't-title dim', style: 'font-size:8px;text-align:center' }, t.ui.soldOut);
          placeEl(s, { x: cx - 30, y: cy - 4, w: 60 });
          this.dom.append(s);
          return;
        }
        const sp = new Sprite(`booster_${{ workload: 'workload', driver: 'treiber', tool: 'werkzeug', software: 'software' }[k]}`, { region: 'content' });
        sp.fit(46, 56).pos(cx, cy);
        this.root.add(sp);
        this.idle(sp, 5 + i);
        sp.interactive = { onTap: () => this.openPackOffer(i, k), onHover: (inside) => (inside ? showTip(packCard(k), this.rectOf(sp), sp) : hideTip(sp)) };
        const price = h('div', { class: `t-title shadow ${run.money >= PACK_PRICES[k] ? 'c-gold' : 'c-bad'}`, style: 'font-size:10px;text-align:center' }, money(PACK_PRICES[k]));
        placeEl(price, { x: cx - 30, y: cy + 30, w: 60 });
        this.dom.append(price);
      });
    }

    // inventory: tools, software, storage
    this.panel(inv, 'dark');
    this.buildInventory(inv);

    // status
    const st = statsOf(run);
    const stat = h('div', { class: 'glass', style: 'font-size:9px;padding:3px 6px;text-align:center' }, fmt(t.shop.statusLine, { cores: st.cores, hand: st.handSize, tdp: st.tdp, watt: st.watt, cool: st.cooling, sw: swSlotsUsed(run), slots: st.swSlots }));
    placeEl(stat, status);
    this.dom.append(stat);

    // repair
    const broken = brokenParts(run);
    if (broken.length) {
      const p = broken[0]!;
      const rb = button([img('icon16_werkbank'), fmt(t.ui.repair, { n: repairCost() })], () => {
        if (g.check(repairPart(run, p.uid))) {
          sfx.cash();
          g.save();
          this.rebuild();
        }
      }, { color: 'blue', cls: 'small' });
      placeEl(rb, { x: status.x, y: status.y - 28 });
      tip(rb, () => partCard(p.id, p));
      this.dom.append(rb);
    }

    // buttons
    const row = h('div', { style: 'display:flex;gap:6px;height:100%' });
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

  private rectOf(n: Node): Box {
    return n.worldRect() ?? { x: 0, y: 0, w: 0, h: 0 };
  }

  private idle(n: Node, i: number): void {
    const by = n.y;
    n.tick = () => {
      n.y = by + Math.sin(performance.now() / 600 + i * 1.3) * 1.2;
    };
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

  /** Pack opening: animation, then choose one option. */
  private async showPack(animate = true): Promise<void> {
    const run = this.g.run!;
    const pk = run.pack;
    if (!pk) return;
    const t = L();
    const { w, h: H } = this.vp;
    this.packLayer?.destroy();
    const layer = new Node();
    layer.z = 100;
    this.packLayer = layer;
    this.root.add(layer);
    const dim = new Sprite('ui_panel_dark', { region: 'content', ax: 0, ay: 0, nine: 7.5, nineScale: 0.8 });
    dim.size(w - 12, this.portrait ? 300 : 250).pos(6, (H - (this.portrait ? 300 : 250)) / 2);
    layer.add(dim);
    const cx = w / 2;
    const cy = H / 2 - 20;
    if (animate) {
      const fxs = this.g.fx.oneShot('fx_pack_open', cx, cy - 10, { fps: 12, scale: 2.6 });
      fxs.z = 200;
      sfx.pack();
      await wait(0.55);
    }
    const title = h('div', { class: 't-title shadow c-gold', style: 'font-size:12px;text-align:center;z-index:6' }, `${t.packs[pk.kind].name} · ${t.shop.packTitle}`);
    placeEl(title, { x: 10, y: dim.y + 8, w: w - 20 });
    this.dom.append(title);
    const n = pk.options.length;
    const step = Math.min(110, (w - 40) / n);
    pk.options.forEach((o, i) => {
      const x = cx + (i - (n - 1) / 2) * step;
      const y = cy;
      const node = this.optionNode(o);
      node.pos(cx, cy);
      node.scale(0.3);
      node.alpha = 0;
      layer.add(node);
      void tween(node, { x, y, sx: 1.25, sy: 1.25, alpha: 1 }, { dur: 0.35, delay: i * 0.08, ease: ease.outBack });
      node.interactive = {
        onTap: () => this.pickOption(i),
        onHover: (inside) => (inside ? showTip(this.optionInfo(o), this.rectOf(node), node) : hideTip(node)),
      };
      const lab = h('div', { class: 'pe', style: 'font-size:9px;text-align:center;line-height:1.15;z-index:6;cursor:pointer' }, this.optionLabel(o));
      lab.addEventListener('click', () => this.pickOption(i));
      placeEl(lab, { x: x - step / 2 + 4, y: y + 52, w: step - 8 });
      this.dom.append(lab);
    });
    const skip = button(t.ui.skip, () => this.pickOption(null), { color: 'gray' });
    skip.style.zIndex = '6';
    placeEl(skip, { x: w / 2 - 50, y: dim.y + dim.h - 40, w: 100 });
    this.dom.append(skip);
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
