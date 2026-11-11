import { BaseScreen, placeEl } from './base';
import { Sprite } from '../../render/scene';
import { button, h, img, statChip, tip } from '../dom';
import { heatTip } from '../describe';
import { richLines } from '../rich';
import { L, big, fmt, money } from '../../i18n';
import { generationBenches, startBenchmark, statsOf } from '../../core/run';
import { bossDef } from '../../core/data/content';
import { openSettings } from '../settings';
import { openDeck } from '../deckSheet';
import { tween, ease } from '../../render/tween';
import { sfx } from '../../audio/sfx';
import { isFinaleGen } from '../../core/difficulty';

export class SelectScreen extends BaseScreen {
  build(): void {
    const g = this.g;
    const run = g.run!;
    g.setBg('pcb');
    const t = L();
    const { w, h: H } = this.vp;
    const benches = generationBenches(run);

    const head = h(
      'div',
      { style: 'display:flex;align-items:center;justify-content:space-between;gap:6px' },
      h('div', { class: 't-title shadow', style: 'font-size:15px' }, fmt(t.bench.chooseTitle, { g: run.gen })),
      h(
        'div',
        { style: 'display:flex;gap:12px;align-items:center' },
        h('span', { class: 't-title c-gold shadow', style: 'font-size:12px;margin-right:0' }, money(run.money)),
        button('', () => openDeck(), { color: 'gray', cls: 'iconbtn', icon: 'icon16_deck' }),
        button('', () => openSettings({ inRun: true }), { color: 'gray', cls: 'iconbtn', icon: 'icon16_einstellungen' }),
      ),
    );
    placeEl(head, { x: 8, y: 6, w: w - 16 });
    this.dom.append(head);

    const portrait = this.portrait;
    const chipW = portrait ? w - 24 : (w - 40) / 3;
    const chipH = portrait ? Math.min(104, (H - 180) / 3) : H - 140;
    benches.forEach((b, i) => {
      const x = portrait ? 12 : 12 + i * (chipW + 8);
      const y = portrait ? 40 + i * (chipH + 8) : 40;
      const name = b.kind === 'boss' ? t.bosses[b.boss!].name : b.kind === 'office' ? t.bench.office : t.bench.gaming;
      const kindLabel = b.kind === 'boss' ? (isFinaleGen(run.gen) ? t.bench.finale : t.bench.boss) : '';
      const panel = h(
        'div',
        { style: `opacity:${b.done ? 0.6 : 1};display:flex;flex-direction:column;justify-content:center;gap:2px;padding:6px 8px;${portrait ? 'padding-left:56px' : 'padding-top:56px;justify-content:flex-start;text-align:center;align-items:center'}` },
        kindLabel ? h('div', { class: 't-title c-bad', style: 'font-size:9.5px' }, kindLabel) : null,
        h('div', { class: 't-title shadow', style: 'font-size:11px' }, name),
        h('div', { style: 'font-size:10px' }, img('icon16_leistung'), ' ', fmt(t.bench.targetN, { n: big(b.target) })),
        h('div', { class: 'c-gold', style: 'font-size:10px' }, img('icon8_geld', 'i8'), ' ', fmt(t.bench.reward, { n: b.reward })),
        b.boss ? h('div', { style: 'font-size:9.5px' }, richLines(t.bosses[b.boss].desc, {}, 'c-warn')) : null,
        b.done ? h('div', { class: 'c-ok t-title', style: 'font-size:9.5px' }, '✔ ' + t.bench.done) : null,
      );
      placeEl(panel, { x, y, w: chipW, h: chipH });
      this.dom.append(panel);
      const p3 = this.panel({ x, y, w: chipW, h: chipH }, b.current ? 'light' : 'dark');
      if (b.done) p3.alpha = 0.6;
      const icon = new Sprite(b.kind === 'boss' ? bossDef(b.boss!).icon : `bench_${b.kind}`, { region: 'content' });
      icon.fit(34, 34);
      icon.pos(portrait ? x + 30 : x + chipW / 2, portrait ? y + chipH / 2 : y + 30);
      if (b.done) icon.mode = 'gray';
      this.root.add(icon);
      if (b.current) {
        icon.tick = () => (icon.rot = Math.sin(performance.now() / 300) * 0.06);
        icon.scale(0.2);
        void tween(icon, { sx: 1, sy: 1 }, { dur: 0.4, ease: ease.outBack, delay: 0.1 * i });
      }
    });

    const st = statsOf(run);
    const coolChip = statChip('icon8_kuehlung', `${t.stat.cooling} ${st.cooling}`);
    tip(coolChip, heatTip);
    const info = h(
      'div',
      { class: 'glass', style: 'padding:4px 6px;font-size:9.5px;display:flex;flex-wrap:wrap;align-items:center;gap:3px 8px' },
      statChip('icon8_kerne', `${t.stat.cores} ${st.cores}`),
      statChip('icon16_handgroesse', `${t.stat.hand} ${st.handSize}`),
      statChip('icon8_neuprio', `${t.stat.rerolls} ${st.rerolls}`),
      coolChip,
      statChip('icon8_watt', `${st.tdp}/${st.watt} W`),
    );
    const startBtn = button(t.bench.startBench + ' ▶', () => {
      if (g.check(startBenchmark(run))) {
        sfx.boot();
        g.save();
        g.route();
      }
    }, { color: 'green', cls: 'big' });
    if (portrait) {
      placeEl(info, { x: 12, y: H - 100, w: w - 24 });
      placeEl(startBtn, { x: 12, y: H - 56, w: w - 24, h: 44 });
    } else {
      placeEl(info, { x: 12, y: H - 92, w: w - 24 });
      placeEl(startBtn, { x: w - 232, y: H - 52, w: 220, h: 42 });
    }
    this.dom.append(info, startBtn);
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      const run = this.g.run!;
      if (this.g.check(startBenchmark(run))) {
        this.g.save();
        this.g.route();
      }
    }
  }
}
