import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography } from '@mui/material';
import { getRecommendations } from '../../../api/incidents';
import { ErrorState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';
import type { Ref } from '../../../api/types';
import { COLORS } from './ui';

/**
 * "Why this technician": the current assignee's row in the allocation engine's ranking for this incident
 * (GET /incidents/{id}/recommendations): rank, score, load, the factor values and the engine's reasons.
 * Used on the workbench and on the lead screens after an incident has an assignee.
 */
export default function WhyAssignee({ incidentId, assignee }: { incidentId: number; assignee: Ref | null }) {
  const q = useQuery({
    queryKey: ['incident-recommendations', incidentId],
    queryFn: () => getRecommendations(incidentId),
    enabled: assignee != null,
  });
  if (!assignee) return null;
  if (q.isError) return <ErrorState message={`The ranking did not load: ${apiErrorMessage(q.error)}`} onRetry={() => q.refetch()} />;
  const rec = q.data;
  if (!rec) return null;

  const rank = rec.recommendations.findIndex((r) => r.technicianId === assignee.id);
  const mine = rank >= 0 ? rec.recommendations[rank] : null;
  const excludedReason = rec.excluded.find((x) => x.technicianId === assignee.id)?.reason;
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: COLORS.surfaceContainerLowest, border: `1px solid ${COLORS.border}` }}>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: COLORS.onSurface, textTransform: 'uppercase', mb: 1 }}>
        Why {assignee.name} ({rec.strategy})
      </Typography>
      {mine ? (
        <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
              Rank {rank + 1} of {rec.recommendations.length}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: COLORS.primary }}>score {mine.score}</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mb: 0.5 }}>
            Load {mine.currentLoad}/{mine.maxLoad}
          </Typography>
          {Object.entries(mine.factors ?? {}).map(([k, v]) => (
            <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.onSurfaceVariant }}>
              <span>{k}</span>
              <span>{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
            </Box>
          ))}
          {mine.reasons?.map((reason, idx) => (
            <Typography key={idx} sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>• {reason}</Typography>
          ))}
        </Box>
      ) : (
        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
          {assignee.name} is not in the current ranking (for example at full load or away now), so no score is shown.
          {excludedReason ? ` Reason: ${excludedReason}` : ''}
        </Typography>
      )}
    </Paper>
  );
}
