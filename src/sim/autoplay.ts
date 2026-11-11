/**
 * Browser self-test: drives the real UI (screens, animations, saving) with the
 * balancing bot's decisions until game over. Start in the console with
 * `__autoplay(4)` (speed) or with the URL parameter `?autoplay=4`.
 */
import type { Game } from '../game/game';
import { bestPlay, botBios, botShop, playRun } from './bot';
import { card, goWorkbench, startBenchmark } from '../core/run';
import { Rng } from '../core/rng';
import { timeScale } from '../render/tween';

interface BenchApi {
  busy: boolean;
  toggle(id: number): void;
  doPlay(): Promise<void>;
  doDiscard(): Promise<void>;
  selected: number[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function autoplay(g: Game, speed = 4, maxSteps = 4000): Promise<{ gen: number; reason: string | undefined; steps: number }> {
  timeScale.value = speed;
  const rng = new Rng(1234);
  let steps = 0;
  if (!g.run) g.newRun();
  for (; steps < maxSteps; steps++) {
    await sleep(60);
    const run = g.run;
    if (!run) break;
    const scr = g.engine.current as unknown;
    switch (g.screenName) {
      case 'title':
        g.route();
        break;
      case 'select':
        if (startBenchmark(run).ok) {
          g.save();
          g.route();
        }
        break;
      case 'bench': {
        const b = scr as BenchApi;
        if (b.busy || !run.bench || run.phase !== 'bench') {
          await sleep(100);
          break;
        }
        const bp = bestPlay(run);
        const bench = run.bench;
        const need = bench.target - bench.score;
        for (const id of [...b.selected]) b.toggle(id);
        if (bp && !(bp.score * bench.hands < need && bench.discards > 0 && bench.draw.length > 0)) {
          for (const id of bp.ids) b.toggle(id);
          await b.doPlay();
        } else if (bench.discards > 0) {
          const keep = new Set(bp?.ids ?? []);
          const toss = bench.hand
            .filter((id) => !keep.has(id))
            .map((id) => card(run, id))
            .sort((x, y) => x.level - y.level)
            .slice(0, 5)
            .map((c) => c.id);
          for (const id of toss.length ? toss : bench.hand.slice(0, 1)) b.toggle(id);
          await b.doDiscard();
        } else {
          b.toggle(bench.hand[0]!);
          await b.doPlay();
        }
        break;
      }
      case 'receipt':
        await sleep(400 / speed);
        (scr as { next(): void }).next();
        break;
      case 'shop':
        if (run.pack) {
          (await import('../core/run')).choosePack(run, null);
        }
        botShop(run, rng);
        g.save();
        if (goWorkbench(run).ok) g.route();
        break;
      case 'workbench': {
        botBios(run);
        g.save();
        await (scr as { runPost(): Promise<void> }).runPost();
        await sleep(300);
        if (g.screenName === 'workbench') {
          // the bot could not produce a valid build here – fall back to the pure bot
          console.warn('autoplay: POST failed, using pure bot');
          return { gen: playRun(run).gen, reason: 'post', steps };
        }
        break;
      }
      case 'gameover':
        timeScale.value = g.settings.speed;
        return { gen: run.gen, reason: run.gameOver?.reason, steps };
    }
  }
  timeScale.value = g.settings.speed;
  return { gen: g.run?.gen ?? 0, reason: 'timeout', steps };
}
