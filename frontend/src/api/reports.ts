import { api } from './client';
import type { Ref } from './types';

export interface ReportRange { from?: string; to?: string }

export interface ReportOverview {
  total: number; open: number; critical: number; resolved: number; slaViolations: number;
  avgResolutionMinutes: number | null; avgSatisfaction: number | null;
}
export interface TrendPoint { date: string; created: number; resolved: number }
export interface SlaComplianceRow { label: string; met: number; violated: number; total: number; compliancePercent: number }
export interface LabelCount { label: string; count: number }
export interface ServiceReportRow { serviceId: number; name: string; count: number }
export interface WorkloadReportRow { technicianId: number; name: string; load: number; maxLoad: number; active: number; avgResolutionMinutes: number | null }
export type CoverageLevel = 'NO_COVERAGE' | 'SINGLE_HOLDER' | 'THIN' | 'COVERED';
export interface CoverageItem {
  category: Ref | null; service: Ref | null; criticality: number; eligibleCount: number;
  eligibleTechnicians: Ref[]; flagged: boolean; level: CoverageLevel; message: string;
  requiredSkills: { skillId: number; name: string; holders: number }[]; incidentsInWindow: number;
}
export interface CoverageRiskReport {
  availableTechnicians: number; flaggedCount: number; generatedAt: string; items: CoverageItem[];
  minCriticality: number; minHolders: number; windowDays: number;
}

export type SlaGroupBy = 'priority' | 'service' | 'technician';
export type ExportType = 'incidents' | 'overview' | 'services' | 'trends' | 'priority-distribution'
  | 'category-distribution' | 'sla-compliance' | 'workload';

export const getOverview = async (r: ReportRange) => (await api.get<ReportOverview>('/reports/overview', { params: r })).data;
export const getTrends = async (r: ReportRange, bucket: 'day' | 'week') =>
  (await api.get<TrendPoint[]>('/reports/trends', { params: { ...r, bucket } })).data;
export const getSlaCompliance = async (r: ReportRange, groupBy: SlaGroupBy) =>
  (await api.get<SlaComplianceRow[]>('/reports/sla-compliance', { params: { ...r, groupBy } })).data;
export const getPriorityDistribution = async (r: ReportRange) =>
  (await api.get<LabelCount[]>('/reports/priority-distribution', { params: r })).data;
export const getCategoryDistribution = async (r: ReportRange) =>
  (await api.get<LabelCount[]>('/reports/category-distribution', { params: r })).data;
export const getServiceReport = async (r: ReportRange) =>
  (await api.get<ServiceReportRow[]>('/reports/services', { params: r })).data;
export const getWorkloadReport = async () => (await api.get<WorkloadReportRow[]>('/reports/workload')).data;
export const getCoverageRisk = async (onlyFlagged: boolean) =>
  (await api.get<CoverageRiskReport>('/reports/coverage-risk', { params: { onlyFlagged } })).data;

/** Downloads a report as a file; the blob goes through the axios client so the auth header is sent. */
export async function downloadReport(type: ExportType, format: 'csv' | 'pdf', r: ReportRange): Promise<void> {
  const res = await api.get<Blob>('/reports/export', { params: { type, format, ...r }, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${type}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
