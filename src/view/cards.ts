import { Node, Sprite, Text } from '../render/scene';
import { frame } from '../render/assets';
import { measure } from '../render/font';
import type { Card, CardType, Enhancement, Tier } from '../core/types';
import { cardName } from '../ui/describe';
import { L } from '../i18n';

export const CARD_W = 48;
export const CARD_H = 64;

const TYPE_COLOR: Record<CardType, number> = { cpu: 0x8cc4ff, gpu: 0xa8f07a, ram: 0xffe28a, io: 0xd4b0ff };

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
  private shadowS: Sprite;
  private back: Sprite;
  selected = false;
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
    this.shadowS.size(CARD_W + 2, CARD_H + 2).pos(2, 3);
    this.shadowS.alpha = 0.55;
    this.add(this.shadowS);
    this.add(this.body);
    this.highlight = new Sprite('ui_card_highlight', { region: 'anim' });
    this.highlight.size(CARD_W + 8, CARD_H + 9).play(8);
    this.highlight.visible = false;
    this.body.add(this.highlight);
    this.frameS = new Sprite('card_frame_cpu', { region: 'content' });
    this.frameS.size(CARD_W, CARD_H);
    this.body.add(this.frameS);
    this.art = new Sprite('card_art_cpu', { region: 'content' });
    this.body.add(this.art);
    this.level = new Text('', { font: 'title', size: 12, align: 'center', valign: 'middle', shadow: 0x0b0b12, outline: 0x0b0b12 });
    this.body.add(this.level);
    this.icon = new Sprite('card_typeicon8_cpu', { region: 'content' });
    this.body.add(this.icon);
    this.nameT = new Text('', { font: 'body', size: 5.5, align: 'center', valign: 'middle', maxWidth: 36, lineHeight: 0.95, shadow: null, color: 0xcfd0e0 });
    this.body.add(this.nameT);
    this.back = new Sprite('card_back', { region: 'content' });
    this.back.size(CARD_W, CARD_H);
    this.back.visible = false;
    this.body.add(this.back);
    this.setCard(card);
  }

  setCard(card: Card): void {
    this.card = { ...card };
    const t = card.type;
    this.frameS.setFrame(`card_frame_${t}`);
    this.frameS.size(CARD_W, CARD_H);
    this.art.setFrame(`card_art_${t}`);
    this.art.fit(CARD_W * 0.7, CARD_H * 0.34);
    place(this.art, CARD_W, CARD_H, 0.506, 0.5);
    this.level.text = String(card.level);
    this.level.color(TYPE_COLOR[t]);
    place(this.level, CARD_W, CARD_H, 0.25, 0.155);
    this.icon.setFrame(`card_typeicon8_${t}`);
    this.icon.fit(8, 8);
    place(this.icon, CARD_W, CARD_H, 0.8, 0.148);
    this.setName();
    this.setEnh(card.enh);
  }

  private setName(): void {
    if (!this.showName) {
      // small screens: big type label instead of the flavour name
      this.nameT.text = L().cardTypes[this.card.type];
      this.nameT.setSize(8);
      this.nameT.setFont('title');
      this.nameT.color(TYPE_COLOR[this.card.type]);
      place(this.nameT, CARD_W, CARD_H, 0.506, 0.84);
      return;
    }
    this.nameT.setFont('body');
    this.nameT.color(0xcfd0e0);
    const name = cardName(this.card);
    this.nameT.text = name;
    // shrink long names to fit the name plate
    let size = 5.5;
    while (size > 4 && measure('body', name, size) > 36 * 2 - 6) size -= 0.25;
    this.nameT.setSize(size);
    place(this.nameT, CARD_W, CARD_H, 0.506, 0.84);
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
    s.size(CARD_W * k, CARD_H * (e === 'oc' ? 1.12 : k));
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
    this.highlight.visible = v;
  }

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
    shadow.size(w + 2, hh + 2).pos(2, 3);
    shadow.alpha = 0.5;
    this.add(shadow);
    this.add(this.body);
    this.highlight = new Sprite('ui_card_highlight', { region: 'anim' });
    this.highlight.size(w + 8, hh + 9).play(8);
    this.highlight.visible = false;
    this.body.add(this.highlight);
    this.frameS = new Sprite(frameName, { region: frameName.includes('software_l') ? 'anim' : 'content' });
    if (frameName.includes('software_l')) this.frameS.play(8);
    this.frameS.size(w, hh);
    this.body.add(this.frameS);
    this.icon = new Sprite(iconName, { region: 'content' });
    this.icon.fit(w * 0.66, hh * 0.46);
    this.icon.y = -hh * 0.02;
    if (opts.rgb) this.icon.mode = 'rgb';
    this.body.add(this.icon);
    if (opts.tier !== undefined) {
      this.gem = new Sprite(`gem_tier_${opts.tier}`, { region: 'content' });
      this.gem.fit(8, 8);
      this.gem.pos(w * 0.33, -hh * 0.38);
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
