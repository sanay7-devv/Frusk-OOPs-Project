import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, Psychology as PsychologyIcon } from '@mui/icons-material';
import {
  getSimilarIncidents,
  getSlaRisk,
  getSuggestedResolutions,
  summarizeIncident,
  type SimilarIncidentView,
  type SlaRiskView,
  type SuggestedResolutionView,
  type ThreadSummaryView,
} from '../../../api/technicians';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';
import { COLORS, MONO } from './ui';
import { alpha } from '../../technician/staffStyle';
import { tokens } from '../../../theme/theme';

const riskColor = { LOW: COLORS.success, MEDIUM: COLORS.warning, HIGH: COLORS.error } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: MONO, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** Server-computed SLA risk for one incident (GET /incidents/{id}/sla-risk). */
export function SlaRiskCard({ incidentId }: { incidentId: number }) {
  const { data, isLoading, error, refetch } = useQuery<SlaRiskView>({
    queryKey: ['incident-sla-risk', incidentId],
    queryFn: () => getSlaRisk(incidentId),
    refetchInterval: 30000,
  });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => refetch()} message={apiErrorMessage(error)} />;
  if (!data) return <EmptyState message="No SLA risk data for this incident." />;
  return (
    <Paper elevation={0} sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Chip
          size="small"
          label={`${data.level} RISK`}
          sx={{ fontFamily: MONO, fontWeight: 800, fontSize: 12, color: riskColor[data.level], bgcolor: alpha(tokens.onSurface, 0.05) }}
        />
        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>
          score {Math.round(data.score * 100) / 100} / threshold {data.threshold}
          {data.atRisk ? ' (at risk)' : ''}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, data.score * 100))}
        sx={{ height: 6, borderRadius: 3, bgcolor: alpha(tokens.onSurface, 0.08), '& .MuiLinearProgress-bar': { bgcolor: riskColor[data.level] } }}
      />
      {data.factors.map((f) => (
        <Typography key={f.name} sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.75 }}>
          <Box component="span" sx={{ color: COLORS.onSurface, fontWeight: 700 }}>
            {f.name}
          </Box>{' '}
          ({Math.round(f.contribution * 100) / 100}): {f.detail}
        </Typography>
      ))}
    </Paper>
  );
}

function SimilarList({ incidentId, onOpen }: { incidentId: number; onOpen?: (id: number) => void }) {
  const { data, isLoading, error, refetch } = useQuery<SimilarIncidentView[]>({
    queryKey: ['incidents', incidentId, 'similar'],
    queryFn: () => getSimilarIncidents(incidentId),
  });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => refetch()} message={apiErrorMessage(error)} />;
  if (!data || data.length === 0) return <EmptyState message="No similar incidents found." />;
  return (
    <Stack spacing={1}>
      {data.map((s) => (
        <Paper key={s.incidentId} elevation={0} sx={{ p: 1.25, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: COLORS.secondary }}>{s.code}</Typography>
            <Chip size="small" label={s.match} sx={{ fontSize: 12, height: 20, color: s.match === 'DUPLICATE' ? COLORS.warning : COLORS.onSurfaceVariant }} />
            <Chip size="small" label={`${Math.round(s.similarity * 100)}% match`} sx={{ fontSize: 12, height: 20 }} />
            {s.source && <Chip size="small" label={s.source} sx={{ fontSize: 12, height: 20 }} />}
            <Chip size="small" label={s.status} sx={{ fontSize: 12, height: 20 }} />
          </Stack>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mt: 0.5 }}>{s.title}</Typography>
          {onOpen && (
            <Button size="small" onClick={() => onOpen(s.incidentId)} sx={{ textTransform: 'none', fontSize: 12, color: COLORS.secondary, px: 0 }}>
              Open
            </Button>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

function SuggestedList({ incidentId }: { incidentId: number }) {
  const { data, isLoading, error, refetch } = useQuery<SuggestedResolutionView[]>({
    queryKey: ['incidents', incidentId, 'suggested-resolutions'],
    queryFn: () => getSuggestedResolutions(incidentId),
  });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => refetch()} message={apiErrorMessage(error)} />;
  if (!data || data.length === 0) return <EmptyState message="No past resolutions match this incident yet." />;
  return (
    <Stack spacing={1}>
      {data.map((r) => (
        <Paper key={r.fromIncidentId} elevation={0} sx={{ p: 1.25, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: COLORS.secondary }}>{r.code}</Typography>
            <Chip size="small" label={`${Math.round(r.similarity * 100)}% match`} sx={{ fontSize: 12, height: 20 }} />
            {r.reusable && <Chip size="small" label="REUSABLE" sx={{ fontSize: 12, height: 20, color: COLORS.success }} />}
          </Stack>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.5 }}>{r.title}</Typography>
          <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, mt: 0.5 }}>Root cause: {r.rootCause}</Typography>
          {r.notes && <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>Notes: {r.notes}</Typography>}
          {r.steps && <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, whiteSpace: 'pre-wrap' }}>Steps: {r.steps}</Typography>}
        </Paper>
      ))}
    </Stack>
  );
}

function SummaryBlock({ incidentId }: { incidentId: number }) {
  const [summary, setSummary] = useState<ThreadSummaryView | null>(null);
  const m = useMutation({
    mutationFn: () => summarizeIncident(incidentId),
    onSuccess: setSummary,
  });
  return (
    <Box>
      <Button
        size="small"
        variant="outlined"
        onClick={() => m.mutate()}
        disabled={m.isPending}
        startIcon={m.isPending ? <CircularProgress size={14} /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
        sx={{ textTransform: 'none', fontSize: 12.5, borderColor: COLORS.border, color: COLORS.onSurface }}
      >
        {summary ? 'Summarize again' : 'Summarize thread'}
      </Button>
      {m.isError && <ErrorState onRetry={() => m.mutate()} message={apiErrorMessage(m.error)} />}
      {summary && (
        <Paper elevation={0} sx={{ mt: 1.5, p: 1.5, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
          <Chip size="small" label={`source: ${summary.source}`} sx={{ fontSize: 12, height: 20, mb: 1 }} />
          <Typography sx={{ fontSize: 13, color: COLORS.onSurface, whiteSpace: 'pre-wrap' }}>{summary.summary}</Typography>
          {summary.handoverNotes.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, color: COLORS.onSurfaceVariant, fontSize: 12.5 }}>
              {summary.handoverNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

/**
 * Thread summary, similar incidents, suggested resolutions and SLA risk for one incident.
 * Every block calls the real endpoint; nothing is worked out in the browser.
 */
export default function IntelligencePanel({
  incidentId,
  onOpenIncident,
  showSlaRisk = true,
}: {
  incidentId: number;
  onOpenIncident?: (id: number) => void;
  showSlaRisk?: boolean;
}) {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <PsychologyIcon sx={{ color: COLORS.secondary }} />
        <Typography sx={{ fontWeight: 800, color: COLORS.onSurface }}>Intelligence tools</Typography>
      </Stack>
      {showSlaRisk && (
        <Section title="SLA risk">
          <SlaRiskCard incidentId={incidentId} />
        </Section>
      )}
      <Section title="Thread summary">
        <SummaryBlock incidentId={incidentId} />
      </Section>
      <Section title="Similar incidents">
        <SimilarList incidentId={incidentId} onOpen={onOpenIncident} />
      </Section>
      <Section title="Suggested resolutions">
        <SuggestedList incidentId={incidentId} />
      </Section>
    </Paper>
  );
}
