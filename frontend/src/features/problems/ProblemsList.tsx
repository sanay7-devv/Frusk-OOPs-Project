import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { listProblems, getRecurringProblems, createProblem, type ProblemStatus, type RecurringView } from '../../api/problems';
import { apiErrorMessage } from '../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { useProblemAccess } from './problemAccess';

type TabKey = ProblemStatus | 'RECURRING';

const cellSx = { color: tokens.onSurface, fontSize: 13, borderColor: tokens.outlineVariant };
const headSx = { color: tokens.onSurfaceVariant, fontSize: 12, fontWeight: 700, borderColor: tokens.outlineVariant };
const paperSx = { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 2 };

export const fmtDate = (iso?: string | null) => (iso ? format(new Date(iso), 'dd MMM yyyy, HH:mm') : '-');

export function ProblemStatusChip({ status }: { status: ProblemStatus }) {
  const open = status === 'OPEN';
  return (
    <Chip
      size="small"
      label={open ? 'Open' : 'Resolved'}
      sx={{
        fontSize: 12,
        fontWeight: 700,
        color: open ? '#fb923c' : '#4ade80',
        bgcolor: open ? 'rgba(251, 146, 60, 0.12)' : 'rgba(74, 222, 128, 0.12)',
        border: `1px solid ${open ? 'rgba(251, 146, 60, 0.4)' : 'rgba(74, 222, 128, 0.4)'}`,
      }}
    />
  );
}

export function MajorChip() {
  return (
    <Chip
      size="small"
      label="Major incident"
      sx={{
        fontSize: 12,
        fontWeight: 700,
        color: '#fb7185',
        bgcolor: 'rgba(244, 63, 94, 0.15)',
        border: '1px solid rgba(244, 63, 94, 0.4)',
      }}
    />
  );
}

function ProblemTable({ status }: { status: ProblemStatus }) {
  const navigate = useNavigate();
  const { basePath } = useProblemAccess();
  const q = useQuery({ queryKey: ['problems', status], queryFn: () => listProblems(status) });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];
  if (rows.length === 0)
    return <EmptyState message={status === 'OPEN' ? 'No open problem records.' : 'No resolved problem records.'} />;

  return (
    <TableContainer component={Paper} sx={paperSx}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headSx}>Title</TableCell>
            <TableCell sx={headSx}>Service</TableCell>
            <TableCell sx={headSx}>Status</TableCell>
            <TableCell sx={headSx}>Lead incident</TableCell>
            <TableCell sx={headSx} align="right">Linked incidents</TableCell>
            <TableCell sx={headSx} align="right">Joined</TableCell>
            <TableCell sx={headSx}>Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((p) => (
            <TableRow
              key={p.id}
              hover
              onClick={() => navigate(`${basePath}/${p.id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={cellSx}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{p.title}</span>
                  {p.lead?.major && <MajorChip />}
                </Stack>
              </TableCell>
              <TableCell sx={cellSx}>{p.service?.name ?? '-'}</TableCell>
              <TableCell sx={cellSx}><ProblemStatusChip status={p.status} /></TableCell>
              <TableCell sx={{ ...cellSx, fontFamily: 'JetBrains Mono, monospace' }}>{p.lead?.code ?? '-'}</TableCell>
              <TableCell sx={cellSx} align="right">{p.incidentCount}</TableCell>
              <TableCell sx={cellSx} align="right">{p.joined}</TableCell>
              <TableCell sx={cellSx}>{fmtDate(p.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const KIND_LABEL: Record<RecurringView['kind'], string> = {
  REPEATED_FIX: 'Fixed again and again',
  REPEATED_REOPEN: 'Reopened repeatedly',
};

function RecurringList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { basePath, incidentPath, canManage } = useProblemAccess();
  const q = useQuery({ queryKey: ['problems', 'recurring'], queryFn: getRecurringProblems });
  const create = useMutation({
    mutationFn: (r: RecurringView) => createProblem({ incidentIds: r.incidents.map((i) => i.id) }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['problems'] });
      toast(`Problem record opened: ${p.title}`, 'success');
      navigate(`${basePath}/${p.id}`);
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];
  if (rows.length === 0) return <EmptyState message="No recurring problems found." />;

  return (
    <Stack spacing={1.5}>
      {rows.map((r, idx) => (
        <Paper key={`${r.kind}-${r.service?.id}-${r.category?.id}-${idx}`} sx={{ ...paperSx, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" label={KIND_LABEL[r.kind]} sx={{ fontSize: 12, color: tokens.primaryLight, bgcolor: 'rgba(99, 102, 241, 0.15)' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.onSurface }}>
                  {r.service?.name ?? 'Unknown service'}
                  {r.category ? ` / ${r.category.name}` : ''}
                </Typography>
                <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>{r.count} incidents</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mt: 0.75 }}>{r.reason}</Typography>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                {r.incidents.map((i) => (
                  <Link
                    key={i.id}
                    component={RouterLink}
                    to={incidentPath(i.id)}
                    sx={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: tokens.secondaryLight }}
                  >
                    {i.code}
                  </Link>
                ))}
              </Stack>
            </Box>
            {canManage && (
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={create.isPending || r.incidents.length === 0}
                  onClick={() => create.mutate(r)}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  Open problem record
                </Button>
              </Box>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default function ProblemsList() {
  const [tab, setTab] = useState<TabKey>('OPEN');
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.onSurface, mb: 0.5 }}>
        Problems
      </Typography>
      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
        Incidents grouped into one problem record (Major Incident Mode), and recurring problems found in recent fixes.
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v: TabKey) => setTab(v)}
        sx={{ mb: 2, borderBottom: `1px solid ${tokens.outlineVariant}` }}
      >
        <Tab value="OPEN" label="Open" sx={{ textTransform: 'none' }} />
        <Tab value="RESOLVED" label="Resolved" sx={{ textTransform: 'none' }} />
        <Tab value="RECURRING" label="Recurring" sx={{ textTransform: 'none' }} />
      </Tabs>
      {tab === 'RECURRING' ? <RecurringList /> : <ProblemTable status={tab} />}
    </Box>
  );
}
