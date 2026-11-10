import type { AxiosError } from 'axios';
import type { ApiError } from '../api/types';

// Copy from handbook 2.9
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ACCOUNT_LOCKED: 'Too many attempts. Try again in 15 minutes.',
  UNAUTHORIZED_OPERATION: 'You do not have permission to do this.',
  CONFLICT_OF_INTEREST: 'You reported this incident, so you cannot handle it.',
  INVALID_STATE_TRANSITION: "This action is not available in the incident's current status. Refresh to see the latest state.",
  OPTIMISTIC_LOCK_CONFLICT: 'Someone else just updated this incident. Reload to continue.',
  TECHNICIAN_UNAVAILABLE: 'That technician cannot take more work. Pick another.',
  WORKLOAD_EXCEEDED: 'That technician cannot take more work. Pick another.',
  SLA_NOT_CONFIGURED: 'No SLA policy exists for this service and priority. Ask an administrator.',
  RATE_LIMITED: 'You are doing that too quickly. Try again in a moment.',
};
export function errorMessage(e: unknown): string {
  const body = (e as AxiosError<ApiError>)?.response?.data;
  if (body?.code && MESSAGES[body.code]) return MESSAGES[body.code];
  if (body?.code === 'VALIDATION_FAILED' && body.message) return body.message;
  if (body?.message) return body.message;
  if ((e as Error)?.message) return (e as Error).message;
  return 'Something went wrong on our side. Retry.';
}
export const fieldErrors = (e: unknown) => (e as AxiosError<ApiError>)?.response?.data?.fieldErrors ?? [];
export const isDuplicate = (e: unknown) => (e as AxiosError<ApiError>)?.response?.data?.code === 'DUPLICATE_INCIDENT';
