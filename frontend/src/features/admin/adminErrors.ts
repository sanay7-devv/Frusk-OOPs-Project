import type { AxiosError } from 'axios';
import type { ApiError } from '../../api/types';
import { apiErrorMessage, retryAfterSeconds } from '../../utils/errors';

type Toast = (message: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;

export const errorCode = (e: unknown): string | undefined => (e as AxiosError<ApiError>)?.response?.data?.code;
export const isConflict = (e: unknown) => errorCode(e) === 'OPTIMISTIC_LOCK_CONFLICT';

/**
 * Text for a failed admin request. Adds what the generic helper does not say:
 * a rate limit names the Retry-After wait, an optimistic-lock conflict says the screen was reloaded,
 * a duplicate says to open the existing incident.
 */
export function failureMessage(e: unknown): string {
  switch (errorCode(e)) {
    case 'RATE_LIMITED': {
      const s = retryAfterSeconds(e);
      return s ? `Too many requests. Try again in ${s} second${s === 1 ? '' : 's'}.` : apiErrorMessage(e);
    }
    case 'OPTIMISTIC_LOCK_CONFLICT':
      return 'Someone else changed this just now. The latest version has been loaded; check it and try again.';
    case 'DUPLICATE_INCIDENT':
      return `${apiErrorMessage(e)} Open the existing incident instead of creating another.`;
    default:
      return apiErrorMessage(e);
  }
}

/** Toast a failed mutation; on a version conflict run `reload` first so the retry uses fresh data. */
export function reportFailure(toast: Toast, e: unknown, reload?: () => void): void {
  if (isConflict(e)) reload?.();
  const code = errorCode(e);
  toast(failureMessage(e), code === 'RATE_LIMITED' || code === 'OPTIMISTIC_LOCK_CONFLICT' ? 'warning' : 'error');
}
