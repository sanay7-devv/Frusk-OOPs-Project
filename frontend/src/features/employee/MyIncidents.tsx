import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import { listIncidents } from '../../api/incidents';
import type { IncidentSummary } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';

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
};

export default function MyIncidents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-incidents'],
    queryFn: () => listIncidents({ mine: true, size: 50 }),
  });

  const incidents: IncidentSummary[] = (data as any)?.items || (data as any)?.content || [];

  const filteredIncidents = incidents.filter((inc: IncidentSummary) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.service?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') {
      return inc.status !== 'RESOLVED' && inc.status !== 'CLOSED';
    }
    if (statusFilter === 'RESOLVED') {
      return inc.status === 'RESOLVED' || inc.status === 'CLOSED';
    }
    return true;
  });

  const activeCount = incidents.filter((i: IncidentSummary) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const resolvedCount = incidents.filter((i: IncidentSummary) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header Bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: COLORS.onSurface,
                fontFamily: 'Sora, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              My Reported Incidents
            </Typography>
            <Chip
              label={`${incidents.length} TOTAL`}
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                color: COLORS.primary,
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 10.5,
                height: 22,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
            Real-time telemetry and resolution tracking for your submitted IT services and enterprise tickets
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            size="small"
            onClick={() => refetch()}
            startIcon={isFetching ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: COLORS.surfaceContainer,
              color: COLORS.onSurfaceVariant,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
            }}
          >
            Refresh Feed
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate('/employee/report')}
            startIcon={<AddIcon />}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              borderRadius: 2,
              px: 2.5,
              py: 0.8,
              fontSize: 12.5,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              '&:hover': { opacity: 0.9 },
            }}
          >
            Report Incident
          </Button>
        </Box>
      </Box>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          bgcolor: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.border}`,
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: COLORS.surfaceContainerLow, p: 0.5, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
          {[
            { id: 'ALL', label: 'All Incidents', count: incidents.length },
            { id: 'ACTIVE', label: 'Active', count: activeCount },
            { id: 'RESOLVED', label: 'Resolved / Closed', count: resolvedCount },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                size="small"
                onClick={() => setStatusFilter(tab.id as any)}
                sx={{
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: 12,
                  color: isSelected ? '#ffffff' : COLORS.onSurfaceVariant,
                  bgcolor: isSelected ? COLORS.surfaceContainerHighest : 'transparent',
                  border: isSelected ? `1px solid ${COLORS.border}` : '1px solid transparent',
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.6,
                  textTransform: 'none',
                  '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
                }}
              >
                <span>{tab.label}</span>
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    px: 0.8,
                    py: 0.1,
                    borderRadius: 1,
                    bgcolor: isSelected ? COLORS.primary : COLORS.surfaceContainerHighest,
                    color: '#ffffff',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </Box>
              </Button>
            );
          })}
        </Box>

        <TextField
          size="small"
          placeholder="Filter by code, summary, service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: COLORS.onSurfaceVariant, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', md: 320 },
            '& .MuiOutlinedInput-root': {
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 2,
              fontSize: 12.5,
              color: COLORS.onSurface,
              '& fieldset': { borderColor: COLORS.border },
            },
          }}
        />
      </Paper>

      {/* Incidents Ledger Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ color: COLORS.primary, mb: 1.5 }} />
            <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>
              Loading your incidents...
            </Typography>
          </Box>
        ) : filteredIncidents.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 44, color: COLORS.secondary, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              No Incidents Found
            </Typography>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, maxWidth: 440, mx: 'auto', mt: 0.5 }}>
              {searchQuery ? 'No tickets matched your query filter.' : 'You have not reported any open or past service disruptions.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    Ticket
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    Incident Summary
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    Service Mesh
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    Severity
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    Lifecycle
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    SLA Clock
                  </TableCell>
                  <TableCell align="right" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIncidents.map((inc: IncidentSummary) => (
                  <TableRow
                    key={inc.id}
                    hover
                    onClick={() => navigate(`/employee/incidents/${inc.id}`)}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: `1px solid ${COLORS.border}`,
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 800, color: COLORS.secondary }}>
                      {inc.code}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mb: 0.25 }}>
                        {inc.title}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                        Reported {new Date(inc.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={inc.service?.name || 'General Enterprise'}
                        size="small"
                        sx={{
                          bgcolor: COLORS.surfaceContainerHigh,
                          color: COLORS.onSurfaceVariant,
                          border: `1px solid ${COLORS.border}`,
                          fontSize: 11,
                          fontWeight: 600,
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={inc.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={inc.status} />
                    </TableCell>
                    <TableCell>
                      {inc.status === 'RESOLVED' || inc.status === 'CLOSED' ? (
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: COLORS.success, fontWeight: 700 }}>
                          Remediated
                        </Typography>
                      ) : (
                        <SlaCountdown
                          due={inc.resolutionDue}
                          createdAt={inc.createdAt}
                          slaState={inc.slaState}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          color: COLORS.secondary,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 1.5,
                          px: 1.5,
                          '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.1)' },
                        }}
                      >
                        Telemetry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
