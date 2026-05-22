/**
 * Low-level HTTP client used by the live Gumloop adapter.
 *
 * Adds:
 *   - Bearer auth interceptor (`Authorization: Bearer <api_key>`)
 *   - `x-auth-key` user header (required when using personal API keys)
 *   - JSON encoding / decoding
 *   - Exponential-backoff retries for transient failures
 *   - Strongly typed errors via `ApiError`
 */
import { AppConfig } from '@/constants/config';
import { ApiError } from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Max retries on transient (network / 5xx / 429) failures. */
  retries?: number;
  /** Base backoff delay (ms). */
  baseDelayMs?: number;
}

interface AuthContext {
  apiKey: string;
  userId: string;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthContext(): AuthContext {
  return {
    apiKey: AppConfig.gumloop.apiKey,
    userId: AppConfig.gumloop.userId,
  };
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    signal,
    retries = 2,
    baseDelayMs = 400,
  } = options;

  const { apiKey, userId } = getAuthContext();
  const url = buildUrl(AppConfig.gumloop.baseUrl, path, query);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (apiKey) finalHeaders.Authorization = `Bearer ${apiKey}`;
  if (userId) finalHeaders['x-auth-key'] = userId;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let parsed: unknown = text;
        try {
          parsed = text ? JSON.parse(text) : undefined;
        } catch {
          /* keep raw text */
        }

        const retriable =
          response.status === 429 || (response.status >= 500 && response.status < 600);
        if (retriable && attempt < retries) {
          await delay(baseDelayMs * 2 ** attempt);
          continue;
        }
        throw ApiError.fromStatus(response.status, path, parsed);
      }

      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) throw error;
      // Network or abort error
      if ((error as { name?: string })?.name === 'AbortError') throw error;
      if (attempt < retries) {
        await delay(baseDelayMs * 2 ** attempt);
        continue;
      }
      throw new ApiError('network', (error as Error).message ?? 'Network request failed', {
        endpoint: path,
      });
    }
  }
  throw (lastError as Error) ?? new ApiError('unknown', 'Unknown error', { endpoint: path });
}
