import { button, h, img, sheet, type SheetHandle } from './dom';
import { L, fmt } from '../i18n';
import { issueText, partName } from './describe';
import { sfx } from '../audio/sfx';
import type { Issue, Led } from '../core/compat';
import type { Build, PartInst } from '../core/types';
import { installed } from '../core/build';

export const LED_ORDER = ['cpu', 'dram', 'vga', 'boot'] as const satisfies readonly Led[];

/**
 * Beep code per debug LED (classic BIOS style): longs, then shorts.
 * CPU 5 short · DRAM 3 short · VGA 1 long 3 short · BOOT 2 long.
 */
export const BEEP: Record<Led, { longs: number; shorts: number }> = {
  cpu: { longs: 0, shorts: 5 },
  dram: { longs: 0, shorts: 3 },
  vga: { longs: 1, shorts: 3 },
  boot: { longs: 2, shorts: 0 },
};

// timing of sfx.beepCode (keep in sync with src/audio/sfx.ts)
const LONG_STEP = 0.6;
const LONG_DUR = 0.45;
const SHORT_STEP = 0.22;
const SHORT_DUR = 0.12;

/** "1 long, 3 short" */
export function beepText(led: Led): string {
  const t = L().postUi;
  const c = BEEP[led];
  const parts: string[] = [];
  if (c.longs) parts.push(fmt(t.long, { n: c.longs }));
  if (c.shorts) parts.push(fmt(t.short, { n: c.shorts }));
  return parts.join(', ');
}

/** Plays the beep code and lights the matching symbols in `row`. */
function playBeep(led: Led, row: HTMLElement): void {
  sfx.beepCode(BEEP[led].longs, BEEP[led].shorts);
  const syms = [...row.querySelectorAll<HTMLElement>('.beep-sym')];
  let t = 0;
  syms.forEach((el) => {
    const long = el.classList.contains('long');
    const on = t;
    const dur = long ? LONG_DUR : SHORT_DUR;
    t += long ? LONG_STEP : SHORT_STEP;
    window.setTimeout(() => el.classList.add('hot'), on * 1000);
    window.setTimeout(() => el.classList.remove('hot'), (on + dur) * 1000);
  });
}

function partNames(b: Build, uids: number[]): string[] {
  const all = new Map<number, PartInst>(installed(b).map((x) => [x.inst.uid, x.inst]));
  return uids.map((u) => all.get(u)).filter((p): p is PartInst => !!p).map((p) => partName(p.id));
}

/**
 * POST error dialog: debug LEDs with the failed one blinking, the beep code
 * (played and shown as symbols), the plain-text reason (GDD 8) and the parts
 * involved. Further errors are listed below.
 */
export function openPostError(b: Build, err: Issue, others: Issue[], onClose?: () => void): SheetHandle {
  const t = L();
  const led = err.led;
  const li = LED_ORDER.indexOf(led);
  const leds = h(
    'div',
    { class: 'post-leds' },
    ...LED_ORDER.map((l, i) =>
      h(
        'div',
        { class: `post-led ${i === li ? 'fail' : i < li ? 'pass' : ''}` },
        img(`fx_post_led_${i * 2 + (i === li ? 1 : 0)}`, 'i16'),
        h('span', {}, t.led[l]),
      ),
    ),
  );
  const syms = h('span', { class: 'beep-syms' });
  for (let i = 0; i < BEEP[led].longs; i++) syms.append(h('span', { class: 'beep-sym long' }));
  for (let i = 0; i < BEEP[led].shorts; i++) syms.append(h('span', { class: 'beep-sym short' }));
  const beepRow = h(
    'div',
    { class: 'beep-row' },
    h('span', { class: 'dim', style: 'font-size:9px' }, `${t.wb.beep}:`),
    syms,
    h('span', { class: 't-mono', style: 'font-size:11px' }, beepText(led)),
  );
  const names = partNames(b, err.uids);
  const rest = others.filter((o) => o !== err && o.severity === 'error');
  const handle = sheet(
    (close) => [
      h('h3', { class: 'c-bad' }, `${t.wb.postFail} · ${t.led[led]}`),
      leds,
      beepRow,
      h('div', { class: 'dim', style: 'font-size:9px;margin:1px 0 4px' }, `${t.led[led]} = ${t.postUi.area[led]}`),
      h('div', { class: 'post-reason' }, img('icon16_kompat_nein', 'i8'), ' ', issueText(err)),
      names.length ? h('div', { style: 'font-size:9.5px;margin-top:3px' }, h('span', { class: 'dim' }, `${t.postUi.affected}: `), names.join(', ')) : null,
      rest.length
        ? h(
            'div',
            { class: 'post-more' },
            h('div', { class: 'dim' }, t.postUi.more),
            ...rest.slice(0, 4).map((o) => h('div', {}, h('span', { class: 'c-bad' }, `[${t.led[o.led]}] `), issueText(o))),
            rest.length > 4 ? h('div', { class: 'dim' }, `+${rest.length - 4}`) : null,
          )
        : null,
      h(
        'div',
        { class: 'actions' },
        button(t.postUi.replay, () => playBeep(led, syms), { color: 'gray', icon: 'icon16_bios' }),
        button(t.ui.ok, close, { color: 'blue' }),
      ),
    ],
    { cls: 'post-sheet', onClose },
  );
  playBeep(led, syms);
  return handle;
}
