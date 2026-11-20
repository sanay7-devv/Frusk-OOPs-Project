import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, IconButton, InputBase, Paper, Stack, Tooltip, Typography } from '@mui/material';
import {
  Add as AddIcon,
  AccountTree as AccountTreeIcon,
  Close as CloseIcon,
  CrisisAlert as CrisisAlertIcon,
  Dns as DnsIcon,
  FilterCenterFocus as FilterCenterFocusIcon,
  FilterList as FilterListIcon,
  Radar as RadarIcon,
  Refresh as RefreshIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme/theme';
import { getServiceGraph, getServiceHealthBoard, getServiceImpact } from '../../api/services';
import type { ServiceHealth } from '../../api/services';
import { apiErrorMessage } from '../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import GraphCanvas, { type GraphCanvasHandle } from './servicegraph/GraphCanvas';
import MajorIncidentPanel, { NO_PATH, type CausePath } from './servicegraph/MajorIncidentPanel';
import ServiceGraphMinimap from '../../components/ServiceGraphMinimap';
import LiveEventPulse from '../../components/LiveEventPulse';
import Inspector from './servicegraph/Inspector';
import DependenciesDialog from './servicegraph/DependenciesDialog';
import { computeLayout } from './servicegraph/layout';
import { HEALTH_COLOR, HEALTH_LABEL } from './servicegraph/health';
import { alpha, tone } from './palette';
import type { GraphNode } from '../../api/services';

const REFRESH_MS = 15000;
const mono = tokens.fontMono;

const panelSx = {
  borderRadius: '16px',
  border: `1px solid ${tokens.outlineVariant}`,
  bgcolor: tokens.paper,
  backdropFilter: 'blur(16px)',
} as const;

const labelSx = {
  fontSize: 12,
  fontWeight: 700,
  color: tokens.onSurfaceVariant,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: mono,
} as const;

/** KPI card: label, big number, one line of context and a coloured strip along the bottom. */
function Kpi({ label, value, note, color, strong = false }: { label: string; value: number; note: string; color: string; strong?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        position: 'relative',
        overflow: 'hidden',
        flex: '1 1 220px',
        minWidth: 0,
        transition: 'transform 0.2s, border-color 0.2s',
        borderColor: strong ? alpha(color, 0.4) : tokens.outlineVariant,
        '&:hover': { transform: 'translateY(-2px)', borderColor: color },
      }}
    >
      <Box sx={{ p: 2, pb: 2.25 }}>
        <Typography sx={labelSx}>{label}</Typography>
        <Typography sx={{ color, mt: 0.5, fontSize: 28, lineHeight: 1.2, fontWeight: 800, fontFamily: tokens.fontHeading }}>{value}</Typography>
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, mt: 0.5 }}>{note}</Typography>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: color }} />
    </Paper>
  );
}

/** Pill-shaped filter chip in Sanay's style: tinted when active. */
function FilterChip({ label, active, color, onClick, dot }: { label: string; active: boolean; color: string; onClick: () => void; dot?: boolean }) {
  return (
    <Chip
      size="small"
      clickable
      onClick={onClick}
      aria-pressed={active}
      label={label}
      icon={dot ? <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, ml: '8px !important', mr: '-2px !important' }} /> : undefined}
      sx={{
        fontWeight: 600,
        fontSize: 12,
        bgcolor: active ? alpha(color, 0.22) : tokens.surfaceContainerHighest,
        color: active ? color : tokens.onSurfaceVariant,
        border: `1px solid ${active ? alpha(color, 0.5) : tokens.outlineVariant}`,
        '&:hover': { bgcolor: alpha(color, 0.2) },
      }}
    />
  );
}

export default function ServiceGraph() {
  const navigate = useNavigate();
  const canvas = useRef<GraphCanvasHandle>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [healthFilter, setHealthFilter] = useState<'ALL' | ServiceHealth>('ALL');
  const [critFilter, setCritFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [blast, setBlast] = useState(true);
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

  const criticalities = useMemo(
    () => Array.from(new Set((graph.data?.nodes ?? []).map((n) => n.criticality))).sort((a, b) => b - a),
    [graph.data],
  );

  const visibleIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return new Set(
      (graph.data?.nodes ?? [])
        .filter(
          (n) =>
            (healthFilter === 'ALL' || health.get(n.id)?.status === healthFilter) &&
            (critFilter === null || n.criticality === critFilter) &&
            (!q || n.name.toLowerCase().includes(q)),
        )
        .map((n) => n.id),
    );
  }, [graph.data, health, healthFilter, critFilter, search]);

  const counts = useMemo(() => {
    const c = { OUTAGE: 0, DEGRADED: 0, HEALTHY: 0 };
    (board.data?.services ?? []).forEach((s) => (c[s.status] += 1));
    return c;
  }, [board.data]);

  const selectedNode = graph.data?.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedHealth = selectedId !== null ? health.get(selectedId) : undefined;

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

  const total = graph.data.nodes.length;
  const filtered = healthFilter !== 'ALL' || critFilter !== null || search.trim() !== '';
  const outlined = {
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: 2,
    borderColor: tokens.outlineVariant,
    color: tokens.onSurfaceVariant,
    bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
    backdropFilter: 'blur(10px)',
  } as const;

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: '12px',
              bgcolor: alpha(tone.success, 0.15),
              color: tone.success,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${alpha(tone.success, 0.3)}`,
              boxShadow: `0 0 16px ${alpha(tone.success, 0.2)}`,
            }}
          >
            <AccountTreeIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography component="h1" sx={{ color: tokens.onSurface, fontSize: 24, fontWeight: 800, fontFamily: tokens.fontHeading }}>
              Service dependency graph
            </Typography>
            <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14 }}>
              An arrow points from a service to the service it depends on. Health is {board.data?.label?.toLowerCase() ?? 'based on reported incidents'}.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Button variant="outlined" startIcon={<DnsIcon />} onClick={() => navigate('/admin/services')} sx={{ ...outlined, '&:hover': { bgcolor: alpha(tone.accent, 0.15), borderColor: tone.accent, color: tokens.white } }}>
            Service catalogue
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              graph.refetch();
              board.refetch();
            }}
            sx={{ ...outlined, '&:hover': { bgcolor: alpha(tokens.secondary, 0.15), borderColor: tokens.secondary, color: tokens.white } }}
          >
            Refresh graph
          </Button>
        </Stack>
      </Stack>

      {/* KPI cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 2 }}>
        <Kpi label="Services" value={total} note={`${counts.HEALTHY} healthy`} color={tone.accentText} />
        <Kpi label="Dependency links" value={graph.data.edges.length} note="Direct dependencies mapped" color={tokens.secondaryLight} />
        <Kpi
          label="In outage"
          value={counts.OUTAGE}
          note={counts.OUTAGE > 0 ? 'Open P1 on the service' : 'No service in outage'}
          color={counts.OUTAGE > 0 ? HEALTH_COLOR.OUTAGE : HEALTH_COLOR.HEALTHY}
          strong={counts.OUTAGE > 0}
        />
        <Kpi
          label="Degraded"
          value={counts.DEGRADED}
          note={counts.DEGRADED > 0 ? 'Open incidents or a failing dependency' : 'No degraded service'}
          color={counts.DEGRADED > 0 ? HEALTH_COLOR.DEGRADED : HEALTH_COLOR.HEALTHY}
          strong={counts.DEGRADED > 0}
        />
      </Stack>

      <MajorIncidentPanel problemId={problemId} onPick={setProblemId} onPath={setCausePath} selectedServiceId={selectedId} />

      {/* Command and filter bar */}
      <Paper elevation={0} sx={{ ...panelSx, p: 2, mb: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <FilterListIcon sx={{ color: tokens.onSurfaceVariant, fontSize: 20 }} />
            <Typography sx={labelSx}>Criticality:</Typography>
            <FilterChip label={`All (${total})`} active={critFilter === null} color={tone.accentText} onClick={() => setCritFilter(null)} />
            {criticalities.map((c) => (
              <FilterChip
                key={c}
                label={`Criticality ${c}`}
                active={critFilter === c}
                color={c >= 4 ? tone.danger : c === 3 ? tokens.secondaryLight : tone.accentText}
                onClick={() => setCritFilter(critFilter === c ? null : c)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: tokens.surfaceContainerLow,
                border: `1px solid ${tokens.outlineVariant}`,
                borderRadius: '8px',
                px: 1.5,
                py: 0.4,
                width: { xs: '100%', sm: 240 },
                transition: 'all 0.2s',
                '&:focus-within': { borderColor: tokens.secondary, boxShadow: `0 0 10px ${alpha(tokens.secondary, 0.2)}` },
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: tokens.onSurfaceVariant }} />
              <InputBase
                placeholder="Find a service"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                inputProps={{ 'aria-label': 'Find a service' }}
                sx={{ color: tokens.onSurface, fontSize: 14, width: '100%', '& input::placeholder': { color: tokens.textDisabled, opacity: 1 } }}
              />
            </Box>

            <Button
              variant={blast ? 'contained' : 'outlined'}
              size="small"
              aria-pressed={blast}
              onClick={() => setBlast((b) => !b)}
              startIcon={<RadarIcon sx={{ fontSize: 17, color: blast ? tokens.white : tone.danger }} />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                px: 1.6,
                py: 0.6,
                bgcolor: blast ? alpha(tone.danger, 0.25) : 'transparent',
                borderColor: blast ? alpha(tone.danger, 0.5) : tokens.outlineVariant,
                color: blast ? tokens.errorLight : tokens.onSurfaceVariant,
                boxShadow: blast ? `0 0 16px ${alpha(tone.danger, 0.3)}` : 'none',
                '&:hover': { bgcolor: alpha(tone.danger, 0.35), borderColor: tone.danger, color: tokens.white },
              }}
            >
              Blast radius
              <Box
                component="span"
                sx={{ ml: 1, px: 0.8, borderRadius: '9999px', bgcolor: blast ? tone.danger : alpha(tokens.white, 0.08), color: tokens.white, fontSize: 12, fontFamily: mono, fontWeight: 800 }}
              >
                {blast ? 'ON' : 'OFF'}
              </Box>
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 2, p: 0.3 }}>
              <Tooltip title="Zoom in" arrow>
                <IconButton size="small" aria-label="Zoom in" onClick={() => canvas.current?.zoomIn()} sx={{ color: tokens.onSurfaceVariant, '&:hover': { color: tokens.white } }}>
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom out" arrow>
                <IconButton size="small" aria-label="Zoom out" onClick={() => canvas.current?.zoomOut()} sx={{ color: tokens.onSurfaceVariant, '&:hover': { color: tokens.white } }}>
                  <RemoveIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fit the graph to the screen" arrow>
                <Button
                  size="small"
                  aria-label="Fit to screen"
                  onClick={() => canvas.current?.fit()}
                  startIcon={<FilterCenterFocusIcon sx={{ fontSize: 15 }} />}
                  sx={{ textTransform: 'none', color: tokens.onSurfaceVariant, fontSize: 12, fontWeight: 700, px: 1, '&:hover': { color: tokens.white } }}
                >
                  Fit
                </Button>
              </Tooltip>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, pt: 1.25, borderTop: `1px solid ${tokens.outlineVariant}` }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Typography sx={labelSx}>Status:</Typography>
            <FilterChip label={`All (${total})`} active={healthFilter === 'ALL'} color={tokens.white} onClick={() => setHealthFilter('ALL')} />
            {(['HEALTHY', 'DEGRADED', 'OUTAGE'] as const).map((h) => (
              <FilterChip
                key={h}
                dot
                label={`${HEALTH_LABEL[h]} (${counts[h]})`}
                active={healthFilter === h}
                color={HEALTH_COLOR[h]}
                onClick={() => setHealthFilter(healthFilter === h ? 'ALL' : h)}
              />
            ))}
            {filtered && <Chip size="small" label={`${visibleIds.size} of ${total} shown`} sx={{ fontSize: 12 }} />}
          </Stack>
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12 }}>
            Click a service to see its health and what depends on it. Drag to pan; use the zoom buttons or the + and - keys.
          </Typography>
        </Box>
      </Paper>

      {/* Canvas with the floating inspector */}
      <Box sx={{ position: 'relative' }}>
        <GraphCanvas
          ref={canvas}
          layout={layout}
          edges={graph.data.edges}
          health={health}
          selectedId={selectedId}
          affectedIds={affectedIds}
          visibleIds={visibleIds}
          onSelect={setSelectedId}
          causePath={causePath}
          focus={blast}
        />
        {selectedNode && (
          <Paper
            id="inspector-panel"
            elevation={0}
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              bottom: 14,
              width: { xs: 'calc(100% - 28px)', sm: 380 },
              maxWidth: 'calc(100% - 28px)',
              bgcolor: alpha(tokens.surface, 0.94),
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${selectedHealth?.status === 'OUTAGE' ? alpha(tone.danger, 0.45) : tokens.border}`,
              borderRadius: '16px',
              boxShadow: `0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px ${alpha(tone.accent, 0.15)}`,
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'sgDrawer 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              '@keyframes sgDrawer': { '0%': { transform: 'translateX(20px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
            }}
          >
            <Box sx={{ p: 1.5, pl: 2, bgcolor: alpha(tokens.surfaceContainerLow, 0.85), borderBottom: `1px solid ${tokens.outlineVariant}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CrisisAlertIcon sx={{ fontSize: 20, color: selectedHealth ? HEALTH_COLOR[selectedHealth.status] : tone.accent }} />
                <Typography component="h2" sx={{ fontWeight: 800, fontSize: 14, color: tokens.onSurface, fontFamily: tokens.fontHeading }}>
                  Service inspector
                </Typography>
              </Stack>
              <IconButton size="small" aria-label="Close inspector" onClick={() => setSelectedId(null)} sx={{ color: tokens.onSurfaceVariant, '&:hover': { color: tokens.white } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Inspector
                floating
                node={selectedNode}
                health={selectedHealth}
                impact={impact}
                onEditDependencies={setDepsFor}
                onSelectService={setSelectedId}
              />
            </Box>
          </Paper>
        )}
      </Box>

      {/* Overview and live events */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2.5 }}>
        <Paper elevation={0} sx={{ ...panelSx, p: 2, flex: '0 0 auto' }}>
          <Typography sx={{ ...labelSx, mb: 1 }}>Overview</Typography>
          <ServiceGraphMinimap selectedId={selectedId} onSelect={setSelectedId} />
        </Paper>
        <Paper elevation={0} sx={{ ...panelSx, p: 2, flex: 1, minWidth: 0 }}>
          <LiveEventPulse max={5} onSelect={(id) => navigate(`/admin/incidents/${id}`)} />
        </Paper>
      </Stack>

      <DependenciesDialog service={depsFor} candidates={graph.data.nodes} onClose={() => setDepsFor(null)} />
    </Box>
  );
}
