import { game } from '../game/game';
import { L, fmt } from '../i18n';
import { toolDef } from '../core/data/content';
import { card, toolTargets, useTool, discardTool } from '../core/run';
import { CARD_TYPES, type CardType } from '../core/types';
import { button, h, img, sheet } from './dom';
import { cardName, toolCard } from './describe';
import { sfx } from '../audio/sfx';

const COLORS = { cpu: '#3a7bf0', gpu: '#3fbf5f', ram: '#f2b233', io: '#a05cf0' } as const;

/** Tool usage outside the benchmark (shop / workbench): picks from 6 drawn deck cards. */
export function openToolSheet(index: number, onDone: () => void): void {
  const run = game.run!;
  const id = run.tools[index];
  if (!id) return;
  const d = toolDef(id);
  const t = L();
  const picked = new Set<number>();
  let type: CardType | null = null;
  const render = (close: () => void) => {
    const targets = toolTargets(run);
    const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:4px' });
    for (const cid of targets) {
      const c = card(run, cid);
      const on = picked.has(cid);
      const el = h(
        'button',
        {
          class: 'pe',
          type: 'button',
          style: `font-family:var(--font-body);font-size:9.5px;color:#0b0b12;background:${COLORS[c.type]};border:2px solid ${on ? '#ffe28a' : '#0b0b12'};border-radius:3px;padding:3px 2px;min-height:34px;box-shadow:${on ? '0 0 0 2px #ffe28a' : 'none'}`,
        },
        h('div', { style: 'font-family:var(--font-title);font-size:11px' }, `${t.cardTypes[c.type]} ${c.level}${c.enh ? ' ★' : ''}`),
        h('div', { style: 'font-size:9.5px;opacity:.85' }, cardName(c)),
      );
      el.addEventListener('click', () => {
        if (picked.has(cid)) picked.delete(cid);
        else if (picked.size < d.cards) picked.add(cid);
        sfx.select();
        close();
        open();
      });
      grid.append(el);
    }
    const can = (d.cards === 0 || (picked.size >= 1 && picked.size <= d.cards)) && !d.benchOnly && (id !== 't2' || !!type);
    return [
      toolCard(id),
      d.benchOnly ? h('div', { class: 'c-warn' }, t.errors.notAllowed) : null,
      d.cards > 0 ? h('div', { class: 'dim', style: 'margin-top:4px' }, `${t.toolUi.fromDeck} · ${fmt(t.toolUi.pickCards, { n: d.cards })}`) : null,
      d.cards > 0 ? grid : null,
      id === 't2'
        ? h(
            'div',
            { class: 'actions' },
            ...CARD_TYPES.map((ty) => {
              const b = button([img(`card_typeicon8_${ty}`, 'i8'), t.cardTypes[ty]], () => {
                type = ty;
                close();
                open();
              }, { color: type === ty ? 'blue' : 'gray', cls: 'small' });
              return b;
            }),
          )
        : null,
      h(
        'div',
        { class: 'actions' },
        button(t.ui.close, close, { color: 'gray' }),
        button(t.ui.discardTool, () => {
          discardTool(run, index);
          game.save();
          close();
          onDone();
        }, { color: 'red' }),
        button(t.ui.use, () => {
          const r = useTool(run, index, { cards: d.cards ? [...picked] : undefined, type: type ?? undefined });
          if (!game.check(r)) return;
          game.save();
          sfx.pack();
          close();
          onDone();
        }, { color: 'green', disabled: !can }),
      ),
    ];
  };
  const open = () => sheet((close) => render(close));
  open();
}
