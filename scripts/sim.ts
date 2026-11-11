/**
 * Balancing simulation: plays many runs with the heuristic bot and prints the
 * distribution of the reached generation.  Usage: npm run sim -- [runs] [seedPrefix]
 */
import { newRun } from '../src/core/run';
import { playRun } from '../src/sim/bot';
import { CURVE } from '../src/core/difficulty';

if (process.env.CURVE_GROWTH) CURVE.growth = Number(process.env.CURVE_GROWTH);
if (process.env.CURVE_STEP) CURVE.accelStep = Number(process.env.CURVE_STEP);
if (process.env.CURVE_FROM) CURVE.accelFrom = Number(process.env.CURVE_FROM);

const runs = Number(process.argv[2] ?? 200);
const prefix = process.argv[3] ?? 'SIM';
const gens: number[] = [];
const reasons: Record<string, number> = {};
const deathAt: Record<string, number> = {};
const bought: Record<string, number> = {};
const t0 = Date.now();
for (let i = 0; i < runs; i++) {
  const run = playRun(newRun(`${prefix}${i}`));
  gens.push(run.gen);
  const go = run.gameOver;
  if (go) {
    reasons[go.reason] = (reasons[go.reason] ?? 0) + 1;
    const k = `${go.kind}${go.boss ? ':' + go.boss : ''}`;
    deathAt[k] = (deathAt[k] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(run.stats.bought)) bought[k] = (bought[k] ?? 0) + v;
  if ((i + 1) % 25 === 0) process.stderr.write(`  ${i + 1}/${runs} runs (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
}
gens.sort((a, b) => a - b);
const hist = new Map<number, number>();
for (const g of gens) hist.set(g, (hist.get(g) ?? 0) + 1);
const pct = (q: number) => gens[Math.min(gens.length - 1, Math.floor(q * gens.length))];
console.log(`\nBOTTLENECK balancing simulation – curve ${JSON.stringify(CURVE)} – ${runs} runs, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('Generation reached (game over in this generation):');
const max = Math.max(...hist.values());
for (const [g, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  Gen ${String(g).padStart(2)} ${'#'.repeat(Math.round((n / max) * 40)).padEnd(40)} ${n} (${((n / runs) * 100).toFixed(1)} %)`);
}
const mean = gens.reduce((a, b) => a + b, 0) / gens.length;
console.log(`mean ${mean.toFixed(2)} · median ${pct(0.5)} · p10 ${pct(0.1)} · p90 ${pct(0.9)} · max ${gens[gens.length - 1]}`);
console.log('Causes:', reasons);
console.log('Lost at:', Object.entries(deathAt).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('Most bought:', Object.entries(bought).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${v}`).join(', '));
