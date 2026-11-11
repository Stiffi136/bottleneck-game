import { frameURL } from '../render/assets';
import { sfx } from '../audio/sfx';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

/** Tiny hyperscript helper. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
  return el;
}

export function img(frame: string, cls = 'i16'): HTMLImageElement {
  const i = h('img', { class: cls, src: frameURL(frame), alt: '', draggable: 'false' });
  return i;
}

/** Icon + text chip with a common baseline: all icons get the same 11 px box, text is centred on it. */
export function statChip(icon: string, text: string): HTMLElement {
  return h('span', { class: 'statchip' }, img(icon, 'sc'), h('span', {}, text));
}

export type BtnColor = 'green' | 'red' | 'gray' | 'blue';

export function button(label: Child | Child[], onClick: () => void, opts: { color?: BtnColor; cls?: string; disabled?: boolean; icon?: string; title?: string } = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${opts.color ?? 'gray'} ${opts.cls ?? ''}`, type: 'button' });
  if (opts.icon) b.append(img(opts.icon, 'ic'));
  for (const c of Array.isArray(label) ? label : [label]) if (c !== null && c !== undefined && c !== false) b.append(typeof c === 'number' ? String(c) : c);
  b.disabled = !!opts.disabled;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    sfx.unlock();
    sfx.click();
    onClick();
  });
  if (opts.title) b.title = opts.title;
  return b;
}

/** Sets CSS variables with data URLs of the UI 9-slice sprites. */
export function installUiSprites(): void {
  const root = document.documentElement.style;
  for (const c of ['gruen', 'rot', 'grau', 'blau']) {
    for (let i = 0; i < 3; i++) root.setProperty(`--btn-${c}-${i}`, `url(${frameURL(`ui_button_${c}_${i}`)})`);
  }
  root.setProperty('--panel-dark', `url(${frameURL('ui_panel_dark')})`);
  root.setProperty('--panel-light', `url(${frameURL('ui_panel_light')})`);
  root.setProperty('--panel-bios', `url(${frameURL('ui_panel_bios')})`);
}

// ------------------------------------------------------------------ tooltip

let tipEl: HTMLElement | null = null;
let tipOwner: unknown = null;

function tipNode(): HTMLElement {
  if (!tipEl || !tipEl.isConnected) {
    tipEl = h('div', { id: 'tip' });
    document.getElementById('ui')!.appendChild(tipEl);
  }
  return tipEl;
}

/** Shows a tooltip near a virtual-px rect. */
export function showTip(content: HTMLElement | string, rect: { x: number; y: number; w: number; h: number }, owner: unknown = null): void {
  const el = tipNode();
  el.innerHTML = '';
  if (typeof content === 'string') el.innerHTML = content;
  else el.append(content);
  tipOwner = owner;
  const ui = document.getElementById('ui')!;
  const W = parseFloat(ui.style.width);
  const H = parseFloat(ui.style.height);
  el.style.left = '0px';
  el.style.top = '0px';
  el.classList.add('show');
  const tw = el.offsetWidth;
  const th = el.offsetHeight;
  let x = rect.x + rect.w / 2 - tw / 2;
  let y = rect.y - th - 4;
  if (y < 2) y = rect.y + rect.h + 4;
  if (y + th > H - 2) y = Math.max(2, H - th - 2);
  x = Math.max(2, Math.min(W - tw - 2, x));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

export function hideTip(owner: unknown = null): void {
  if (owner !== null && owner !== tipOwner) return;
  tipEl?.classList.remove('show');
  tipOwner = null;
}

function rectOf(el: HTMLElement): { x: number; y: number; w: number; h: number } {
  const ui = document.getElementById('ui')!;
  const ur = ui.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const s = ur.width / parseFloat(ui.style.width);
  return { x: (r.left - ur.left) / s, y: (r.top - ur.top) / s, w: r.width / s, h: r.height / s };
}

/** Attaches a tooltip to a DOM element: hover on desktop, long-press on touch. */
export function tip(el: HTMLElement, content: () => HTMLElement | string): void {
  el.classList.add('pe');
  let timer = 0;
  let longFired = false;
  el.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') showTip(content(), rectOf(el), el);
  });
  el.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') hideTip(el);
  });
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    longFired = false;
    timer = window.setTimeout(() => {
      longFired = true;
      showTip(content(), rectOf(el), el);
    }, 420);
  });
  const end = () => {
    clearTimeout(timer);
    if (longFired) setTimeout(() => hideTip(el), 1600);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener(
    'click',
    (e) => {
      if (longFired) {
        e.stopPropagation();
        e.preventDefault();
        longFired = false;
      }
    },
    true,
  );
}

// ------------------------------------------------------------------ toast

export function toast(text: string, kind: 'info' | 'bad' | 'good' = 'info', ms = 2200): void {
  const ui = document.getElementById('ui')!;
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts' });
    ui.appendChild(box);
  }
  const t = h('div', { class: `toast ${kind}` }, text);
  box.appendChild(t);
  if (kind === 'bad') sfx.error();
  setTimeout(() => {
    t.style.transition = 'opacity .3s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 320);
  }, ms);
}

// ------------------------------------------------------------------ sheet

export interface SheetHandle {
  el: HTMLElement;
  close: () => void;
  /** Re-runs the build function in place (keeps panel, scroll position and focus; no open animation). */
  refresh: () => void;
}

let openSheets: SheetHandle[] = [];

export function sheet(build: (close: () => void) => Child[], opts: { onClose?: () => void; dismissable?: boolean; cls?: string } = {}): SheetHandle {
  const ui = document.getElementById('ui')!;
  const backdrop = h('div', { class: 'backdrop' });
  const panel = h('div', { class: `sheet ${opts.cls ?? ''}` });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    panel.remove();
    openSheets = openSheets.filter((s) => s.el !== panel);
    hideTip();
    opts.onClose?.();
  };
  const fill = () => {
    panel.replaceChildren(h('div', { class: 'handle' }));
    for (const c of build(close)) if (c !== null && c !== undefined && c !== false) panel.append(typeof c === 'number' ? String(c) : c);
  };
  fill();
  const refresh = () => {
    if (closed) return;
    const top = panel.scrollTop;
    const ae = document.activeElement as HTMLElement | null;
    const focusIdx = ae && panel.contains(ae) ? [...panel.querySelectorAll('button,input')].indexOf(ae) : -1;
    fill();
    panel.scrollTop = top;
    if (focusIdx >= 0) (panel.querySelectorAll('button,input')[focusIdx] as HTMLElement | undefined)?.focus({ preventScroll: true });
    hideTip();
  };
  if (opts.dismissable !== false) backdrop.addEventListener('click', close);
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  ui.append(backdrop, panel);
  const handle = { el: panel, close, refresh };
  openSheets.push(handle);
  return handle;
}

export function closeAllSheets(): void {
  for (const s of [...openSheets]) s.close();
}

export function anySheetOpen(): boolean {
  return openSheets.length > 0;
}

export function confirmSheet(text: string, yes: string, no: string, onYes: () => void): void {
  sheet((close) => [
    h('p', { style: 'margin:4px 0 2px;font-size:11px' }, text),
    h(
      'div',
      { class: 'actions' },
      button(no, close, { color: 'gray' }),
      button(
        yes,
        () => {
          close();
          onYes();
        },
        { color: 'red' },
      ),
    ),
  ]);
}
