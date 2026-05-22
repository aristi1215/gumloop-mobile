export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'validation'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly endpoint?: string;
  readonly details?: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; endpoint?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.endpoint = options.endpoint;
    this.details = options.details;
  }

  static fromStatus(status: number, endpoint?: string, body?: unknown): ApiError {
    const kind: ApiErrorKind =
      status === 401
        ? 'unauthorized'
        : status === 403
          ? 'forbidden'
          : status === 404
            ? 'not_found'
            : status === 429
              ? 'rate_limited'
              : status >= 500
                ? 'server'
                : status === 400
                  ? 'validation'
                  : 'unknown';
    return new ApiError(kind, defaultMessage(kind), { status, endpoint, details: body });
  }
}

function defaultMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Network error. Check your connection.';
    case 'unauthorized':
      return 'Authentication failed. Verify your Gumloop API key.';
    case 'forbidden':
      return 'You do not have permission to perform this action.';
    case 'not_found':
      return 'Resource not found.';
    case 'rate_limited':
      return 'Too many requests. Slow down and try again.';
    case 'server':
      return 'Gumloop is having trouble. Try again shortly.';
    case 'validation':
      return 'Request validation failed.';
    default:
      return 'Something went wrong.';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
