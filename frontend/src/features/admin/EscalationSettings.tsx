import { useState } from 'react';
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
import { Refresh as RefreshIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { getAdminEscalationPolicies } from '../../api/admin';
import PriorityBadge from '../../components/PriorityBadge';

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

export default function EscalationSettings() {
  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-escalation-policies'],
    queryFn: getAdminEscalationPolicies,
  });

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Escalation Rules &amp; Triggers
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mt: 0.5 }}>
            Configure automated escalation workflows triggered by approaching SLA breaches and on-call paging
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
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow }}>
              <TableRow sx={{ '& th': { borderBottom: `1px solid ${COLORS.border}` } }}>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>TRIGGER PRIORITY</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>ELAPSED TIME TRIGGER</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>ESCALATION TARGET TIER</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>AUTOMATED WORKFLOW ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    '& td': { borderBottom: `1px solid ${COLORS.border}` },
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' },
                  }}
                >
                  <TableCell>
                    <PriorityBadge priority={p.priority} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.triggerMinutes} minutes without acknowledgment
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`Tier ${p.targetLevel} (Team Lead)`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(99, 102, 241, 0.2)',
                        color: COLORS.primary,
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant }}>{p.action}</Typography>
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
