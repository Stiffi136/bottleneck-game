/**
 * Power-curve analysis: the bot plays every benchmark with all 4 hands (no
 * early win, never loses) and the script prints the median benchmark score
 * per generation next to the targets.  Usage: npx tsx scripts/power.ts [runs] [gens]
 */
import { collectReceipt, goWorkbench, leaveWorkbench, newRun, startBenchmark } from '../src/core/run';
import { botBenchmarkStep, botBios, botShop } from '../src/sim/bot';
import { targetFor } from '../src/core/difficulty';
import { Rng } from '../src/core/rng';

const N = Number(process.argv[2] ?? 30);
const G = Number(process.argv[3] ?? 12);
const per: number[][] = Array.from({ length: G + 1 }, () => []);
for (let i = 0; i < N; i++) {
  const run = newRun('P' + i);
  const rng = new Rng(i);
  for (let step = 0; step < 50000 && run.gen <= G; step++) {
    if (run.phase === 'select') {
      startBenchmark(run);
      run.bench!.target = Infinity;
    } else if (run.phase === 'bench') {
      const b = run.bench!;
      if (b.hands === 1) {
        const before = b.score;
        b.target = 0;
        const gen = run.gen;
        botBenchmarkStep(run);
        if (run.phase === 'bench') {
          b.target = Infinity;
          continue;
        }
        per[gen]!.push(before);
      } else botBenchmarkStep(run);
    } else if (run.phase === 'receipt') collectReceipt(run);
    else if (run.phase === 'shop') {
      botShop(run, rng);
      goWorkbench(run);
    } else if (run.phase === 'workbench') {
      botBios(run);
      leaveWorkbench(run);
    } else break;
  }
}
let prev = 0;
for (let g = 1; g <= G; g++) {
  const a = per[g]!.sort((x, y) => x - y);
  if (!a.length) continue;
  const med = a[Math.floor(a.length / 2)]!;
  console.log(
    `gen ${String(g).padStart(2)}: median score after 3 hands ${med.toFixed(0).padStart(9)} · office target ${String(targetFor(g, 'office')).padStart(9)} · ratio ${(med / targetFor(g, 'office')).toFixed(2)}${prev ? ` · growth ${(med / prev).toFixed(2)}` : ''}`,
  );
  prev = med;
}
