import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Policy as PolicyIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { deleteSlaPolicyRecord, listServiceRecords, listSlaPolicyRecords, type SlaPolicyRecord } from '../../api/adminDirectory';
import ConfirmDialog from '../../components/ConfirmDialog';
import PriorityBadge from '../../components/PriorityBadge';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';
import { cardSx, monoLabelSx } from './adminForm';
import { CalendarSummary, ComplianceStrip, EffectivePolicy, formatMinutes } from './sla/SlaInsights';
import SlaPolicyDialog from './sla/SlaPolicyDialog';
import { alpha, tone } from './palette';

const POLICIES_KEY = ['admin-sla-policies-list'];

export default function SlaPolicies() {
  const toast = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ policy: SlaPolicyRecord | null } | null>(null);
  const [del, setDel] = useState<SlaPolicyRecord | null>(null);

  const policies = useQuery({ queryKey: POLICIES_KEY, queryFn: listSlaPolicyRecords });
  const services = useQuery({ queryKey: ['admin-services-records'], queryFn: listServiceRecords });

  const remove = useMutation({
    mutationFn: (p: SlaPolicyRecord) => deleteSlaPolicyRecord(p.id),
    onSuccess: (_d, p) => { toast(`${p.priority} policy deleted`, 'success'); qc.invalidateQueries({ queryKey: POLICIES_KEY }); setDel(null); },
    onError: (e) => { toast(apiErrorMessage(e), 'error'); setDel(null); },
  });

  const list = [...(policies.data ?? [])].sort((a, b) =>
    (a.serviceId == null ? -1 : 1) - (b.serviceId == null ? -1 : 1) || (a.serviceName ?? '').localeCompare(b.serviceName ?? '') || a.priority.localeCompare(b.priority));
  const globals = list.filter((p) => p.serviceId == null);
  const missing = ['P1', 'P2', 'P3', 'P4'].filter((p) => !globals.some((g) => g.priority === p));

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1440, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PolicyIcon sx={{ color: tokens.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'Sora, sans-serif' }}>SLA policies</Typography>
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>Response and resolution targets per priority. Escalation levels are edited on the <Box component={RouterLink} to="/admin/escalation" sx={{ color: tokens.primaryLight }}>Escalation</Box> screen.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: 'none' }}
            onClick={() => { qc.invalidateQueries({ queryKey: POLICIES_KEY }); qc.invalidateQueries({ queryKey: ['admin-sla-compliance'] });  }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ policy: null })} sx={{ textTransform: 'none', fontWeight: 700 }}>New policy</Button>
        </Stack>
      </Stack>

      {(
        <>
          <ComplianceStrip />
          <CalendarSummary />
          {policies.data && <EffectivePolicy policies={policies.data} services={services.data ?? []} />}

          {policies.isLoading && <LoadingState />}
          {policies.isError && <ErrorState onRetry={() => policies.refetch()} message={apiErrorMessage(policies.error)} />}
          {policies.data && missing.length > 0 && (
            <Paper elevation={0} sx={{ ...cardSx, mb: 2, borderColor: alpha(tone.warning, 0.4) }}>
              <Typography sx={{ fontSize: 14, color: tone.warning }}>
                No global default for {missing.join(', ')}. Services without their own policy for these priorities cannot take incidents.
              </Typography>
            </Paper>
          )}
          {policies.data && list.length === 0 && (
            <EmptyState message="No SLA policies yet." action={<Button variant="contained" onClick={() => setDialog({ policy: null })} sx={{ textTransform: 'none' }}>Create the first policy</Button>} />
          )}
          {list.length > 0 && (
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer, borderRadius: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Priority', 'Applies to', 'Response', 'Resolution', 'Clock', ''].map((h) => <TableCell key={h} sx={{ ...monoLabelSx, borderColor: tokens.outlineVariant }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ borderColor: tokens.outlineVariant }}><PriorityBadge priority={p.priority} /></TableCell>
                      <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                        {p.serviceId == null ? <Chip size="small" label="All services (default)" sx={{ fontSize: 12 }} /> : (p.serviceName ?? `Service ${p.serviceId}`)}
                      </TableCell>
                      <TableCell sx={{ borderColor: tokens.outlineVariant }}>{formatMinutes(p.responseMinutes)}</TableCell>
                      <TableCell sx={{ borderColor: tokens.outlineVariant }}>{formatMinutes(p.resolutionMinutes)}</TableCell>
                      <TableCell sx={{ borderColor: tokens.outlineVariant }}>{p.calendarType === 'ALWAYS' ? 'Always' : 'Business hours'}</TableCell>
                      <TableCell align="right" sx={{ borderColor: tokens.outlineVariant }}>
                        <Tooltip title="Edit"><IconButton aria-label={`Edit ${p.priority} policy`} onClick={() => setDialog({ policy: p })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton aria-label={`Delete ${p.priority} policy`} onClick={() => setDel(p)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <SlaPolicyDialog open={!!dialog} policy={dialog?.policy ?? null} services={services.data ?? []} onClose={() => setDialog(null)}
        onSaved={() => { setDialog(null); qc.invalidateQueries({ queryKey: POLICIES_KEY }); }} />
      <ConfirmDialog open={!!del} title={del ? `Delete the ${del.priority} policy for ${del.serviceId == null ? 'all services' : del.serviceName ?? 'this service'}?` : ''}
        description="Incidents of this priority then use the global default, or are rejected when there is none."
        confirmLabel="Delete" confirmColor="error" isLoading={remove.isPending} onConfirm={() => del && remove.mutate(del)} onClose={() => setDel(null)} />
    </Box>
  );
}
