import { Node, Sprite, Text } from '../render/scene';
import { frame } from '../render/assets';
import { measure } from '../render/font';
import type { Card, CardType, Enhancement, Tier } from '../core/types';
import { cardName } from '../ui/describe';
import { L } from '../i18n';
import { FRAME_ANCHORS, anchorPos } from './cardAnchors';

export const CARD_W = 48;
export const CARD_H = 64;
/** name plate (virtual px at card scale 1) */
const NAME_W = 34;
const NAME_H = 10.5;

const TYPE_COLOR: Record<CardType, number> = { cpu: 0x8cc4ff, gpu: 0xa8f07a, ram: 0xffe28a, io: 0xd4b0ff };

/**
 * Fits a card name into the name plate (max. 2 lines of NAME_W): largest font size wins. A single
 * long word with a hyphen ("Physik-Simulation") may break after the hyphen.
 */
function fitName(name: string): { text: string; size: number } {
  const lineH = 1.9; // ≈ 2 lines at size 1 incl. line gap (lineHeight 0.95)
  const sizeFor = (lines: string[]): number => {
    const longest = Math.max(...lines.flatMap((l) => l.split(' ')).map((w) => measure('body', w, 1)));
    const total = lines.reduce((a, l) => a + measure('body', l, 1), 0);
    // every word fits the width; the whole text fits in 2 lines (with some slack for word wrap)
    return Math.min(5.5, NAME_W / longest, (NAME_W * 2 * 0.86) / Math.max(1, total), NAME_H / lineH);
  };
  let best = { text: name, size: sizeFor([name]) };
  // P5: a short one-line name (RAM, GPU, I/O …) may be larger – the plate is 10.5 high, one line needs ≈ 1.2 em
  const one = Math.min(6.7, NAME_W / Math.max(1, measure('body', name, 1)), NAME_H / 1.25);
  if (!name.includes(' ') && one > best.size) best = { text: name, size: one };
  const i = name.indexOf('-');
  if (!name.includes(' ') && i > 0 && i < name.length - 1) {
    const parts = [name.slice(0, i + 1), name.slice(i + 1)];
    const sz = Math.min(sizeFor(parts), NAME_W / Math.max(...parts.map((x) => measure('body', x, 1))));
    if (sz > best.size + 0.2) best = { text: parts.join('\n'), size: sz };
  }
  return { text: best.text, size: Math.max(3.3, Math.floor(best.size * 10) / 10) };
}

/** Scales a sprite uniformly so that it covers w×h (natural aspect ratio; overhang on one axis). */
function cover(s: Sprite, w: number, h: number): void {
  const k = Math.max(w / s.regionRect.w, h / s.regionRect.h);
  s.size(s.regionRect.w * k, s.regionRect.h * k);
}

/** Places a sub-sprite at a normalized rect of the card frame content box. */
function place(s: Node, w: number, h: number, nx: number, ny: number) {
  s.x = (nx - 0.5) * w;
  s.y = (ny - 0.5) * h;
}

/** A workload card (48×64) built from frame, art, level, type icon, name and overlays. */
export class CardView extends Node {
  card: Card;
  readonly body = new Node(); // wobble/scale target
  private frameS: Sprite;
  private art: Sprite;
  private level: Text;
  private icon: Sprite;
  private nameT: Text;
  private overlay: Sprite | null = null;
  private highlight: Sprite;
  private glow: Sprite;
  private ghosts: Sprite[] = [];
  private shadowS: Sprite;
  private back: Sprite;
  private glitchT = 0;
  private glitchNext = 1 + Math.random() * 3;
  selected = false;
  profile = false;
  hovered = false;
  /** layout target (hand slot) */
  tx = 0;
  ty = 0;
  baseRot = 0;
  wobble = Math.random() * 10;
  faceDown = false;
  dim = false;
  showName = true;

  constructor(card: Card) {
    super();
    this.card = { ...card };
    this.shadowS = new Sprite('card_shadow', { region: 'content' });
    this.shadowS.fit(CARD_W + 2, CARD_H + 2).pos(2, 3);
    this.shadowS.alpha = 0.55;
    this.add(this.shadowS);
    this.add(this.body);
    this.highlight = new Sprite('ui_card_highlight', { region: 'anim' });
    cover(this.highlight, CARD_W + 8, CARD_H + 9);
    this.highlight.play(8);
    this.highlight.visible = false;
    this.body.add(this.highlight);
    // gold glow for cards that form the detected profile
    this.glow = new Sprite('ui_card_highlight', { region: 'anim' });
    cover(this.glow, CARD_W + 12, CARD_H + 13);
    this.glow.play(10);
    this.glow.tint = [1, 0.82, 0.25];
    this.glow.visible = false;
    this.body.add(this.glow);
    // chromatic ghosts for the glitch effect (behind the frame)
    for (const tint of [
      [1, 0.25, 0.65],
      [0.2, 0.95, 1],
    ] as [number, number, number][]) {
      const g = new Sprite('card_frame_cpu', { region: 'content' });
      g.fit(CARD_W, CARD_H);
      g.tint = tint;
      g.alpha = 0.75;
      g.visible = false;
      this.body.add(g);
      this.ghosts.push(g);
    }
    this.frameS = new Sprite('card_frame_cpu', { region: 'content' });
    this.frameS.fit(CARD_W, CARD_H);
    this.body.add(this.frameS);
    this.art = new Sprite('card_art_cpu', { region: 'content' });
    this.body.add(this.art);
    this.level = new Text('', { font: 'title', size: 12, align: 'center', valign: 'middle', shadow: 0x0b0b12, outline: 0x0b0b12 });
    this.body.add(this.level);
    this.icon = new Sprite('card_typeicon8_cpu', { region: 'content' });
    this.body.add(this.icon);
    this.nameT = new Text('', { font: 'body', size: 5.5, align: 'center', valign: 'middle', maxWidth: NAME_W, lineHeight: 0.95, shadow: null, color: 0xcfd0e0 });
    this.body.add(this.nameT);
    this.back = new Sprite('card_back', { region: 'content' });
    this.back.fit(CARD_W, CARD_H);
    this.back.visible = false;
    this.body.add(this.back);
    this.setCard(card);
  }

  setCard(card: Card): void {
    this.card = { ...card };
    const t = card.type;
    this.frameS.setFrame(`card_frame_${t}`);
    this.frameS.fit(CARD_W, CARD_H);
    for (const g of this.ghosts) g.setFrame(`card_frame_${t}`).fit(CARD_W, CARD_H);
    this.art.setFrame(`card_art_${t}`);
    // all fields sit on the measured anchors of the frame (fractions of the displayed frame box)
    const A = FRAME_ANCHORS[`card_frame_${t}`]!;
    const fw = this.frameS.w;
    const fh = this.frameS.h;
    this.art.fit(CARD_W * 0.7, CARD_H * 0.34);
    this.art.pos(anchorPos(A.art, fw, fh).x, anchorPos(A.art, fw, fh).y);
    this.level.text = String(card.level);
    this.level.color(TYPE_COLOR[t]);
    this.level.optical = true; // "1" and "10" are centred by their ink, on the digit baseline
    this.level.pos(anchorPos(A.level!, fw, fh).x, anchorPos(A.level!, fw, fh).y);
    this.icon.setFrame(`card_typeicon8_${t}`);
    this.icon.fit(Math.min(8, A.icon!.w! * fw * 0.85), Math.min(8, A.icon!.h! * fh * 0.9));
    this.icon.pos(anchorPos(A.icon!, fw, fh).x, anchorPos(A.icon!, fw, fh).y);
    this.setName();
    this.setEnh(card.enh);
  }

  private placeName(): void {
    const A = FRAME_ANCHORS[`card_frame_${this.card.type}`]!;
    const p = anchorPos(A.name!, this.frameS.w, this.frameS.h);
    this.nameT.pos(p.x, p.y);
  }

  private setName(): void {
    if (!this.showName) {
      // small screens: big type label instead of the flavour name
      this.nameT.optical = true;
      this.nameT.text = L().cardTypes[this.card.type];
      this.nameT.setSize(9.5);
      this.nameT.setFont('title');
      this.nameT.color(TYPE_COLOR[this.card.type]);
      this.placeName();
      return;
    }
    this.nameT.optical = false;
    this.nameT.setFont('body');
    this.nameT.color(0xcfd0e0);
    const { text, size } = fitName(cardName(this.card));
    this.nameT.maxWidth = NAME_W;
    this.nameT.text = text;
    this.nameT.setSize(size);
    for (let k = size; k > 3.3 && this.nameT.height > NAME_H + 0.5; ) this.nameT.setSize((k -= 0.1));
    this.placeName();
    this.nameT.visible = !this.faceDown;
  }

  setShowName(v: boolean): void {
    this.showName = v;
    this.setName();
  }

  setEnh(e: Enhancement | undefined): void {
    this.overlay?.destroy();
    this.overlay = null;
    if (!e) return;
    const name = { oc: 'card_ov_uebertaktet', opt: 'card_ov_optimiert', eff: 'card_ov_effizient', unst: 'card_ov_instabil' }[e];
    const s = new Sprite(name, { region: 'anim' });
    const k = e === 'oc' ? 1.08 : e === 'opt' ? 1.06 : 1.02;
    cover(s, CARD_W * k, CARD_H * (e === 'oc' ? 1.12 : k)); // natural aspect, never distorted
    if (e === 'oc') s.y = -CARD_H * 0.04;
    s.play(e === 'unst' ? 10 : 8);
    this.body.add(s);
    this.overlay = s;
  }

  setFaceDown(v: boolean): void {
    this.faceDown = v;
    this.back.visible = v;
    for (const n of [this.frameS, this.art, this.level, this.icon]) n.visible = !v;
    this.nameT.visible = !v;
    if (this.overlay) this.overlay.visible = !v;
  }

  setSelected(v: boolean): void {
    this.selected = v;
    this.highlight.visible = v && !this.profile;
  }

  /** Gold glow: the card belongs to the detected profile. */
  setProfile(v: boolean): void {
    this.profile = v;
    this.glow.visible = v;
    this.highlight.visible = this.selected && !v;
  }

  /** Starts a glitch burst (chromatic ghosts + jitter) for `dur` seconds. */
  glitch(dur = 0.18): void {
    this.glitchT = Math.max(this.glitchT, dur);
  }

  /** Per-frame effects; unstable cards glitch now and then on their own. */
  fxTick(dt: number): void {
    if (this.card.enh === 'unst' && !this.faceDown) {
      this.glitchNext -= dt;
      if (this.glitchNext <= 0) {
        this.glitchNext = 1.2 + Math.random() * 3.5;
        this.glitch(0.08 + Math.random() * 0.14);
      }
    }
    const on = this.glitchT > 0 && !this.faceDown;
    if (this.glitchT > 0) this.glitchT -= dt;
    const [a, b] = this.ghosts as [Sprite, Sprite];
    a.visible = b.visible = on;
    if (on) {
      const k = 1.5 + Math.random() * 2.5;
      a.x = -k;
      b.x = k;
      a.y = (Math.random() - 0.5) * 2;
      b.y = (Math.random() - 0.5) * 2;
      this.art.x = (Math.random() - 0.5) * 3;
      this.frameS.x = Math.random() < 0.3 ? (Math.random() - 0.5) * 3 : 0;
      this.frameS.flash = Math.random() < 0.25 ? 0.5 : 0;
      this.glitching = true;
    } else if (this.glitching) {
      this.glitching = false;
      a.x = b.x = this.frameS.x = 0;
      this.frameS.flash = 0;
      place(this.art, CARD_W, CARD_H, 0.506, 0.5);
    }
  }
  private glitching = false;

  setDim(v: boolean): void {
    this.dim = v;
    const mode = v ? 'gray' : 'normal';
    this.frameS.mode = mode;
    this.art.mode = mode;
    this.icon.mode = mode;
  }

  setFlash(f: number): void {
    this.frameS.flash = f;
    this.art.flash = f;
  }

  override bounds() {
    return { x: -CARD_W / 2, y: -CARD_H / 2, w: CARD_W, h: CARD_H };
  }
}

/** Shop/inventory card: frame with an icon, tier gem and optional rarity. */
export class ItemCard extends Node {
  readonly body = new Node();
  private frameS: Sprite;
  private icon: Sprite;
  private gem: Sprite | null = null;
  private highlight: Sprite;
  constructor(frameName: string, iconName: string, opts: { tier?: Tier; rgb?: boolean; w?: number; h?: number } = {}) {
    super();
    const w = opts.w ?? CARD_W;
    const hh = opts.h ?? CARD_H;
    const shadow = new Sprite('card_shadow', { region: 'content' });
    shadow.fit(w + 2, hh + 2).pos(2, 3);
    shadow.alpha = 0.5;
    this.add(shadow);
    this.add(this.body);
    this.highlight = new Sprite('ui_card_highlight', { region: 'anim' });
    cover(this.highlight, w + 8, hh + 9);
    this.highlight.play(8);
    this.highlight.visible = false;
    this.body.add(this.highlight);
    this.frameS = new Sprite(frameName, { region: frameName.includes('software_l') ? 'anim' : 'content' });
    if (frameName.includes('software_l')) this.frameS.play(8);
    this.frameS.size(w, hh);
    this.body.add(this.frameS);
    this.icon = new Sprite(iconName, { region: 'content' });
    const A = FRAME_ANCHORS[frameName.replace(/_l$/, '_s')] ?? FRAME_ANCHORS['card_frame_treiber']!;
    this.icon.fit(w * 0.66, hh * 0.46);
    this.icon.pos(anchorPos(A.art, w, hh).x, anchorPos(A.art, w, hh).y);
    if (opts.rgb) this.icon.mode = 'rgb';
    this.body.add(this.icon);
    if (opts.tier !== undefined) {
      this.gem = new Sprite(`gem_tier_${opts.tier}`, { region: 'content' });
      // centred in the printed gem socket (measured anchor), a little smaller than the socket
      const sock = FRAME_ANCHORS['card_frame_hardware']!.gem!;
      this.gem.fit(sock.w! * w * 0.82, sock.h! * hh * 0.82);
      this.gem.pos(anchorPos(sock, w, hh).x, anchorPos(sock, w, hh).y);
      this.body.add(this.gem);
    }
    this.w = w;
    this.h = hh;
  }
  w: number;
  h: number;
  setSelected(v: boolean): void {
    this.highlight.visible = v;
  }
  setDim(v: boolean): void {
    this.frameS.mode = v ? 'gray' : 'normal';
    this.icon.mode = v ? 'gray' : this.icon.mode === 'gray' ? 'normal' : this.icon.mode;
  }
  override bounds() {
    return { x: -this.w / 2, y: -this.h / 2, w: this.w, h: this.h };
  }
}

/** Label under a card or chip (title font). */
export function label(text: string, size = 7, color = 0xf4f4fa): Text {
  return new Text(text, { font: 'body', size, align: 'center', valign: 'middle', color });
}

export function hasArt(name: string): boolean {
  try {
    frame(name);
    return true;
  } catch {
    return false;
  }
}

export function typeName(t: CardType): string {
  return L().cardTypes[t];
}
