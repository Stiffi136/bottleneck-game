import { game } from '../game/game';
import { L, fmt } from '../i18n';
import type { ProfileId } from '../core/types';
import { PROFILES, profileValues } from '../core/data/content';
import { statsOf } from '../core/run';
import { button, h, img, sheet } from './dom';
import { profileName } from './describe';
import { rich } from './rich';

/** Number of cards a profile needs (from 4 on, the core count matters). */
const MIN_CARDS: Record<ProfileId, number> = {
  single: 1,
  dual: 2,
  quadch: 4,
  hetero: 4,
  triple: 3,
  pipeline: 5,
  special: 5,
  fullstack: 5,
  quadcore: 4,
  optpipe: 5,
};

/**
 * "Combos" sheet: all 10 workload profiles, best first – rank, current values (driver level
 * included), core requirement (✔ / ⚠ with the current core count) and the explanation.
 * `current` highlights the profile that the selected cards form right now.
 */
export function openProfileHelp(current?: ProfileId | ''): void {
  const run = game.run;
  const t = L();
  const cores = run ? statsOf(run).cores : 4;
  const rows = [...PROFILES].sort((a, b) => b.rank - a.rank).map((p) => {
    const lv = run?.drivers[p.id] ?? 1;
    const v = profileValues(p.id, lv);
    const need = MIN_CARDS[p.id];
    const ok = cores >= need;
    return h(
      'div',
      { class: `prof-row${current === p.id ? ' cur' : ''}` },
      h(
        'div',
        { class: 'prof-head' },
        h('span', { class: 'prof-rank' }, `#${p.rank}`),
        img(p.icon, 'i16'),
        h('b', { class: 't-title' }, profileName(p.id)),
        lv > 1 ? h('span', { class: 'chip c-gold' }, fmt(t.bench.profileLv, { n: lv })) : null,
        h('span', { class: 'prof-vals' }, h('span', { class: 'c-perf' }, String(v.l)), ' × ', h('span', { class: 'c-clock' }, String(v.t))),
      ),
      need >= 4
        ? h('div', { class: ok ? 'ok-badge' : 'warn-badge' }, ok ? '✔ ' : '⚠ ', fmt(t.profileHelpUi.needCores, { n: need }))
        : null,
      h('div', { class: 'prof-help' }, rich(t.profileHelp[p.id])),
    );
  });
  sheet((close) => [
    h('h3', {}, t.profileHelpUi.title),
    h('p', { class: 'dim', style: 'margin:0 0 5px' }, rich(t.profileHelpUi.intro)),
    h('div', { class: 'list' }, ...rows),
    h('div', { class: 'actions' }, button(t.ui.close, close, { color: 'blue' })),
  ], { cls: 'prof-sheet' });
}
