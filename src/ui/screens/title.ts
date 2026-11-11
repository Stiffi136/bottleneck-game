import { BaseScreen, placeEl } from './base';
import { Text } from '../../render/scene';
import { button, confirmSheet, h } from '../dom';
import { L, fmt } from '../../i18n';
import { openSettings } from '../settings';
import { tween, ease } from '../../render/tween';
import { LogoView } from '../../view/logo';

export class TitleScreen extends BaseScreen {
  private logo!: LogoView;

  build(): void {
    const g = this.g;
    g.setBg('title');
    const t = L();
    const { w, h: H } = this.vp;
    const portrait = this.portrait;
    this.logo = new LogoView();
    const ex = this.logo.extent, lw = ex.x1 - ex.x0, lh = ex.y1 - ex.y0;
    // fit the whole logo (words + PC) into the box; uniform scale only
    const boxW = portrait ? w - 20 : Math.min(w - 60, 520), boxH = portrait ? H * 0.2 : H * 0.36;
    const k = Math.min(boxW / lw, boxH / lh);
    const cx = w / 2, top = portrait ? H * 0.1 : 14;
    this.logo.pos(cx - ((ex.x0 + ex.x1) / 2) * k, top + lh * k);
    this.logo.sx = this.logo.sy = k * 0.6;
    this.logo.alpha = 0;
    this.root.add(this.logo);
    void tween(this.logo, { sx: k, sy: k, alpha: 1 }, { dur: 0.6, ease: ease.outBack, real: true });
    const logoBottom = top + lh * k;
    const tag = new Text(t.title.tagline, { font: 'body', size: 11, align: 'center', valign: 'middle', color: 0xcfd0e0 });
    tag.pos(cx, logoBottom + 14);
    this.root.add(tag);
    const sub = new Text(t.meta.subtitle.toUpperCase(), { font: 'title', size: 9.5, align: 'center', valign: 'middle', color: 0x8cc4ff });
    sub.pos(cx, tag.y + 14);
    this.root.add(sub);
    const colY = logoBottom + 48;

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
    placeEl(col, { x: (w - bw) / 2, y: colY, w: bw });
    this.dom.append(col);
    const ver = h('div', { class: 'dim', style: 'font-size:9.5px' }, 'v0.1 MVP');
    placeEl(ver, { x: 6, y: H - 14 });
    this.dom.append(ver);
  }
}
