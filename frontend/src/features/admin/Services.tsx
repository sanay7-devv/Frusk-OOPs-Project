import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, FormControlLabel, Grid, IconButton, InputAdornment, Menu, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon, AccountTree as GraphIcon, Dns as DnsIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon, Search as SearchIcon,
} from '@mui/icons-material';
import { listServiceRecords, retireServiceRecord, updateServiceRecord, type ServiceRecord } from '../../api/adminDirectory';
import { getServiceHealthBoard, type ServiceHealth, type ServiceHealthRow } from '../../api/services';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';
import { cardSx, monoLabelSx } from './adminForm';
import { HEALTH_COLOR, HEALTH_LABEL } from './servicegraph/health';
import { DependenciesDialog, ImpactDialog, ServiceFormDialog } from './services/ServiceDialogs';
import { tone } from './palette';

const LIST_KEY = ['admin-services-records'];
const HEALTH_KEY = ['service-health'];

type HealthFilter = 'ALL' | ServiceHealth;

export default function Services() {
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState<HealthFilter>('ALL');
  const [showRetired, setShowRetired] = useState(false);
  const [form, setForm] = useState<{ service: ServiceRecord | null } | null>(null);
  const [deps, setDeps] = useState<ServiceRecord | null>(null);
  const [impact, setImpact] = useState<ServiceRecord | null>(null);
  const [retire, setRetire] = useState<ServiceRecord | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; service: ServiceRecord } | null>(null);

  const services = useQuery({ queryKey: LIST_KEY, queryFn: listServiceRecords });
  const board = useQuery({ queryKey: HEALTH_KEY, queryFn: getServiceHealthBoard, refetchInterval: 30000 });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    qc.invalidateQueries({ queryKey: HEALTH_KEY });
    qc.invalidateQueries({ queryKey: ['service-graph'] });
    qc.invalidateQueries({ queryKey: ['service-impact'] });
  };

  const retireMut = useMutation({
    mutationFn: (s: ServiceRecord) => retireServiceRecord(s.id),
    onSuccess: (_d, s) => { toast(`${s.name} retired`, 'success'); refresh(); setRetire(null); },
    onError: (e) => { toast(apiErrorMessage(e), 'error'); setRetire(null); },
  });
  const reactivate = useMutation({
    mutationFn: (s: ServiceRecord) => updateServiceRecord(s.id, {
      name: s.name, owner: s.owner ?? '', description: s.description ?? '', criticality: s.criticality, alwaysP1: s.alwaysP1, active: true, dependencyIds: s.dependencyIds,
    }),
    onSuccess: (_d, s) => { toast(`${s.name} is active again`, 'success'); refresh(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const healthById = useMemo(() => new Map<number, ServiceHealthRow>((board.data?.services ?? []).map((r) => [r.id, r])), [board.data]);
  const all = services.data ?? [];
  const nameById = useMemo(() => new Map(all.map((s) => [s.id, s.name])), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => {
      if (!showRetired && !s.active) return false;
      if (health !== 'ALL' && healthById.get(s.id)?.status !== health) return false;
      return !q || s.name.toLowerCase().includes(q) || (s.owner ?? '').toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q);
    });
  }, [all, search, health, showRetired, healthById]);

  const counts = useMemo(() => {
    const c = { OUTAGE: 0, DEGRADED: 0, HEALTHY: 0 };
    all.filter((s) => s.active).forEach((s) => { const h = healthById.get(s.id)?.status; if (h) c[h]++; });
    return c;
  }, [all, healthById]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1440, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <DnsIcon sx={{ color: tokens.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'Sora, sans-serif' }}>Services</Typography>
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>The catalog incidents are filed against: criticality, owner, dependencies and health.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<GraphIcon />} onClick={() => navigate('/admin/services/graph')} sx={{ textTransform: 'none' }}>Dependency graph</Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} sx={{ textTransform: 'none' }}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ service: null })} sx={{ textTransform: 'none', fontWeight: 700 }}>New service</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {([['OUTAGE', 'In outage'], ['DEGRADED', 'Degraded'], ['HEALTHY', 'Healthy']] as [ServiceHealth, string][]).map(([k, label]) => (
          <Grid item xs={12} sm={4} key={k}>
            <Paper elevation={0} sx={cardSx}>
              <Typography sx={monoLabelSx}>{label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif', color: HEALTH_COLOR[k], mt: 0.5 }}>{board.data ? counts[k] : '…'}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 0.5 }}>
                {board.isError ? apiErrorMessage(board.error) : board.data?.label ?? 'Loading status'}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, owner or description"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ maxWidth: { md: 380 }, '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest } }} />
          <ToggleButtonGroup exclusive size="small" value={health} onChange={(_e, v: HealthFilter | null) => v && setHealth(v)}>
            <ToggleButton value="ALL" sx={{ textTransform: 'none', fontSize: 13 }}>All</ToggleButton>
            <ToggleButton value="OUTAGE" sx={{ textTransform: 'none', fontSize: 13 }}>Outage</ToggleButton>
            <ToggleButton value="DEGRADED" sx={{ textTransform: 'none', fontSize: 13 }}>Degraded</ToggleButton>
            <ToggleButton value="HEALTHY" sx={{ textTransform: 'none', fontSize: 13 }}>Healthy</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel control={<Switch checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 14 }}>Show retired</Typography>} />
        </Stack>
      </Paper>

      {services.isLoading && <LoadingState />}
      {services.isError && <ErrorState onRetry={() => services.refetch()} message={apiErrorMessage(services.error)} />}
      {services.data && rows.length === 0 && (
        <EmptyState message={all.length === 0 ? 'No services yet.' : 'No service matches this search or filter.'}
          action={all.length === 0 ? <Button variant="contained" onClick={() => setForm({ service: null })} sx={{ textTransform: 'none' }}>Create the first service</Button> : undefined} />
      )}
      {rows.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer, borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Service', 'Criticality', 'Health', 'Open incidents', 'SLA met', 'Depends on', ''].map((h) => (
                  <TableCell key={h} sx={{ ...monoLabelSx, borderColor: tokens.outlineVariant }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((s) => {
                const h = healthById.get(s.id);
                return (
                  <TableRow key={s.id} hover sx={{ opacity: s.active ? 1 : 0.6 }}>
                    <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{s.name}</Typography>
                        {!s.active && <Chip size="small" label="Retired" sx={{ fontSize: 12 }} />}
                        {s.alwaysP1 && <Chip size="small" label="Always P1" color="error" variant="outlined" sx={{ fontSize: 12 }} />}
                      </Stack>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{s.owner || 'No owner'}</Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: tokens.outlineVariant }}>{s.criticality} / 5</TableCell>
                    <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                      {h ? (
                        <Tooltip title={h.reason}>
                          <Chip size="small" label={HEALTH_LABEL[h.status]} sx={{ fontSize: 12, fontWeight: 700, color: HEALTH_COLOR[h.status], bgcolor: `${HEALTH_COLOR[h.status]}22` }} />
                        </Tooltip>
                      ) : <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>{board.isLoading ? '…' : 'Not tracked'}</Typography>}
                    </TableCell>
                    <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                      {h ? `${h.open.total}${h.open.P1 ? ` (${h.open.P1} P1)` : ''}` : '–'}
                    </TableCell>
                    <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                      {h && h.slaCompliancePercent != null ? `${h.slaCompliancePercent.toFixed(0)}% of ${h.slaJudged}` : '–'}
                    </TableCell>
                    <TableCell sx={{ borderColor: tokens.outlineVariant, maxWidth: 220 }}>
                      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }} noWrap>
                        {s.dependencyIds.length === 0 ? 'Nothing' : s.dependencyIds.map((id) => nameById.get(id) ?? `#${id}`).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderColor: tokens.outlineVariant }}>
                      <IconButton aria-label={`Actions for ${s.name}`} onClick={(e) => setMenu({ anchor: e.currentTarget, service: s })}><MoreVertIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu && [
          <MenuItem key="e" sx={{ fontSize: 14 }} onClick={() => { setForm({ service: menu.service }); setMenu(null); }}>Edit</MenuItem>,
          <MenuItem key="d" sx={{ fontSize: 14 }} onClick={() => { setDeps(menu.service); setMenu(null); }}>Dependencies</MenuItem>,
          <MenuItem key="i" sx={{ fontSize: 14 }} onClick={() => { setImpact(menu.service); setMenu(null); }}>Impact if it fails</MenuItem>,
          <MenuItem key="s" sx={{ fontSize: 14 }} onClick={() => { navigate('/admin/sla'); setMenu(null); }}>SLA policies</MenuItem>,
          <MenuItem key="inc" sx={{ fontSize: 14 }} onClick={() => { navigate(`/admin/tickets?serviceId=${menu.service.id}`); setMenu(null); }}>View incidents</MenuItem>,
          <MenuItem key="cat" sx={{ fontSize: 14 }} onClick={() => { navigate('/admin/categories'); setMenu(null); }}>Categories</MenuItem>,
          menu.service.active
            ? <MenuItem key="r" sx={{ fontSize: 14, color: tone.danger }} onClick={() => { setRetire(menu.service); setMenu(null); }}>Retire</MenuItem>
            : <MenuItem key="a" sx={{ fontSize: 14 }} onClick={() => { reactivate.mutate(menu.service); setMenu(null); }}>Reactivate</MenuItem>,
        ]}
      </Menu>

      <ServiceFormDialog open={!!form} service={form?.service ?? null} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />
      <DependenciesDialog service={deps} all={all} onClose={() => setDeps(null)} onSaved={() => { setDeps(null); refresh(); }} />
      <ImpactDialog service={impact} onClose={() => setImpact(null)} />
      <ConfirmDialog open={!!retire} title={retire ? `Retire ${retire.name}?` : ''} confirmLabel="Retire" confirmColor="error" isLoading={retireMut.isPending}
        description="It disappears from the report form and no new incident can use it. Existing incidents stay. You can reactivate it later."
        onConfirm={() => retire && retireMut.mutate(retire)} onClose={() => setRetire(null)} />
    </Box>
  );
}
