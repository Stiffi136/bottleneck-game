import { game } from '../game/game';
import { L, LANGS, type Lang } from '../i18n';
import { button, confirmSheet, h, sheet } from './dom';
import { sfx } from '../audio/sfx';

/** Settings bottom sheet (also the pause menu). */
export function openSettings(opts: { inRun?: boolean } = {}): void {
  const s = game.settings;
  const t = L();
  const seg = <T extends string | number | boolean>(values: T[], labels: string[], cur: T, set: (v: T) => void) => {
    const box = h('div', { class: 'seg' });
    values.forEach((v, i) => {
      const b = button(labels[i]!, () => {
        set(v);
        game.applySettings();
        handle.close();
        openSettings(opts);
      }, { color: 'gray' });
      if (v === cur) b.classList.add('on');
      box.append(b);
    });
    return box;
  };
  const onOff = (cur: boolean, set: (v: boolean) => void) => seg([true, false], [t.settings.on, t.settings.off], cur, set);
  const vol = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(s.volume * 100)) }) as HTMLInputElement;
  vol.addEventListener('input', () => {
    s.volume = Number(vol.value) / 100;
    game.applySettings();
  });
  vol.addEventListener('change', () => sfx.coin());
  const handle = sheet((close) => [
    h('h3', {}, t.settings.title),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.language), seg<Lang>(Object.keys(LANGS) as Lang[], Object.values(LANGS).map((d) => d.langName), s.lang, (v) => (s.lang = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.sound), onOff(!s.muted, (v) => (s.muted = !v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.volume), vol),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.fanNoise), onOff(s.fan, (v) => (s.fan = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.bgm), onOff(s.music, (v) => (s.music = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.speed), seg<1 | 2 | 4>([1, 2, 4], ['1×', '2×', '4×'], s.speed, (v) => (s.speed = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.scorePreview), onOff(s.scorePreview, (v) => (s.scorePreview = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.screenshake), onOff(s.shake, (v) => (s.shake = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.crt), onOff(s.crt, (v) => (s.crt = v))),
    h('div', { class: 'setrow' }, h('span', {}, t.settings.lefty), onOff(s.lefty, (v) => (s.lefty = v))),
    game.run && opts.inRun
      ? h('div', { class: 'setrow' }, h('span', { class: 'dim' }, `${t.ui.seed}: ${game.run.seed}`), button(t.settings.abandon, () => {
          close();
          confirmSheet(t.ui.confirmNewRun, t.ui.yes, t.ui.no, () => {
            game.run = null;
            game.save();
            localStorage.removeItem('bottleneck.run.v1');
            game.show('title');
          });
        }, { color: 'red', cls: 'small' }))
      : null,
    h('p', { class: 'dim', style: 'font-size:8.5px;margin:6px 0 0' }, `${t.settings.credits}: ${t.settings.creditsText}`),
    h('div', { class: 'actions' }, button(t.ui.close, close, { color: 'blue' })),
  ], { onClose: () => game.engine.current && (game.engine.current as { refresh?: () => void }).refresh?.() });
}
