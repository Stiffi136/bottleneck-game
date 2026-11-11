import { Node, Sprite } from '../../render/scene';
import type { Screen, Viewport } from '../../render/engine';
import { h } from '../dom';
import { game, type Game } from '../../game/game';
import { onLangChange } from '../../i18n';
import { checkAspectSoon } from '../../view/aspectCheck';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function placeEl(el: HTMLElement, b: Box | { x: number; y: number; w?: number; h?: number }): void {
  el.style.position = 'absolute';
  el.style.left = `${b.x}px`;
  el.style.top = `${b.y}px`;
  if (b.w !== undefined) el.style.width = `${b.w}px`;
  if (b.h !== undefined) el.style.height = `${b.h}px`;
}

export abstract class BaseScreen implements Screen {
  root = new Node();
  dom: HTMLElement = h('div', { class: 'screen' });
  vp!: Viewport;
  private offLang: (() => void) | null = null;
  constructor(public g: Game = game) {}

  abstract build(): void;

  layout(vp: Viewport): void {
    this.vp = vp;
    this.rebuild();
  }

  /** Recreates the whole screen (cheap; used on resize and language change). */
  rebuild(): void {
    this.root.removeAll();
    this.dom.innerHTML = '';
    this.build();
    checkAspectSoon(this.root, this.constructor.name);
  }

  enter(): void {
    this.offLang = onLangChange(() => this.rebuild());
  }

  exit(): void {
    this.offLang?.();
  }

  /** 9-slice panel rendered by three.js (DOM text can sit on top). */
  panel(b: Box, kind: 'dark' | 'light' | 'bios' = 'dark', parent: Node = this.root): Sprite {
    const p = new Sprite(`ui_panel_${kind}`, { region: 'content', ax: 0, ay: 0, nine: 7.5, nineScale: 0.8 });
    p.size(b.w, b.h).pos(b.x, b.y);
    parent.add(p);
    return p;
  }

  get portrait(): boolean {
    return this.vp.portrait;
  }
}
