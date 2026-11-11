import { BaseScreen, placeEl } from './base';
import { Sprite } from '../../render/scene';
import { button, h } from '../dom';
import { L, big, fmt } from '../../i18n';
import { sfx } from '../../audio/sfx';
import { bossDef } from '../../core/data/content';
import { tween } from '../../render/tween';

export class GameOverScreen extends BaseScreen {
  private record = false;
  private recorded = false;

  build(): void {
    const g = this.g;
    const run = g.run!;
    const go = run.gameOver!;
    if (!this.recorded) {
      this.recorded = true;
      this.record = g.recordGameOver();
      sfx.bsod();
      sfx.fan(0);
    }
    g.setBg('bsod');
    const t = L();
    const { w, h: H } = this.vp;
    const face = new Sprite('bsod_face', { region: 'content' });
    face.fit(this.portrait ? 64 : 56, 64);
    face.pos(this.portrait ? 50 : 50, this.portrait ? 70 : 48);
    this.root.add(face);
    const glitch = new Sprite('fx_glitch_noise', { region: 'cell' });
    glitch.stretchOk = true; // noise texture
    glitch.size(this.vp.fullW, this.vp.fullH).pos(w / 2, H / 2).play(16);
    glitch.alpha = 0.5;
    this.root.add(glitch);
    void tween(glitch, { alpha: 0 }, { dur: 0.9, real: true }).then(() => glitch.destroy());

    const benchName = go.boss ? t.bosses[go.boss].name : go.kind === 'office' ? t.bench.office : t.bench.gaming;
    const pct = Math.min(100, Math.floor((go.score / Math.max(1, go.target)) * 100));
    const st = run.stats;
    const statRow = (k: string, v: string) => h('div', { style: 'display:flex;justify-content:space-between;gap:10px' }, h('span', { style: 'opacity:.8' }, k), h('span', {}, v));
    const box = h(
      'div',
      { class: 't-mono', style: 'color:#fff;font-size:17px;line-height:1.05' },
      h('div', { style: 'font-size:21px;margin-bottom:8px' }, t.gameover.title),
      h('div', { style: 'opacity:.9;margin-bottom:8px' }, t.gameover.sub),
      h('div', { style: 'margin-bottom:8px' }, fmt(t.gameover.percent, { n: pct })),
      h('div', { style: 'opacity:.9' }, t.gameover.reasons[go.reason]),
      h('div', { style: 'margin:4px 0 10px' }, `${t.gameover.stopcode}: ${t.gameover.codes[go.reason]}`),
      this.record ? h('div', { class: 't-title', style: 'color:#ffe28a;font-size:12px;margin-bottom:6px' }, t.gameover.stats.record) : null,
      statRow(t.gameover.stats.gen, String(go.gen)),
      statRow(t.gameover.stats.bench, `${benchName} (${big(go.score)} / ${big(go.target)})`),
      statRow(t.gameover.stats.best, big(st.bestPlay)),
      statRow(t.gameover.stats.won, String(st.benchesWon)),
      statRow(t.gameover.stats.plays, String(st.plays)),
      statRow(t.gameover.stats.maxTemp, `${Math.round(st.maxTemp)} °C`),
      statRow(t.gameover.stats.seed, run.seed),
    );
    const bx = this.portrait ? 18 : 120;
    placeEl(box, { x: bx, y: this.portrait ? 118 : 18, w: w - bx - 18 });
    this.dom.append(box);
    const btns = h(
      'div',
      { style: 'display:flex;gap:8px' },
      button(t.gameover.title2, () => {
        g.run = null;
        g.show('title');
      }, { color: 'gray' }),
      button(t.gameover.again, () => g.newRun(), { color: 'green', cls: 'big' }),
    );
    placeEl(btns, { x: bx, y: H - 54 });
    this.dom.append(btns);
    void bossDef;
  }
}
