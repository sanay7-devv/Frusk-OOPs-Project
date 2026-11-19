import { api, tokenStore } from './client';

export interface ServiceItem {
  id: number;
  name: string;
  criticality: number;
  description?: string;
  alwaysP1?: boolean;
}

export interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}

export interface CategoryItem {
  id: number;
  name: string;
  parentId?: number | null;
  level?: number;
}

export function flattenCategories(nodes: CategoryNode[], level = 0): CategoryItem[] {
  const result: CategoryItem[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      name: level > 0 ? `${'\u00A0'.repeat(level * 3)}↳ ${node.name}` : node.name,
      level,
    });
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategories(node.children, level + 1));
    }
  }
  return result;
}

export async function getServices(): Promise<ServiceItem[]> {
  const res = await api.get<ServiceItem[]>('/services');
  return res.data || [];
}

export async function getCategories(): Promise<CategoryItem[]> {
  const res = await api.get<CategoryNode[]>('/categories');
  return flattenCategories(res.data || []);
}



// ---- Service graph, impact and health (GET /services/graph, /services/{id}/impact, /services/status) ----

export interface GraphNode {
  id: number;
  name: string;
  criticality: number;
  openIncidents: number;
  hasOpenP1: boolean;
}

/** `from` depends on `to`. */
export interface GraphEdge {
  from: number;
  to: number;
}

export interface ServiceGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ReachedService {
  id: number;
  name: string;
  /** 1 = direct neighbour. */
  distance: number;
}

export interface ServiceImpact {
  serviceId: number;
  affected: ReachedService[];
}

export type ServiceHealth = 'OUTAGE' | 'DEGRADED' | 'HEALTHY';

export interface ServiceHealthRow {
  id: number;
  name: string;
  criticality: number;
  status: ServiceHealth;
  reason: string;
  causedBy: ReachedService[];
  open: { total: number; P1: number; P2: number; P3: number; P4: number };
  slaCompliancePercent: number | null;
  slaJudged: number;
}

export interface ServiceHealthBoard {
  basis: string;
  label: string;
  windowDays: number;
  generatedAt: string;
  services: ServiceHealthRow[];
}

export async function getServiceGraph(): Promise<ServiceGraphData> {
  const res = await api.get<ServiceGraphData>('/services/graph');
  return res.data;
}

export async function getServiceImpact(id: number): Promise<ServiceImpact> {
  const res = await api.get<ServiceImpact>(`/services/${id}/impact`);
  return res.data;
}

export async function getServiceHealthBoard(): Promise<ServiceHealthBoard> {
  const res = await api.get<ServiceHealthBoard>('/services/status');
  return res.data;
}
