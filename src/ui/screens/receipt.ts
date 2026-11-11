import { BaseScreen, placeEl } from './base';
import { button, h } from '../dom';
import { L, fmt, money } from '../../i18n';
import { collectReceipt } from '../../core/run';
import { frameURL } from '../../render/assets';
import { sfx } from '../../audio/sfx';
import { wait } from '../../render/tween';

export class ReceiptScreen extends BaseScreen {
  private printing = false;

  build(): void {
    const g = this.g;
    const run = g.run!;
    const rc = run.receipt!;
    g.setBg('pcb');
    const t = L();
    const { w, h: H } = this.vp;
    const pw = Math.min(250, w - 40);
    const paper = h('div', {
      class: 't-mono',
      style: `background:#f2eee2;color:#22222e;font-size:15px;line-height:1.05;padding:10px 12px 14px;box-shadow:0 6px 0 rgba(0,0,0,.35);transform-origin:50% 0;
        background-image:linear-gradient(rgba(0,0,0,.03) 50%, transparent 50%);background-size:100% 4px;`,
    });
    const edge = h('div', { style: `height:6px;background:url(${frameURL('ui_receipt_edge')}) repeat-x;background-size:auto 6px;filter:brightness(1.1)` });
    const wrap = h('div', { style: 'display:flex;flex-direction:column' }, paper, edge);
    const lines: HTMLElement[] = [];
    const row = (a: string, b: string, cls = '') => h('div', { class: cls, style: 'display:flex;justify-content:space-between;gap:8px' }, h('span', {}, a), h('span', {}, b));
    paper.append(
      h('div', { style: 'text-align:center;font-size:17px' }, t.receipt.shopName),
      h('div', { style: 'text-align:center' }, t.receipt.title),
      h('div', { style: 'text-align:center;opacity:.7' }, `${t.stat.gen} ${run.gen} · ${rc.kind === 'office' ? t.bench.office : rc.kind === 'gaming' ? t.bench.gaming : t.bench.boss}`),
      h('div', { style: 'border-top:2px dashed #22222e;margin:5px 0' }),
    );
    for (const l of rc.lines) {
      const label = fmt(t.receipt.lines[l.key], { n: l.n ?? 0 });
      const el = row(label, (l.amount >= 0 ? '+' : '') + money(l.amount), l.info ? '' : '');
      if (l.info) el.style.opacity = '0.55';
      if (l.amount < 0) el.style.color = '#a0202a';
      lines.push(el);
    }
    lines.push(h('div', { style: 'border-top:2px dashed #22222e;margin:5px 0' }));
    lines.push(row(t.receipt.total, (rc.total >= 0 ? '+' : '') + money(rc.total)));
    lines.push(row(t.receipt.balance, money(rc.moneyAfter)));
    if (rc.debtAfter > 0) lines.push(h('div', { style: 'color:#a0202a' }, fmt(t.receipt.debtLeft, { n: rc.debtAfter })));
    lines.push(h('div', { style: 'text-align:center;margin-top:6px;opacity:.7' }, t.receipt.thanks));
    lines.push(h('div', { style: 'text-align:center;letter-spacing:1px;font-size:20px;margin-top:2px' }, '|||| ||| |||| | ||'));
    for (const l of lines) {
      l.style.visibility = 'hidden';
      paper.append(l);
    }
    placeEl(wrap, { x: (w - pw) / 2, y: this.portrait ? 40 : 14, w: pw });
    this.dom.append(wrap);
    const next = button(t.ui.next + ' ▶', () => this.next(), { color: 'green', cls: 'big' });
    next.style.visibility = 'hidden';
    placeEl(next, { x: (w - 180) / 2, y: H - 56, w: 180, h: 44 });
    this.dom.append(next);
    // print animation
    this.printing = true;
    wrap.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
    void (async () => {
      await wait(0.25);
      for (const l of lines) {
        if (!this.printing) break;
        l.style.visibility = 'visible';
        sfx.printer();
        await wait(0.13);
      }
      for (const l of lines) l.style.visibility = 'visible';
      sfx.cash();
      next.style.visibility = 'visible';
      this.printing = false;
    })();
    this.dom.addEventListener('pointerdown', () => {
      if (this.printing) {
        this.printing = false;
        for (const l of lines) l.style.visibility = 'visible';
        next.style.visibility = 'visible';
      }
    });
    this.dom.classList.add('pe');
  }

  private next(): void {
    const g = this.g;
    if (g.check(collectReceipt(g.run!))) {
      g.save();
      g.route();
    }
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') this.next();
  }
}
