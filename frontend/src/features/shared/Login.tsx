import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login, PREDEFINED_ACCOUNTS, PredefinedAccount } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
import logoIcon from '../../assets/logo.png';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof schema>;

export default function Login() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@iitsm.local',
      password: 'Admin@123',
    },
  });

  const { user, workspace, signIn } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('admin@iitsm.local');

  const onSubmit = handleSubmit(async (v) => {
    setErr('');
    try {
      const authResponse = await login(v.email, v.password);
      const ws = signIn(authResponse);
      navigate(ws ? HOME[ws] : '/', { replace: true });
    } catch (e: unknown) {
      setErr(errorMessage(e));
    }
  });

  const handleSelectPredefined = (acc: PredefinedAccount) => {
    setSelectedAccount(acc.email);
    setValue('email', acc.email, { shouldValidate: true });
    setValue('password', acc.password, { shouldValidate: true });
    setErr('');
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="85vh" px={2}>
      <Paper
        elevation={4}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 480,
          borderRadius: 3,
        }}
        component="form"
        onSubmit={onSubmit}
      >
        <Box textAlign="center" mb={2}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              bgcolor: '#0a192f',
              border: '1px solid rgba(0, 180, 216, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
              boxShadow: '0 4px 14px rgba(10, 25, 47, 0.18)',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={logoIcon}
              alt="IITSM Logo"
              sx={{ width: 56, height: 56, objectFit: 'contain' }}
            />
          </Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            I-ITSM Platform
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Intelligent IT Service Management System
          </Typography>
        </Box>

        {user && workspace && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate(HOME[workspace])}>
                Continue
              </Button>
            }
          >
            Currently signed in as <strong>{user.name}</strong> ({workspace})
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Database Offline Bypass:</strong> The backend database is currently disconnected.
          Use any pre-decided credential below to validate and bypass into the application.
        </Alert>

        <Box mb={2}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
            PRE-DECIDED DEMO ACCOUNTS (Click to quick-fill):
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
            {PREDEFINED_ACCOUNTS.map((acc) => (
              <Chip
                key={acc.email}
                label={acc.roleLabel}
                color={selectedAccount === acc.email ? 'primary' : 'default'}
                variant={selectedAccount === acc.email ? 'filled' : 'outlined'}
                onClick={() => handleSelectPredefined(acc)}
                clickable
                size="small"
                sx={{ mb: 0.5 }}
              />
            ))}
          </Stack>
          {selectedAccount && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 1 }}>
              {PREDEFINED_ACCOUNTS.find((a) => a.email === selectedAccount)?.description}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <TextField
          label="Email Address"
          fullWidth
          margin="normal"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          autoComplete="email"
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          autoComplete="current-password"
        />

        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 3, py: 1.2, fontWeight: 'bold' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Validating...' : 'Sign In & Validate'}
        </Button>

        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Pre-decided: <code>admin@iitsm.local</code> / <code>Admin@123</code>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
