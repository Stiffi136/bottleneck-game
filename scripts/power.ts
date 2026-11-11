/**
 * Power-curve analysis: the bot plays normally, but a lost benchmark is turned
 * into a win (the run never ends), so the bot's power can be measured beyond
 * the point where it would die. Prints per generation the median expected
 * score per play (bot valuation, no boss) × 3.2 plays next to the targets and
 * the share of benchmarks the bot would have lost.
 * Usage: npx tsx scripts/power.ts [runs] [gens]
 */
import { collectReceipt, goWorkbench, leaveWorkbench, newRun, startBenchmark, type RunState } from '../src/core/run';
import { botBenchmarkStep, botBios, botShop, assemble, normalPower, BOT } from '../src/sim/bot';
import { CURVE, targetFor } from '../src/core/difficulty';
import { installed } from '../src/core/build';

if (process.env.CURVE_GROWTH) CURVE.growth = Number(process.env.CURVE_GROWTH);
if (process.env.CURVE_STEP) CURVE.accelStep = Number(process.env.CURVE_STEP);
if (process.env.CURVE_FROM) CURVE.accelFrom = Number(process.env.CURVE_FROM);

const N = Number(process.argv[2] ?? 30);
const G = Number(process.argv[3] ?? 12);
const pw: number[][] = Array.from({ length: G + 1 }, () => []);
const lost: { n: number; lost: number; f1: number }[] = Array.from({ length: G + 1 }, () => ({ n: 0, lost: 0, f1: 0 }));

function benchStep(run: RunState): void {
  const snap = structuredClone(run);
  botBenchmarkStep(run);
  if (run.phase !== 'gameover') return;
  // rescue: undo and let the next play win
  Object.assign(run, snap);
  const b = run.bench!;
  lost[run.gen]!.lost++;
  if (b.boss === 'f1') lost[run.gen]!.f1++;
  b.target = 0;
  b.temp = 35;
  b.hands = Math.max(1, b.hands);
  botBenchmarkStep(run);
  if ((run.phase as string) === 'bench') botBenchmarkStep(run);
}

for (let i = 0; i < N; i++) {
  const run = newRun('P' + i);
  let seenGen = 0;
  for (let step = 0; step < 50000 && run.gen <= G; step++) {
    if (run.phase === 'select') {
      if (run.gen !== seenGen) {
        seenGen = run.gen;
        pw[run.gen]!.push(normalPower(run) * BOT.playsPerBench);
        if (process.env.POWER_DUMP && i < 3)
          console.log(
            `  P${i} G${run.gen} ${run.money} ${installed(run.build).map((x) => x.inst.id + (x.inst.oc ? '+' + x.inst.oc : '')).join(' ')} | sw ${run.software.map((s) => s.id).join(',')} | drv ${JSON.stringify(run.drivers)} | deck ${run.deck.length} ${run.deck.filter((c) => c.enh).map((c) => c.enh).join(',')} | power ${normalPower(run).toFixed(0)}`,
          );
      }
      lost[run.gen]!.n++;
      startBenchmark(run);
    } else if (run.phase === 'bench') benchStep(run);
    else if (run.phase === 'receipt') collectReceipt(run);
    else if (run.phase === 'shop') {
      botShop(run);
      goWorkbench(run);
    } else if (run.phase === 'workbench') {
      assemble(run);
      botBios(run);
      leaveWorkbench(run);
    } else break;
  }
}
console.log(`curve ${JSON.stringify(CURVE)} – ${N} runs`);
let prev = 0;
for (let g = 1; g <= G; g++) {
  const a = pw[g]!.sort((x, y) => x - y);
  if (!a.length) continue;
  const med = a[Math.floor(a.length / 2)]!;
  const l = lost[g]!;
  console.log(
    `gen ${String(g).padStart(2)}: power×${BOT.playsPerBench} ${med.toFixed(0).padStart(9)} · office ${String(targetFor(g, 'office')).padStart(9)} · boss ${String(targetFor(g, 'boss')).padStart(9)} · ratio ${(med / targetFor(g, 'office')).toFixed(2)}${prev ? ` · growth ${(med / prev).toFixed(2)}` : '         '} · lost ${((l.lost / Math.max(1, l.n)) * 100).toFixed(0).padStart(3)} %${l.f1 ? ` (F1 ${l.f1})` : ''}`,
  );
  prev = med;
}
