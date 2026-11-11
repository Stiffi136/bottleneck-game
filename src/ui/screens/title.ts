import { BaseScreen, placeEl } from './base';
import { Sprite, Text } from '../../render/scene';
import { button, confirmSheet, h } from '../dom';
import { L, fmt } from '../../i18n';
import { openSettings } from '../settings';
import { tween, ease } from '../../render/tween';
import { sfx } from '../../audio/sfx';

export class TitleScreen extends BaseScreen {
  private logo!: Sprite;
  private glintT = 2;

  build(): void {
    const g = this.g;
    g.setBg('title');
    const t = L();
    const { w, h: H } = this.vp;
    const portrait = this.portrait;
    this.logo = new Sprite('logo_bottleneck', { region: 'anim' });
    const lw = portrait ? Math.min(220, w * 0.66) : 190;
    this.logo.fit(lw, lw);
    this.logo.pos(portrait ? w / 2 : w * 0.3, portrait ? H * 0.24 : H * 0.36);
    this.root.add(this.logo);
    this.logo.scale(0.6);
    this.logo.alpha = 0;
    void tween(this.logo, { sx: 1, sy: 1, alpha: 1 }, { dur: 0.6, ease: ease.outBack, real: true });
    const tag = new Text(t.title.tagline, { font: 'body', size: 11, align: 'center', valign: 'middle', color: 0xcfd0e0 });
    tag.pos(this.logo.x, this.logo.y + this.logo.h / 2 + 14);
    this.root.add(tag);
    const sub = new Text(t.meta.subtitle.toUpperCase(), { font: 'title', size: 9.5, align: 'center', valign: 'middle', color: 0x8cc4ff });
    sub.pos(this.logo.x, tag.y + 14);
    this.root.add(sub);

    const col = h('div', { style: 'display:flex;flex-direction:column;gap:7px;align-items:stretch' });
    const run = g.run;
    if (run && run.phase !== 'gameover') {
      col.append(button(fmt(t.title.resume, { g: run.gen }), () => g.route(), { color: 'green', cls: 'big' }));
    }
    col.append(
      button(t.ui.newRun, () => {
        if (run && run.phase !== 'gameover') confirmSheet(t.ui.confirmNewRun, t.ui.yes, t.ui.no, () => g.newRun());
        else g.newRun();
      }, { color: run ? 'blue' : 'green', cls: 'big' }),
    );
    col.append(button(t.ui.settings, () => openSettings(), { color: 'gray', icon: 'icon16_einstellungen' }));
    const best = g.bestGen();
    if (best) col.append(h('div', { class: 't-title c-gold shadow', style: 'text-align:center;font-size:9.5px;margin-top:2px' }, fmt(t.ui.best, { g: best })));
    const bw = 180;
    if (portrait) placeEl(col, { x: (w - bw) / 2, y: H * 0.56, w: bw });
    else placeEl(col, { x: w * 0.62, y: H * 0.3, w: bw });
    this.dom.append(col);
    const ver = h('div', { class: 'dim', style: 'font-size:9.5px' }, 'v0.1 MVP');
    placeEl(ver, { x: 6, y: H - 14 });
    this.dom.append(ver);
  }

  update(dt: number): void {
    this.glintT -= dt;
    if (this.glintT <= 0 && this.logo) {
      this.glintT = 3.5;
      this.logo.play(10, false);
      this.logo.onAnimEnd = () => (this.logo.frameIndex = 0);
    }
    this.logo.y += Math.sin(performance.now() / 700) * 0.03;
    void sfx;
  }
}
