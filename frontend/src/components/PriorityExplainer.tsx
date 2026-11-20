import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import PriorityBadge from './PriorityBadge';
import type { Priority } from '../api/types';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
interface PriorityExplainerProps {
  priority: Priority | null;
  impact?: number;
  urgency?: number;
  score?: number;
  overrideRule?: string | null;
  rationale?: string | null;
}

export default function PriorityExplainer({
  priority,
  impact,
  urgency,
  score,
  overrideRule,
  rationale,
}: PriorityExplainerProps) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: '10px',
        bgcolor: alpha(tokens.white, 0.02),
        border: `1px solid ${tokens.borderSubtle}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: tokens.onSurfaceVariant }}>
          How the priority was worked out
        </Typography>
        <PriorityBadge priority={priority} />
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 1 }}>
        {impact !== undefined && (
          <Grid item xs={4}>
            <Box sx={{ p: 1, bgcolor: alpha(tokens.white, 0.03), borderRadius: '6px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.textDisabled }}>Impact</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: tokens.white }}>{impact}/5</Typography>
            </Box>
          </Grid>
        )}
        {urgency !== undefined && (
          <Grid item xs={4}>
            <Box sx={{ p: 1, bgcolor: alpha(tokens.white, 0.03), borderRadius: '6px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.textDisabled }}>Urgency</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: tokens.white }}>{urgency}/5</Typography>
            </Box>
          </Grid>
        )}
        {score !== undefined && (
          <Grid item xs={4}>
            <Box sx={{ p: 1, bgcolor: alpha(tokens.white, 0.03), borderRadius: '6px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.textDisabled }}>Score</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: tokens.secondaryLight }}>{score}</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {overrideRule && (
        <Typography sx={{ fontSize: '0.75rem', color: tokens.amber, mt: 1, fontStyle: 'italic' }}>
          Override Applied: {overrideRule}
        </Typography>
      )}

      {rationale && (
        <Typography sx={{ fontSize: '0.75rem', color: tokens.onSurfaceVariant, mt: 0.5 }}>
          {rationale}
        </Typography>
      )}
    </Paper>
  );
}
