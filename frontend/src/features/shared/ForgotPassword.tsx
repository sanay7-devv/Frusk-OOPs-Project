import { useState } from 'react';
import { Alert, Button, Link, Stack, TextField } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { requestPasswordReset } from '../../api/auth';
import { apiErrorMessage } from '../../utils/errors';
import AuthCard from './AuthCard';

import { tokens } from '../../theme/theme';
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setErr(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we will send you a reset link.">
      {sent ? (
        <Stack spacing={2}>
          <Alert severity="success">If that address has an account, we have sent a link.</Alert>
          <Link component={RouterLink} to="/login" sx={{ color: tokens.secondaryLight, textAlign: 'center' }}>
            Back to sign in
          </Link>
        </Stack>
      ) : (
        <form onSubmit={submit} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {err && <Alert severity="error">{err}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={busy || !email.trim()}>
              {busy ? 'Sending...' : 'Send reset link'}
            </Button>
            <Link component={RouterLink} to="/login" sx={{ color: tokens.secondaryLight, textAlign: 'center', fontSize: 13 }}>
              Back to sign in
            </Link>
          </Stack>
        </form>
      )}
    </AuthCard>
  );
}
