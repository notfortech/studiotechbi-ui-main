import { isAxiosError } from 'axios';

const GENERIC_NETWORK =
  'We could not reach the server. Check your connection and try again.';
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';
const SERVICE_UNAVAILABLE = 'The service is temporarily unavailable. Please try again shortly.';

function readServerMessage(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const msg = o.message ?? o.title;
  if (typeof msg === 'string' && msg.trim()) {
    const parts: string[] = [msg.trim()];
    if (Array.isArray(o.errors)) {
      const errStrs = o.errors.filter(
        (e): e is string => typeof e === 'string' && e.trim() !== ''
      );
      if (errStrs.length) parts.push(errStrs.join(' '));
    }
    if (typeof o.error === 'string' && o.error.trim()) parts.push(o.error.trim());
    return parts.join(' ');
  }
  if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
  if (typeof o.errors === 'string' && o.errors.trim()) return o.errors;
  return undefined;
}

/**
 * Maps Axios/network failures to safe, user-facing copy. Does not expose stack traces or raw exceptions.
 */
export function getUserFacingApiMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return SESSION_EXPIRED;
    if (status === 503 || status === 502 || status === 504) return SERVICE_UNAVAILABLE;
    if (status != null && status >= 500) return SERVICE_UNAVAILABLE;
    const fromBody = readServerMessage(error.response?.data);
    if (fromBody) return fromBody;
    if (error.code === 'ERR_NETWORK' || !error.response) return GENERIC_NETWORK;
    return 'Something went wrong. Please try again.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
