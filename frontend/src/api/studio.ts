import { api, tokenStore } from './client';
import { getIncident, listIncidents, type IncidentFilters } from './incidents';
import type { IncidentDetail, IncidentSummary, Page } from './types';

// Reuse the team's demo incident store. Live requests retain visible errors and empty states.
export const listStudioIncidents = (filters: IncidentFilters) => tokenStore.getAccess()?.startsWith('mock-')
  ? listIncidents(filters)
  : api.get<Page<IncidentSummary>>('/incidents', { params: filters, paramsSerializer: { indexes: null } }).then(response => response.data);
export const getStudioIncident = (id: number) => tokenStore.getAccess()?.startsWith('mock-')
  ? getIncident(id)
  : api.get<IncidentDetail>(`/incidents/${id}`).then(response => response.data);
export const getStudioHistory = (id: number) => api.get(`/incidents/${id}/history`).then(response => response.data);
