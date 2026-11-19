import type { ServiceHealth } from '../../../api/services';
import { tone } from '../palette';

/** Status colours (semantic; the design tokens have no success/warning/error entries). */
export const HEALTH_COLOR: Record<ServiceHealth, string> = {
  OUTAGE: tone.danger,
  DEGRADED: tone.warning,
  HEALTHY: tone.success,
};

export const HEALTH_LABEL: Record<ServiceHealth, string> = {
  OUTAGE: 'Outage',
  DEGRADED: 'Degraded',
  HEALTHY: 'Healthy',
};
