import { Node, Rect2, Sprite, Text, rgb } from '../render/scene';
import { big } from '../i18n';
import { softwareDef } from '../core/data/content';
import type { SoftwareId } from '../core/types';

export function tempFrac(t: number): number {
  return Math.max(0, Math.min(1, 0.06 + ((t - 35) * 0.86) / 65));
}

export function heatColor(t: number): number {
  if (t >= 100) return 0xe8432d;
  if (t >= 85) return 0xff8a2e;
  if (t >= 70) return 0xffd23f;
  return 0x8cc4ff;
}

/** Thermometer, horizontal (portrait) or vertical (landscape). */
export class Thermo extends Node {
  private frameS: Sprite;
  private fill: Sprite;
  private label: Text;
  temp = 35;
  private shown = 35;
  private marks: Rect2[] = [];
  /** forecast of the selected play: ghost bar (current → peak), peak marker and end-of-turn marker */
  private ghost: Rect2;
  private peakMark: Rect2;
  private endMark: Rect2;
  private fc: { peak: number; end: number } | null = null;
  constructor(public vertical: boolean, length: number) {
    super();
    if (vertical) {
      this.frameS = new Sprite('ui_thermo_v_frame', { region: 'anim' });
      this.frameS.fit(30, length);
      this.fill = new Sprite('ui_thermo_v_fill', { region: 'content' });
      this.fill.fit(99, this.frameS.h * 0.78); // natural aspect, height-limited
      this.fill.y = -this.frameS.h * 0.035;
    } else {
      this.frameS = new Sprite('ui_thermo_h_frame', { region: 'content' });
      this.frameS.size(length, length * (11.5 / 123));
      this.fill = new Sprite('ui_thermo_h_fill', { region: 'content' });
      this.fill.fit(this.frameS.w * 0.95, 99); // natural aspect, width-limited
    }
    this.fill.ax = vertical ? 0.5 : 0;
    this.fill.ay = vertical ? 0.5 : 0.5;
    if (!vertical) this.fill.x = -this.fill.w / 2;
    this.add(this.frameS);
    this.add(this.fill);
    for (const [t, c] of [
      [85, 0xffd23f],
      [100, 0xe8432d],
    ] as const) {
      const m = vertical ? new Rect2(this.fill.w + 6, 1, c) : new Rect2(1, this.fill.h + 5, c);
      m.ax = m.ay = 0.5;
      const f = tempFrac(t);
      if (vertical) m.pos(0, this.fill.y + this.fill.h / 2 - this.fill.h * f);
      else m.pos(this.fill.x + this.fill.w * f, 0);
      this.add(m);
      this.marks.push(m);
    }
    const thick = 2;
    this.ghost = new Rect2(vertical ? this.fill.w * 0.5 : 1, vertical ? 1 : this.fill.h * 0.6, 0xffffff, 0.5);
    this.ghost.ax = vertical ? 0.5 : 0;
    this.ghost.ay = vertical ? 1 : 0.5;
    this.peakMark = new Rect2(vertical ? this.fill.w + 8 : thick, vertical ? thick : this.fill.h + 8, 0xffffff);
    this.endMark = new Rect2(vertical ? this.fill.w + 8 : thick, vertical ? thick : this.fill.h + 8, 0x5fe8e0);
    for (const n of [this.ghost, this.peakMark, this.endMark]) {
      if (n !== this.ghost) n.ax = n.ay = 0.5;
      n.visible = false;
      this.add(n);
    }
    this.label = new Text('35 °C', { font: 'title', size: 9.5, align: vertical ? 'center' : 'left', valign: 'middle' });
    if (vertical) this.label.pos(0, this.frameS.h / 2 + 8);
    else this.label.pos(this.frameS.w / 2 + 5, 0);
    this.add(this.label);
    this.set(35, true);
  }

  set(t: number, instant = false): void {
    this.temp = t;
    if (instant) this.shown = t;
  }

  /** Shows the outlook of the selected cards (null hides it): peak after the heat step, end after cooling. */
  setForecast(fc: { peak: number; end: number } | null): void {
    this.fc = fc;
    for (const n of [this.ghost, this.peakMark, this.endMark]) n.visible = !!fc;
    if (fc) {
      const col = fc.peak >= 85 ? 0xe8432d : 0xf4f4fa;
      this.peakMark.tint = rgb(col);
      this.ghost.tint = rgb(fc.peak >= 85 ? 0xe8432d : heatColor(fc.peak));
    }
  }

  private place(n: Rect2, t: number): void {
    const f = tempFrac(t);
    if (this.vertical) n.pos(0, this.fill.y + this.fill.h / 2 - this.fill.h * f);
    else n.pos(this.fill.x + this.fill.w * f, 0);
  }

  get labelNode(): Text {
    return this.label;
  }

  override tick = (dt: number): void => {
    this.shown += (this.temp - this.shown) * Math.min(1, dt * 6);
    const f = tempFrac(this.shown);
    if (this.vertical) this.fill.cropT = f;
    else this.fill.cropR = f;
    if (this.fc) {
      const a = tempFrac(this.shown);
      const b = tempFrac(this.fc.peak);
      this.place(this.peakMark, this.fc.peak);
      this.place(this.endMark, this.fc.end);
      this.place(this.ghost, this.shown);
      if (this.vertical) {
        this.ghost.h = Math.max(0, this.fill.h * (b - a));
      } else this.ghost.w = Math.max(0, this.fill.w * (b - a));
    }
    this.label.text = `${Math.round(this.shown)} °C`;
    this.label.color(heatColor(this.shown));
    const hot = this.shown >= 85;
    if (this.vertical && this.frameS.frames.length > 1) this.frameS.frameIndex = hot && Math.floor(performance.now() / 250) % 2 ? 1 : 0;
    this.frameS.flash = hot ? 0.25 + 0.25 * Math.sin(performance.now() / 90) : 0;
  };
}

/** Value box for Perf (blue) or Clock (red). */
export class ValueBox extends Node {
  readonly box: Sprite;
  readonly text: Text;
  value = 0;
  constructor(kind: 'perf' | 'clock', w = 84) {
    super();
    this.box = new Sprite(kind === 'perf' ? 'ui_box_leistung' : 'ui_box_takt', { region: 'anim' });
    this.box.fit(w, w);
    this.add(this.box);
    this.text = new Text('0', { font: 'title', size: 12, align: 'center', valign: 'middle', color: 0xf4f4fa });
    this.text.x = this.box.w * 0.12;
    this.add(this.text);
  }
  get w(): number {
    return this.box.w;
  }
  get h(): number {
    return this.box.h;
  }
  setValue(v: number): void {
    this.value = v;
    const s = big(Math.round(v * 10) / 10);
    this.text.text = s;
    const maxW = this.box.w * 0.62;
    this.text.setSize(12);
    if (this.text.width > maxW) this.text.setSize(Math.max(7, (12 * maxW) / this.text.width));
  }
  /** Brief highlight frame (puls animation). */
  pulseFrame(): void {
    this.box.frameIndex = 2;
    setTimeout(() => (this.box.frameIndex = 0), 120);
  }
  override bounds() {
    return { x: -this.box.w / 2, y: -this.box.h / 2, w: this.box.w, h: this.box.h };
  }
}

export class ScoreBar extends Node {
  private frameS: Sprite;
  private fill: Sprite;
  k = 0;
  private shown = 0;
  constructor(public length: number) {
    super();
    this.frameS = new Sprite('ui_scorebar_frame', { region: 'content' });
    this.frameS.size(length, length * (31 / 586));
    this.fill = new Sprite('ui_scorebar_fill', { region: 'content', ax: 0 });
    this.fill.fit(length * 0.962, 99); // natural aspect, width-limited
    this.fill.x = -this.fill.w / 2;
    this.add(this.frameS);
    this.add(this.fill);
  }
  override tick = (dt: number): void => {
    this.shown += (this.k - this.shown) * Math.min(1, dt * 5);
    this.fill.cropR = Math.max(0, Math.min(1, this.shown));
    this.fill.flash = this.shown >= 1 ? 0.3 + 0.2 * Math.sin(performance.now() / 120) : 0;
  };
}

/** Software chip in the software bar (mini frame + icon). */
export class SwChip extends Node {
  readonly frameS: Sprite;
  readonly icon: Sprite;
  readonly counter: Text;
  constructor(public id: SoftwareId, size: number, inactive = false) {
    super();
    const d = softwareDef(id);
    const fname = d.rarity === 'L' ? 'ui_mini_frame_software_l' : `ui_mini_frame_software_${d.rarity.toLowerCase()}`;
    this.frameS = new Sprite(fname, { region: 'anim' });
    this.frameS.size(size, size);
    if (d.rarity === 'L') this.frameS.play(8);
    this.add(this.frameS);
    this.icon = new Sprite(d.icon, { region: 'content' });
    this.icon.fit(size * 0.68, size * 0.68);
    this.add(this.icon);
    this.counter = new Text('', { font: 'title', size: 9.5, align: 'right', valign: 'bottom', color: 0xffe28a });
    this.counter.pos(size / 2 - 3, size / 2 - 2);
    this.add(this.counter);
    if (inactive) {
      this.icon.mode = 'gray';
      this.frameS.mode = 'gray';
    }
    this.size = size;
  }
  size: number;
  setFlash(f: number): void {
    this.frameS.flash = f;
    this.icon.flash = f;
  }
  override bounds() {
    return { x: -this.size / 2, y: -this.size / 2, w: this.size, h: this.size };
  }
}

/** Hardware icon chip for the component bar. */
export class HwChip extends Node {
  readonly bg: Sprite;
  readonly icon: Sprite;
  readonly badge: Text;
  constructor(iconName: string, size: number, opts: { rgb?: boolean; off?: boolean } = {}) {
    super();
    this.bg = new Sprite('ui_slot_empty_software_mini', { region: 'content' });
    this.bg.size(size, size);
    this.bg.alpha = 0.0;
    const plate = new Rect2(size - 2, size - 2, 0x14142a, 0.75);
    plate.ax = plate.ay = 0.5;
    this.add(plate);
    this.add(this.bg);
    this.icon = new Sprite(iconName, { region: 'content' });
    this.icon.fit(size - 4, size - 4);
    if (opts.rgb) this.icon.mode = 'rgb';
    if (opts.off) this.icon.mode = 'gray';
    this.add(this.icon);
    this.badge = new Text('', { font: 'body', size: 9.5, align: 'right', valign: 'bottom', color: 0xff8a2e, outline: 0x0b0b12 });
    this.badge.pos(size / 2 - 1, size / 2);
    this.add(this.badge);
    this.size = size;
  }
  size: number;
  setFlash(f: number): void {
    this.icon.flash = f;
  }
  override bounds() {
    return { x: -this.size / 2, y: -this.size / 2, w: this.size, h: this.size };
  }
}

/**
 * Rolling score counter (DOM): every digit is a vertical strip 0–9 that rolls to its value.
 * Other characters (separators, suffixes) are plain text. Works with any formatter (big()).
 */
export class Odometer {
  readonly el: HTMLElement;
  private cols: (HTMLElement | null)[] = [];
  private shape = '';
  value = 0;
  constructor(private format: (n: number) => string = big) {
    this.el = document.createElement('span');
    this.el.style.cssText = 'display:inline-flex;align-items:flex-end;line-height:1.15;white-space:nowrap;transform-origin:100% 60%';
  }

  /** Shows `v`; `roll` animates the digit strips. */
  set(v: number, roll = true): void {
    this.value = v;
    const s = this.format(Math.floor(v));
    const shape = s.replace(/\d/g, '0');
    if (shape !== this.shape) {
      this.shape = shape;
      this.el.textContent = '';
      this.cols = [];
      for (const ch of s) {
        if (ch >= '0' && ch <= '9') {
          const win = document.createElement('span');
          win.style.cssText = 'display:inline-block;height:1.15em;overflow:hidden;position:relative';
          const strip = document.createElement('span');
          strip.style.cssText = 'display:flex;flex-direction:column;align-items:center;transition:transform 0.09s ease-out';
          for (let d = 0; d < 10; d++) {
            const c = document.createElement('span');
            c.textContent = String(d);
            c.style.cssText = 'height:1.15em;line-height:1.15em';
            strip.append(c);
          }
          win.append(strip);
          this.el.append(win);
          this.cols.push(strip);
          strip.style.transition = 'none';
        } else {
          const t = document.createElement('span');
          t.textContent = ch;
          this.el.append(t);
          this.cols.push(null);
        }
      }
      roll = false;
    }
    [...s].forEach((ch, i) => {
      const strip = this.cols[i];
      if (!strip) return;
      strip.style.transition = roll ? 'transform 0.09s ease-out' : 'none';
      strip.style.transform = `translateY(${-Number(ch) * 1.15}em)`;
    });
  }

  /** Short scale pop + colour flash. */
  bump(k = 1.25, color = '#ffffff'): void {
    this.el.animate?.([{ transform: `scale(${k})`, color }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
  }
}

export { big };
