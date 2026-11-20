import type { AxiosError } from 'axios';
import type { ApiError } from '../../api/types';
import { fieldErrors } from '../../utils/errors';

/** The server's error `code` (ApiError.code) for a failed request, or null when there was no API body. */
export const apiErrorCode = (e: unknown): string | null => (e as AxiosError<ApiError>)?.response?.data?.code ?? null;

/**
 * Codes that mean "the screen is showing old data": the status changed, someone else saved first, or the
 * technician's capacity changed. After one of these the screen reloads what the choice depended on.
 */
const STALE_CODES = new Set(['INVALID_STATE_TRANSITION', 'OPTIMISTIC_LOCK_CONFLICT', 'TECHNICIAN_UNAVAILABLE', 'WORKLOAD_EXCEEDED']);
export const isStaleDataError = (e: unknown): boolean => {
  const code = apiErrorCode(e);
  return code != null && STALE_CODES.has(code);
};

/** Message of the first field error for `field` (ApiError.fieldErrors), or undefined. */
export const fieldErrorFor = (e: unknown, field: string): string | undefined => fieldErrors(e).find((f) => f.field === field)?.message;
