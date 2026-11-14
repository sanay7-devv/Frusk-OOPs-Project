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
          <Typography variant="h4" fontWeight="bold">
            Executive Analytics & SLA Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Long-term reliability trends, MTTR metrics and workload distributions
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
          Refresh Data
        </Button>
      </Stack>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                Resolution Compliance
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main" my={1}>
                {resolutionRate}%
              </Typography>
              <LinearProgress variant="determinate" value={resolutionRate} sx={{ height: 6, borderRadius: 3 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                Mean Time to Resolve (MTTR)
              </Typography>
              <Typography variant="h4" fontWeight="bold" my={1}>
                1.8 hrs
              </Typography>
              <Typography variant="caption" color="success.main">
                -24 mins vs previous cycle
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                Mission-Critical P1 Volume
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main" my={1}>
                {p1Count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round((p1Count / total) * 100)}% of total volume
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                Active Catalog Services
              </Typography>
              <Typography variant="h4" fontWeight="bold" my={1}>
                {services.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Monitored infrastructure nodes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Priority Distribution Chart */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Incident Volume Distribution by Priority
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600">
                P1 - Critical Priority
              </Typography>
              <Typography variant="body2">{p1Count} incidents</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(p1Count / total) * 100} color="error" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600">
                P2 - High Priority
              </Typography>
              <Typography variant="body2">{p2Count} incidents</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(p2Count / total) * 100} color="warning" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600">
                P3 - Medium Priority
              </Typography>
              <Typography variant="body2">{p3Count} incidents</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(p3Count / total) * 100} color="info" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight="600">
                P4 - Low Priority
              </Typography>
              <Typography variant="body2">{p4Count} incidents</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(p4Count / total) * 100} color="inherit" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
