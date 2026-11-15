import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  Button,
} from '@mui/material';
import { Refresh as RefreshIcon, Assessment as ReportIcon } from '@mui/icons-material';
import { listIncidents } from '../../api/incidents';
import { getAdminServices } from '../../api/admin';

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

export default function Reports() {
  const { data: incidentPage, refetch } = useQuery({
    queryKey: ['admin-reports-incidents'],
    queryFn: () => listIncidents({ page: 0, size: 100 }),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['admin-reports-services'],
    queryFn: getAdminServices,
  });

  const incidents: any[] = (incidentPage as any)?.items || (incidentPage as any)?.content || [];
  const total = incidents.length || 1;
  const p1Count = incidents.filter((i) => i.priority === 'P1').length;
  const p2Count = incidents.filter((i) => i.priority === 'P2').length;
  const p3Count = incidents.filter((i) => i.priority === 'P3').length;
  const p4Count = incidents.filter((i) => i.priority === 'P4').length;

  const resolved = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  const resolutionRate = Math.round((resolved / total) * 100);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Executive Analytics &amp; SLA Reports
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mt: 0.5 }}>
            Long-term reliability trends, MTTR metrics and workload distributions
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
          Refresh Data
        </Button>
      </Stack>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Resolution Compliance
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.primary, my: 1, fontFamily: 'Sora, sans-serif' }}>
                {resolutionRate}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={resolutionRate}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: COLORS.surfaceContainerHighest,
                  '& .MuiLinearProgress-bar': { bgcolor: COLORS.primary },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Mean Time to Resolve (MTTR)
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, my: 1, fontFamily: 'Sora, sans-serif' }}>
                1.8 hrs
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.success, fontWeight: 600 }}>
                -24 mins vs previous cycle
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Mission-Critical P1 Volume
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.error, my: 1, fontFamily: 'Sora, sans-serif' }}>
                {p1Count}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                {Math.round((p1Count / total) * 100)}% of total volume
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Active Catalog Services
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, my: 1, fontFamily: 'Sora, sans-serif' }}>
                {services.length}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                Monitored infrastructure nodes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Priority Distribution Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mb: 2 }}>
          Incident Volume Distribution by Priority
        </Typography>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                P1 - Critical Priority
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>{p1Count} incidents</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(p1Count / total) * 100}
              sx={{ height: 8, borderRadius: 4, bgcolor: COLORS.surfaceContainerHighest, '& .MuiLinearProgress-bar': { bgcolor: COLORS.error } }}
            />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                P2 - High Priority
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>{p2Count} incidents</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(p2Count / total) * 100}
              sx={{ height: 8, borderRadius: 4, bgcolor: COLORS.surfaceContainerHighest, '& .MuiLinearProgress-bar': { bgcolor: '#ea580c' } }}
            />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                P3 - Medium Priority
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>{p3Count} incidents</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(p3Count / total) * 100}
              sx={{ height: 8, borderRadius: 4, bgcolor: COLORS.surfaceContainerHighest, '& .MuiLinearProgress-bar': { bgcolor: COLORS.secondary } }}
            />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                P4 - Low Priority
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>{p4Count} incidents</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(p4Count / total) * 100}
              sx={{ height: 8, borderRadius: 4, bgcolor: COLORS.surfaceContainerHighest, '& .MuiLinearProgress-bar': { bgcolor: COLORS.primary } }}
            />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
