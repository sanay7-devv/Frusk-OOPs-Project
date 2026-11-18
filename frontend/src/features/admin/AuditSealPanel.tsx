import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { FactCheck as VerifyIcon, Lock as SealIcon } from '@mui/icons-material';
import { sealAudit, verifyAudit, type SealView, type VerifyView } from '../../api/audit';
import { apiErrorMessage } from '../../utils/errors';

const shortHash = (h?: string | null) => (h ? `${h.slice(0, 12)}…${h.slice(-6)}` : '—');
const mono = { fontFamily: 'JetBrains Mono, monospace', fontSize: 12 } as const;

export default function AuditSealPanel() {
  const qc = useQueryClient();
  const [verify, setVerify] = useState<VerifyView | null>(null);
  const [sealed, setSealed] = useState<SealView | 'none' | null>(null);

  const verifyMut = useMutation({ mutationFn: verifyAudit, onSuccess: (v) => setVerify(v) });
  const sealMut = useMutation({
    mutationFn: sealAudit,
    onSuccess: (s) => {
      setSealed(s ?? 'none');
      setVerify(null); // previous result is out of date once a new seal exists
      qc.invalidateQueries({ queryKey: ['audit-log'] });
    },
  });
  const busy = verifyMut.isPending || sealMut.isPending;
  const hasResult = verify || sealed || verifyMut.isError || sealMut.isError;

  return (
    <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: 16 }}>Tamper check</Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            Sealing locks the records written so far into a signed block. Verifying re-checks every record and block.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => { setSealed(null); sealMut.reset(); verifyMut.mutate(); }}
            startIcon={verifyMut.isPending ? <CircularProgress size={16} /> : <VerifyIcon />}
          >
            Verify chain
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => { verifyMut.reset(); setVerify(null); sealMut.mutate(); }}
            startIcon={sealMut.isPending ? <CircularProgress size={16} color="inherit" /> : <SealIcon />}
          >
            Seal now
          </Button>
        </Stack>
      </Stack>

      {hasResult && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {verifyMut.isError && <Alert severity="error">{apiErrorMessage(verifyMut.error)}</Alert>}
          {sealMut.isError && <Alert severity="error">{apiErrorMessage(sealMut.error)}</Alert>}

          {verify?.intact && (
            <Alert severity="success">
              Intact: {verify.recordsChecked} records, {verify.sealsChecked} seals checked.
              {verify.unsealedRecords > 0 && ` ${verify.unsealedRecords} newer records are not sealed yet.`}
            </Alert>
          )}
          {verify && !verify.intact && (
            <Alert severity="error">
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                {verify.firstProblem?.message ?? 'The audit chain failed verification.'}
              </Typography>
              <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                {verify.problemCount} problem{verify.problemCount === 1 ? '' : 's'} found
                ({verify.recordsChecked} records, {verify.sealsChecked} seals checked).
              </Typography>
              {verify.problems?.length > 0 && (
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, fontSize: 13 }}>
                  {verify.problems.map((p, i) => (
                    <li key={i}>
                      {p.recordId != null && <>Record {p.recordId}</>}
                      {p.recordId != null && p.sealId != null && ', '}
                      {p.sealId != null && <>seal {p.sealId}</>}
                      {(p.recordId != null || p.sealId != null) && ': '}
                      {p.message}
                    </li>
                  ))}
                </Box>
              )}
            </Alert>
          )}
          {verify && (
            <Typography sx={{ ...mono, color: 'text.secondary' }}>
              Last seal: {verify.lastSealId != null ? `#${verify.lastSealId}` : 'none yet'}
              {verify.lastSealHash && <> · hash {shortHash(verify.lastSealHash)}</>}
            </Typography>
          )}

          {sealed === 'none' && <Alert severity="info">Nothing new to seal.</Alert>}
          {sealed && sealed !== 'none' && (
            <Alert severity="success">
              Sealed block #{sealed.id}: records {sealed.fromId} to {sealed.toId} ({sealed.recordCount} records).
              <Box component="span" sx={{ ...mono, display: 'block', mt: 0.5 }} title={sealed.hash}>
                hash {shortHash(sealed.hash)}
              </Box>
            </Alert>
          )}
        </Stack>
      )}
    </Paper>
  );
}
