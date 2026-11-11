import { game } from '../game/game';
import { L, fmt } from '../i18n';
import { CARD_TYPES } from '../core/types';
import { PROFILES, profileValues } from '../core/data/content';
import { button, h, img, sheet, tip } from './dom';
import { cardCard } from './describe';

const COLORS = { cpu: '#3a7bf0', gpu: '#3fbf5f', ram: '#f2b233', io: '#a05cf0' } as const;
const ENH_MARK = { oc: '🔥', opt: '★', eff: '❄', unst: '⚡' } as const;

/** Deck overview: 4 type columns × 10 levels; drawn cards are dimmed. */
export function openDeck(): void {
  const run = game.run;
  if (!run) return;
  const t = L();
  const inDraw = run.bench ? new Set(run.bench.draw) : null;
  const grid = h('div', { style: 'display:grid;grid-template-columns:18px repeat(4,1fr);gap:2px;font-size:9px;align-items:center' });
  grid.append(h('span', {}));
  for (const ty of CARD_TYPES) grid.append(h('div', { style: `text-align:center;font-family:var(--font-title);color:${COLORS[ty]}` }, img(`card_typeicon8_${ty}`, 'i8'), ' ', t.cardTypes[ty]));
  for (let lv = 10; lv >= 1; lv--) {
    grid.append(h('div', { class: 'dim', style: 'text-align:right' }, String(lv)));
    for (const ty of CARD_TYPES) {
      const cards = run.deck.filter((c) => c.type === ty && c.level === lv);
      const cell = h('div', { style: 'display:flex;gap:1px;flex-wrap:wrap;min-height:13px;justify-content:center' });
      for (const c of cards) {
        const avail = !inDraw || inDraw.has(c.id);
        const chip = h(
          'span',
          { style: `display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:13px;border-radius:2px;background:${COLORS[ty]};opacity:${avail ? 1 : 0.28};color:#0b0b12;font-size:8.5px;padding:0 2px` },
          `${lv}${c.enh ? ENH_MARK[c.enh] : ''}`,
        );
        tip(chip, () => cardCard(c));
        cell.append(chip);
      }
      grid.append(cell);
    }
  }
  const drivers = PROFILES.filter((p) => (run.drivers[p.id] ?? 1) > 1).map((p) => {
    const lv = run.drivers[p.id] ?? 1;
    const v = profileValues(p.id, lv);
    return h('div', { style: 'font-size:9.5px' }, img(p.icon, 'i16'), ` ${t.profiles[p.id].name} Lv.${lv} · ${v.l} × ${v.t}`);
  });
  sheet((close) => [
    h('h3', {}, `${t.deckUi.title} · ${fmt(t.deckUi.count, { n: run.deck.length })}`),
    run.bench ? h('div', { class: 'dim', style: 'font-size:9px;margin-bottom:3px' }, fmt(t.deckUi.inDraw, { n: run.bench.draw.length })) : null,
    grid,
    drivers.length ? h('div', { style: 'margin-top:6px' }, h('div', { class: 't-title c-gold', style: 'font-size:9px' }, t.deckUi.drivers), ...drivers) : null,
    h('div', { class: 'actions' }, button(t.ui.close, close, { color: 'blue' })),
  ]);
}
