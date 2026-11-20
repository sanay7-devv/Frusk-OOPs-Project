import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Grid, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { tokens } from '../../theme/theme';
import { getServiceGraph, getServiceHealthBoard, getServiceImpact } from '../../api/services';
import type { ServiceHealth } from '../../api/services';
import { apiErrorMessage } from '../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import GraphCanvas from './servicegraph/GraphCanvas';
import MajorIncidentPanel, { NO_PATH, type CausePath } from './servicegraph/MajorIncidentPanel';
import ServiceGraphMinimap from '../../components/ServiceGraphMinimap';
import LiveEventPulse from '../../components/LiveEventPulse';
import Inspector from './servicegraph/Inspector';
import DependenciesDialog from './servicegraph/DependenciesDialog';
import { computeLayout } from './servicegraph/layout';
import { HEALTH_COLOR, HEALTH_LABEL } from './servicegraph/health';
import type { GraphNode } from '../../api/services';

const REFRESH_MS = 15000;

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box sx={{ px: 2, py: 1.25, borderRadius: '10px', border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainerLow, minWidth: 120 }}>
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ color: color ?? tokens.onSurface, fontSize: 24, fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}

export default function ServiceGraph() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [healthFilter, setHealthFilter] = useState<'ALL' | ServiceHealth>('ALL');
  const [search, setSearch] = useState('');
  const [depsFor, setDepsFor] = useState<GraphNode | null>(null);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [causePath, setCausePath] = useState<CausePath>(NO_PATH);

  const graph = useQuery({ queryKey: ['service-graph'], queryFn: getServiceGraph, refetchInterval: REFRESH_MS });
  const board = useQuery({ queryKey: ['service-health'], queryFn: getServiceHealthBoard, refetchInterval: REFRESH_MS });
  const impact = useQuery({
    queryKey: ['service-impact', selectedId],
    queryFn: () => getServiceImpact(selectedId!),
    enabled: selectedId !== null,
  });

  const layout = useMemo(() => computeLayout(graph.data?.nodes ?? [], graph.data?.edges ?? []), [graph.data]);
  const health = useMemo(() => new Map((board.data?.services ?? []).map((s) => [s.id, s])), [board.data]);
  const affectedIds = useMemo(() => new Set((impact.data?.affected ?? []).map((a) => a.id)), [impact.data]);

  const visibleIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return new Set(
      (graph.data?.nodes ?? [])
        .filter((n) => (healthFilter === 'ALL' || health.get(n.id)?.status === healthFilter) && (!q || n.name.toLowerCase().includes(q)))
        .map((n) => n.id),
    );
  }, [graph.data, health, healthFilter, search]);

  const counts = useMemo(() => {
    const c = { OUTAGE: 0, DEGRADED: 0, HEALTHY: 0 };
    (board.data?.services ?? []).forEach((s) => (c[s.status] += 1));
    return c;
  }, [board.data]);
  const openTotal = (graph.data?.nodes ?? []).reduce((sum, n) => sum + n.openIncidents, 0);

  const selectedNode = graph.data?.nodes.find((n) => n.id === selectedId) ?? null;

  if (graph.isLoading || board.isLoading) return <LoadingState />;
  const failure = graph.error ?? board.error;
  if (graph.isError || board.isError) {
    return (
      <ErrorState
        message={apiErrorMessage(failure)}
        onRetry={() => {
          graph.refetch();
          board.refetch();
        }}
      />
    );
  }
  if (!graph.data || graph.data.nodes.length === 0) {
    return <EmptyState message="No active services yet. Add services in the catalogue to see their dependencies here." />;
  }

  return (
    <Box>
      <Typography component="h1" sx={{ color: tokens.onSurface, fontSize: 24, fontWeight: 700 }}>
        Service dependency graph
      </Typography>
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mb: 2 }}>
        An arrow points from a service to the service it depends on. Health is {board.data?.label?.toLowerCase() ?? 'based on reported incidents'}.
      </Typography>

      <MajorIncidentPanel problemId={problemId} onPick={setProblemId} onPath={setCausePath} selectedServiceId={selectedId} />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }}>
        <Kpi label="Services" value={graph.data.nodes.length} />
        <Kpi label="Outage" value={counts.OUTAGE} color={HEALTH_COLOR.OUTAGE} />
        <Kpi label="Degraded" value={counts.DEGRADED} color={HEALTH_COLOR.DEGRADED} />
        <Kpi label="Healthy" value={counts.HEALTHY} color={HEALTH_COLOR.HEALTHY} />
        <Kpi label="Open incidents" value={openTotal} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          label="Find a service"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={healthFilter}
          onChange={(_, v) => v && setHealthFilter(v)}
          aria-label="Filter by health"
        >
          <ToggleButton value="ALL" sx={{ fontSize: 12 }}>All</ToggleButton>
          {(['OUTAGE', 'DEGRADED', 'HEALTHY'] as const).map((h) => (
            <ToggleButton key={h} value={h} sx={{ fontSize: 12 }}>
              {HEALTH_LABEL[h]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {healthFilter !== 'ALL' || search ? (
          <Chip size="small" label={`${visibleIds.size} of ${graph.data.nodes.length} shown`} sx={{ fontSize: 12 }} />
        ) : null}
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8} lg={9}>
          <GraphCanvas
            layout={layout}
            edges={graph.data.edges}
            health={health}
            selectedId={selectedId}
            affectedIds={affectedIds}
            visibleIds={visibleIds}
            onSelect={setSelectedId}
            causePath={causePath}
          />
        </Grid>
        <Grid item xs={12} md={4} lg={3}>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <ServiceGraphMinimap selectedId={selectedId} onSelect={setSelectedId} />
            <LiveEventPulse max={5} onSelect={(id) => navigate(`/admin/incidents/${id}`)} />
          </Stack>
          <Inspector
            node={selectedNode}
            health={selectedId !== null ? health.get(selectedId) : undefined}
            impact={impact}
            onEditDependencies={setDepsFor}
            onSelectService={setSelectedId}
          />
        </Grid>
      </Grid>

      <DependenciesDialog service={depsFor} candidates={graph.data.nodes} onClose={() => setDepsFor(null)} />
    </Box>
  );
}
