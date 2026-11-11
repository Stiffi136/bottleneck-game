/**
 * Balancing simulation: plays many runs with the heuristic bot and prints the
 * distribution of the reached generation.
 *
 * Usage: npm run sim -- [runs] [seedPrefix]
 * Env:   SIM_JOBS (parallel processes, default min(8, CPUs)), CURVE_GROWTH,
 *        CURVE_STEP, CURVE_FROM, CURVE_START (curve experiments), BOT_* (src/sim/bot.ts)
 */
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { newRun } from '../src/core/run';
import { playRun } from '../src/sim/bot';
import { CURVE } from '../src/core/difficulty';
import { part } from '../src/core/data/hardware';

if (process.env.CURVE_GROWTH) CURVE.growth = Number(process.env.CURVE_GROWTH);
if (process.env.CURVE_STEP) CURVE.accelStep = Number(process.env.CURVE_STEP);
if (process.env.CURVE_FROM) CURVE.accelFrom = Number(process.env.CURVE_FROM);
if (process.env.CURVE_START) CURVE.start = Number(process.env.CURVE_START);

interface Result {
  gen: number;
  reason?: string;
  at?: string;
  bought: Record<string, number>;
}

function simulate(prefix: string, from: number, to: number): Result[] {
  const out: Result[] = [];
  for (let i = from; i < to; i++) {
    const run = playRun(newRun(`${prefix}${i}`));
    const go = run.gameOver;
    out.push({
      gen: run.gen,
      reason: go?.reason,
      at: go ? `${go.kind}${go.boss ? ':' + go.boss : ''}` : undefined,
      bought: run.stats.bought,
    });
  }
  return out;
}

/** Purchase category of a stats.bought key. */
function category(k: string): string {
  if (k.startsWith('pack_')) return k;
  if (/^sw\d+$/.test(k)) return 'software';
  if (/^t\d+$/.test(k)) return 'tool';
  try {
    part(k);
    return 'hardware';
  } catch {
    return 'driver';
  }
}

function report(all: Result[], runs: number, secs: number): void {
  const gens = all.map((r) => r.gen).sort((a, b) => a - b);
  const reasons: Record<string, number> = {};
  const deathAt: Record<string, number> = {};
  const bought: Record<string, number> = {};
  const cats: Record<string, number> = {};
  for (const r of all) {
    if (r.reason) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
    if (r.at) deathAt[r.at] = (deathAt[r.at] ?? 0) + 1;
    for (const [k, v] of Object.entries(r.bought)) {
      bought[k] = (bought[k] ?? 0) + v;
      cats[category(k)] = (cats[category(k)] ?? 0) + v;
    }
  }
  const hist = new Map<number, number>();
  for (const g of gens) hist.set(g, (hist.get(g) ?? 0) + 1);
  const pct = (q: number) => gens[Math.min(gens.length - 1, Math.floor(q * gens.length))];
  console.log(`\nBOTTLENECK balancing simulation – curve ${JSON.stringify(CURVE)} – ${runs} runs, ${secs.toFixed(1)} s`);
  console.log('Generation reached (game over in this generation):');
  const max = Math.max(...hist.values());
  for (const [g, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  Gen ${String(g).padStart(2)} ${'#'.repeat(Math.round((n / max) * 40)).padEnd(40)} ${n} (${((n / runs) * 100).toFixed(1)} %)`);
  }
  const mean = gens.reduce((a, b) => a + b, 0) / gens.length;
  const early = gens.filter((g) => g <= 2).length;
  console.log(`mean ${mean.toFixed(2)} · median ${pct(0.5)} · p10 ${pct(0.1)} · p90 ${pct(0.9)} · max ${gens[gens.length - 1]} · dead in gen 1–2: ${((early / runs) * 100).toFixed(1)} %`);
  console.log('Causes:', reasons);
  console.log('Lost at:', Object.entries(deathAt).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', '));
  const perRun = (n: number) => (n / runs).toFixed(1);
  console.log('Purchases per run:', Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${perRun(v)}`).join(', '));
  console.log('Most bought:', Object.entries(bought).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, v]) => `${k} ${v}`).join(', '));
}

const args = process.argv.slice(2);
if (args[0] === '--worker') {
  const [, prefix, from, to] = args;
  process.stdout.write(JSON.stringify(simulate(prefix!, Number(from), Number(to))));
} else {
  const runs = Number(args[0] ?? 200);
  const prefix = args[1] ?? 'SIM';
  const jobs = Math.max(1, Math.min(Number(process.env.SIM_JOBS ?? Math.min(8, cpus().length)), runs));
  const t0 = Date.now();
  if (jobs === 1) {
    report(simulate(prefix, 0, runs), runs, (Date.now() - t0) / 1000);
  } else {
    const self = fileURLToPath(import.meta.url);
    const chunk = Math.ceil(runs / jobs);
    const parts: Promise<Result[]>[] = [];
    for (let j = 0; j < jobs; j++) {
      const from = j * chunk;
      const to = Math.min(runs, from + chunk);
      if (from >= to) break;
      parts.push(
        new Promise((resolve, reject) => {
          const p = spawn(process.execPath, [...process.execArgv, self, '--worker', prefix, String(from), String(to)], {
            stdio: ['ignore', 'pipe', 'inherit'],
            env: process.env,
          });
          let buf = '';
          p.stdout.on('data', (d) => (buf += d));
          p.on('close', (code) => (code === 0 ? resolve(JSON.parse(buf) as Result[]) : reject(new Error(`worker exit ${code}`))));
        }),
      );
    }
    Promise.all(parts).then(
      (res) => report(res.flat(), runs, (Date.now() - t0) / 1000),
      (e) => {
        console.error(e);
        process.exit(1);
      },
    );
  }
}
