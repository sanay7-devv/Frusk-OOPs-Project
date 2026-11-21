import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { disableMfa, enableMfa, getMfaStatus, setupMfa, type MfaSetup } from '../../api/auth';
import { apiErrorMessage } from '../../utils/errors';

import { tokens } from '../../theme/theme';
import { alpha } from '@mui/material/styles';
import { QRCodeSVG } from 'qrcode.react';
const codeField = (e: unknown): string | null => {
  const fes = (e as any)?.response?.data?.fieldErrors as { field: string; message: string }[] | undefined;
  return fes?.find((f) => f.field === 'code')?.message ?? null;
};

export default function AccountSecurity() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['mfa-status'], queryFn: getMfaStatus });
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [copied, setCopied] = useState(false);

  const reset = () => { setCode(''); setCodeErr(''); setErr(''); };
  const done = (msg: string) => { setSetup(null); reset(); setInfo(msg); qc.invalidateQueries({ queryKey: ['mfa-status'] }); };
  const fail = (e: unknown) => {
    const fe = codeField(e);
    if (fe) setCodeErr(`Code ${fe}`); else setErr(apiErrorMessage(e));
  };

  const start = useMutation({ mutationFn: setupMfa, onMutate: () => { reset(); setInfo(''); }, onSuccess: setSetup, onError: (e) => { setSetup(null); fail(e); } });
  const enable = useMutation({ mutationFn: () => enableMfa(code), onMutate: reset, onSuccess: () => done('Two-step verification is on.'), onError: fail });
  const disable = useMutation({ mutationFn: () => disableMfa(code), onMutate: reset, onSuccess: () => done('Two-step verification is off.'), onError: fail });

  const enabled = status.data?.enabled;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  const codeInput = (
    <TextField
      label="6-digit code"
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      error={!!codeErr}
      helperText={codeErr || ' '}
      autoComplete="one-time-code"
      inputProps={{ inputMode: 'numeric', maxLength: 6 }}
      sx={{ width: 200 }}
    />
  );

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h5" component="h1" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: tokens.white, mb: 2 }}>
        Account security
      </Typography>
      <Paper elevation={0} sx={{ p: 3, bgcolor: alpha(tokens.paper, 0.85), border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <Typography sx={{ fontWeight: 600, color: tokens.white }}>Two-step verification</Typography>
          {status.isLoading ? <CircularProgress size={16} /> : status.data && (
            <Chip size="small" label={enabled ? 'On' : 'Off'} color={enabled ? 'success' : 'default'} />
          )}
        </Stack>
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13, mb: 2 }}>
          Ask for a code from an authenticator app when you sign in with your password.
        </Typography>

        {status.isError && <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(status.error)}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {status.data && !enabled && !setup && (
          <Button variant="contained" onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending ? 'Preparing...' : 'Set up two-step verification'}
          </Button>
        )}

        {setup && (
          <Stack spacing={2}>
            <Typography sx={{ color: tokens.onSurface, fontSize: 14 }}>
              Add this account to your authenticator app by scanning the QR code (or entering the key), then type the first code it shows.
            </Typography>
            <Box>
              <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, mb: 1 }}>Scan with your authenticator app</Typography>
              {/* White quiet zone so phone cameras read it on the dark theme. */}
              <Box sx={{ display: 'inline-block', p: 1.5, bgcolor: tokens.white, borderRadius: 1 }}>
                <QRCodeSVG value={setup.otpauthUri} size={176} level="M" role="img"
                  aria-label="QR code for your authenticator app" />
              </Box>
            </Box>
            <Box>
              <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12 }}>Secret key</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: tokens.secondaryLight, wordBreak: 'break-all' }}>
                  {setup.secret}
                </Typography>
                <Button size="small" onClick={() => copy(setup.secret)}>{copied ? 'Copied' : 'Copy'}</Button>
              </Stack>
            </Box>
            <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => copy(setup.otpauthUri)}>Copy setup link</Button>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              {codeInput}
              <Button variant="contained" sx={{ mt: 1 }} onClick={() => enable.mutate()} disabled={code.length !== 6 || enable.isPending}>
                Turn on
              </Button>
              <Button sx={{ mt: 1 }} onClick={() => { setSetup(null); reset(); }}>Cancel</Button>
            </Stack>
          </Stack>
        )}

        {enabled && (
          <Stack spacing={1}>
            <Typography sx={{ color: tokens.onSurface, fontSize: 14 }}>
              To turn it off, enter a fresh code from your authenticator app (not the one used to turn it on; wait for the next one).
            </Typography>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              {codeInput}
              <Button variant="outlined" color="error" sx={{ mt: 1 }} onClick={() => disable.mutate()} disabled={code.length !== 6 || disable.isPending}>
                Turn off
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
