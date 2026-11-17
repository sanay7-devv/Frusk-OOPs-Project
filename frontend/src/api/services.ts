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


