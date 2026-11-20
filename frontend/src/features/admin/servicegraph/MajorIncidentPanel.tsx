import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { getRootCause, listProblems, type CauseView, type ProblemView } from '../../../api/problems';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { tone } from '../palette';

/** Probable root cause and the services on its path, for the canvas to highlight. */
export interface CausePath { rootId: number | null; nodeIds: Set<number>; edgeKeys: Set<string> }
export const NO_PATH: CausePath = { rootId: null, nodeIds: new Set(), edgeKeys: new Set() };
/** Unordered key: the path lists services in walking order, the graph edge may point either way. */
export const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function pathOf(cause: CauseView | null | undefined): CausePath {
  if (!cause) return NO_PATH;
  const nodeIds = new Set<number>([cause.service.id]);
  const edgeKeys = new Set<string>();
  cause.paths.forEach((p) => {
    p.forEach((r, i) => {
      nodeIds.add(r.id);
      if (i > 0) edgeKeys.add(edgeKey(p[i - 1].id, r.id));
    });
  });
  return { rootId: cause.service.id, nodeIds, edgeKeys };
}

interface Props {
  problemId: number | null;
  onPick: (id: number | null) => void;
  onPath: (p: CausePath) => void;
  /** Service picked on the canvas: its open problem is chosen first. */
  selectedServiceId: number | null;
}

/**
 * Major Incident Mode on the graph: open problems with the join counter, a link to the problem page,
 * and the probable root cause drawn as a path on the canvas (GET /problems/{id}/root-cause).
 */
export default function MajorIncidentPanel({ problemId, onPick, onPath, selectedServiceId }: Props) {
  const problems = useQuery({ queryKey: ['problems', 'OPEN'], queryFn: () => listProblems('OPEN'), refetchInterval: 15000 });
  const open = problems.data ?? [];

  // Follow the service selected on the canvas, else keep the choice, else the first open problem.
  useEffect(() => {
    if (!problems.data) return;
    if (open.length === 0) { if (problemId !== null) onPick(null); return; }
    const onService = open.find((p) => p.service?.id === selectedServiceId);
    if (onService && onService.id !== problemId) onPick(onService.id);
    else if (problemId === null || !open.some((p) => p.id === problemId)) onPick(open[0].id);
  }, [problems.data, selectedServiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const active: ProblemView | undefined = open.find((p) => p.id === problemId);
  const cause = useQuery({
    queryKey: ['problem-root-cause', problemId],
    queryFn: () => getRootCause(problemId!),
    enabled: problemId !== null && !!active,
    refetchInterval: 15000,
  });
  const path = useMemo(() => pathOf(cause.data?.probable), [cause.data]);
  useEffect(() => { onPath(active ? path : NO_PATH); }, [path, active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (problems.isLoading) return <LoadingState />;
  if (problems.isError) return <ErrorState message={apiErrorMessage(problems.error)} onRetry={() => void problems.refetch()} />;
  if (open.length === 0) return null;

  const probable = cause.data?.probable;
  return (
    <Box sx={{ mb: 2, p: 2, borderRadius: '12px', border: `1px solid ${tone.danger}`, bgcolor: tokens.surfaceContainerLow }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, color: tone.danger }}>Major incident mode</Typography>
        <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant }}>
          {open.length} open problem{open.length === 1 ? '' : 's'}
        </Typography>
        {open.map((p) => (
          <Chip key={p.id} size="small" clickable label={`${p.title} (${p.joined} joined)`} onClick={() => onPick(p.id)}
            color={p.id === problemId ? 'error' : 'default'} variant={p.id === problemId ? 'filled' : 'outlined'} sx={{ fontSize: 12 }} />
        ))}
      </Stack>
      {active && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14 }}>
              <strong>{active.title}</strong>
              {active.service ? ` on ${active.service.name}` : ''}: {active.incidentCount} linked incidents,{' '}
              <strong>{active.joined}</strong> {active.joined === 1 ? 'person has' : 'people have'} joined the outage.
            </Typography>
            {cause.isLoading && <LoadingState />}
            {cause.isError && <ErrorState message={apiErrorMessage(cause.error)} onRetry={() => void cause.refetch()} />}
            {cause.data && (
              <>
                <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mt: 0.5 }}>{cause.data.explanation}</Typography>
                {probable ? (
                  <Typography sx={{ fontSize: 14, mt: 0.5 }}>
                    Probable root cause: <strong>{probable.service.name}</strong>
                    {probable.paths[0] ? `, path ${probable.paths[0].map((r) => r.name).join(' > ')}` : ''}. It is outlined on the graph.
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mt: 0.5 }}>No single probable cause could be named.</Typography>
                )}
              </>
            )}
          </Box>
          <Button component={Link} to={`/admin/problems/${active.id}`} variant="outlined" size="small"
            sx={{ alignSelf: 'flex-start', textTransform: 'none', flexShrink: 0 }}>
            Open the problem
          </Button>
        </Stack>
      )}
    </Box>
  );
}
