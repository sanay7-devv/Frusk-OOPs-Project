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

export default function EscalationSettings() {
  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-escalation-policies'],
    queryFn: getAdminEscalationPolicies,
  });

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Escalation Rules & Triggers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure automated escalation workflows triggered by approaching SLA breaches and on-call paging
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
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Trigger Priority</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Elapsed Time Trigger</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Escalation Target Tier</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Automated Workflow Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <PriorityBadge priority={p.priority} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">
                      {p.triggerMinutes} minutes without acknowledgment
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`Tier ${p.targetLevel} (Team Lead)`} color="primary" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.action}</Typography>
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
