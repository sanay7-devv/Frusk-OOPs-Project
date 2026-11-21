import { humanizeEnum } from '../../../utils/format';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getHistory, getRecommendations } from '../../../api/incidents';
import { listTechnicians, type TechnicianView } from '../../../api/technicians';
import type { AuditEntry, RecommendationView } from '../../../api/types';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';
import { COLORS, MONO, dialogPaperSx, fieldSx, fmtDateTime } from './ui';
import { alpha } from '../../technician/staffStyle';
import { tokens } from '../../../theme/theme';

export const AVAILABILITY_COLOR: Record<string, string> = {
  AVAILABLE: COLORS.success,
  BUSY: COLORS.warning,
  AWAY: COLORS.warning,
  OFF_DUTY: COLORS.error,
};

function AvailabilityChip({ value }: { value: string }) {
  const c = AVAILABILITY_COLOR[value] ?? COLORS.onSurfaceVariant;
  return (
    <Chip
      size="small"
      label={humanizeEnum(value)}
      sx={{ height: 20, fontSize: 12, fontWeight: 700, color: c, bgcolor: alpha(tokens.onSurface, 0.05), border: `1px solid ${c}` }}
    />
  );
}

/**
 * Pick a technician for a reassignment. Combines the technician list (availability, load, skills) with the
 * server's recommendation ranking (score, reasons, exclusions). The current assignee is left out; technicians
 * the engine excluded, and anyone away or off duty, cannot be selected and the reason is shown.
 */
export function CandidatePicker({
  incidentId,
  assigneeId,
  selectedId,
  onSelect,
}: {
  incidentId: number;
  assigneeId: number | null | undefined;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const techs = useQuery<TechnicianView[]>({ queryKey: ['lead-technicians-list'], queryFn: () => listTechnicians() });
  const recs = useQuery<RecommendationView>({
    queryKey: ['incidents', incidentId, 'recommendations'],
    queryFn: () => getRecommendations(incidentId),
  });

  if (techs.isLoading) return <LoadingState />;
  if (techs.isError) return <ErrorState onRetry={() => techs.refetch()} message={apiErrorMessage(techs.error)} />;

  const score = new Map((recs.data?.recommendations ?? []).map((r) => [r.technicianId, r]));
  const excluded = new Map((recs.data?.excluded ?? []).map((x) => [x.technicianId, x.reason]));
  const isBlocked = (t: TechnicianView) =>
    !!(excluded.get(t.id) ?? (t.availability === 'OFF_DUTY' || t.availability === 'AWAY'));

  const list = (techs.data ?? [])
    .filter((t) => t.id !== assigneeId)
    .sort((a, b) => {
      const aBlocked = isBlocked(a);
      const bBlocked = isBlocked(b);
      if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
      return (score.get(b.id)?.score ?? -1) - (score.get(a.id)?.score ?? -1);
    });

  if (list.length === 0) return <EmptyState message="No other technicians are available to reassign to." />;

  const allIneligible = list.every(isBlocked);

  return (
    <Stack spacing={1}>
      {recs.isError && (
        <Alert severity="info" sx={{ fontSize: 12.5 }}>
          Ranking unavailable ({apiErrorMessage(recs.error)}). You can still choose from the technician list.
        </Alert>
      )}
      {allIneligible && (
        <Alert severity="warning" sx={{ fontSize: 12.5 }}>
          All technicians are currently unavailable or ineligible for this incident (skills, capacity, or off duty).
        </Alert>
      )}
      {recs.data?.strategy && (
        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>
          Ranked with {humanizeEnum(recs.data.strategy).toLowerCase()} strategy
        </Typography>
      )}
      {list.map((t) => {
        const rec = score.get(t.id);
        const blocked =
          excluded.get(t.id) ?? (t.availability === 'OFF_DUTY' || t.availability === 'AWAY' ? `Technician is ${t.availability.replace('_', ' ').toLowerCase()}` : null);
        const selected = selectedId === t.id;
        const ratio = t.maxLoad > 0 ? Math.min(100, (t.currentLoad / t.maxLoad) * 100) : 0;
        return (
          <Box
            key={t.id}
            onClick={() => !blocked && onSelect(t.id)}
            sx={{
              p: 1.5,
              borderRadius: 2,
              cursor: blocked ? 'not-allowed' : 'pointer',
              opacity: blocked ? 0.55 : 1,
              bgcolor: selected ? alpha(tokens.primary, 0.15) : COLORS.surfaceContainerLow,
              border: `1px solid ${selected ? COLORS.primary : COLORS.border}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>{t.name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {rec && (
                  <Typography sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: COLORS.secondary }}>{rec.score}% fit</Typography>
                )}
                <AvailabilityChip value={t.availability} />
              </Stack>
            </Stack>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
              Weighted load {t.currentLoad} / {t.maxLoad} ({t.activeIncidents} active incidents)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={ratio}
              sx={{ height: 4, borderRadius: 2, my: 0.75, bgcolor: alpha(tokens.onSurface, 0.08), '& .MuiLinearProgress-bar': { bgcolor: ratio >= 90 ? COLORS.error : COLORS.secondary } }}
            />
            {t.skills.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {t.skills.map((s) => (
                  <Chip key={s.skillId} size="small" label={`${s.name} · Lvl ${s.proficiency}`} sx={{ height: 20, fontSize: 12 }} />
                ))}
              </Stack>
            )}
            {rec && rec.reasons.length > 0 && (
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.5 }}>{rec.reasons.join(' | ')}</Typography>
            )}
            {blocked && <Typography sx={{ fontSize: 12, color: COLORS.error, mt: 0.5 }}>Cannot select: {blocked}</Typography>}
          </Box>
        );
      })}
    </Stack>
  );
}

/** Every technician with availability, weighted load and skills, so a lead can see capacity before allocating. */
export function TeamWorkloadDialog({
  open,
  onClose,
  highlightId,
}: {
  open: boolean;
  onClose: () => void;
  highlightId?: number | null;
}) {
  const [availability, setAvailability] = useState('');
  const q = useQuery<TechnicianView[]>({
    queryKey: ['lead-technicians-list', 'workload', availability],
    queryFn: () => listTechnicians(undefined, availability || undefined),
    enabled: open,
  });
  const rows = [...(q.data ?? [])].sort((a, b) => b.currentLoad / (b.maxLoad || 1) - a.currentLoad / (a.maxLoad || 1));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Team workload</DialogTitle>
      <DialogContent dividers sx={{ borderColor: COLORS.border }}>
        <TextField
          select
          size="small"
          label="Availability"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          sx={{ minWidth: 200, mb: 2, ...fieldSx }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="AVAILABLE">Available</MenuItem>
          <MenuItem value="BUSY">Busy</MenuItem>
          <MenuItem value="AWAY">Away</MenuItem>
          <MenuItem value="OFF_DUTY">Off duty</MenuItem>
        </TextField>
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} message={apiErrorMessage(q.error)} />
        ) : rows.length === 0 ? (
          <EmptyState message="No technicians match this filter." />
        ) : (
          <Stack spacing={1}>
            {rows.map((t) => {
              const ratio = t.maxLoad > 0 ? Math.min(100, (t.currentLoad / t.maxLoad) * 100) : 0;
              return (
                <Box
                  key={t.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: COLORS.surfaceContainerLow,
                    border: `1px solid ${t.id === highlightId ? COLORS.primary : COLORS.border}`,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: COLORS.onSurface }}>
                      {t.name}
                      {t.id === highlightId ? ' (just assigned)' : ''}
                    </Typography>
                    <AvailabilityChip value={t.availability} />
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.5, fontFamily: MONO }}>
                    {t.currentLoad >= t.maxLoad && t.maxLoad > 0 ? 'Full' : `Load ${t.currentLoad} of ${t.maxLoad}`} · {t.activeIncidents} active · {humanizeEnum(String(t.experienceLevel))}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={ratio}
                    sx={{ height: 5, borderRadius: 3, my: 0.75, bgcolor: alpha(tokens.onSurface, 0.08), '& .MuiLinearProgress-bar': { bgcolor: ratio >= 90 ? COLORS.error : COLORS.secondary } }}
                  />
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {t.skills.map((s) => (
                      <Chip key={s.skillId} size="small" label={`${s.name} · Lvl ${s.proficiency}`} sx={{ height: 20, fontSize: 12 }} />
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Who was notified at each escalation level and when, from the incident's audit history (action ESCALATED). */
export function EscalationTimeline({ incidentId }: { incidentId: number }) {
  const q = useQuery<AuditEntry[]>({
    queryKey: ['lead-escalation-history', incidentId],
    queryFn: () => getHistory(incidentId),
  });
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} message={apiErrorMessage(q.error)} />;
  const rows = (q.data ?? []).filter((e) => e.action === 'ESCALATED');
  if (rows.length === 0) return <EmptyState message="No escalation steps recorded for this incident yet." />;
  return (
    <Stack spacing={1}>
      {rows.map((e) => (
        <Box key={e.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
          <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>
            {fmtDateTime(e.timestamp)} · {e.actor?.name ?? 'System'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurface }}>{e.description}</Typography>
        </Box>
      ))}
    </Stack>
  );
}
