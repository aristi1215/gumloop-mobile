import type { RunState } from './gumloop';

export type AlertCategory = 'failure' | 'termination' | 'completion';

export interface NotificationPreferences {
  enabled: boolean;
  failureAlerts: boolean;
  terminationAlerts: boolean;
  completionAlerts: boolean;
  /** Polling interval in milliseconds. */
  pollingIntervalMs: number;
  /** Per-flow opt-in/out. Missing entries inherit global defaults. */
  flowOverrides: Record<string, Partial<Omit<NotificationPreferences, 'flowOverrides'>>>;
}

export interface AppNotification {
  id: string;
  category: AlertCategory;
  title: string;
  body: string;
  run_id: string;
  saved_item_id: string;
  flow_name: string;
  state: RunState;
  created_at: string;
  read: boolean;
}
