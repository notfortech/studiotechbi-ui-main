/**
 * Shared API envelope for property location endpoints (camelCase JSON).
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  /** JWT / auth middleware may use singular `error` instead of `errors`. */
  error?: string;
}

export class PropertyApiError extends Error {
  constructor(
    message: string,
    public readonly errors?: string[],
    public readonly code?: string
  ) {
    super(message);
    this.name = 'PropertyApiError';
  }
}

function formatFailureMessage(body: ApiResponse<unknown>): string {
  const base =
    typeof body.message === 'string' && body.message.trim()
      ? body.message.trim()
      : 'The request could not be completed.';
  const parts: string[] = [base];
  if (Array.isArray(body.errors)) {
    const errStrings = body.errors.filter((e): e is string => typeof e === 'string' && e.trim() !== '');
    if (errStrings.length) parts.push(errStrings.join(' '));
  }
  if (typeof body.error === 'string' && body.error.trim()) {
    parts.push(body.error.trim());
  }
  return parts.join(' ');
}

/**
 * Parses a property controller JSON body. When `success === true`, returns `data` (possibly undefined).
 * When `success === false` or missing, throws {@link PropertyApiError} with a user-safe message.
 */
export function unwrapPropertyApiResponse<T>(body: unknown): T {
  if (body == null || typeof body !== 'object') {
    throw new PropertyApiError('Invalid response from server.');
  }
  const envelope = body as ApiResponse<T>;
  if (envelope.success !== true) {
    throw new PropertyApiError(
      formatFailureMessage(envelope as ApiResponse<unknown>),
      Array.isArray(envelope.errors)
        ? envelope.errors.filter((e): e is string => typeof e === 'string')
        : undefined,
      typeof envelope.error === 'string' ? envelope.error : undefined
    );
  }
  return envelope.data as T;
}
