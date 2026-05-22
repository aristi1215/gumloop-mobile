/**
 * Background watcher that polls run state transitions and dispatches
 * notifications when a flow flips into FAILED / TERMINATED / DONE state.
 *
 * Architected as a pure detection layer that delegates the actual delivery
 * to `notificationService.dispatchLocalNotification`. Swap in a webhook /
 * push-channel transport later without touching detection logic.
 */
import { gumloopAdapter } from '@/services/api';
import type { FlowRun, RunState } from '@/types/gumloop';
import type { AlertCategory, AppNotification } from '@/types/notifications';

import { dispatchLocalNotification } from './notificationService';
import { notificationStore } from './notificationStore';

const TERMINAL_STATES: RunState[] = ['FAILED', 'TERMINATED', 'DONE'];

function categoryForState(state: RunState): AlertCategory | null {
  switch (state) {
    case 'FAILED':
      return 'failure';
    case 'TERMINATED':
      return 'termination';
    case 'DONE':
      return 'completion';
    default:
      return null;
  }
}

function titleForCategory(category: AlertCategory, flowName: string): string {
  switch (category) {
    case 'failure':
      return `🚨 ${flowName} failed`;
    case 'termination':
      return `⛔ ${flowName} was terminated`;
    case 'completion':
      return `✅ ${flowName} completed`;
  }
}

function makeId(): string {
  return `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface WatcherOptions {
  intervalMs: number;
}

class RunWatcher {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSeenState = new Map<string, RunState>();
  private bootstrapped = false;
  private intervalMs = 15_000;

  async start(options: WatcherOptions): Promise<void> {
    this.intervalMs = options.intervalMs;
    if (this.timer) clearInterval(this.timer);
    await notificationStore.hydrate();
    if (!this.bootstrapped) await this.bootstrap();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setInterval(intervalMs: number): void {
    if (intervalMs === this.intervalMs && this.timer) return;
    this.intervalMs = intervalMs;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        void this.tick();
      }, this.intervalMs);
    }
  }

  /** Seed `lastSeenState` so we don't spam alerts for historical runs. */
  private async bootstrap(): Promise<void> {
    this.bootstrapped = true;
    try {
      const runs = await gumloopAdapter.listRecentRuns();
      for (const run of runs) this.lastSeenState.set(run.run_id, run.state);
    } catch {
      /* ignore — bootstrap is best-effort */
    }
  }

  private async tick(): Promise<void> {
    try {
      const runs = await gumloopAdapter.listRecentRuns();
      for (const run of runs) {
        const previous = this.lastSeenState.get(run.run_id);
        this.lastSeenState.set(run.run_id, run.state);
        if (previous === run.state) continue;
        if (!TERMINAL_STATES.includes(run.state)) continue;
        await this.maybeDispatch(run);
      }
    } catch (error) {
      if (__DEV__) {
         
        console.warn('[runWatcher] tick failed', error);
      }
    }
  }

  private async maybeDispatch(run: FlowRun): Promise<void> {
    const category = categoryForState(run.state);
    if (!category) return;
    if (!notificationStore.shouldNotify(category, run.saved_item_id)) return;

    const notification: AppNotification = {
      id: makeId(),
      category,
      title: titleForCategory(category, run.flow_name ?? 'Workflow'),
      body:
        run.error_message ??
        `Run finished in ${run.state.toLowerCase()} state at ${new Date(
          run.finished_ts ?? Date.now(),
        ).toLocaleTimeString()}.`,
      run_id: run.run_id,
      saved_item_id: run.saved_item_id,
      flow_name: run.flow_name ?? 'Workflow',
      state: run.state,
      created_at: new Date().toISOString(),
      read: false,
    };

    await notificationStore.add(notification);
    await dispatchLocalNotification(notification);
  }

  /** Manually inject a sample alert — useful for the "Send test" button. */
  async injectTestAlert(run: FlowRun, category: AlertCategory): Promise<void> {
    const notification: AppNotification = {
      id: makeId(),
      category,
      title: titleForCategory(category, run.flow_name ?? 'Workflow'),
      body:
        category === 'failure'
          ? 'Synthetic alert: pretend HubSpot is unreachable.'
          : category === 'termination'
            ? 'Synthetic alert: pretend an operator terminated this run.'
            : 'Synthetic alert: pretend this run just completed successfully.',
      run_id: run.run_id,
      saved_item_id: run.saved_item_id,
      flow_name: run.flow_name ?? 'Workflow',
      state: run.state,
      created_at: new Date().toISOString(),
      read: false,
    };
    await notificationStore.add(notification);
    await dispatchLocalNotification(notification);
  }
}

export const runWatcher = new RunWatcher();
