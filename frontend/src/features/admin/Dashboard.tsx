import { useState } from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { AddAlert as AddAlertIcon } from '@mui/icons-material';
import { tokens } from '../../theme/theme';
import { KpiRow } from './dashboard/KpiRow';
import { VelocityCard } from './dashboard/VelocityCard';
import { PriorityCard } from './dashboard/PriorityCard';
import { CapacityCard } from './dashboard/CapacityCard';
import { AttentionCard, LiveFeedCard } from './dashboard/LiveCards';
import { OperationsCard } from './dashboard/OperationsCard';
import { IncidentCreateDialog } from '../../components/IncidentCreateDialog';

/** Admin dashboard: every number comes from /dashboard/live or /reports/*. */
export default function Dashboard() {
  const [declareOpen, setDeclareOpen] = useState(false);
  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.onSurface }}>Dashboard</Typography>
        <Button variant="contained" color="error" startIcon={<AddAlertIcon />} onClick={() => setDeclareOpen(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Declare incident
        </Button>
      </Stack>

      <KpiRow />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}><VelocityCard /></Grid>
        <Grid item xs={12} md={4}><PriorityCard /></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}><AttentionCard /></Grid>
        <Grid item xs={12} md={4}><CapacityCard /></Grid>
        <Grid item xs={12} md={4}><LiveFeedCard /></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12}><OperationsCard /></Grid>
      </Grid>

      <IncidentCreateDialog open={declareOpen} onClose={() => setDeclareOpen(false)} />
    </Box>
  );
}
