import { BaseScreen, placeEl, type Box } from './base';
import { Node, Sprite, Text, Rect2 } from '../../render/scene';
import { CARD_H, CARD_W, CardView } from '../../view/cards';
import { HwChip, Odometer, ScoreBar, SwChip, Thermo, ValueBox, heatColor } from '../../view/hud';
import { HeatShimmer } from '../../render/fx';
import { openProfileHelp } from '../profileSheet';
import { button, h, hideTip, img, sheet, showTip, tip, toast } from '../dom';
import { L, big, fmt, num } from '../../i18n';
import {
  activeSoftware,
  card,
  discardCards,
  playCards,
  previewPlay,
  reorderHand,
  requiredCards,
  sortHand,
  statsOf,
  useTool,
  type PlayOutcome,
} from '../../core/run';
import { bossDef, toolDef } from '../../core/data/content';
import { part, partOf } from '../../core/data/hardware';
import { caseOf, coolerOf, cpuOf, drives, exps, fans, gpuInst, ramKits } from '../../core/build';
import { cardCard, partCard, partName, profileName, softwareCard, toolCard, bossCard } from '../describe';
import { ease, tween, wait } from '../../render/tween';
import { sfx } from '../../audio/sfx';
import { openSettings } from '../settings';
import { openDeck } from '../deckSheet';
import type { Src, ScoreEvent } from '../../core/scoring';
import type { BossId, CardType, ProfileId } from '../../core/types';
import { CARD_TYPES } from '../../core/types';
import { isFinaleGen } from '../../core/difficulty';

interface Lay {
  header: Box;
  status: Box;
  sw: Box;
  tools: Box;
  profile: Box;
  hw: Box;
  play: Box;
  preview: Box;
  hand: Box;
  buttons: Box;
  deck: { x: number; y: number };
  thermo: { x: number; y: number; vertical: boolean; len: number };
  boxes: { y: number; x: number; vertical: boolean };
  twoRows: boolean;
}

export class BenchScreen extends BaseScreen {
  private lay!: Lay;
  private cards = new Map<number, CardView>();
  private selected: number[] = [];
  private busy = false;
  private handLayer = new Node();
  private playLayer = new Node();
  private hudLayer = new Node();
  private thermo!: Thermo;
  private lBox!: ValueBox;
  private tBox!: ValueBox;
  private scoreBar!: ScoreBar;
  private hwChips = new Map<string, HwChip>();
  private hwPartIds = new Map<number, string>();
  private swChips = new Map<number, SwChip>();
  private profileText!: Text;
  private deckCount!: Text;
  private deckPile!: Sprite;
  private els: Record<string, HTMLElement> = {};
  private shownScore = 0;
  private dragging: CardView | null = null;
  private enterAnim = true;
  private bossIcon: Sprite | null = null;
  private shimmer: HeatShimmer | null = null;
  private odo = new Odometer(big);
  private zoomLayer = new Node();
  private zoom: { cv: CardView; src: CardView; long: boolean } | null = null;
  private lastProfile = '';
  /** scale of cards in the play area */
  private playK = 1;
  /** card ids of the profile in the current play */
  private profileIds: number[] = [];

  override enter(): void {
    super.enter();
    const b = this.g.run!.bench!;
    this.shownScore = b.score;
    if (this.enterAnim && b.plays === 0) void this.introAnim();
  }

  override exit(): void {
    super.exit();
    sfx.fan(0);
    this.g.bg.setHeat(0);
  }

  private computeLayout(): Lay {
    const { w, h: H } = this.vp;
    const b = this.g.run!.bench!;
    if (this.portrait) {
      // from 9 cards: two rows, so every card keeps a hit width of at least 36 px (GDD 18.3)
      const twoRows = Math.max(b.hand.length, b.handSize) >= 9;
      const handH = twoRows ? 150 : 118;
      const buttons = { x: 6, y: H - 50, w: w - 12, h: 44 };
      const hand = { x: 4, y: buttons.y - handH - 2, w: w - 8, h: handH };
      const preview = { x: 6, y: hand.y - 18, w: w - 12, h: 16 };
      const swSize = 36;
      return {
        header: { x: 0, y: 0, w, h: 46 },
        status: { x: 4, y: 48, w: w - 8, h: 22 },
        sw: { x: 6, y: 74, w: w - 76, h: swSize },
        tools: { x: w - 68, y: 78, w: 62, h: 28 },
        profile: { x: 0, y: 114, w, h: 54 },
        hw: { x: 4, y: 172, w: w - 8, h: 32 },
        play: { x: 4, y: 208, w: w - 8, h: preview.y - 208 - 2 },
        preview,
        hand,
        buttons,
        deck: { x: w - 22, y: hand.y - 6 },
        thermo: { x: w / 2 + 6, y: 59, vertical: false, len: 112 },
        boxes: { x: w / 2, y: 151, vertical: false },
        twoRows,
      };
    }
    const left = 150;
    const right = 70;
    const mid = { x: left, w: w - left - right };
    const buttons = { x: mid.x + 4, y: H - 42, w: mid.w - 8, h: 38 };
    const hand = { x: mid.x, y: buttons.y - 84, w: mid.w, h: 82 };
    const preview = { x: mid.x + 4, y: hand.y - 15, w: mid.w - 8, h: 14 };
    return {
      header: { x: 0, y: 0, w: left, h: 120 },
      status: { x: 4, y: H - 104, w: left - 8, h: 40 },
      sw: { x: mid.x + 4, y: 4, w: mid.w - 8, h: 38 },
      tools: { x: w - right + 4, y: 6, w: right - 8, h: 30 },
      profile: { x: 0, y: 124, w: left, h: 90 },
      hw: { x: mid.x + 4, y: 46, w: mid.w - 8, h: 30 },
      play: { x: mid.x, y: 80, w: mid.w, h: preview.y - 80 },
      preview,
      hand,
      buttons,
      deck: { x: w - right / 2, y: H - 34 },
      thermo: { x: w - right / 2, y: 120, vertical: true, len: 104 },
      boxes: { x: left / 2, y: 175, vertical: true },
      twoRows: false,
    };
  }

  build(): void {
    const g = this.g;
    const run = g.run!;
    const b = run.bench!;
    g.setBg('pcb');
    this.lay = this.computeLayout();
    const lay = this.lay;
    const t = L();
    this.cards.clear();
    this.hwChips.clear();
    this.hwPartIds.clear();
    this.swChips.clear();
    this.els = {};
    this.handLayer = new Node();
    this.playLayer = new Node();
    this.hudLayer = new Node();
    this.zoomLayer = new Node();
    if (this.zoom) hideTip(this.zoom.cv);
    this.zoom = null;
    this.lastProfile = '';
    // heat shimmer over the table, below everything else (covers the whole window like the background)
    const vp = this.vp;
    this.shimmer = new HeatShimmer({ x: -vp.ox, y: -vp.oy, w: vp.fullW, h: vp.fullH });
    this.shimmer.z = -10;
    this.root.add(this.shimmer);
    this.root.add(this.hudLayer);
    this.root.add(this.playLayer);
    this.root.add(this.handLayer);
    this.root.add(this.zoomLayer);
    this.handLayer.z = 5;
    this.playLayer.z = 4;
    this.zoomLayer.z = 60;

    // ---------------------------------------------------------- header
    const benchName = b.boss ? t.bosses[b.boss].name : b.kind === 'office' ? t.bench.office : t.bench.gaming;
    const iconName = b.boss ? bossDef(b.boss).icon : `bench_${b.kind}`;
    this.bossIcon = new Sprite(iconName, { region: 'content' });
    this.bossIcon.fit(30, 30);
    this.hudLayer.add(this.bossIcon);
    this.bossIcon.interactive = {
      onTap: () => b.boss && sheet((close) => [bossCard(b.boss!), h('div', { class: 'actions' }, button(t.ui.close, close, { color: 'blue' }))]),
      onHover: (inside) => (inside && b.boss ? showTip(bossCard(b.boss), this.rectOf(this.bossIcon!), this.bossIcon) : hideTip(this.bossIcon)),
      pad: 4,
    };
    const title = h('div', { class: 't-title shadow', style: 'font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, `${t.stat.gen} ${run.gen} · ${benchName.toUpperCase()}`);
    const moneyNum = h('span', { class: 'wallet-n' }, num(run.money));
    const money$ = h('div', { class: this.portrait ? 'wallet compact' : 'wallet' }, img('icon16_geld', 'wallet-ic'), moneyNum);
    this.els.money = money$;
    this.shownMoney = run.money;
    tip(money$, () => t.tips.money);
    const menu = button('', () => openSettings({ inRun: true }), { color: 'gray', cls: 'iconbtn hit44', icon: 'icon16_einstellungen', title: t.ui.settings });
    const combos = button('', () => openProfileHelp((this.lastProfile.split(':')[0] ?? '') as ProfileId | ''), { color: 'gray', cls: 'iconbtn hit44', icon: 'icon16_info', title: t.profileHelpUi.title });
    combos.setAttribute('aria-label', t.profileHelpUi.title);
    const target = h('div', { class: 'shadow', style: 'font-size:10px;white-space:nowrap' }, img('icon16_leistung'), ` ${t.stat.target} `, h('b', { class: 't-title', style: 'font-weight:400' }, big(b.target)));
    this.odo = new Odometer(big);
    this.odo.set(this.shownScore, false);
    const score = h('div', { class: 't-title shadow', style: 'font-size:13px;text-align:right' }, this.odo.el);
    if (this.shownScore >= b.target) score.classList.add('c-ok');
    this.els.score = score;
    // portrait: the bar starts after the (measured) target text, so long targets never run into it
    let barX = 42 + 82;
    let barLen = 132;
    if (this.portrait) {
      placeEl(target, { x: 42, y: 25 });
      this.dom.append(target);
      const barEnd = barX + Math.max(60, lay.header.w - 290);
      barX = 42 + Math.max(82, target.offsetWidth + 8);
      barLen = Math.max(40, barEnd - barX);
    }
    this.scoreBar = new ScoreBar(barLen);
    this.scoreBar.k = this.shownScore / b.target;
    this.hudLayer.add(this.scoreBar);

    if (this.portrait) {
      this.bossIcon.pos(22, 22);
      placeEl(title, { x: 42, y: 5, w: lay.header.w - 200 });
      placeEl(money$, { x: lay.header.w - 150, y: 2, h: 28 });
      placeEl(combos, { x: lay.header.w - 76, y: 4 });
      placeEl(menu, { x: lay.header.w - 36, y: 4 });
      this.scoreBar.pos(barX + this.scoreBar.length / 2, 32);
      placeEl(score, { x: lay.header.w - 164, y: 30, w: 84 });
    } else {
      this.bossIcon.pos(20, 20);
      placeEl(title, { x: 38, y: 6, w: 108 });
      title.style.whiteSpace = 'normal';
      title.style.fontSize = '9.5px';
      placeEl(target, { x: 6, y: 42 });
      this.scoreBar.pos(75, 62);
      placeEl(score, { x: 6, y: 70, w: 138 });
      score.style.textAlign = 'center';
      score.style.fontSize = '15px';
      placeEl(money$, { x: 6, y: this.vp.h - 38, h: 32 });
      placeEl(combos, { x: 72, y: this.vp.h - 38 });
      placeEl(menu, { x: 112, y: this.vp.h - 38 });
    }
    this.dom.append(title, money$, combos, menu, target, score);
    // a long boss name never ends in an ellipsis: drop the generation prefix, then tighten the spacing
    if (this.portrait && title.scrollWidth > title.clientWidth + 1) {
      title.textContent = benchName.toUpperCase();
      if (title.scrollWidth > title.clientWidth + 1) title.style.letterSpacing = '-0.4px';
    }

    // ---------------------------------------------------------- status
    const st = statsOf(run);
    const hands = h('span', { class: 'chip shadow', style: 'font-size:10px' }, img('icon16_durchlauf'), h('b', { class: 't-title', style: 'font-weight:400' }, String(b.hands)));
    const discards = h('span', { class: 'chip shadow', style: 'font-size:10px' }, img('icon16_neuprio'), h('b', { class: 't-title', style: 'font-weight:400' }, String(b.discards)));
    tip(hands, () => t.tips.hands);
    tip(discards, () => t.tips.discards);
    this.els.hands = hands;
    this.els.discards = discards;
    const watt = h('span', { class: 'chip shadow', style: 'font-size:9.5px' }, img('icon8_watt', 'i8'), `${st.tdp} W`);
    tip(watt, () => `${t.tips.watt} ${st.tdp}/${st.watt} W`);
    const statusBox = h('div', { style: 'display:flex;gap:4px;align-items:center;flex-wrap:wrap' }, hands, discards);
    this.thermo = new Thermo(lay.thermo.vertical, lay.thermo.len);
    this.thermo.set(b.temp, true);
    this.thermo.pos(lay.thermo.x, lay.thermo.y);
    if (!lay.thermo.vertical) this.thermo.x = lay.status.x + 70 + lay.thermo.len / 2;
    this.hudLayer.add(this.thermo);
    this.thermo.interactive = {
      onHover: (inside) => (inside ? showTip(t.tips.heat, this.rectOf(this.thermo), this.thermo) : hideTip(this.thermo)),
      onTap: () => showTip(t.tips.heat, this.rectOf(this.thermo), this.thermo),
    };
    this.thermo.hit = lay.thermo.vertical ? { x: -15, y: -55, w: 30, h: 120 } : { x: -lay.thermo.len / 2, y: -10, w: lay.thermo.len + 40, h: 20 };
    if (this.portrait) {
      placeEl(statusBox, { x: lay.status.x, y: lay.status.y, w: 70 });
      placeEl(watt, { x: lay.status.w - 56, y: lay.status.y + 2 });
    } else {
      placeEl(statusBox, { x: 6, y: lay.status.y + 4, w: 140 });
      placeEl(watt, { x: this.vp.w - 66, y: lay.thermo.y + 72 });
    }
    this.dom.append(statusBox, watt);

    // ---------------------------------------------------------- software & tools
    this.buildSoftwareBar();
    this.buildTools();

    // ---------------------------------------------------------- profile & boxes
    this.profileText = new Text('', { font: 'title', size: 11, align: 'center', valign: 'middle', color: 0xffe28a });
    this.lBox = new ValueBox('perf', this.portrait ? 96 : 116);
    this.tBox = new ValueBox('clock', this.portrait ? 96 : 116);
    const times = new Text('×', { font: 'title', size: 14, align: 'center', valign: 'middle', color: 0xe8432d });
    if (lay.boxes.vertical) {
      this.profileText.pos(lay.boxes.x, lay.profile.y + 8);
      this.lBox.pos(lay.boxes.x, lay.profile.y + 22 + this.lBox.h / 2);
      times.pos(lay.boxes.x, this.lBox.y + this.lBox.h / 2 + 7);
      this.tBox.pos(lay.boxes.x, times.y + 7 + this.tBox.h / 2);
      this.profileText.maxWidth = 140;
    } else {
      this.profileText.pos(lay.boxes.x, lay.profile.y + 8);
      this.lBox.pos(lay.boxes.x - this.lBox.w / 2 - 10, lay.boxes.y);
      times.pos(lay.boxes.x, lay.boxes.y);
      this.tBox.pos(lay.boxes.x + this.tBox.w / 2 + 10, lay.boxes.y);
    }
    this.lBox.interactive = { onHover: (i) => (i ? showTip(t.tips.perf, this.rectOf(this.lBox), this.lBox) : hideTip(this.lBox)) };
    this.tBox.interactive = { onHover: (i) => (i ? showTip(t.tips.clock, this.rectOf(this.tBox), this.tBox) : hideTip(this.tBox)) };
    this.hudLayer.add(this.profileText);
    this.hudLayer.add(this.lBox);
    this.hudLayer.add(times);
    this.hudLayer.add(this.tBox);

    // ---------------------------------------------------------- hardware bar
    this.buildHwBar();

    // ---------------------------------------------------------- preview line
    const preview = h('div', { class: 'shadow', style: 'font-size:10px;text-align:center;white-space:nowrap' });
    placeEl(preview, lay.preview);
    this.els.preview = preview;
    this.dom.append(preview);

    // ---------------------------------------------------------- deck pile
    this.deckPile = new Sprite('card_back', { region: 'content' });
    this.deckPile.size(CARD_W * 0.5, CARD_H * 0.5).pos(lay.deck.x, lay.deck.y);
    this.hudLayer.add(this.deckPile);
    this.deckCount = new Text('', { font: 'title', size: 9.5, align: 'center', valign: 'middle' });
    this.deckCount.pos(lay.deck.x, lay.deck.y + 22);
    this.hudLayer.add(this.deckCount);
    this.deckPile.interactive = { onTap: () => openDeck(), onHover: (i) => (i ? showTip(t.tips.deck, this.rectOf(this.deckPile), this.deckPile) : hideTip(this.deckPile)), pad: 6 };

    // ---------------------------------------------------------- buttons
    const btnRow = h('div', { style: 'display:flex;gap:6px;align-items:stretch;height:100%' });
    const discardBtn = button([t.ui.discard, h('span', { class: 'badge-n' }, String(b.discards))], () => void this.doDiscard(), { color: 'red', cls: 'big' });
    discardBtn.style.flex = '1.2';
    // one 44 px sort button: each tap sorts by the shown criterion, then offers the other one
    const sortLab = (by: 'level' | 'type') => (by === 'level' ? t.ui.sortLevel : t.ui.sortType);
    const sortIc = (by: 'level' | 'type') => (by === 'level' ? 'icon16_sortieren_stufe' : 'icon16_sortieren_typ');
    const sortBtn = button('', () => {
      const by = this.sortToggle === 'level' ? 'type' : 'level';
      this.sortToggle = by;
      this.doSort(by);
      setSortLabel();
    }, { color: 'gray', cls: 'sortbtn' });
    const setSortLabel = () => {
      const next = this.sortToggle === 'level' ? 'type' : 'level';
      sortBtn.innerHTML = '';
      sortBtn.append(img(sortIc(next), 'ic'), h('span', {}, sortLab(next)));
    };
    setSortLabel();
    const sortBox = sortBtn;
    const playBtn = button([t.ui.play, h('span', { class: 'badge-n' }, String(b.hands))], () => void this.doPlay(), { color: 'green', cls: 'big' });
    playBtn.style.flex = '1.4';
    if (g.settings.lefty) btnRow.append(playBtn, sortBox, discardBtn);
    else btnRow.append(discardBtn, sortBox, playBtn);
    placeEl(btnRow, lay.buttons);
    this.els.play = playBtn;
    this.els.discardBtn = discardBtn;
    this.els.sortBtn = sortBtn;
    this.dom.append(btnRow);


    // ---------------------------------------------------------- hand
    for (const id of b.hand) this.makeCard(id, this.handLayer);
    this.layoutHand(true);
    this.refreshHud();
  }

  private rectOf(n: Node): Box {
    return n.worldRect() ?? { x: 0, y: 0, w: 0, h: 0 };
  }

  // ------------------------------------------------------------ card zoom (hover / long-press)

  /** Enlarged copy of a hand card in the (empty) play area, with the tooltip next to it. */
  private showZoom(src: CardView, long: boolean): void {
    if (this.busy) return;
    this.hideZoom();
    const lay = this.lay;
    const p = this.portrait;
    const k = p ? Math.min(2.4, (lay.play.h - 44) / CARD_H) : Math.min(2.1, (lay.play.h - 6) / CARD_H);
    const zw = CARD_W * k;
    const zh = CARD_H * k;
    const zx = p ? lay.play.x + lay.play.w / 2 : lay.play.x + Math.max(zw / 2 + 8, lay.play.w * 0.28);
    const zy = p ? lay.play.y + lay.play.h - zh / 2 - 4 : lay.play.y + lay.play.h / 2;
    const zc = new CardView(src.card);
    zc.setShowName(true);
    zc.pos(src.wm[4], src.wm[5]);
    zc.tick = (dt) => zc.fxTick(dt);
    this.zoomLayer.add(zc);
    void tween(zc, { x: zx, y: zy, sx: k, sy: k }, { dur: 0.16, ease: ease.outBack });
    this.zoom = { cv: zc, src, long };
    const rect = { x: zx - zw / 2, y: zy - zh / 2, w: zw, h: zh };
    showTip(cardCard(src.card), rect, zc);
    if (!p) {
      // landscape: tooltip to the right of the enlarged card
      const tipEl = document.getElementById('tip');
      if (tipEl) {
        tipEl.style.left = `${rect.x + rect.w + 10}px`;
        tipEl.style.top = `${Math.max(2, zy - tipEl.offsetHeight / 2)}px`;
      }
    }
    if (long) {
      const off = () => {
        window.removeEventListener('pointerup', off);
        window.removeEventListener('pointercancel', off);
        if (this.zoom?.cv === zc) this.hideZoom();
      };
      window.addEventListener('pointerup', off);
      window.addEventListener('pointercancel', off);
    }
  }

  private hideZoom(): void {
    const z = this.zoom;
    if (!z) return;
    this.zoom = null;
    hideTip(z.cv);
    void tween(z.cv, { alpha: 0, sx: z.cv.sx * 0.9, sy: z.cv.sy * 0.9 }, { dur: 0.08 }).then(() => z.cv.destroy());
  }

  private buildSoftwareBar(): void {
    const run = this.g.run!;
    const lay = this.lay;
    const active = new Set(activeSoftware(run).map((s) => s.uid));
    const slots = statsOf(run).swSlots;
    const sw = run.software;
    const n = Math.max(slots, sw.filter((s) => !s.id.startsWith('sw9')).length) + (sw.some((s) => s.id === 'sw9') ? 1 : 0);
    const size = Math.min(36, (lay.sw.w - 2 * (n - 1)) / Math.max(1, n));
    const t = L();
    let i = 0;
    for (const s of sw) {
      const chip = new SwChip(s.id, size, !active.has(s.uid));
      chip.pos(lay.sw.x + size / 2 + i * (size + 2), lay.sw.y + lay.sw.h / 2);
      if (s.id === 'sw10' || s.id === 'sw12') chip.counter.text = `+${s.counter}`;
      chip.interactive = {
        onTap: () => sheet((close) => [softwareCard(s.id, s), h('div', { class: 'actions' }, button(t.ui.close, close, { color: 'blue' }))]),
        onHover: (inside) => (inside ? showTip(softwareCard(s.id, s), this.rectOf(chip), chip) : hideTip(chip)),
        onLongPress: () => showTip(softwareCard(s.id, s), this.rectOf(chip), chip),
      };
      this.hudLayer.add(chip);
      this.swChips.set(s.uid, chip);
      i++;
    }
    for (; i < n; i++) {
      const e = new Sprite('ui_slot_empty_software_mini', { region: 'content' });
      e.size(size, size).pos(lay.sw.x + size / 2 + i * (size + 2), lay.sw.y + lay.sw.h / 2);
      e.alpha = 0.6;
      this.hudLayer.add(e);
    }
  }

  private buildTools(): void {
    const run = this.g.run!;
    const lay = this.lay;
    const t = L();
    for (let i = 0; i < 2; i++) {
      const x = lay.tools.x + 15 + i * 31;
      const y = lay.tools.y + 14;
      const slot = new Sprite('ui_slot_empty_tool', { region: 'content' });
      slot.size(28, 28).pos(x, y);
      this.hudLayer.add(slot);
      const id = run.tools[i];
      if (!id) continue;
      const ic = new Sprite(toolDef(id).icon, { region: 'content' });
      ic.fit(24, 24).pos(x, y);
      ic.interactive = {
        onTap: () => this.openTool(i),
        onHover: (inside) => (inside ? showTip(toolCard(id), this.rectOf(ic), ic) : hideTip(ic)),
        pad: 3,
      };
      ic.tick = () => (ic.rot = Math.sin(performance.now() / 500 + i) * 0.05);
      this.hudLayer.add(ic);
      void t;
    }
  }

  private buildHwBar(): void {
    const run = this.g.run!;
    const b = run.bench!;
    const lay = this.lay;
    const build = run.build;
    const items: { key: string; icon: string; partId: string | null; inst: ReturnType<typeof gpuInst>; rgb?: boolean }[] = [];
    const add = (inst: NonNullable<ReturnType<typeof gpuInst>>) => {
      const d = part(inst.id);
      items.push({ key: String(inst.uid), icon: d.icon, partId: d.id, inst, rgb: !!d.rgb });
    };
    if (build.cpu) add(build.cpu);
    const gi = gpuInst(build);
    if (gi) add(gi);
    for (const k of ramKits(build)) add(k);
    for (const d of drives(build)) add(d);
    for (const e of exps(build)) add(e);
    const cool = coolerOf(build);
    if (cool && build.cooler) add(build.cooler);
    for (const f of fans(build)) add(f);
    const cs = caseOf(build);
    if (cs && build.case) items.push({ key: 'case', icon: cs.icon, partId: cs.id, inst: build.case, rgb: cs.builtinFans.some((f) => part(f).rgb) });
    const size = Math.min(30, (lay.hw.w - 3 * (items.length - 1)) / Math.max(1, items.length));
    const total = items.length * size + (items.length - 1) * 3;
    const disabled = new Set(b.disabled);
    items.forEach((it, i) => {
      const off = it.inst ? disabled.has(it.inst.uid) || !!it.inst.broken : false;
      const chip = new HwChip(it.icon, size, { rgb: it.rgb, off });
      chip.pos(lay.hw.x + (lay.hw.w - total) / 2 + size / 2 + i * (size + 3), lay.hw.y + lay.hw.h / 2);
      if (it.inst && it.inst.oc > 0) chip.badge.text = `OC${it.inst.oc}`;
      const info = () => partCard(it.partId!, it.inst ?? undefined, off ? [h('div', { class: 'c-bad' }, it.inst?.broken ? L().fx.broken : L().bench.disabledPart)] : []);
      chip.interactive = {
        onTap: () => sheet((close) => [info(), h('div', { class: 'actions' }, button(L().ui.close, close, { color: 'blue' }))]),
        onHover: (inside) => (inside ? showTip(info(), this.rectOf(chip), chip) : hideTip(chip)),
      };
      this.hudLayer.add(chip);
      this.hwChips.set(it.key, chip);
      if (it.inst && it.partId) this.hwPartIds.set(it.inst.uid, it.partId);
    });
    // iGPU contributions are attributed to the CPU chip
  }

  // ------------------------------------------------------------ cards

  private makeCard(id: number, layer: Node): CardView {
    const run = this.g.run!;
    const cv = new CardView(card(run, id));
    cv.setShowName(this.vp.s >= 1.75); // names are 5.5 vpx: readable only from ≈ 9.5 CSS px
    this.cards.set(id, cv);
    layer.add(cv);
    const lay = this.lay;
    cv.pos(lay.deck.x, lay.deck.y);
    cv.interactive = {
      onTap: () => this.toggle(id),
      onLongPress: () => {
        if (!this.cards.has(id)) return;
        this.showZoom(cv, true);
      },
      onHover: (inside) => {
        cv.hovered = inside;
        if (inside && !this.dragging && this.cards.has(id)) {
          sfx.hover();
          this.showZoom(cv, false);
        } else if (this.zoom?.src === cv && !this.zoom.long) this.hideZoom();
        this.layoutHand();
      },
      onDragStart: () => {
        if (this.busy) return;
        this.dragging = cv;
        this.hideZoom();
        hideTip();
        cv.z = 100;
      },
      onDrag: (e) => {
        if (this.dragging !== cv) return;
        cv.x = e.x;
        cv.y = e.y;
        this.reorderByDrag(cv);
      },
      onDragEnd: () => {
        if (this.dragging !== cv) return;
        this.dragging = null;
        cv.z = 0;
        const b = this.g.run!.bench!;
        const order = [...b.hand].sort((a, c) => this.cards.get(a)!.tx - this.cards.get(c)!.tx);
        reorderHand(this.g.run!, order);
        this.g.save();
        this.layoutHand();
        sfx.deal();
      },
      pad: 1,
    };
    cv.tick = (dt) => {
      cv.fxTick(dt);
      if (this.dragging === cv) return;
      const k = Math.min(1, dt * 14);
      cv.x += (cv.tx - cv.x) * k;
      const lift = cv.selected ? -12 : cv.hovered ? -4 : 0;
      cv.y += (cv.ty + lift - cv.y) * k;
      cv.wobble += dt;
      cv.body.rot = cv.baseRot + Math.sin(cv.wobble * 1.7) * 0.012;
    };
    return cv;
  }

  private reorderByDrag(cv: CardView): void {
    const b = this.g.run!.bench!;
    const others = b.hand.filter((id) => this.cards.get(id) !== cv);
    const slots = this.handSlots(b.hand.length);
    // find index nearest to dragged x
    let best = 0;
    let bd = Infinity;
    slots.forEach((s, i) => {
      const d = Math.abs(s.x - cv.x) + (s.row ? 10 : 0) * Math.abs(s.y - cv.y) * 0.1;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    const order = [...others];
    order.splice(best, 0, cv.card.id);
    order.forEach((id, i) => {
      const c = this.cards.get(id)!;
      c.tx = slots[i]!.x;
      c.ty = slots[i]!.y;
      c.baseRot = slots[i]!.rot;
    });
  }

  private handSlots(n: number): { x: number; y: number; rot: number; row: number }[] {
    const lay = this.lay;
    const out: { x: number; y: number; rot: number; row: number }[] = [];
    const two = lay.twoRows && n >= 9;
    const cy = lay.hand.y + lay.hand.h / 2 + (two ? 5 : 6);
    const rows = two ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
    rows.forEach((cnt, r) => {
      const aw = lay.hand.w - CARD_W - 8;
      const step = cnt > 1 ? Math.min(CARD_W + 4, aw / (cnt - 1)) : 0;
      const total = step * (cnt - 1);
      // two rows: the rows overlap by a few px only (labels stay visible)
      const y = two ? cy - 34 + r * 68 : cy;
      const fan = two ? 4 : 10;
      for (let i = 0; i < cnt; i++) {
        const k = cnt > 1 ? i / (cnt - 1) - 0.5 : 0;
        out.push({ x: lay.hand.x + lay.hand.w / 2 - total / 2 + i * step, y: y + k * k * fan, rot: k * (two ? 0.06 : 0.12), row: r });
      }
    });
    return out;
  }

  private layoutHand(instant = false): void {
    const b = this.g.run!.bench!;
    const slots = this.handSlots(b.hand.length);
    b.hand.forEach((id, i) => {
      const cv = this.cards.get(id);
      if (!cv || this.dragging === cv) return;
      const s = slots[i]!;
      cv.tx = s.x;
      cv.ty = s.y;
      cv.baseRot = s.rot;
      cv.z = i + (s.row ? 50 : 0);
      if (instant && !this.enterAnim) {
        cv.x = s.x;
        cv.y = s.y;
      }
    });
  }

  private toggle(id: number): void {
    if (this.busy) return;
    const b = this.g.run!.bench!;
    const cv = this.cards.get(id);
    if (!cv || !b.hand.includes(id)) return;
    sfx.unlock();
    if (this.selected.includes(id)) {
      this.selected = this.selected.filter((x) => x !== id);
      cv.setSelected(false);
      sfx.deselect();
    } else {
      if (this.selected.length >= b.cores) {
        toast(fmt(L().bench.selectCards, { n: b.cores }), 'info', 1200);
        void this.g.fx.pulse(cv, 1.08);
        sfx.error();
        return;
      }
      this.selected.push(id);
      cv.setSelected(true);
      sfx.select();
    }
    this.refreshHud();
  }

  private clearSelection(): void {
    for (const id of this.selected) this.cards.get(id)?.setSelected(false);
    this.selected = [];
  }

  // ------------------------------------------------------------ hud

  private shownMoney = 0;
  private moneyRaf = 0;

  /** Wallet display: counts up/down to the new value and pulses on change. */
  private setMoney(v: number, animate: boolean): void {
    const el = this.els.money!;
    const n = el.querySelector('.wallet-n') as HTMLElement;
    cancelAnimationFrame(this.moneyRaf);
    const from = this.shownMoney;
    this.shownMoney = v;
    if (!animate || from === v) {
      n.textContent = num(v);
      return;
    }
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    const t0 = performance.now();
    const step = (now: number): void => {
      const k = Math.min(1, (now - t0) / 450);
      n.textContent = num(Math.round(from + (v - from) * k));
      if (k < 1) this.moneyRaf = requestAnimationFrame(step);
    };
    this.moneyRaf = requestAnimationFrame(step);
  }

  private refreshHud(): void {
    const run = this.g.run!;
    const b = run.bench!;
    const t = L();
    this.setMoney(run.money, false);
    (this.els.hands!.querySelector('b') as HTMLElement).textContent = String(b.hands);
    (this.els.discards!.querySelector('b') as HTMLElement).textContent = String(b.discards);
    (this.els.play!.querySelector('.badge-n') as HTMLElement).textContent = String(b.hands);
    (this.els.discardBtn!.querySelector('.badge-n') as HTMLElement).textContent = String(b.discards);
    this.deckCount.text = String(b.draw.length);
    const req = requiredCards(run);
    const sel = this.selected;
    const playable = !this.busy && !b.result && sel.length > 0 && (req === null || sel.length === req);
    (this.els.play as HTMLButtonElement).disabled = !playable;
    (this.els.discardBtn as HTMLButtonElement).disabled = this.busy || !!b.result || b.discards <= 0 || sel.length === 0 || sel.length > 5;
    const pv = previewPlay(run, sel);
    const prev = this.els.preview!;
    prev.innerHTML = '';
    // gold glow on the selected cards that form the profile
    const inProfile = new Set(pv && !this.busy ? pv.profileCards : []);
    for (const id of b.hand) this.cards.get(id)?.setProfile(inProfile.has(id));
    const profKey = pv ? `${pv.profile}:${pv.profileLevel}` : '';
    if (profKey !== this.lastProfile) {
      const pt = this.profileText;
      if (pv && !this.busy) void tween(pt, { sx: 1.3, sy: 1.3 }, { dur: 0.07 }).then(() => tween(pt, { sx: 1, sy: 1 }, { dur: 0.16, ease: ease.outBack }));
      this.lastProfile = profKey;
    }
    if (pv) {
      const lv = pv.profileLevel;
      this.profileText.text = `${profileName(pv.profile).toUpperCase()}  ${fmt(t.bench.profileLv, { n: lv })}`;
      if (!this.busy) {
        this.lBox.setValue(pv.events[0]!.k === 'profile' ? pv.events[0]!.l : 0);
        this.tBox.setValue(pv.events[0]!.k === 'profile' ? pv.events[0]!.t : 0);
      }
      const after = pv.heat.after;
      const col = after >= 100 ? 'c-bad' : after >= 85 ? 'c-warn' : '';
      prev.append(
        img('icon8_hitze', 'i8'),
        h('span', { class: col }, ' ' + fmt(t.bench.heatPreview, { add: pv.heat.total, temp: after })),
        after >= 100 ? h('b', { class: 'c-bad t-title', style: 'font-weight:400' }, '  ' + t.bench.heatShutdown) : after >= 85 ? h('b', { class: 'c-warn t-title', style: 'font-weight:400' }, '  ' + t.bench.heatThrottle) : '',
      );
      if (this.g.settings.scorePreview) prev.append(h('span', { class: 'c-gold' }, '   ' + fmt(t.bench.scorePreview, { n: big(pv.score) })));
    } else {
      this.profileText.text = '';
      if (!this.busy) {
        this.lBox.setValue(0);
        this.tBox.setValue(0);
      }
      prev.append(h('span', { class: 'dim' }, req !== null ? fmt(t.bench.mustPlay, { n: req }) : fmt(t.bench.selectCards, { n: b.cores })));
    }
    if (req !== null && pv) prev.append(h('span', { class: sel.length === req ? 'c-ok' : 'c-warn' }, `  (${sel.length}/${req})`));
    this.thermo.set(b.temp);
    this.heatFeedback(b.temp);
  }

  private heatFeedback(temp: number): void {
    const k = Math.max(0, (temp - 50) / 50);
    this.g.bg.setHeat(Math.min(1, k));
    // heat shimmer from 70 °C (GDD 18.1), full strength at 100 °C
    this.shimmer?.set(temp >= 70 ? 0.25 + ((temp - 70) / 30) * 0.75 : 0);
    sfx.fan(0.15 + Math.min(1, Math.max(0, (temp - 35) / 65)) * 0.85);
  }

  // ------------------------------------------------------------ actions

  private doSort(by: 'level' | 'type'): void {
    if (this.busy) return;
    sortHand(this.g.run!, by);
    this.g.save();
    this.layoutHand();
    sfx.deal();
  }

  private async doDiscard(): Promise<void> {
    if (this.busy) return;
    const run = this.g.run!;
    const ids = [...this.selected];
    const r = discardCards(run, ids);
    if (!this.g.check(r)) return;
    this.busy = true;
    this.hideZoom();
    this.clearSelection();
    hideTip();
    this.g.save();
    sfx.deal();
    // fly out to the right
    await Promise.all(
      ids.map(async (id, i) => {
        const cv = this.cards.get(id)!;
        cv.tick = null;
        await tween(cv, { x: this.vp.w + 60, y: cv.y - 30, alpha: 0 }, { dur: 0.25, delay: i * 0.04, ease: ease.inQuad });
        cv.destroy();
        this.cards.delete(id);
      }),
    );
    await this.dealIn(r.drawn);
    this.busy = false;
    if (run.phase === 'gameover') return this.endBench();
    this.refreshHud();
  }

  private async dealIn(ids: number[]): Promise<void> {
    for (const id of ids) {
      const cv = this.makeCard(id, this.handLayer);
      cv.setFaceDown(true);
      cv.alpha = 1;
    }
    this.layoutHand();
    for (const [i, id] of ids.entries()) {
      const cv = this.cards.get(id)!;
      sfx.deal(i);
      await wait(0.06);
      void (async () => {
        await wait(0.12);
        // reveal without distortion (no scaleX flip): small uniform dip, then pop
        await tween(cv, { sx: 0.88, sy: 0.88 }, { dur: 0.06 });
        cv.setFaceDown(false);
        await tween(cv, { sx: 1, sy: 1 }, { dur: 0.09, ease: ease.outBack });
      })();
    }
    await wait(0.2);
    this.refreshHud();
  }

  private async introAnim(): Promise<void> {
    const run = this.g.run!;
    const b = run.bench!;
    this.busy = true;
    const t = L();
    // hide the hand, show boot text, then deal
    for (const id of b.hand) {
      const cv = this.cards.get(id);
      if (cv) {
        cv.pos(this.lay.deck.x, this.lay.deck.y);
        cv.setFaceDown(true);
      }
    }
    if (b.boss) await this.bossIntro(b.boss, isFinaleGen(run.gen));
    const boot = new Text(t.bench.boot, { font: 'mono', size: 14, align: 'center', valign: 'middle', color: 0xa8f07a });
    boot.pos(this.lay.play.x + this.lay.play.w / 2, this.lay.play.y + this.lay.play.h / 2);
    this.playLayer.add(boot);
    sfx.boot();
    await wait(0.6);
    void tween(boot, { alpha: 0 }, { dur: 0.3 }).then(() => boot.destroy());
    for (const ev of b.startEvents) {
      const msg = { update: t.bench.eventUpdate, melt: t.bench.eventMelt, brownout: t.bench.eventBrownout, heatwave: t.bench.eventHeatwave }[ev];
      toast(msg, 'bad', 3200);
      if (ev === 'melt') {
        const gi = gpuInst(run.build);
        const chip = gi ? this.hwChips.get(String(gi.uid)) : null;
        if (chip) {
          this.g.fx.burst(chip.wm[4], chip.wm[5], 'fire');
          this.g.fx.burst(chip.wm[4], chip.wm[5] - 6, 'smoke');
        }
      }
      if (ev === 'brownout') this.g.fx.oneShot('fx_lightning', this.lay.hw.x + this.lay.hw.w / 2, this.lay.hw.y, { fps: 14 });
    }
    this.layoutHand();
    for (const [i, id] of b.hand.entries()) {
      const cv = this.cards.get(id);
      if (!cv) continue;
      sfx.deal(i);
      void (async () => {
        await wait(0.15);
        // reveal without distortion (no scaleX flip): small uniform dip, then pop
        await tween(cv, { sx: 0.88, sy: 0.88 }, { dur: 0.06 });
        cv.setFaceDown(false);
        await tween(cv, { sx: 1, sy: 1 }, { dur: 0.09, ease: ease.outBack });
      })();
      await wait(0.07);
    }
    await wait(0.25);
    this.enterAnim = false;
    this.busy = false;
    this.refreshHud();
  }

  /** Boss intro: the screen darkens, a warning band slams in with the boss icon, name and rule. */
  private async bossIntro(id: BossId, finale: boolean): Promise<void> {
    const t = L();
    const vp = this.vp;
    const lay = this.lay;
    const fx = this.g.fx;
    const root = new Node();
    root.z = 90;
    this.root.add(root);
    const dim = new Rect2(vp.fullW, vp.fullH, 0x05050a, 0);
    dim.pos(-vp.ox, -vp.oy);
    root.add(dim);
    void tween(dim, { alpha: 0.6 }, { dur: 0.2 });
    const red = 0xe8432d;
    const bandH = this.portrait ? 86 : 78;
    const cy = this.portrait ? lay.play.y + lay.play.h * 0.42 : lay.play.y + lay.play.h * 0.5;
    const band = new Node();
    band.pos(vp.w / 2, cy);
    root.add(band);
    const bg = new Rect2(vp.fullW, bandH, 0x0b0b12, 0.94);
    bg.ax = bg.ay = 0.5;
    band.add(bg);
    // hazard stripes along both edges
    const stripes = new Node();
    band.add(stripes);
    for (const y of [-bandH / 2, bandH / 2 - 4]) {
      for (let x = -vp.fullW / 2 - 16; x < vp.fullW / 2 + 16; x += 16) {
        const r = new Rect2(8, 4, finale ? 0xffd23f : red, 1);
        r.pos(x, y);
        stripes.add(r);
      }
    }
    stripes.tick = (dt) => (stripes.x = (stripes.x + dt * 24) % 16);
    const iconSize = this.portrait ? 52 : 56;
    const leftW = Math.min(vp.w - 24, 420);
    const ix = -leftW / 2 + iconSize / 2;
    const icon = new Sprite(bossDef(id).icon, { region: 'content' });
    icon.fit(iconSize, iconSize).pos(ix, 0);
    band.add(icon);
    const tx = ix + iconSize / 2 + 10;
    const tw = leftW / 2 - tx;
    const tag = new Text(finale ? t.bench.finale.toUpperCase() : t.bench.boss.toUpperCase(), { font: 'title', size: 9.5, valign: 'top', color: finale ? 0xffd23f : red, outline: 0x0b0b12 });
    tag.pos(tx, -bandH / 2 + 9);
    band.add(tag);
    const name = new Text(t.bosses[id].name.toUpperCase(), { font: 'title', size: 13, valign: 'top', color: 0xf4f4fa, outline: 0x0b0b12 });
    if (name.width > tw) name.setSize(Math.max(8, (13 * tw) / name.width));
    name.pos(tx, tag.y + 12);
    band.add(name);
    const rule = new Text(t.bosses[id].desc, { font: 'body', size: 9.5, valign: 'top', color: 0xffe28a, maxWidth: tw, lineHeight: 1.05 });
    rule.pos(tx, name.y + name.height + 4);
    band.add(rule);
    // in: band unfolds, icon slams, texts slide
    band.sy = 0;
    icon.scale(0);
    for (const n of [tag, name, rule]) {
      n.alpha = 0;
      n.x += 30;
    }
    await tween(band, { sy: 1 }, { dur: 0.16, ease: ease.outBack });
    const k = iconSize / Math.max(icon.w, icon.h);
    icon.scale(3 * k);
    icon.alpha = 0;
    void tween(icon, { alpha: 1 }, { dur: 0.08 });
    await tween(icon, { sx: k, sy: k }, { dur: 0.16, ease: ease.inQuad });
    sfx.slam();
    this.g.engine.shake(5, 0.35);
    fx.burst(icon.wm[4], icon.wm[5], 'xclock', 1.3);
    fx.sparks(icon.wm[4], icon.wm[5], 14, finale ? 0xffd23f : red, 140);
    [tag, name, rule].forEach((n, i) => void tween(n, { x: n.x - 30, alpha: 1 }, { dur: 0.2, delay: i * 0.07, ease: ease.outBack }));
    icon.tick = () => (icon.rot = Math.sin(performance.now() / 120) * 0.04);
    tag.tick = () => (tag.alpha = 0.65 + 0.35 * Math.sin(performance.now() / 90));
    await wait(1.9);
    // out: slide away to the left
    void tween(dim, { alpha: 0 }, { dur: 0.25 });
    await tween(band, { x: -vp.w, alpha: 0 }, { dur: 0.25, ease: ease.inQuad });
    root.destroy();
  }

  private async doPlay(): Promise<void> {
    if (this.busy) return;
    const run = this.g.run!;
    const b = run.bench!;
    const ids = b.hand.filter((id) => this.selected.includes(id));
    const req = requiredCards(run);
    if (req !== null && ids.length !== req) {
      toast(fmt(L().errors.mustPlayAll, { n: req }), 'bad');
      return;
    }
    const r = playCards(run, ids);
    if (!this.g.check(r, { n: req ?? 0 })) return;
    this.g.save();
    this.busy = true;
    this.hideZoom();
    this.clearSelection();
    hideTip();
    this.refreshButtonsBusy();
    try {
      await this.animatePlay(r.out, ids);
    } catch (e) {
      console.error(e);
    }
    this.busy = false;
    if (run.phase !== 'bench') return this.endBench();
    this.refreshHud();
  }

  private refreshButtonsBusy(): void {
    (this.els.play as HTMLButtonElement).disabled = true;
    (this.els.discardBtn as HTMLButtonElement).disabled = true;
  }

  private srcNode(src: Src, cardIdx: number | undefined, played: CardView[]): Node | null {
    switch (src.kind) {
      case 'part':
        return this.hwChips.get(String(src.uid)) ?? null;
      case 'builtin':
        return this.hwChips.get('case') ?? null;
      case 'sw':
        return this.swChips.get(src.uid) ?? null;
      case 'card':
        return cardIdx !== undefined ? played[cardIdx] ?? null : null;
      case 'heat':
        return this.thermo;
      case 'boss':
        return this.bossIcon;
      default:
        return this.profileText;
    }
  }

  private async animatePlay(out: PlayOutcome, ids: number[]): Promise<void> {
    const run = this.g.run!;
    const fx = this.g.fx;
    const t = L();
    const lay = this.lay;
    const played = ids.map((id) => this.cards.get(id)!);
    // move cards to the play area
    const n = played.length;
    // bigger cards when the play area has room (tall phones)
    const pk = Math.max(1, Math.min(this.portrait ? 1.5 : 1.25, (lay.play.w - 12) / (n * (CARD_W + 6)), (lay.play.h - 70) / CARD_H));
    this.playK = pk;
    const step = Math.min((CARD_W + 6) * pk, (lay.play.w - CARD_W * pk - 10) / Math.max(1, n - 1));
    const cx = lay.play.x + lay.play.w / 2;
    const cy = lay.play.y + lay.play.h * (this.portrait ? 0.56 : 0.54);
    played.forEach((cv, i) => {
      cv.tick = (dt) => cv.fxTick(dt);
      cv.parent?.remove(cv);
      this.playLayer.add(cv);
      cv.setSelected(false);
      cv.setProfile(false);
      cv.hovered = false;
      const tx = cx + (i - (n - 1) / 2) * step;
      void tween(cv, { x: tx, y: cy, rot: 0, sx: pk, sy: pk }, { dur: 0.28, delay: i * 0.05, ease: ease.outBack });
      void tween(cv.body, { rot: 0 }, { dur: 0.2 });
    });
    for (const id of ids) this.cards.delete(id);
    this.layoutHand();
    sfx.deal();
    await wait(0.35 + n * 0.05);

    // heat step
    const ev = out.eval;
    this.profileIds = ev.profileCards;
    played.forEach((cv, i) => {
      const hh = ev.heat.perCard[i] ?? 0;
      if (hh > 0) void fx.float(cv.x, cv.y - (CARD_H * pk) / 2 - 4, `+${num(hh)}°`, { color: heatColor(out.tempPeak), size: 9.5, rise: 10 });
    });
    this.thermo.set(out.tempPeak);
    this.heatFeedback(out.tempPeak);
    if (out.tempPeak >= 70) for (let i = 0; i < 2; i++) fx.burst(this.thermo.wm[4], this.thermo.wm[5] - 6, 'smoke', 0.8);
    await wait(0.45);

    if (out.shutdown) {
      sfx.shutdown();
      this.g.engine.shake(6, 0.8);
      for (const cv of played) fx.burst(cv.x, cv.y, 'fire', 1.4);
      await fx.flashScreen(this.vp.w, this.vp.h, 0xe8432d, 0.5, 0.6);
      this.banner(t.bench.shutdown, 0xe8432d);
      await wait(1.4);
      return;
    }
    if (out.bluescreen !== null) {
      sfx.bsod();
      this.g.engine.shake(4, 0.5);
      for (const cv of played) cv.glitch(1.4);
      const chip = this.hwChips.get(String(out.bluescreen));
      if (chip) {
        fx.burst(chip.wm[4], chip.wm[5], 'spark', 1.5);
        chip.setFlash(1);
        void wait(0.4).then(() => chip.setFlash(0));
      }
      void fx.flashScreen(this.vp.w, this.vp.h, 0x1f4fb4, 0.45, 0.12);
      await fx.glitch(lay.play.x, lay.play.y, lay.play.w, lay.play.h, 0.55, 1.3);
      await this.bsodPanel(this.hwPartIds.get(out.bluescreen) ?? null);
      await this.discardPlayed(played);
      await this.afterPlay(out);
      return;
    }

    // scoring sequence
    let stepN = 0;
    const perfPos = () => [this.lBox.wm[4], this.lBox.wm[5]] as const;
    const clockPos = () => [this.tBox.wm[4], this.tBox.wm[5]] as const;
    for (const e of ev.events) {
      const dly = Math.max(0.05, 0.17 * Math.pow(0.965, stepN));
      await this.playEvent(e, played, stepN, perfPos, clockPos);
      if (e.k === 'L' || e.k === 'T' || e.k === 'xT' || e.k === 'money') {
        stepN++;
        await wait(e.k === 'xT' ? dly * 2.2 : dly);
      }
      if (e.k === 'profile') await wait(0.35);
      if (e.k === 'global') await wait(0.12);
    }

    // final multiplication: Perf × Clock rolls up, then slams
    await wait(0.15);
    const final = ev.nullified ? 0 : out.score;
    const scoreT = new Text('0', { font: 'title', size: 22, align: 'center', valign: 'middle', color: 0xf4f4fa, outline: 0x0b0b12 });
    scoreT.pos(cx, Math.max(lay.play.y + 16, cy - (CARD_H * this.playK) / 2 - 22));
    scoreT.scale(0.5);
    this.playLayer.add(scoreT);
    void fx.pulse(this.lBox, 1.12, 0.2);
    void fx.pulse(this.tBox, 1.12, 0.2);
    const roll = { v: 0 };
    let lastStep = -1;
    await tween(roll, { v: final }, {
      dur: final > 0 ? Math.min(0.7, 0.25 + Math.log10(final + 1) * 0.07) : 0.05,
      ease: ease.outCubic,
      onUpdate: () => {
        const f = final > 0 ? roll.v / final : 1;
        scoreT.text = big(Math.floor(roll.v));
        scoreT.sx = scoreT.sy = 0.5 + 0.45 * f;
        const step = Math.floor(f * 10);
        if (step !== lastStep) {
          lastStep = step;
          sfx.tick(step * 1.5);
        }
      },
    });
    scoreT.text = big(final);
    scoreT.color(0xffe28a);
    sfx.slam();
    const ratio = out.score / run.bench!.target;
    this.g.engine.shake(Math.min(7, 1.5 + ratio * 4), 0.35);
    await tween(scoreT, { sx: 1.4, sy: 1.4 }, { dur: 0.14, ease: ease.outBack });
    fx.burst(scoreT.x, scoreT.y, 'xclock', 1.2 + Math.min(1, ratio));
    if (run.bench && run.bench.score >= run.bench.target && this.shownScore < run.bench.target) fx.confetti(scoreT.x, scoreT.y, 24, 150);
    await tween(scoreT, { sx: 1, sy: 1 }, { dur: 0.12 });
    if (ev.nullified) {
      this.banner(t.bench.nullified, 0xe8432d);
    }
    await wait(0.35);
    // fly to the score counter
    const target = this.els.score!;
    const tr = this.domCenter(target);
    void tween(scoreT, { x: tr.x, y: tr.y, sx: 0.5, sy: 0.5, alpha: 0.3 }, { dur: 0.35, ease: ease.inQuad }).then(() => scoreT.destroy());
    await wait(0.3);
    await this.countScore(run.bench ? run.bench.score : this.shownScore + out.score);
    for (const id of out.destroyed) {
      const cv = played[ids.indexOf(id)];
      if (cv) {
        fx.burst(cv.x, cv.y, 'spark', 2);
        void fx.float(cv.x, cv.y, t.bench.destroyed, { color: 0xff3fa4, size: 9.5 });
        cv.setDim(true);
      }
    }
    if (out.money) {
      sfx.coin();
      this.setMoney(run.money, true);
    }
    await this.discardPlayed(played);
    await this.afterPlay(out);
  }

  private domCenter(el: HTMLElement): { x: number; y: number } {
    const ui = document.getElementById('ui')!;
    const ur = ui.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const s = this.vp.s;
    return { x: (r.left - ur.left + r.width / 2) / s, y: (r.top - ur.top + r.height / 2) / s };
  }

  private async countScore(to: number): Promise<void> {
    const from = this.shownScore;
    const b = this.g.run!.bench;
    const target = b ? b.target : this.g.run!.gameOver?.target ?? 1;
    const o = { v: from };
    sfx.cash();
    let lastTick = 0;
    let n = 0;
    await tween(o, { v: to }, {
      dur: Math.min(1.1, 0.45 + Math.log10(Math.max(1, to - from)) * 0.1),
      ease: ease.outCubic,
      onUpdate: () => {
        this.odo.set(o.v);
        this.scoreBar.k = o.v / target;
        const now = performance.now();
        if (now - lastTick > 55) {
          lastTick = now;
          sfx.tick(8 + n++);
        }
      },
    });
    this.shownScore = to;
    this.odo.set(to);
    this.scoreBar.k = to / target;
    const reached = to >= target;
    this.odo.bump(1.35, reached ? '#a8f07a' : '#ffe28a');
    void this.g.fx.pulse(this.scoreBar, 1.08, 0.2);
    if (reached) this.els.score!.classList.add('c-ok');
  }

  private async playEvent(e: ScoreEvent, played: CardView[], stepN: number, perfPos: () => readonly [number, number], clockPos: () => readonly [number, number]): Promise<void> {
    const fx = this.g.fx;
    const flashNode = (n: Node | null) => {
      if (!n) return;
      if (n instanceof HwChip || n instanceof SwChip) {
        n.setFlash(1);
        const o = { f: 1 };
        void tween(o, { f: 0 }, { dur: 0.35, onUpdate: () => n.setFlash(o.f) });
        void fx.pulse(n, 1.3, 0.22);
      } else if (n instanceof CardView) {
        void fx.pulse(n.body, 1.1, 0.18);
      }
    };
    switch (e.k) {
      case 'profile': {
        this.lBox.setValue(e.l);
        this.tBox.setValue(e.t);
        void fx.pulse(this.profileText, 1.3, 0.3);
        void fx.pulse(this.lBox, 1.15);
        void fx.pulse(this.tBox, 1.15);
        sfx.select();
        // the cards that form the profile jump and glow gold; the others only nod
        const prof = new Set(this.profileIds);
        played.forEach((cv, i) => {
          const isP = prof.has(cv.card.id);
          cv.setProfile(isP);
          const jump = isP ? -14 : -3;
          void tween(cv.body, { y: jump }, { dur: 0.1, delay: i * 0.035, ease: ease.outQuad }).then(() => tween(cv.body, { y: 0 }, { dur: 0.2, ease: ease.outBack }));
          if (isP) {
            void wait(i * 0.035).then(() => fx.sparks(cv.x, cv.y - (CARD_H * this.playK) / 2, 6, 0xffd23f, 70));
          }
        });
        break;
      }
      case 'cardStart': {
        const cv = played[e.card];
        if (cv) {
          void tween(cv.body, { y: -10, sx: 1.12, sy: 1.12 }, { dur: 0.1, ease: ease.outQuad });
          cv.setFlash(0.4);
          setTimeout(() => cv.setFlash(0), 90);
        }
        break;
      }
      case 'cardEnd': {
        const cv = played[e.card];
        if (cv) void tween(cv.body, { y: 0, sx: 1, sy: 1 }, { dur: 0.15, ease: ease.outBack });
        break;
      }
      case 'L': {
        const src = this.srcNode(e.src, e.card, played);
        const cv = e.card !== undefined ? played[e.card] : null;
        const [px, py] = src && !(src instanceof CardView) ? [src.wm[4], src.wm[5] - 14] : cv ? [cv.x, cv.y - (CARD_H * this.playK) / 2 - 8] : perfPos();
        void fx.float(px, py, `+${num(e.add)}`, { color: 0x8cc4ff, size: 10 });
        flashNode(src);
        if (src !== cv && cv) void fx.pulse(cv.body, 1.05, 0.12);
        this.lBox.setValue(e.l);
        this.lBox.pulseFrame();
        void fx.pulse(this.lBox, 1.12, 0.14);
        const [bx, by] = perfPos();
        fx.burst(bx, by, 'perf', 0.6);
        sfx.perf(stepN);
        break;
      }
      case 'T': {
        const src = this.srcNode(e.src, e.card, played);
        const cv = e.card !== undefined ? played[e.card] : null;
        const [px, py] = src && !(src instanceof CardView) ? [src.wm[4], src.wm[5] - 14] : cv ? [cv.x, cv.y - (CARD_H * this.playK) / 2 - 8] : clockPos();
        void fx.float(px, py, `${e.add >= 0 ? '+' : ''}${num(e.add)}`, { color: 0xff7a5c, size: 10 });
        flashNode(src);
        this.tBox.setValue(e.t);
        this.tBox.pulseFrame();
        void fx.pulse(this.tBox, 1.12, 0.14);
        const [bx, by] = clockPos();
        fx.burst(bx, by, 'clock', 0.6);
        sfx.clock(stepN);
        break;
      }
      case 'xT': {
        const src = this.srcNode(e.src, e.card, played);
        flashNode(src);
        const [bx, by] = clockPos();
        const label = `×${num(e.mul, 2)}`;
        void fx.float(bx, by - 18, label, { color: e.mul < 1 ? 0xff8a2e : 0xff3fa4, size: 16, pop: 1.2, rise: 20 });
        if (src && !(src instanceof CardView)) void fx.float(src.wm[4], src.wm[5] - 14, label, { color: 0xff3fa4, size: 10 });
        this.tBox.setValue(e.t);
        this.tBox.pulseFrame();
        void fx.pulse(this.tBox, 1.35, 0.3);
        if (e.mul >= 1) {
          fx.burst(bx, by, 'xclock', 1);
          this.g.engine.shake(3.5, 0.25);
          sfx.xclock();
        } else {
          this.banner(e.src.kind === 'heat' ? L().bench.throttled : '×0.5', 0xff8a2e);
          fx.burst(this.thermo.wm[4], this.thermo.wm[5], 'smoke', 1.2);
          sfx.throttle();
        }
        break;
      }
      case 'money': {
        const src = this.srcNode(e.src, e.card, played);
        flashNode(src);
        if (src) {
          fx.burst(src.wm[4], src.wm[5], 'coin');
          void fx.float(src.wm[4], src.wm[5] - 14, fmt(L().bench.money, { n: e.add }), { color: 0xffe28a, size: 9.5 });
        }
        sfx.coin();
        break;
      }
      case 'counter': {
        const chip = this.swChips.get(e.uid);
        if (chip) chip.counter.text = `+${e.value}`;
        break;
      }
      case 'global':
        break;
      case 'nullify':
        break;
    }
  }

  private banner(text: string, color: number): void {
    const lay = this.lay;
    const bw = lay.play.w + 40;
    const bg = new Rect2(bw, 26, 0x0b0b12, 0.8);
    bg.ax = bg.ay = 0.5;
    const n = new Node();
    n.add(bg);
    for (const y of [-13, 12]) {
      const line = new Rect2(bw, 1, color, 0.9);
      line.ax = 0.5;
      line.y = y;
      n.add(line);
    }
    const tx = new Text(text, { font: 'title', size: 13, align: 'center', valign: 'middle', color, outline: 0x0b0b12 });
    if (tx.width > lay.play.w - 8) tx.setSize((13 * (lay.play.w - 8)) / tx.width);
    n.add(tx);
    n.pos(lay.play.x + lay.play.w / 2, lay.play.y + 22);
    n.sy = 0;
    n.z = 50;
    tx.x = 40;
    tx.alpha = 0;
    this.playLayer.add(n);
    void (async () => {
      void tween(tx, { x: 0, alpha: 1 }, { dur: 0.22, ease: ease.outBack });
      await tween(n, { sy: 1 }, { dur: 0.15, ease: ease.outBack });
      void this.g.fx.pulse(tx, 1.15, 0.2);
      await wait(1.1);
      void tween(tx, { x: -40 }, { dur: 0.2, ease: ease.inQuad });
      await tween(n, { sy: 0, alpha: 0 }, { dur: 0.2 });
      n.destroy();
    })();
  }

  /** Mini bluescreen in the play area: CRT on, ":(", stop line with the culprit, progress, CRT off. */
  private async bsodPanel(partId: string | null): Promise<void> {
    const lay = this.lay;
    const t = L();
    const pw = Math.min(lay.play.w - 16, 290);
    const ph = Math.min(lay.play.h - 8, 100);
    const n = new Node();
    n.pos(lay.play.x + lay.play.w / 2, lay.play.y + lay.play.h / 2);
    n.z = 60;
    const bg = new Rect2(pw, ph, 0x1f4fb4, 0.97);
    bg.ax = bg.ay = 0.5;
    n.add(bg);
    const x0 = -pw / 2 + 12;
    const sad = new Text(':(', { font: 'title', size: 26, valign: 'top', color: 0xf4f4fa, shadow: null });
    sad.pos(x0, -ph / 2 + 8);
    n.add(sad);
    const msg = new Text(t.bench.bluescreen, { font: 'title', size: 9.5, valign: 'top', color: 0xf4f4fa, shadow: null, maxWidth: pw - 24 });
    msg.pos(x0, -ph / 2 + 44);
    n.add(msg);
    const stop = new Text(fmt(t.bench.bsodStop, { part: partId ? partName(partId) : '?' }), { font: 'mono', size: 10, valign: 'top', color: 0xc8d8ff, shadow: null, maxWidth: pw - 24 });
    stop.pos(x0, msg.y + msg.height + 4);
    n.add(stop);
    const pct = new Text('0%', { font: 'mono', size: 10, align: 'right', valign: 'top', color: 0xf4f4fa, shadow: null });
    pct.pos(pw / 2 - 10, -ph / 2 + 10);
    n.add(pct);
    n.sx = n.sy = 0.9; // uniform scale only (sprites are never squashed)
    n.alpha = 0;
    this.playLayer.add(n);
    await tween(n, { sx: 1, sy: 1, alpha: 1 }, { dur: 0.12, ease: ease.outQuad });
    const p = { v: 0 };
    void this.g.fx.glitch(n.x - pw / 2, n.y - ph / 2, pw, ph, 0.18, 0.6);
    await tween(p, { v: 100 }, { dur: 1.1, onUpdate: () => (pct.text = `${Math.floor(p.v)}%`) });
    void this.g.fx.glitch(n.x - pw / 2, n.y - ph / 2, pw, ph, 0.15, 0.8);
    await tween(n, { sx: 0.94, sy: 0.94, alpha: 0 }, { dur: 0.18, ease: ease.inQuad });
    n.destroy();
  }

  private async discardPlayed(played: CardView[]): Promise<void> {
    await Promise.all(
      played.map(async (cv, i) => {
        await tween(cv, { x: this.vp.w + 50, y: cv.y - 20, alpha: 0 }, { dur: 0.3, delay: i * 0.04, ease: ease.inQuad });
        cv.destroy();
      }),
    );
  }

  private async afterPlay(out: PlayOutcome): Promise<void> {
    const run = this.g.run!;
    // cooling
    this.thermo.set(out.tempAfter);
    this.heatFeedback(out.tempAfter);
    if (out.tempPeak - out.tempAfter >= 10) {
      sfx.frost();
      this.g.fx.burst(this.thermo.wm[4], this.thermo.wm[5], 'frost', 1.2);
    }
    if (run.phase === 'bench') {
      await this.dealIn(out.drawn);
    }
    this.lBox.setValue(0);
    this.tBox.setValue(0);
  }

  private async endBench(): Promise<void> {
    const run = this.g.run!;
    const t = L();
    this.busy = true;
    if (run.phase === 'receipt') {
      sfx.win();
      this.banner(t.bench.cleared, 0xa8f07a);
      this.g.fx.confetti(this.vp.w / 2, this.lay.play.y + this.lay.play.h / 2, 40, 180);
      this.g.engine.shake(3, 0.3);
      await wait(1.6);
      this.g.route();
    } else if (run.phase === 'gameover') {
      sfx.lose();
      this.banner(t.bench.failed, 0xe8432d);
      await wait(1.5);
      this.g.route();
    }
  }

  // ------------------------------------------------------------ tools

  private openTool(i: number): void {
    if (this.busy) return;
    const run = this.g.run!;
    const id = run.tools[i];
    if (!id) return;
    const d = toolDef(id);
    const t = L();
    const sel = [...this.selected];
    const can = d.cards === 0 || (sel.length >= 1 && sel.length <= d.cards);
    const apply = (type?: CardType) => {
      const r = useTool(run, i, { cards: d.cards ? sel : undefined, type });
      if (!this.g.check(r)) return;
      this.g.save();
      sfx.pack();
      if (id === 't3') {
        this.g.fx.burst(this.thermo.wm[4], this.thermo.wm[5], 'frost', 1.5);
        sfx.frost();
      }
      this.clearSelection();
      this.rebuildKeepState();
    };
    sheet((close) => [
      toolCard(id),
      d.cards > 0 ? h('div', { class: can ? 'c-ok' : 'c-warn', style: 'margin-top:4px' }, fmt(t.toolUi.pickCards, { n: d.cards }) + ` (${sel.length})`) : null,
      id === 't2' && can
        ? h(
            'div',
            { class: 'actions' },
            ...CARD_TYPES.map((ty) =>
              button([img(`card_typeicon8_${ty}`, 'i8'), t.cardTypes[ty]], () => {
                close();
                apply(ty);
              }, { color: 'blue' }),
            ),
          )
        : null,
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        button(t.ui.discardTool, () => {
          close();
          run.tools.splice(i, 1);
          this.g.save();
          this.rebuildKeepState();
        }, { color: 'red' }),
        id !== 't2'
          ? button(t.ui.use, () => {
              close();
              apply();
            }, { color: 'green', disabled: !can })
          : null,
      ),
    ]);
  }

  private rebuildKeepState(): void {
    this.enterAnim = false;
    this.rebuild();
    for (const id of this.g.run!.bench!.hand) {
      const cv = this.cards.get(id);
      if (cv) {
        cv.x = cv.tx;
        cv.y = cv.ty;
      }
    }
  }

  refresh(): void {
    if (!this.busy) this.rebuildKeepState();
  }

  update(): void {
    if (this.busy) return;
  }

  onKey(e: KeyboardEvent): void {
    if (this.busy) return;
    const b = this.g.run!.bench!;
    if (e.key >= '0' && e.key <= '9') {
      const i = e.key === '0' ? 9 : Number(e.key) - 1;
      const id = b.hand[i];
      if (id !== undefined) this.toggle(id);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      void this.doPlay();
    } else if (e.key === 'd' || e.key === 'D') void this.doDiscard();
    else if (e.key === 's' || e.key === 'S') this.els.sortBtn?.click();
  }
  private sortToggle: 'level' | 'type' = 'type'; // last used; the button offers the other one
}

export { isFinaleGen, cpuOf, partOf };
