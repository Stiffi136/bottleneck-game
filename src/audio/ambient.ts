import { postIssues } from '../core/run';
import { sfx } from './sfx';
import type { RunState } from '../core/run';

/**
 * Fan noise outside the benchmark: quiet idle noise on the workbench while the PC would pass POST,
 * silence elsewhere. The benchmark screen drives the fan itself (by temperature).
 */
export function startAmbient(getRun: () => RunState | null): void {
  window.setInterval(() => {
    const run = getRun();
    if (!run || run.phase === 'bench') return;
    if (run.phase !== 'workbench') {
      sfx.fan(0);
      return;
    }
    const ok = run.phase === 'workbench' && !postIssues(run).some((i) => i.severity === 'error');
    if (ok) sfx.fanIdle();
    else sfx.fan(0);
  }, 400);
}
