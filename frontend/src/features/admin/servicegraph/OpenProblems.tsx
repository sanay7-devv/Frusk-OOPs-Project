import { Button, Divider, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listProblems } from '../../../api/problems';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';

/** Open problem records (Major Incident Mode) on one service: linked incidents, people who joined, and the root-cause page. */
export default function OpenProblems({ serviceId }: { serviceId: number }) {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['problems', 'OPEN'], queryFn: () => listProblems('OPEN'), refetchInterval: 15000 });
  const mine = (q.data ?? []).filter((p) => p.service?.id === serviceId);
  return (
    <>
      <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
        Open problems
      </Typography>
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={apiErrorMessage(q.error)} onRetry={() => void q.refetch()} />}
      {q.data && mine.length === 0 && (
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mt: 0.75 }}>No open problem on this service.</Typography>
      )}
      <Stack spacing={0.5} sx={{ mt: 0.75 }}>
        {mine.map((p) => (
          <Button key={p.id} size="small" onClick={() => navigate(`/admin/problems/${p.id}`)}
            sx={{ justifyContent: 'space-between', textTransform: 'none', fontSize: 14, textAlign: 'left' }}>
            <span>{p.title}</span>
            <span style={{ color: tokens.onSurfaceVariant }}>{p.incidentCount} incidents, {p.joined} joined</span>
          </Button>
        ))}
      </Stack>
    </>
  );
}
