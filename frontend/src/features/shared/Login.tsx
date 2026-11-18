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
  Stack,
  Divider,
  Collapse,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { login, googleLogin } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
import { Link as RouterLink } from 'react-router-dom';
import logoIcon from '../../assets/logo.png';

declare global {
  interface Window {
    google?: any;
  }
}

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof schema>;

const SEED_CREDENTIALS = [
  { role: 'Administrator', email: 'asha.rao@iitsm.demo', pass: 'Demo@1234', desc: 'Full system clearance (Admin, Tech & Employee)' },
  { role: 'Team Lead', email: 'priya.nair@iitsm.demo', pass: 'Demo@1234', desc: 'Level 1 Escalation & Team Queue triage' },
  { role: 'Technician', email: 'tech1@iitsm.demo', pass: 'Demo@1234', desc: 'Level 0 Workbench & incident resolution' },
  { role: 'Employee', email: 'employee1@iitsm.demo', pass: 'Demo@1234', desc: 'End-user ticketing & incident reporting' },
];

export default function Login() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { user, workspace, signIn } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Two-step login: set once the server answers 401 MFA_REQUIRED.
  const [needCode, setNeedCode] = useState(false);
  const [totp, setTotp] = useState('');
  const [codeErr, setCodeErr] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasGoogleAuth = Boolean(clientId && !clientId.includes('your-google-client-id'));

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (user && workspace) {
      navigate(HOME[workspace], { replace: true });
    }
  }, [user, workspace, navigate]);

  // Initialize Google Identity Services (GIS) button if available
  useEffect(() => {
    if (hasGoogleAuth && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              await executeGoogleLogin(response.credential);
            }
          },
        });
        const container = document.getElementById('google-btn-container');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: 380,
            text: 'signin_with',
          });
        }
      } catch (e) {
        console.warn('Google Identity Services init error:', e);
      }
    }
  }, [hasGoogleAuth, clientId]);

  const executeGoogleLogin = async (idToken: string) => {
    setErr('');
    try {
      const authResponse = await googleLogin(idToken);
      // Route the user to their actual registered role's workspace
      const ws = signIn(authResponse);
      navigate(ws ? HOME[ws] : '/', { replace: true });
    } catch (e: unknown) {
      setErr(errorMessage(e));
    }
  };

  const onSubmit = handleSubmit(async (v) => {
    setErr('');
    setCodeErr('');
    try {
      const authResponse = await login(v.email, v.password, needCode ? totp.trim() : undefined);
      const ws = signIn(authResponse);
      navigate(ws ? HOME[ws] : '/', { replace: true });
    } catch (e: unknown) {
      const code = (e as any)?.response?.data?.code;
      if (code === 'MFA_REQUIRED') {
        setNeedCode(true);
      } else if (code === 'INVALID_MFA_CODE' && needCode) {
        setCodeErr(errorMessage(e));
      } else {
        setErr(errorMessage(e));
      }
    }
  });

  const handleQuickFill = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setErr('');
    setNeedCode(false);
    setTotp('');
    setCodeErr('');
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      px={2}
      py={4}
      sx={{
        bgcolor: '#090d16',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          bgcolor: 'rgba(99, 102, 241, 0.1)',
          filter: 'blur(130px)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          bgcolor: 'rgba(6, 182, 212, 0.08)',
          filter: 'blur(130px)',
          pointerEvents: 'none',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4.5 },
          width: '100%',
          maxWidth: 480,
          borderRadius: '16px',
          bgcolor: 'rgba(20, 24, 36, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 24px rgba(99, 102, 241, 0.12)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header with Logo */}
        <Box textAlign="center" mb={3.5}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '14px',
              bgcolor: '#141824',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={logoIcon}
              alt="IITSM Logo"
              sx={{ width: 48, height: 48, objectFit: 'contain' }}
            />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              mb: 0.5,
            }}
          >
            IITSM Platform
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              fontFamily: 'Geist, sans-serif',
              fontSize: 13,
            }}
          >
            Enterprise Incident &amp; Service Command System
          </Typography>
        </Box>

        {user && workspace && (
          <Alert
            severity="success"
            sx={{
              mb: 2.5,
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#6ee7b7',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontFamily: 'Geist, sans-serif',
              fontSize: 13,
            }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate(HOME[workspace])}
                sx={{ fontWeight: 600 }}
              >
                Continue
              </Button>
            }
          >
            Currently signed in as <strong>{user.name}</strong> ({workspace})
          </Alert>
        )}

        {/* Credentials Form */}
        <form onSubmit={onSubmit}>
          <TextField
            label="Email Address"
            fullWidth
            margin="normal"
            placeholder="e.g. admin@iitsm.com"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            placeholder="••••••••"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#94a3b8' }}
                  >
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {needCode && (
            <TextField
              label="Authenticator code"
              fullWidth
              margin="normal"
              autoFocus
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={!!codeErr}
              helperText={codeErr || 'Enter the 6-digit code from your authenticator app.'}
              autoComplete="one-time-code"
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            />
          )}

          <Box mt={1} textAlign="right">
            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{ fontSize: 12.5, color: '#4cd7f6', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Forgot password?
            </Link>
          </Box>

          {err && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                bgcolor: 'rgba(244, 63, 94, 0.12)',
                color: '#ffdad6',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                fontSize: 13,
              }}
            >
              {err}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{
              mt: 3,
              py: 1.3,
              fontWeight: 700,
              fontSize: 14,
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)',
                boxShadow: '0 0 28px rgba(6, 182, 212, 0.55)',
              },
            }}
            disabled={isSubmitting || (needCode && totp.length !== 6)}
          >
            {isSubmitting ? 'Authenticating...' : needCode ? 'Verify and sign in' : 'Sign In'}
          </Button>
        </form>

        {/* Google OAuth 2.0 Sign-In */}
        {hasGoogleAuth && (
          <>
            <Divider sx={{ my: 2.5, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                OR SIGN IN WITH
              </Typography>
            </Divider>

            <Box id="google-btn-container" sx={{ display: 'flex', justifyContent: 'center' }} />
          </>
        )}

        {/* Database Seed Accounts Reference Toggle */}
        <Box mt={3} textAlign="center">
          <Link
            component="button"
            variant="caption"
            onClick={() => setShowSeed(!showSeed)}
            sx={{
              textDecoration: 'none',
              color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              '&:hover': { color: '#4cd7f6' },
            }}
          >
            {showSeed ? '▲ Hide Database Credentials' : '▼ View Default Database Credentials'}
          </Link>
          <Collapse in={showSeed}>
            <Paper
              elevation={0}
              sx={{
                mt: 1.5,
                p: 1.8,
                textAlign: 'left',
                bgcolor: 'rgba(10, 14, 23, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#4cd7f6',
                  mb: 1.2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                PostgreSQL Seed Accounts (Click to auto-fill):
              </Typography>
              <Stack spacing={0.8}>
                {SEED_CREDENTIALS.map((c) => (
                  <Box
                    key={c.email}
                    onClick={() => handleQuickFill(c.email, c.pass)}
                    sx={{
                      p: 0.8,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'all 0.15s',
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.12)',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                      },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#dfe2ef' }}>
                        {c.role}:
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11.5,
                          color: '#c0c1ff',
                          fontWeight: 500,
                        }}
                      >
                        {c.email}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{
                        fontFamily: 'Geist, sans-serif',
                        color: '#94a3b8',
                        fontSize: 11,
                        mt: 0.2,
                      }}
                    >
                      Password: <code style={{ color: '#4cd7f6' }}>{c.pass}</code> • {c.desc}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Collapse>
        </Box>

        {/* Register Link */}
        <Box mt={2.5} textAlign="center">
          <Typography sx={{ color: '#94a3b8', fontSize: 12.5, fontFamily: 'Geist, sans-serif' }}>
            Don't have an enterprise account?{' '}
            <Link
              component="button"
              sx={{
                fontWeight: 700,
                color: '#4cd7f6',
                textDecoration: 'none',
                fontFamily: 'Geist, sans-serif',
                fontSize: 12.5,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => navigate('/register')}
            >
              Register as Employee
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
