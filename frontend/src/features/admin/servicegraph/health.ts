import type { ServiceHealth } from '../../../api/services';

/** Status colours (semantic; the design tokens have no success/warning/error entries). */
export const HEALTH_COLOR: Record<ServiceHealth, string> = {
  OUTAGE: '#f43f5e',
  DEGRADED: '#f59e0b',
  HEALTHY: '#10b981',
};

export const HEALTH_LABEL: Record<ServiceHealth, string> = {
  OUTAGE: 'Outage',
  DEGRADED: 'Degraded',
  HEALTHY: 'Healthy',
};
