import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Hub as HubIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getServicesStatus, getKnownOutages, joinProblem } from '../../api/incidents';
import type { KnownOutageView, ServiceStatus as IServiceStatus } from '../../api/types';

import { tokens } from '../../theme/theme';
import { formatDateTime, formatTime } from '../../utils/format';
import { alpha } from '@mui/material/styles';
export default function ServiceStatus() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinedMsg, setJoinedMsg] = useState<string | null>(null);

  const {
    data: statusBoard,
    isLoading: boardLoading,
    error: boardError,
    refetch: refetchBoard,
  } = useQuery({
    queryKey: ['services', 'status-board'],
    queryFn: getServicesStatus,
    staleTime: 30000,
  });

  const {
    data: outages = [],
    isLoading: outagesLoading,
    refetch: refetchOutages,
  } = useQuery({
    queryKey: ['problems', 'known-outages'],
    queryFn: () => getKnownOutages(),
    staleTime: 30000,
  });

  const joinMutation = useMutation({
    mutationFn: (problemId: number) => joinProblem(problemId),
    onSuccess: (data) => {
      setJoinedMsg(`You have joined report ${data.code}. You will get updates on it.`);
      queryClient.invalidateQueries({ queryKey: ['problems', 'known-outages'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const handleRefresh = () => {
    refetchBoard();
    refetchOutages();
  };

  const getStatusIcon = (status: IServiceStatus['status']) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircleIcon sx={{ fontSize: 20, color: tokens.success }} />;
      case 'DEGRADED':
        return <WarningIcon sx={{ fontSize: 20, color: tokens.amber }} />;
      case 'OUTAGE':
        return <ErrorIcon sx={{ fontSize: 20, color: tokens.red }} />;
      default:
        return <CheckCircleIcon sx={{ fontSize: 20, color: tokens.onSurfaceVariant }} />;
    }
  };

  const getStatusColor = (status: IServiceStatus['status']): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'HEALTHY':
        return 'success';
      case 'DEGRADED':
        return 'warning';
      case 'OUTAGE':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/employee/home')}
            sx={{ color: tokens.onSurfaceVariant, textTransform: 'none', '&:hover': { color: tokens.white } }}
          >
            Home
          </Button>
          <Box>
            <Typography
              variant="h4" component="h1"
              sx={{
                fontWeight: 700,
                fontFamily: 'Sora, sans-serif',
                color: tokens.white,
                fontSize: { xs: '1.4rem', sm: '1.8rem' },
              }}
            >
              Service status
            </Typography>
            <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: '0.85rem' }}>
              See which services are working and which have problems
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh service status">
          <IconButton
            onClick={handleRefresh}
            aria-label="Refresh service status"
            sx={{
              bgcolor: alpha(tokens.white, 0.05),
              border: `1px solid ${alpha(tokens.white, 0.1)}`,
              color: tokens.onSurface,
              '&:hover': { bgcolor: alpha(tokens.white, 0.1) },
            }}
          >
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {joinedMsg && (
        <Alert severity="success" onClose={() => setJoinedMsg(null)} sx={{ mb: 3 }}>
          {joinedMsg}
        </Alert>
      )}

      {/* Known Outages Section */}
      {outages.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: tokens.red,
              textTransform: 'none',
              letterSpacing: 0,
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <HubIcon sx={{ fontSize: 16 }} /> Known problems ({outages.length})
          </Typography>
          <Grid container spacing={2}>
            {outages.map((outage) => (
              <Grid item xs={12} key={outage.problemId}>
                <Card
                  sx={{
                    bgcolor: alpha(tokens.red, 0.06),
                    border: `1px solid ${alpha(tokens.red, 0.3)}`,
                    borderRadius: '12px',
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Chip
                          label={outage.leadPriority || 'P1'}
                          size="small"
                          sx={{
                            bgcolor: tokens.red,
                            color: tokens.white,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                        <Typography sx={{ fontWeight: 700, color: tokens.white, fontSize: '1rem' }}>
                          {outage.title}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: '0.85rem' }}>
                        Service: <strong>{outage.service?.name}</strong> • People affected:{' '}
                        <strong>{outage.affectedUsers}</strong> • Since{' '}
                        {formatTime(outage.since)}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={outage.alreadyJoined || joinMutation.isPending}
                      onClick={() => joinMutation.mutate(outage.problemId)}
                      sx={{
                        bgcolor: outage.alreadyJoined ? alpha(tokens.white, 0.1) : tokens.red,
                        color: tokens.white,
                        textTransform: 'none',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        '&:hover': { bgcolor: tokens.redDark },
                      }}
                    >
                      {outage.alreadyJoined ? 'You have joined' : 'This affects me too'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Status Board Loading / Error */}
      {boardLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : boardError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Could not load service status. Please try again later.
        </Alert>
      ) : statusBoard ? (
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              p: 2,
              borderRadius: '10px',
              bgcolor: alpha(tokens.white, 0.02),
              border: `1px solid ${tokens.borderSubtle}`,
            }}
          >
            <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: '0.85rem' }}>
              Based on the last <strong>{statusBoard.windowDays} days</strong> of reports
            </Typography>
            <Typography sx={{ color: tokens.textDisabled, fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
              Updated: {formatDateTime(statusBoard.generatedAt)}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {statusBoard.services?.map((svc) => (
              <Grid item xs={12} md={6} key={svc.id}>
                <Card
                  sx={{
                    bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
                    border: `1px solid ${tokens.outlineVariant}`,
                    borderRadius: '12px',
                    p: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {getStatusIcon(svc.status)}
                        <Typography sx={{ fontWeight: 600, color: tokens.white, fontSize: '1.05rem' }}>
                          {svc.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={({ HEALTHY: 'Working', DEGRADED: 'Slow or partly down', OUTAGE: 'Down' } as Record<string, string>)[svc.status] ?? svc.status}
                        color={getStatusColor(svc.status)}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                      />
                    </Box>

                    {svc.reason && (
                      <Typography sx={{ color: tokens.amber, fontSize: '0.82rem', mb: 1.5, fontStyle: 'italic' }}>
                        {svc.reason}
                      </Typography>
                    )}

                    {/* null when no incident has been judged yet: show nothing rather than 0%. */}
                    {svc.slaCompliancePercent != null && (
                      <Box sx={{ mb: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: '0.78rem', color: tokens.onSurfaceVariant }}>
                            Fixed on time ({svc.slaJudged ?? 0} incidents checked)
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.78rem',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 700,
                              color: svc.slaCompliancePercent >= 95 ? tokens.success : tokens.amber,
                            }}
                          >
                            {svc.slaCompliancePercent.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, Math.max(0, svc.slaCompliancePercent))}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: tokens.borderSubtle,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: svc.slaCompliancePercent >= 95 ? tokens.success : tokens.amber,
                            },
                          }}
                        />
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ pt: 1.5, borderTop: `1px solid ${tokens.borderSubtle}`, display: 'flex', gap: 2 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: tokens.textDisabled }}>
                      Importance: <strong style={{ color: tokens.onSurface }}>{svc.criticality} of 5</strong>
                    </Typography>
                    {svc.open && (
                      <Typography sx={{ fontSize: '0.78rem', color: tokens.textDisabled }}>
                        Open incidents: <strong style={{ color: tokens.onSurface }}>{svc.open.total}</strong>
                        {svc.open.P1 > 0 && <span style={{ color: tokens.red }}> ({svc.open.P1} urgent)</span>}
                      </Typography>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : null}
    </Box>
  );
}
