import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tokens } from '../../../theme/theme';
import { getAdminServices, replaceAdminServiceDependencies } from '../../../api/admin';
import type { GraphNode } from '../../../api/services';
import { apiErrorMessage } from '../../../utils/errors';
import { useToast } from '../../../components/Toast';
import { ErrorState, LoadingState } from '../../../components/StateViews';

interface Props {
  service: GraphNode | null;
  candidates: GraphNode[];
  onClose: () => void;
}

/** Replaces the direct dependencies of one service (PUT /admin/services/{id}/dependencies). */
export default function DependenciesDialog({ service, candidates, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const admin = useQuery({ queryKey: ['admin-services-deps'], queryFn: getAdminServices, enabled: !!service });
  const current = admin.data?.find((s) => s.id === service?.id);
  const original = current?.dependencyIds ?? [];

  useEffect(() => {
    setPicked(new Set(original));
    setError(null);
  }, [service?.id, admin.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => {
      // Dependencies on switched-off services are not listed here; keep them.
      const shown = new Set(candidates.map((c) => c.id));
      const keep = original.filter((id) => !shown.has(id));
      return replaceAdminServiceDependencies(service!.id, [...picked, ...keep]);
    },
    onSuccess: () => {
      toast('Dependencies updated', 'success');
      qc.invalidateQueries({ queryKey: ['service-graph'] });
      qc.invalidateQueries({ queryKey: ['service-health'] });
      qc.invalidateQueries({ queryKey: ['service-impact'] });
      qc.invalidateQueries({ queryKey: ['admin-services-deps'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const toggle = (id: number) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Dialog
      open={!!service}
      onClose={() => !save.isPending && onClose()}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ color: tokens.onSurface, fontWeight: 700 }}>Dependencies of {service?.name}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mb: 1.5 }}>
          Tick the services that {service?.name} directly depends on. The server rejects a dependency loop.
        </Typography>
        {admin.isLoading && <LoadingState />}
        {admin.isError && <ErrorState message={apiErrorMessage(admin.error)} onRetry={() => admin.refetch()} />}
        {admin.data && (
          <FormGroup>
            {candidates
              .filter((c) => c.id !== service?.id)
              .map((c) => (
                <FormControlLabel
                  key={c.id}
                  control={<Checkbox checked={picked.has(c.id)} onChange={() => toggle(c.id)} disabled={save.isPending} />}
                  label={c.name}
                  sx={{ color: tokens.onSurface }}
                />
              ))}
          </FormGroup>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!admin.data || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save dependencies'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
