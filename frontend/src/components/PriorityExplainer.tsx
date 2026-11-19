import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import PriorityBadge from './PriorityBadge';
import type { Priority } from '../api/types';

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
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
          ITIL Priority Formula Breakdown
        </Typography>
        <PriorityBadge priority={priority} />
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 1 }}>
        {impact !== undefined && (
          <Grid item xs={4}>
            <Box sx={{ p: 1, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Impact</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{impact}/5</Typography>
            </Box>
          </Grid>
        )}
        {urgency !== undefined && (
          <Grid item xs={4}>
            <Box sx={{ p: 1, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Urgency</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{urgency}/5</Typography>
            </Box>
          </Grid>
        )}
        {score !== undefined && (
          <Grid item xs={4}>
            <Box sx={{ p: 1, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Score</Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#4cd7f6' }}>{score}</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {overrideRule && (
        <Typography sx={{ fontSize: '0.75rem', color: '#f59e0b', mt: 1, fontStyle: 'italic' }}>
          Override Applied: {overrideRule}
        </Typography>
      )}

      {rationale && (
        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>
          {rationale}
        </Typography>
      )}
    </Paper>
  );
}
