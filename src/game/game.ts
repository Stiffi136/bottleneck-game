import { Engine, type Screen } from '../render/engine';
import { Fx } from '../render/fx';
import { timeScale } from '../render/tween';
import { Background, type BgKind } from '../view/background';
import { newRun, type RunState } from '../core/run';
import { randomSeedString } from '../core/rng';
import { addBest, loadBest, loadRun, loadSettings, saveRun, saveSettings, type Settings } from './storage';
import { setLang, L, fmt } from '../i18n';
import { sfx } from '../audio/sfx';
import { closeAllSheets, hideTip, toast } from '../ui/dom';
import type { ErrKey, Result } from '../core/run';

type ScreenFactory = (g: Game) => Screen;

export class Game {
  engine!: Engine;
  fx!: Fx;
  bg!: Background;
  settings: Settings = loadSettings();
  run: RunState | null = null;
  private factories = new Map<string, ScreenFactory>();
  screenName = '';
  /** part uid to preselect when the workbench opens ("buy & install") */
  pendingInstall: number | null = null;

  init(host: HTMLElement): void {
    this.engine = new Engine(host);
    this.bg = new Background();
    this.engine.bg.add(this.bg);
    this.fx = new Fx(this.engine.fx);
    this.engine.onFrame((dt) => this.fx.update(dt));
    this.engine.onResizeVp((vp) => this.bg.layout(vp));
    this.applySettings();
    this.run = loadRun();
    // unlock audio on first interaction
    const unlock = () => {
      sfx.unlock();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', (e) => this.engine.current?.onKey?.(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
  }

  register(name: string, f: ScreenFactory): void {
    this.factories.set(name, f);
  }

  show(name: string): void {
    const f = this.factories.get(name);
    if (!f) throw new Error('unknown screen ' + name);
    closeAllSheets();
    hideTip();
    this.fx.clear();
    this.screenName = name;
    this.engine.setScreen(f(this));
  }

  setBg(kind: BgKind): void {
    this.bg.set(kind, this.engine.vp);
  }

  /** Shows the screen that belongs to the current run phase. */
  route(): void {
    const r = this.run;
    if (!r) return this.show('title');
    switch (r.phase) {
      case 'select':
        return this.show('select');
      case 'bench':
        return this.show('bench');
      case 'receipt':
        return this.show('receipt');
      case 'shop':
        return this.show('shop');
      case 'workbench':
        return this.show('workbench');
      case 'gameover':
        return this.show('gameover');
    }
  }

  newRun(seed = randomSeedString()): void {
    this.run = newRun(seed);
    this.save();
    this.route();
  }

  save(): void {
    if (this.run) saveRun(this.run);
  }

  /** Called when a run ends. Returns true on a new record. */
  recordGameOver(): boolean {
    const r = this.run;
    if (!r) return false;
    const rec = addBest({ gen: r.gen, seed: r.seed, best: r.stats.bestPlay, date: Date.now() });
    saveRun(null);
    return rec;
  }

  bestGen(): number {
    const b = loadBest();
    return b.length ? b[0]!.gen : 0;
  }

  applySettings(): void {
    const s = this.settings;
    setLang(s.lang);
    sfx.volume = s.volume;
    sfx.muted = s.muted;
    sfx.fanEnabled = s.fan;
    sfx.applyVolume();
    timeScale.value = s.speed;
    this.engine.shakeEnabled = s.shake;
    document.body.classList.toggle('crt', s.crt);
    document.body.classList.toggle('lefty', s.lefty);
    saveSettings(s);
  }

  /** Shows an error toast for a failed action. */
  check<T>(r: Result<T>, params: Record<string, string | number> = {}): r is { ok: true } & T {
    if (r.ok) return true;
    const e = r as { ok: false; err: ErrKey };
    toast(fmt(L().errors[e.err], params), 'bad');
    return false;
  }
}

export const game = new Game();
