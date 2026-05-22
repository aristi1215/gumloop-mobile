import type { FlowRun, RunState } from '@/types/gumloop';

const PRIORITY: Record<RunState, number> = {
  FAILED: 0,
  TERMINATED: 1,
  RUNNING: 2,
  STARTED: 3,
  QUEUED: 4,
  DONE: 5,
};

/**
 * Sorts runs to surface operationally important items first:
 *   1. FAILED → TERMINATED (highest priority)
 *   2. RUNNING / STARTED / QUEUED
 *   3. DONE
 *   4. Newest first within each tier
 */
export function sortRunsByPriority(runs: FlowRun[]): FlowRun[] {
  return [...runs].sort((a, b) => {
    const priority = PRIORITY[a.state] - PRIORITY[b.state];
    if (priority !== 0) return priority;
    return a.created_ts < b.created_ts ? 1 : -1;
  });
}
