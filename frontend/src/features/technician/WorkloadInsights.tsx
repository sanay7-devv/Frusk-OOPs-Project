import { useNavigate } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, Grid, LinearProgress, Paper, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { apiErrorMessage } from '../../utils/errors';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { priorityColor, slaStateColor, slaStateLabel, tokens } from '../../theme/theme';
import { listIncidents } from '../../api/incidents';
import { getMyQueue, getSlaRisk, type Deadline, type SkillLevel } from '../../api/technicians';
import type { Priority, SlaState } from '../../api/types';

const cardSx = {
  p: 2.5,
  borderRadius: 3,
  bgcolor: tokens.surfaceContainer,
  border: `1px solid ${tokens.outlineVariant}`,
  height: '100%',
} as const;

const heading = { fontSize: 14, fontWeight: 800, color: tokens.onSurface, mb: 0.5 } as const;
const sub = { fontSize: 12, color: tokens.onSurfaceVariant, mb: 1.5 } as const;

const FINISHED = ['RESOLVED', 'VERIFIED', 'CLOSED'];

/**
 * Four extra cards for the workload page. Everything is read from the API:
 *  - my active queue grouped by priority and by the server's slaState (GET /technicians/me/queue),
 *  - SLA compliance over my last 100 finished incidents, counting the slaState the server stored on each
 *    (GET /incidents?assignedToMe=true&status=RESOLVED,VERIFIED,CLOSED),
 *  - breach risk for the incidents behind my next deadlines (GET /incidents/{id}/sla-risk),
 *  - my skills, when the caller may list technicians (team lead or administrator).
 */
export default function WorkloadInsights({ deadlines, skills }: { deadlines: Deadline[]; skills: SkillLevel[] | null }) {
  const navigate = useNavigate();

  const queue = useQuery({ queryKey: ['tech-workload-mix'], queryFn: () => getMyQueue(0, 100), refetchInterval: 30000 });
  const finished = useQuery({
    queryKey: ['tech-workload-finished'],
    queryFn: () =>
      listIncidents({ assignedToMe: true, status: FINISHED, size: 100, sort: 'createdAt,desc' }),
    refetchInterval: 60000,
  });

  const uniqueDeadlines = deadlines.filter((d, i, all) => all.findIndex((x) => x.incidentId === d.incidentId) === i).slice(0, 6);
  const risks = useQueries({
    queries: uniqueDeadlines.map((d) => ({
      queryKey: ['incident-sla-risk', d.incidentId],
      queryFn: () => getSlaRisk(d.incidentId),
    })),
  });

  const active = queue.data?.items ?? [];
  const byPriority = (['P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => ({
    name: p,
    count: active.filter((i) => i.priority === p).length,
  }));
  const bySla = (['OK', 'WARNING', 'AT_RISK', 'VIOLATED', 'PAUSED'] as SlaState[]).map((s) => ({
    name: slaStateLabel[s],
    state: s,
    count: active.filter((i) => i.slaState === s).length,
  }));

  const done = finished.data?.items ?? [];
  const met = done.filter((i) => i.slaState === 'MET').length;
  const violated = done.filter((i) => i.slaState === 'VIOLATED').length;
  const judged = met + violated;
  const compliance = judged > 0 ? Math.round((met / judged) * 100) : null;

  const chartTooltip = { contentStyle: { background: tokens.surfaceContainerHigh, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 8, fontSize: 12 } };

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      <Grid item xs={12} lg={6}>
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={heading}>My active queue by priority</Typography>
          <Typography sx={sub}>Incidents assigned to me that are not finished yet.</Typography>
          {queue.isLoading ? (
            <LoadingState />
          ) : queue.error ? (
            <ErrorState message={apiErrorMessage(queue.error)} onRetry={() => queue.refetch()} />
          ) : active.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>Nothing is assigned to you right now.</Typography>
          ) : (
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPriority} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={tokens.outlineVariant} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: tokens.onSurfaceVariant, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: tokens.onSurfaceVariant, fontSize: 12 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                    {byPriority.map((d) => (
                      <Cell key={d.name} fill={priorityColor[d.name as Priority]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={heading}>My active queue by SLA state</Typography>
          <Typography sx={sub}>The state is the one the server reports for each incident.</Typography>
          {queue.isLoading ? (
            <LoadingState />
          ) : queue.error ? (
            <ErrorState message={apiErrorMessage(queue.error)} onRetry={() => queue.refetch()} />
          ) : active.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>Nothing is assigned to you right now.</Typography>
          ) : (
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySla} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={tokens.outlineVariant} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: tokens.onSurfaceVariant, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: tokens.onSurfaceVariant, fontSize: 12 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                    {bySla.map((d) => (
                      <Cell key={d.state} fill={slaStateColor[d.state]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={heading}>SLA compliance</Typography>
          <Typography sx={sub}>Finished incidents assigned to me (last {done.length || 100}), counted from the server's SLA state.</Typography>
          {finished.isLoading ? (
            <LoadingState />
          ) : finished.error ? (
            <ErrorState message={apiErrorMessage(finished.error)} onRetry={() => finished.refetch()} />
          ) : compliance === null ? (
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No finished incident has an SLA result yet.</Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: compliance >= 90 ? slaStateColor.MET : compliance >= 70 ? slaStateColor.WARNING : slaStateColor.VIOLATED, fontFamily: 'Sora, sans-serif' }}>
                {compliance}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={compliance}
                sx={{ height: 6, borderRadius: 1, bgcolor: tokens.surfaceContainerHigh, '& .MuiLinearProgress-bar': { bgcolor: slaStateColor.MET } }}
              />
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 1 }}>
                {met} met, {violated} violated
              </Typography>
            </>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={heading}>Close to breach</Typography>
          <Typography sx={sub}>Breach probability for the incidents behind my next deadlines.</Typography>
          {uniqueDeadlines.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No upcoming deadlines.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {uniqueDeadlines.map((d, i) => {
                const r = risks[i];
                return (
                  <Box key={d.incidentId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => navigate(`/tech/incidents/${d.incidentId}`)}
                      sx={{ textTransform: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, p: 0, minWidth: 0 }}
                    >
                      {d.code}
                    </Button>
                    {r.isLoading ? (
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>…</Typography>
                    ) : r.error ? (
                      <Typography sx={{ fontSize: 12, color: slaStateColor.VIOLATED }} title={apiErrorMessage(r.error)}>
                        unavailable
                      </Typography>
                    ) : r.data ? (
                      <Chip
                        size="small"
                        label={`${r.data.level} ${Math.round(r.data.score * 100)}%`}
                        sx={{
                          height: 22,
                          fontSize: 12,
                          fontWeight: 700,
                          bgcolor: r.data.atRisk ? 'rgba(244, 63, 94, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                          color: r.data.atRisk ? slaStateColor.VIOLATED : slaStateColor.MET,
                        }}
                      />
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} lg={4}>
        <Paper elevation={0} sx={cardSx}>
          <Typography sx={heading}>My skills</Typography>
          {skills === null ? (
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
              Skills are listed for team leads and administrators. Ask your lead to see yours.
            </Typography>
          ) : skills.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No skills are recorded for you yet.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {skills.map((sk) => (
                <Box key={sk.skillId}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurface }}>{sk.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{sk.proficiency}/5</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (sk.proficiency / 5) * 100)}
                    sx={{ height: 4, borderRadius: 1, bgcolor: tokens.surfaceContainerHigh }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
