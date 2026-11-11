import { game } from '../game/game';
import { L, fmt, money } from '../i18n';
import { button, h, sheet } from './dom';
import { ocAllowed, setOc, stabilityTest, statsOf, swIds } from '../core/run';
import { installed } from '../core/build';
import { part } from '../core/data/hardware';
import { partName } from './describe';
import { sfx } from '../audio/sfx';

/** Retro BIOS screen: overclocking and the silicon lottery (GDD 9). */
export function openBios(onClose: () => void): void {
  const run = game.run!;
  const hd: { h?: ReturnType<typeof sheet> } = {};
  hd.h = sheet(
      (close) => {
        const t = L();
        const st = statsOf(run);
        const rows: HTMLElement[] = [];
        const undervolt = swIds(run).includes('sw16');
        for (const { inst } of installed(run.build)) {
          const d = part(inst.id);
          if (d.cat !== 'cpu' && d.cat !== 'gpu' && d.cat !== 'ram') continue;
          const allowed = ocAllowed(run, inst.uid);
          const unstable = inst.limitKnown && inst.oc > inst.limit;
          const per =
            d.cat === 'cpu'
              ? `+${inst.oc} ${t.stat.clockShort} · +${inst.oc} ${t.stat.perfShort}/CPU · +${inst.oc}°/CPU · ${Math.round(d.tdp * (1 + 0.2 * inst.oc))} W`
              : d.cat === 'gpu'
                ? `+${inst.oc * 3} ${t.stat.perfShort}/GPU · +${inst.oc}°/GPU · ${Math.round(d.tdp * (1 + 0.15 * inst.oc))} W`
                : `+${inst.oc} ${t.stat.perfShort}/RAM`;
          const lvl = h('span', { style: 'display:inline-block;min-width:36px;text-align:center;font-size:20px' }, allowed ? `[${inst.oc}]` : '[-]');
          const change = (dv: number) => {
            if (game.check(setOc(run, inst.uid, inst.oc + dv))) {
              sfx.tick(inst.oc * 3);
              game.save();
              hd.h?.refresh();
            }
          };
          rows.push(
            h(
              'div',
              { style: 'border-bottom:1px dashed #6a8ad8;padding:3px 0 4px' },
              h('div', { style: 'color:#ffe28a;font-size:17px' }, partName(inst.id)),
              h(
                'div',
                { style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap' },
                h('span', {}, t.biosUi.oc + ':'),
                button('◄', () => change(-1), { color: 'gray', cls: 'small', disabled: !allowed || inst.oc <= 0 }),
                lvl,
                button('►', () => change(1), { color: 'gray', cls: 'small', disabled: !allowed || inst.oc >= 3 }),
                h('span', { style: 'margin-left:6px' }, `${t.biosUi.limit}: ${inst.limitKnown ? inst.limit : t.biosUi.unknown}`),
                !inst.limitKnown && allowed
                  ? button(t.biosUi.test, () => {
                      if (game.check(stabilityTest(run, inst.uid))) {
                        sfx.beep();
                        game.save();
                        hd.h?.refresh();
                      }
                    }, { color: 'blue', cls: 'small', disabled: run.money < 1 })
                  : null,
              ),
              allowed
                ? h('div', { style: `font-size:15px;color:${unstable ? '#ff6a55' : '#cfe0ff'}` }, unstable ? `${t.biosUi.unstable} (> ${inst.limit})` : per)
                : h('div', { style: 'font-size:15px;color:#9bb0e0' }, `${t.biosUi.locked}: ${undervolt ? t.biosUi.undervolt : d.cat === 'ram' ? t.biosUi.lockedRam : d.cat === 'cpu' ? t.biosUi.lockedWhy : ''}`),
            ),
          );
        }
        return [
          h(
            'div',
            { class: 't-mono', style: 'background:#1a2f8f;color:#e6ecff;margin:-4px -6px 0;padding:6px 8px;border:2px solid #9bb4ff;font-size:16px;line-height:1.05' },
            h('div', { style: 'text-align:center;background:#9bb4ff;color:#1a2f8f;margin:-6px -8px 6px;padding:2px' }, t.biosUi.title),
            ...(rows.length ? rows : [h('div', {}, t.biosUi.noParts)]),
            h('div', { style: 'margin-top:5px;color:#9bb4ff' }, `${st.tdp}/${st.watt} W · ${t.stat.money}: ${money(run.money)}`),
            h('div', { style: 'margin-top:2px;color:#9bb4ff;font-size:14px' }, t.biosUi.hint),
          ),
          h('div', { class: 'actions' }, button(t.biosUi.exit, close, { color: 'blue' })),
        ];
      },
      { onClose },
    );
  void fmt;
}
