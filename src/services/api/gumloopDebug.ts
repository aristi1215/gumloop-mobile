/**
 * Dev-only Gumloop diagnostics. Never logs full secrets.
 */
import { AppConfig, isGumloopConfigured, isMockMode } from '@/constants/config';

const TAG = '[Gumloop]';

export function maskSecret(value: string, visible = 4): string {
  if (!value) return '(empty)';
  if (value.length <= visible * 2) return `(${value.length} chars)`;
  return `${value.slice(0, visible)}…${value.slice(-visible)} (${value.length} chars)`;
}

export function logGumloopStartup(): void {
  if (!__DEV__) return;

  const { baseUrl, apiKey, userId, projectId, organizationId, useMockApi } = AppConfig.gumloop;
  const configured = isGumloopConfigured();
  const mode = isMockMode() ? 'mock' : 'live';

  console.log(TAG, 'Startup config', {
    adapter: mode,
    configured,
    useMockApi,
    baseUrl,
    apiKey: maskSecret(apiKey),
    userId: maskSecret(userId),
    projectId: projectId || '(unset — requests use user_id)',
    organizationId: organizationId || '(unset — audit logs need org id)',
  });

  if (mode === 'live' && !configured) {
    console.warn(
      TAG,
      'Live mode but credentials incomplete. Set EXPO_PUBLIC_GUMLOOP_API_KEY and EXPO_PUBLIC_GUMLOOP_USER_ID in .env.local, then restart Metro (npx expo start -c).',
    );
  }
}

export function logRequestScope(label: string): void {
  if (!__DEV__) return;
  const { userId, projectId } = AppConfig.gumloop;
  console.log(TAG, `${label} scope`, projectId ? { project_id: projectId } : { user_id: maskSecret(userId) });
}

export function logHttpAttempt(
  method: string,
  path: string,
  auth: { hasApiKey: boolean; hasUserId: boolean; attempt: number },
): void {
  if (!__DEV__) return;
  console.log(TAG, `→ ${method} ${path}`, auth);
}

export function logHttpFailure(
  method: string,
  path: string,
  status: number,
  body?: unknown,
  auth?: { hasApiKey: boolean; hasUserId: boolean },
): void {
  if (!__DEV__) return;
  console.warn(TAG, `✗ ${method} ${path} HTTP ${status}`, { auth, body: body ?? '(empty)' });
}

export function logAdapterCall(method: string, detail?: string): void {
  if (!__DEV__) return;
  console.log(TAG, `adapter.${method}${detail ? ` — ${detail}` : ''}`);
}
