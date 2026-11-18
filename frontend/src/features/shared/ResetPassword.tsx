import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Link, Stack, TextField } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../../api/auth';
import { apiErrorMessage } from '../../utils/errors';
import { passwordRule } from '../../utils/validation';
import AuthCard from './AuthCard';

const schema = z
  .object({
    newPassword: passwordRule.max(72, 'Max 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });
type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [tokenBad, setTokenBad] = useState(!token);
  const [err, setErr] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setErr('');
    try {
      await confirmPasswordReset(token, v.newPassword);
      setDone(true);
    } catch (e: any) {
      const fes: { field: string; message: string }[] = e?.response?.data?.fieldErrors ?? [];
      if (fes.some((f) => f.field === 'token')) {
        setTokenBad(true);
        return;
      }
      const pw = fes.find((f) => f.field === 'newPassword');
      if (pw) {
        setError('newPassword', { message: pw.message });
        return;
      }
      setErr(apiErrorMessage(e));
    }
  });

  if (done) {
    return (
      <AuthCard title="Password changed">
        <Stack spacing={2}>
          <Alert severity="success">Your password has been changed. Sign in with your new password.</Alert>
          <Button component={RouterLink} to="/login" variant="contained">
            Go to sign in
          </Button>
        </Stack>
      </AuthCard>
    );
  }

  if (tokenBad) {
    return (
      <AuthCard title="Reset link problem">
        <Stack spacing={2}>
          <Alert severity="error">This reset link is invalid or has expired.</Alert>
          <Link component={RouterLink} to="/forgot-password" sx={{ color: '#4cd7f6', textAlign: 'center' }}>
            Ask for a new link
          </Link>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="At least 8 characters, with a letter and a number.">
      <form onSubmit={onSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="New password"
            type="password"
            fullWidth
            autoComplete="new-password"
            {...register('newPassword')}
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
          />
          <TextField
            label="Confirm new password"
            type="password"
            fullWidth
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          {err && <Alert severity="error">{err}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Change password'}
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
