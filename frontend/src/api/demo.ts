import axios from 'axios';
import { api } from './client';
import type { Ref } from './types';

// Demo-profile only (not in the OpenAPI export): every other profile answers 404.
export interface ClockView { now: string; offsetMinutes: number }
export interface DrillResult { rootService: Ref; problemId: number | null; incidentCodes: string[]; dependents: Ref[]; note: string }
export const ADVANCE_MIN = 1;
export const ADVANCE_MAX = 1440;

/** True when the server answered 404, i.e. it is not running the demo profile. */
export const isDemoUnavailable = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 404;

export const getDemoClock = async () => (await api.get<ClockView>('/admin/demo/clock')).data;
export const advanceDemoClock = async (minutes: number) =>
  (await api.post<ClockView>('/admin/demo/clock/advance', { minutes })).data;
export const runOutageDrill = async (rootServiceId: number) =>
  (await api.post<DrillResult>('/admin/demo/outage-drill', { rootServiceId })).data;
