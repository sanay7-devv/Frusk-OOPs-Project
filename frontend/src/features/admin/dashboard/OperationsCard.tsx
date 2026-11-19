import { Button, Paper, Stack, Typography } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { tokens } from '../../../theme/theme';

// Grafana from backend/observability (docker-compose.observability.yml publishes it on 3001; the provisioned
// dashboard uid is "iitsm-service-desk"). Override with VITE_GRAFANA_URL for another host.
const GRAFANA_BASE = (import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const DASHBOARD_URL = `${GRAFANA_BASE}/d/iitsm-service-desk/i-itsm-service-desk`;

/** Link to the Grafana "I-ITSM service desk" dashboard. The metrics endpoint itself is token-guarded and never used here. */
export function OperationsCard() {
  return (
    <Paper sx={{ p: 2.5, height: '100%', bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
      <Typography sx={{ fontWeight: 700, color: tokens.onSurface, mb: 0.5 }}>Operations</Typography>
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13, mb: 2 }}>
        Service desk metrics over time: open and critical incidents, SLA warnings and violations, escalations, API latency and the
        database. Needs the optional monitoring stack to be running.
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button
          variant="outlined"
          component="a"
          href={DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Open Grafana dashboard
        </Button>
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12 }}>{GRAFANA_BASE}</Typography>
      </Stack>
    </Paper>
  );
}
