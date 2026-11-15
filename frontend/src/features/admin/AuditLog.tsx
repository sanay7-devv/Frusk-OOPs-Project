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

const COLORS = {
  surface: '#090d16',
  surfaceContainerLowest: '#0a0e17',
  surfaceContainerLow: '#121622',
  surfaceContainer: '#141824',
  surfaceContainerHigh: '#1c2234',
  surfaceContainerHighest: '#262d42',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  secondary: '#06b6d4',
  error: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',
};

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
          <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Immutable Audit Trail
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mt: 0.5 }}>
            Append-only compliance log recording logins, priority overrides, assignments and state transitions
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          sx={{
            borderColor: COLORS.border,
            color: COLORS.onSurfaceVariant,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)' },
          }}
        >
          Refresh
        </Button>
      </Stack>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surfaceContainer,
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <Box p={6} display="flex" justifyContent="center">
            <CircularProgress sx={{ color: COLORS.primary }} />
          </Box>
        ) : logs.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="body1" sx={{ color: COLORS.onSurfaceVariant }}>
              No audit records logged yet.
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow }}>
              <TableRow sx={{ '& th': { borderBottom: `1px solid ${COLORS.border}` } }}>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>TIMESTAMP (UTC)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>ACTION EVENT</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>ACTOR</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>INCIDENT ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>AUDIT DESCRIPTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((entry) => (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{
                    '& td': { borderBottom: `1px solid ${COLORS.border}` },
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant, fontSize: '0.82rem' }}>
                      {entry.occurredAt ? new Date(entry.occurredAt).toLocaleString() : 'Just now'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.action}
                      size="small"
                      sx={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        fontSize: 10,
                        bgcolor:
                          entry.action.includes('FAIL') || entry.action.includes('LOCK')
                            ? 'rgba(244, 63, 94, 0.2)'
                            : entry.action.includes('LOGIN')
                            ? 'rgba(16, 185, 129, 0.15)'
                            : entry.action.includes('CONFIG')
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(99, 102, 241, 0.2)',
                        color:
                          entry.action.includes('FAIL') || entry.action.includes('LOCK')
                            ? '#fb7185'
                            : entry.action.includes('LOGIN')
                            ? '#34d399'
                            : entry.action.includes('CONFIG')
                            ? '#fbbf24'
                            : COLORS.primary,
                        border: '1px solid',
                        borderColor:
                          entry.action.includes('FAIL') || entry.action.includes('LOCK')
                            ? 'rgba(244, 63, 94, 0.3)'
                            : entry.action.includes('LOGIN')
                            ? 'rgba(16, 185, 129, 0.3)'
                            : entry.action.includes('CONFIG')
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'rgba(99, 102, 241, 0.3)',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: COLORS.onSurface, fontWeight: 500 }}>
                      {entry.actorEmail || (entry.actorId ? `User #${entry.actorId}` : 'System / Anonymous')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {entry.incidentId ? (
                      <Chip
                        label={`INC #${entry.incidentId}`}
                        size="small"
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          fontSize: 10,
                          bgcolor: COLORS.surfaceContainerHighest,
                          color: COLORS.primary,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: COLORS.onSurface }}>{entry.description}</Typography>
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
