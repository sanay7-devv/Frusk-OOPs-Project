import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../../theme/theme';
import type { GraphNode, ServiceHealthRow, ServiceImpact } from '../../../api/services';
import { apiErrorMessage } from '../../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { alpha } from '../palette';
import OpenProblems from './OpenProblems';
import { HEALTH_COLOR, HEALTH_LABEL } from './health';

interface Props {
  node: GraphNode | null;
  health: ServiceHealthRow | undefined;
  impact: { data?: ServiceImpact; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void };
  onEditDependencies: (node: GraphNode) => void;
  onSelectService: (id: number) => void;
}

const Label = ({ children }: { children: string }) => (
  <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
    {children}
  </Typography>
);

const hops = (d: number) => (d === 1 ? 'direct' : `${d} hops`);

export default function Inspector({ node, health, impact, onEditDependencies, onSelectService }: Props) {
  const navigate = useNavigate();
  if (!node) {
    return <EmptyState message="Select a service on the graph to see its health and everything that depends on it." />;
  }
  const open = health?.open;
  const affected = impact.data?.affected ?? [];

  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainerLow }}>
      <Typography sx={{ color: tokens.onSurface, fontWeight: 700, fontSize: 18 }}>{node.name}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
        {health && (
          <Chip
            size="small"
            label={HEALTH_LABEL[health.status]}
            sx={{ bgcolor: alpha(HEALTH_COLOR[health.status], 0.15), color: HEALTH_COLOR[health.status], fontWeight: 700, fontSize: 12 }}
          />
        )}
        <Chip size="small" label={`Criticality ${node.criticality}`} sx={{ fontSize: 12 }} />
      </Stack>
      {health && <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mt: 1.5 }}>{health.reason}</Typography>}

      <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />
      <Label>Open incidents</Label>
      <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 1 }}>
        <Chip size="small" label={`${node.openIncidents} total`} sx={{ fontSize: 12 }} />
        {open &&
          (['P1', 'P2', 'P3', 'P4'] as const).map((p) => <Chip key={p} size="small" label={`${p}: ${open[p]}`} sx={{ fontSize: 12 }} />)}
      </Stack>
      {health && health.slaCompliancePercent !== null && (
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mt: 1.5 }}>
          SLA met on {health.slaCompliancePercent}% of {health.slaJudged} judged incidents (status window).
        </Typography>
      )}

      {health && health.causedBy.length > 0 && (
        <>
          <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />
          <Label>Degraded because of</Label>
          <Stack spacing={0.5} sx={{ mt: 0.75 }}>
            {health.causedBy.map((c) => (
              <Button
                key={c.id}
                size="small"
                onClick={() => onSelectService(c.id)}
                sx={{ justifyContent: 'space-between', textTransform: 'none', fontSize: 14 }}
              >
                <span>{c.name}</span>
                <span style={{ color: tokens.onSurfaceVariant }}>{hops(c.distance)}</span>
              </Button>
            ))}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />
      <Label>Impact if this service fails</Label>
      {impact.isLoading && <LoadingState />}
      {impact.isError && <ErrorState message={apiErrorMessage(impact.error)} onRetry={impact.refetch} />}
      {impact.data && affected.length === 0 && (
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mt: 0.75 }}>No other service depends on it.</Typography>
      )}
      {affected.length > 0 && (
        <>
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mt: 0.75 }}>
            {affected.length} service{affected.length === 1 ? '' : 's'} depend on it, directly or through others.
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.75 }}>
            {affected.map((a) => (
              <Button
                key={a.id}
                size="small"
                onClick={() => onSelectService(a.id)}
                sx={{ justifyContent: 'space-between', textTransform: 'none', fontSize: 14 }}
              >
                <span>{a.name}</span>
                <span style={{ color: tokens.onSurfaceVariant }}>{hops(a.distance)}</span>
              </Button>
            ))}
          </Stack>
        </>
      )}

      <OpenProblems serviceId={node.id} />

      <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Button size="small" variant="outlined" onClick={() => navigate(`/admin/tickets?serviceId=${node.id}`)}>
          View incidents
        </Button>
        <Button size="small" variant="outlined" onClick={() => onEditDependencies(node)}>
          Edit dependencies
        </Button>
        <Button size="small" onClick={() => navigate('/admin/services')}>
          Service catalogue
        </Button>
      </Stack>
    </Box>
  );
}
