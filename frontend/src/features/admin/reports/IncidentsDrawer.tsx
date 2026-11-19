import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { listIncidents, type IncidentFilters } from '../../../api/incidents';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import PriorityBadge from '../../../components/PriorityBadge';
import StatusChip from '../../../components/StatusChip';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';

export interface DrawerTarget {
  title: string;
  filters: IncidentFilters;
}

const PAGE = 15;

/** Incidents behind a clicked chart bar or slice, from GET /incidents with the same filters the chart used. */
export default function IncidentsDrawer({ target, onClose }: { target: DrawerTarget | null; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const key = target ? JSON.stringify(target.filters) : '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(0);
  }

  const q = useQuery({
    queryKey: ['reports-drawer', key, page],
    queryFn: () => listIncidents({ ...target!.filters, page, size: PAGE, sort: 'createdAt,desc' }),
    enabled: target !== null,
  });

  const data = q.data;
  return (
    <Drawer
      anchor="right"
      open={target !== null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, bgcolor: tokens.surfaceContainerLow, p: 2.5 } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography sx={{ fontWeight: 700, fontSize: 18, color: tokens.onSurface }}>{target?.title}</Typography>
        <IconButton aria-label="Close" onClick={onClose} sx={{ color: tokens.onSurfaceVariant }}>
          <CloseIcon />
        </IconButton>
      </Stack>
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="No incidents match this selection." />
      ) : (
        <>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 1.5 }}>
            {data.totalItems} incident{data.totalItems === 1 ? '' : 's'}
          </Typography>
          <Stack spacing={1} sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {data.items.map((i) => (
              <Box
                key={i.id}
                component={Link}
                to={`/admin/tickets/${i.id}`}
                sx={{
                  display: 'block',
                  p: 1.5,
                  borderRadius: '10px',
                  border: `1px solid ${tokens.outlineVariant}`,
                  textDecoration: 'none',
                  color: tokens.onSurface,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.04)' },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.secondaryLight }}>{i.code}</Typography>
                  <PriorityBadge priority={i.priority} />
                  <StatusChip status={i.status} />
                </Stack>
                <Typography sx={{ fontSize: 14 }}>{i.title}</Typography>
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                  {i.service.name} · {i.assignee ? i.assignee.name : 'Unassigned'}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
            <Button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
              Page {page + 1} of {Math.max(data.totalPages, 1)}
            </Typography>
            <Button disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </Stack>
        </>
      )}
    </Drawer>
  );
}
