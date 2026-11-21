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
  Chip,
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
import { tokens } from '../../theme/theme';
import logoIcon from '../../assets/logo.png';

import { alpha } from '@mui/material/styles';
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

/** Demo-only seed account panel: shown in `npm run dev`, or in a build made with VITE_SHOW_DEMO_ACCOUNTS=true (the recorded demo). */
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

export default function Login() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const currentEmail = watch('email');

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

  useEffect(() => {
    document.title = 'Sign In · IITSM';
  }, []);

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
            theme: 'filled_black',
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
    setValue('email', email, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('password', pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
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
        bgcolor: tokens.background,
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
          bgcolor: alpha(tokens.primary, 0.1),
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
          bgcolor: alpha(tokens.secondary, 0.08),
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
          bgcolor: alpha(tokens.paper, 0.85),
          backdropFilter: 'blur(24px)',
          border: `1px solid ${tokens.outlineVariant}`,
          boxShadow: `0 24px 64px ${alpha(tokens.black, 0.7)}, 0 0 24px ${alpha(tokens.primary, 0.12)}`,
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
              bgcolor: tokens.surfaceContainer,
              border: `1px solid ${alpha(tokens.primary, 0.4)}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
              boxShadow: `0 0 20px ${alpha(tokens.primary, 0.3)}`,
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
            variant="h5" component="h1"
            sx={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 700,
              color: tokens.white,
              letterSpacing: '-0.02em',
              mb: 0.5,
            }}
          >
            IITSM Enterprise
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: tokens.onSurfaceVariant,
              fontFamily: 'Geist, sans-serif',
              fontSize: 13,
            }}
          >
            Incident &amp; Service Command Centre
          </Typography>
        </Box>

        {user && workspace && (
          <Alert
            severity="success"
            sx={{
              mb: 2.5,
              bgcolor: alpha(tokens.success, 0.12),
              color: tokens.successLight,
              border: `1px solid ${alpha(tokens.success, 0.3)}`,
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
            placeholder="e.g. employee1@iitsm.demo"
            InputLabelProps={{ shrink: true }}
            {...register('email', {
              onChange: () => {
                setNeedCode(false);
                setTotp('');
                setCodeErr('');
              },
            })}
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
            InputLabelProps={{ shrink: true }}
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="Toggle password visibility"
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: tokens.onSurfaceVariant }}
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
              InputLabelProps={{ shrink: true }}
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
              sx={{ fontSize: 12.5, color: tokens.secondaryLight, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Forgot password?
            </Link>
          </Box>

          {err && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                bgcolor: alpha(tokens.danger, 0.12),
                color: tokens.errorPale,
                border: `1px solid ${alpha(tokens.danger, 0.3)}`,
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
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              boxShadow: `0 0 20px ${alpha(tokens.primary, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.primaryStrong} 0%, ${tokens.secondaryStrong} 100%)`,
                boxShadow: `0 0 28px ${alpha(tokens.secondary, 0.55)}`,
              },
            }}
            disabled={isSubmitting || (needCode && totp.length !== 6)}
          >
            {isSubmitting ? 'Authenticating...' : needCode ? 'Verify and sign in' : 'Sign in'}
          </Button>
        </form>

        {/* Google OAuth 2.0 Sign-In */}
        {hasGoogleAuth && (
          <>
            <Divider sx={{ my: 2.5, borderColor: tokens.outlineVariant }}>
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: tokens.outline,
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

        {/* Database Seed Accounts Reference Toggle (Demo/Development Only) */}
        {SHOW_DEMO_ACCOUNTS && (
          <Box mt={3} textAlign="center">
            <Link
              component="button"
              type="button"
              aria-label="View Default Database Credentials"
              variant="caption"
              onClick={() => setShowSeed(!showSeed)}
              sx={{
                textDecoration: 'none',
                color: tokens.onSurfaceVariant,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                fontWeight: 600,
                '&:hover': { color: tokens.secondaryLight },
              }}
            >
              {showSeed ? '▲ Hide demo accounts' : '▼ Show demo accounts'}
            </Link>
            <Collapse in={showSeed}>
              <Paper
                elevation={0}
                sx={{
                  mt: 1.5,
                  p: 1.8,
                  textAlign: 'left',
                  bgcolor: alpha(tokens.surfaceDim, 0.9),
                  border: `1px solid ${tokens.outlineVariant}`,
                  borderRadius: '10px',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: tokens.secondaryLight,
                    mb: 1.2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Demo Accounts (Click to auto-fill):
                </Typography>
                <Stack spacing={0.8}>
                  {SEED_CREDENTIALS.map((c) => {
                    const isSelected = currentEmail === c.email;
                    return (
                      <Box
                        key={c.email}
                        onClick={() => handleQuickFill(c.email, c.pass)}
                        sx={{
                          p: 1,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          bgcolor: isSelected ? alpha(tokens.primary, 0.16) : alpha(tokens.white, 0.02),
                          border: `1px solid ${isSelected ? tokens.primary : tokens.hover}`,
                          boxShadow: isSelected ? `0 0 10px ${alpha(tokens.primary, 0.25)}` : 'none',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: isSelected ? alpha(tokens.primary, 0.22) : alpha(tokens.primary, 0.1),
                            borderColor: alpha(tokens.primary, 0.4),
                          },
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: isSelected ? tokens.primaryLight : tokens.onSurface }}>
                              {c.role}:
                            </Typography>
                            {isSelected && (
                              <Chip
                                label="Active"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  bgcolor: alpha(tokens.primary, 0.2),
                                  color: tokens.primaryLight,
                                  border: `1px solid ${alpha(tokens.primary, 0.35)}`,
                                }}
                              />
                            )}
                          </Stack>
                          <Typography
                            sx={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 12,
                              color: isSelected ? tokens.white : tokens.primaryLight,
                              fontWeight: 500,
                            }}
                          >
                            {c.email}
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            fontFamily: 'Geist, sans-serif',
                            color: tokens.onSurfaceVariant,
                            fontSize: 12,
                            mt: 0.2,
                          }}
                        >
                          Password: <code style={{ color: tokens.secondaryLight }}>{c.pass}</code> • {c.desc}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Collapse>
          </Box>
        )}

        {/* Register Link */}
        <Box mt={2.5} textAlign="center">
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12.5, fontFamily: 'Geist, sans-serif' }}>
            Don't have an account?{' '}
            <Link
              component="button"
              sx={{
                fontWeight: 700,
                color: tokens.secondaryLight,
                textDecoration: 'none',
                fontFamily: 'Geist, sans-serif',
                fontSize: 12.5,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => navigate('/register')}
            >
              Register as employee
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
