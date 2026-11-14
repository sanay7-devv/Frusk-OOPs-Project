import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Refresh as RefreshIcon, Security as SecurityIcon } from '@mui/icons-material';
import { getAdminAuditLogs } from '../../api/admin';

export default function AuditLog() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => getAdminAuditLogs({ page: 0, size: 50 }),
  });

  const logs = data?.content || [];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Immutable Audit Trail
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Append-only compliance log recording logins, priority overrides, assignments and state transitions
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
          Refresh
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        {isLoading ? (
          <Box p={6} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              No audit records logged yet.
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Timestamp (UTC)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Action Event</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actor</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Incident ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Audit Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {entry.occurredAt ? new Date(entry.occurredAt).toLocaleString() : 'Just now'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.action}
                      size="small"
                      color={
                        entry.action.includes('FAIL') || entry.action.includes('LOCK')
                          ? 'error'
                          : entry.action.includes('LOGIN')
                          ? 'success'
                          : entry.action.includes('CONFIG')
                          ? 'warning'
                          : 'primary'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.actorEmail || (entry.actorId ? `User #${entry.actorId}` : 'System / Anonymous')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {entry.incidentId ? (
                      <Chip label={`INC #${entry.incidentId}`} size="small" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{entry.description}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
}
