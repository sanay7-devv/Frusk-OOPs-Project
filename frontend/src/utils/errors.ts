import type { AxiosError } from 'axios';
import type { ApiError } from '../api/types';

// Copy from handbook 2.9
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ACCOUNT_LOCKED: 'Too many failed attempts. This account is temporarily locked; try again later.',
  MFA_REQUIRED: 'Enter the code from your authenticator app.',
  INVALID_MFA_CODE: 'That code is wrong or has expired. Enter the current code from your authenticator app.',
  TOKEN_INVALID: 'Your session or link is no longer valid. Sign in again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Try again in a moment.',
  UNAUTHORIZED_OPERATION: 'You do not have permission to do this.',
  CONFLICT_OF_INTEREST: 'You reported this incident, so you cannot handle it.',
  INVALID_STATE_TRANSITION: "This action is not available in the incident's current status. Refresh to see the latest state.",
  OPTIMISTIC_LOCK_CONFLICT: 'Someone else just updated this incident. Reload to continue.',
  TECHNICIAN_UNAVAILABLE: 'That technician cannot take more work. Pick another.',
  WORKLOAD_EXCEEDED: 'That technician cannot take more work. Pick another.',
  SLA_NOT_CONFIGURED: 'No SLA policy exists for this service and priority. Ask an administrator.',
  RATE_LIMITED: 'You are doing that too quickly. Try again in a moment.',
};
/** Seconds from the Retry-After header, when present and numeric. */
export function retryAfterSeconds(e: unknown): number | null {
  const h = (e as AxiosError)?.response?.headers?.['retry-after'];
  const n = Number(h);
  return h != null && Number.isFinite(n) && n > 0 ? Math.ceil(n) : null;
}
export function errorMessage(e: unknown): string {
  const body = (e as AxiosError<ApiError>)?.response?.data;
  if (body?.code === 'RATE_LIMITED') {
    const s = retryAfterSeconds(e);
    return s ? `Too many attempts. Try again in ${s} second${s === 1 ? '' : 's'}.` : MESSAGES.RATE_LIMITED;
  }
  if (body?.code && MESSAGES[body.code]) return MESSAGES[body.code];
  if (body?.code === 'VALIDATION_FAILED' && body.message) return body.message;
  if (body?.message) return body.message;
  if ((e as Error)?.message) return (e as Error).message;
  return 'Something went wrong on our side. Retry.';
}
export const fieldErrors = (e: unknown) => (e as AxiosError<ApiError>)?.response?.data?.fieldErrors ?? [];
export const isDuplicate = (e: unknown) => (e as AxiosError<ApiError>)?.response?.data?.code === 'DUPLICATE_INCIDENT';

export function apiErrorMessage(e: unknown): string {
  const body = (e as AxiosError<ApiError>)?.response?.data;
  if (body?.fieldErrors?.length) {
    const fields = body.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', ');
    return `${body.message || 'Validation error'}: ${fields}`;
  }
  return errorMessage(e);
}
