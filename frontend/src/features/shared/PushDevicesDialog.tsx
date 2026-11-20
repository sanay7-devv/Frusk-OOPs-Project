import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, DeleteOutline as DeleteIcon, PhoneAndroid as PhoneIcon } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { deleteDevice, listDevices, registerDevice, type DeviceView } from '../../api/notifications';
import { tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';

import { alpha } from '@mui/material/styles';
const PLATFORMS = ['WEB', 'ANDROID', 'IOS'] as const;
const MIN_TOKEN = 8; // RegisterDeviceRequest: @Size(min = 8, max = 255)
const MAX_TOKEN = 255;

function when(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function PushDevicesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('WEB');
  const [token, setToken] = useState('');
  const [removing, setRemoving] = useState<DeviceView | null>(null);

  const devices = useQuery({ queryKey: ['notification-devices'], queryFn: listDevices, enabled: open });

  const register = useMutation({
    mutationFn: () => registerDevice({ platform, token: token.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-devices'] });
      setToken('');
      toast('Device registered for push notifications.', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-devices'] });
      toast('Device removed. It will no longer receive push notifications.', 'success');
      setRemoving(null);
    },
    onError: (e) => {
      toast(apiErrorMessage(e), 'error');
      setRemoving(null);
    },
  });

  const trimmed = token.trim();
  const tokenError = trimmed.length > 0 && trimmed.length < MIN_TOKEN ? `At least ${MIN_TOKEN} characters.` : '';
  const canRegister = trimmed.length >= MIN_TOKEN && trimmed.length <= MAX_TOKEN && !register.isPending;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component="span" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 18 }}>
            Push devices
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ color: tokens.onSurfaceVariant }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
            Simulated mobile push: register a device token and the push channel delivers to it. The server keeps only the last six
            characters of each token.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
            <TextField
              select
              size="small"
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
              sx={{ minWidth: 130 }}
            >
              {PLATFORMS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Device token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              error={!!tokenError}
              helperText={tokenError || `${MIN_TOKEN} to ${MAX_TOKEN} characters.`}
              inputProps={{ maxLength: MAX_TOKEN }}
              fullWidth
            />
            <Button
              variant="contained"
              disabled={!canRegister}
              onClick={() => register.mutate()}
              sx={{ textTransform: 'none', fontWeight: 700, alignSelf: { sm: 'flex-start' }, minWidth: 96, height: 40 }}
            >
              {register.isPending ? 'Registering...' : 'Register'}
            </Button>
          </Stack>

          {devices.isLoading ? (
            <LoadingState />
          ) : devices.isError ? (
            <ErrorState onRetry={() => devices.refetch()} message={apiErrorMessage(devices.error)} />
          ) : !devices.data || devices.data.length === 0 ? (
            <EmptyState message="No devices registered. Push notifications go nowhere until you add one." />
          ) : (
            <Stack spacing={1}>
              {devices.data.map((d) => (
                <Box
                  key={d.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.2,
                    borderRadius: '10px',
                    bgcolor: alpha(tokens.white, 0.03),
                    border: `1px solid ${tokens.outlineVariant}`,
                  }}
                >
                  <PhoneIcon sx={{ color: tokens.secondaryLight }} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                      {d.platform} · token ...{d.tokenHint}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                      Added {when(d.createdAt)} · last seen {when(d.lastSeenAt)}
                    </Typography>
                  </Box>
                  <IconButton aria-label={`Remove ${d.platform} device`} onClick={() => setRemoving(d)} sx={{ color: tokens.tertiaryLight }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        title="Remove this device?"
        description={removing ? `${removing.platform} device ...${removing.tokenHint} will stop receiving push notifications.` : undefined}
        confirmLabel="Remove"
        confirmColor="error"
        isLoading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
