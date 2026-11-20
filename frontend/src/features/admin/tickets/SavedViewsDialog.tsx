import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { createSavedFilter, deleteSavedFilter, listSavedFilters } from '../../../api/incidents';
import type { SavedFilterView } from '../../../api/types';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { reportFailure, failureMessage } from '../adminErrors';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The filters currently applied, as saved with a new view. */
  current: Record<string, string>;
  onApply: (filter: Record<string, unknown>) => void;
}

/** Saved views: GET/POST /saved-filters and DELETE /saved-filters/{id} (the server allows 20 per user). */
export default function SavedViewsDialog({ open, onClose, current, onApply }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [toDelete, setToDelete] = useState<SavedFilterView | null>(null);
  const views = useQuery({ queryKey: ['saved-filters'], queryFn: listSavedFilters, enabled: open });

  const save = useMutation({
    mutationFn: () => createSavedFilter({ name: name.trim(), filter: current }),
    onSuccess: () => {
      toast('View saved.', 'success');
      setName('');
      qc.invalidateQueries({ queryKey: ['saved-filters'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteSavedFilter(id),
    onSuccess: () => {
      toast('View deleted.', 'success');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['saved-filters'] });
    },
    onError: (e) => {
      setToDelete(null);
      reportFailure(toast, e);
    },
  });

  const hasFilters = Object.keys(current).length > 0;
  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' } }}>
        <DialogTitle>Saved views</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {save.isError && <Alert severity="error">{failureMessage(save.error)}</Alert>}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField size="small" fullWidth label="Name for the current filters" value={name} disabled={save.isPending || !hasFilters}
                onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 60 }}
                helperText={hasFilters ? 'Saves every filter that is set now' : 'Set at least one filter first'} />
              <Button variant="contained" disabled={!name.trim() || !hasFilters || save.isPending} onClick={() => save.mutate()}
                startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                Save view
              </Button>
            </Stack>
            {views.isLoading && <LoadingState />}
            {views.isError && <ErrorState onRetry={() => views.refetch()} message={apiErrorMessage(views.error)} />}
            {views.data && views.data.length === 0 && <EmptyState message="No saved views yet." />}
            {views.data && views.data.length > 0 && (
              <List disablePadding>
                {views.data.map((v) => (
                  <ListItem key={v.id} disablePadding
                    secondaryAction={<IconButton edge="end" aria-label={`Delete ${v.name}`} onClick={() => setToDelete(v)}><DeleteIcon /></IconButton>}>
                    <ListItemButton onClick={() => { onApply(v.filter); onClose(); }}>
                      <ListItemText primary={v.name}
                        secondary={<Box component="span" sx={{ fontSize: 12 }}>{Object.entries(v.filter).map(([k, val]) => `${k}: ${String(val)}`).join(', ') || 'No filters'}</Box>} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Click a view to apply it. You can keep up to 20.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!toDelete} title="Delete this view?" description={toDelete ? `"${toDelete.name}" will be removed.` : undefined}
        confirmLabel="Delete" confirmColor="error" isLoading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
