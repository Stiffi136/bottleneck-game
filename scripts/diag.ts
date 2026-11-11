/** Debug: plays one run with the bot and prints the build per generation. Usage: npx tsx scripts/diag.ts [seed] (BOT_DEBUG=1 shows shop options). */
import { newRun, collectReceipt, goWorkbench, leaveWorkbench, startBenchmark } from '../src/core/run';
import { botBenchmarkStep, botBios, botShop } from '../src/sim/bot';
import { installed } from '../src/core/build';
import { Rng } from '../src/core/rng';
const seed = process.argv[2] ?? 'SIM1';
const run = newRun(seed);
const rng = new Rng(run.rng ^ 0x5bd1e995);
let lastGen = 0;
for (let step = 0; step < 20000 && run.phase !== 'gameover'; step++) {
  if (run.phase === 'select') {
    if (run.gen !== lastGen) {
      lastGen = run.gen;
      const enh = run.deck.filter((c) => c.enh).map((c) => c.enh).join(',');
      console.log(`G${run.gen} $${run.money} build=${installed(run.build).map((x) => x.inst.id + (x.inst.oc ? '+' + x.inst.oc : '')).join(' ')} sw=${run.software.map((s) => s.id).join(',')} drv=${JSON.stringify(run.drivers)} deck=${run.deck.length} enh=${enh} tools=${run.tools}`);
    }
    startBenchmark(run);
  } else if (run.phase === 'bench') {
    botBenchmarkStep(run);
    if (run.phase !== 'bench') {
      const b = run.bench!;
      console.log(`   ${b.kind}${b.boss ? ':' + b.boss : ''} ${b.score}/${b.target} hands left ${b.hands} ${b.result}`);
    }
  } else if (run.phase === 'receipt') collectReceipt(run);
  else if (run.phase === 'shop') { botShop(run, rng); goWorkbench(run); }
  else if (run.phase === 'workbench') { botBios(run); leaveWorkbench(run); }
}
console.log('bought', JSON.stringify(run.stats.bought), 'profiles', JSON.stringify(run.stats.profiles));
