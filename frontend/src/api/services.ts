import { api, tokenStore } from './client';

export interface ServiceItem {
  id: number;
  name: string;
  criticality: number;
  description?: string;
  alwaysP1?: boolean;
}

export interface CategoryItem {
  id: number;
  name: string;
  serviceId?: number;
  parentId?: number | null;
  description?: string;
}

export const PREDEFINED_SERVICES: ServiceItem[] = [
  { id: 1, name: 'Identity & SSO (Okta Gateway)', criticality: 5, description: 'Authentication, SAML & Single Sign-On broker' },
  { id: 2, name: 'Global VPN Gateway (AnyConnect Edge)', criticality: 4, description: 'Remote access VPN termination points' },
  { id: 3, name: 'Email & Office 365 Cloud Suite', criticality: 3, description: 'Corporate mailbox, Teams and calendar' },
  { id: 4, name: 'Core Database Cluster (Postgres Aurora)', criticality: 5, description: 'Primary relational data storage cluster' },
  { id: 5, name: 'CI/CD Build Runners (GitLab Fleet)', criticality: 2, description: 'Software integration and deployment pipelines' },
  { id: 6, name: 'Core Payment Gateway (Payment Service)', criticality: 5, alwaysP1: true, description: 'Client transaction and billing engine' },
];

export const PREDEFINED_CATEGORIES: CategoryItem[] = [
  { id: 1, name: 'Network & Connectivity', serviceId: 2 },
  { id: 2, name: 'Authentication & Access Controls', serviceId: 1 },
  { id: 3, name: 'Data Integrity & Corruption', serviceId: 4 },
  { id: 4, name: 'Performance & Latency Degradation', serviceId: 4 },
  { id: 5, name: 'Hardware / Infrastructure Fault', serviceId: 5 },
  { id: 6, name: 'Application Software', serviceId: 6 },
];

export async function getServices(): Promise<ServiceItem[]> {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return PREDEFINED_SERVICES;
  }
  try {
    const res = await api.get<ServiceItem[]>('/services');
    return res.data && res.data.length > 0 ? res.data : PREDEFINED_SERVICES;
  } catch {
    return PREDEFINED_SERVICES;
  }
}

export async function getCategories(): Promise<CategoryItem[]> {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return PREDEFINED_CATEGORIES;
  }
  try {
    const res = await api.get<CategoryItem[]>('/categories');
    return res.data && res.data.length > 0 ? res.data : PREDEFINED_CATEGORIES;
  } catch {
    return PREDEFINED_CATEGORIES;
  }
}

