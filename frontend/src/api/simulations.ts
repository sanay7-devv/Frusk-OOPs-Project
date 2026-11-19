import { api } from './client';

// Contract: SimulationRequest / ConfigurationRequest / WeightsRequest (backend/docs/openapi/iitsm-api.json).
export const SIM_STRATEGIES = ['COMPOSITE', 'SKILL', 'LOAD', 'ROUND_ROBIN', 'EXPERIENCE_PRIORITY'] as const;
export type SimStrategy = (typeof SIM_STRATEGIES)[number];

export const WEIGHT_NAMES = ['skill', 'load', 'experience', 'priorityFit', 'familiarity'] as const;
export type WeightName = (typeof WEIGHT_NAMES)[number];

/** Backend limits (@Min/@Max/@Size on the request records). */
export const SIM_LIMITS = {
  maxConfigurations: 3, nameMax: 60, techniciansMin: 1, techniciansMax: 50,
  incidentsMin: 10, incidentsMax: 500, speedUpMin: 1, speedUpMax: 20, weightSumTolerance: 0.001,
} as const;

export interface ConfigurationRequest {
  name?: string;
  strategy?: SimStrategy;
  weights?: Partial<Record<WeightName, number>>;
  technicians?: number;
}
export interface SimulationRequest {
  lastIncidents?: number;
  speedUp?: number;
  configurations?: ConfigurationRequest[];
}

export interface WorkerResult { technicianId: number; name: string; assigned: number; busyMinutes: number; utilizationPercent: number }
export interface ConfigurationView {
  name: string; strategy: string; weights: Record<string, string>; technicians: number; incidents: number;
  slaViolations: number; slaViolationPercent: number; unassigned: number; meanResolveMinutes: number;
  p90ResolveMinutes: number; meanWaitMinutes: number; fairness: number; matchesRealAssigneePercent: number;
  perTechnician: WorkerResult[];
}
export interface SimulationView {
  workload: { incidents: number; from: string | null; to: string | null; speedUp: number; excluded: Record<string, number> };
  assumptions: string[];
  results: ConfigurationView[];
  best: string | null;
  bestReason: string | null;
}

export const runSimulation = async (body: SimulationRequest) =>
  (await api.post<SimulationView>('/admin/simulations', body)).data;

export const applySimulation = async (body: ConfigurationRequest) => {
  await api.post('/admin/simulations/apply', body);
};
