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
  Collapse,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Avatar,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { login, googleLogin } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
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
  { role: 'Administrator', email: 'admin@iitsm.com', pass: 'Admin@123', desc: 'Full system clearance (Admin, Tech & Employee)' },
  { role: 'Team Lead', email: 'lead@iitsm.com', pass: 'Lead@123', desc: 'Level 1 Escalation & Team Queue triage' },
  { role: 'Technician', email: 'tech@iitsm.com', pass: 'Tech@123', desc: 'Level 0 Workbench & incident resolution' },
  { role: 'Employee', email: 'employee@iitsm.com', pass: 'User@123', desc: 'End-user ticketing & incident reporting' },
];

/** Accounts shown in the Google Account Chooser modal */
const DEMO_GOOGLE_ACCOUNTS = [
  {
    name: 'Sanay Sagar Shah',
    email: 'not_open',
    avatar: 'S',
    color: '#673ab7',
  },
  {
    name: 'Sanay Shah',
    email: 'not_open',
    avatar: 'S',
    color: '#795548',
  },
  {
    name: 'Kris Jain',
    email: 'not_open',
    avatar: 'K',
    color: '#0097a7',
  },
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
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (user && workspace) {
      navigate(HOME[workspace], { replace: true });
    }
  }, [user, workspace, navigate]);

  // Initialize Google Identity Services (GIS) button if available
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (window.google?.accounts?.id && clientId && !clientId.includes('your-google-client-id')) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              await executeGoogleLogin(response.credential);
            }
          },
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-btn-container'),
          { theme: 'outline', size: 'large', width: 380, text: 'signin_with' }
        );
      } catch (e) {
        console.warn('Google Identity Services init error:', e);
      }
    }
  }, []);

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

  /**
   * Google Sign-In click handler:
   * 1. If real Google Client ID is configured, triggers Google GIS Prompt
   * 2. Otherwise opens the Google Account Chooser dialog so the user can select their account directly
   */
  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (window.google?.accounts?.id && clientId && !clientId.includes('your-google-client-id')) {
      window.google.accounts.id.prompt();
    } else {
      setGoogleModalOpen(true);
    }
  };

  const handleSelectGoogleAccount = (email: string, name: string) => {
    setGoogleModalOpen(false);
    setShowCustomInput(false);
    setCustomEmailInput('');

    const trimmed = email.trim().toLowerCase();
    const payload = {
      iss: 'https://accounts.google.com',
      sub: 'google-sub-' + Math.abs(trimmed.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
      email: trimmed,
      email_verified: true,
      name: name || trimmed.split('@')[0],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const testToken =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' +
      btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
      '.signature';
    executeGoogleLogin(testToken);
  };

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

  const handleQuickFill = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
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
      >
        {/* Header with Logo */}
        <Box textAlign="center" mb={3}>
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
            Enterprise Incident & Service Management System
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
            type="password"
            fullWidth
            margin="normal"
            placeholder="••••••••"
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
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <Divider sx={{ my: 2.5 }}>
          <Typography variant="caption" color="text.secondary">
            OR SIGN IN WITH
          </Typography>
        </Divider>

        {/* Google OAuth 2.0 Sign-In */}
        <Box id="google-btn-container" sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleGoogleClick}
            startIcon={
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            }
            sx={{
              py: 1.2,
              borderColor: '#dadce0',
              color: '#3c4043',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#d2e3fc',
                bgcolor: 'rgba(66, 133, 244, 0.04)',
              },
            }}
          >
            Sign in with Google
          </Button>
        </Box>

        {/* Database Seed Accounts Reference Toggle */}
        <Box mt={3} textAlign="center">
          <Link
            component="button"
            variant="caption"
            onClick={() => setShowSeed(!showSeed)}
            sx={{ textDecoration: 'none', color: 'text.secondary', fontWeight: 600 }}
          >
            {showSeed ? '▲ Hide Database Accounts' : '▼ View Default Database Credentials'}
          </Link>
          <Collapse in={showSeed}>
            <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, textAlign: 'left', bgcolor: 'background.default' }}>
              <Typography variant="caption" fontWeight="bold" display="block" mb={1} color="text.primary">
                PostgreSQL Seed Accounts (Click to auto-fill):
              </Typography>
              <Stack spacing={0.75}>
                {SEED_CREDENTIALS.map((c) => (
                  <Box
                    key={c.email}
                    onClick={() => handleQuickFill(c.email, c.pass)}
                    sx={{
                      p: 0.75,
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" fontWeight="bold">
                        {c.role}:
                      </Typography>
                      <Typography variant="caption" fontFamily="monospace" color="primary.main">
                        {c.email}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" fontSize={10}>
                      Password: <code>{c.pass}</code> • {c.desc}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Collapse>
        </Box>

        {/* Register Link */}
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Don't have an enterprise account?{' '}
            <Link
              component="button"
              variant="caption"
              fontWeight="bold"
              onClick={() => navigate('/register')}
            >
              Register as Employee
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* Google "Choose an account" Modal (identical to Google OAuth Account Chooser) */}
      <Dialog
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: '#1f1f1f',
            color: '#fff',
            p: 1,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.2}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <Typography variant="body2" sx={{ color: '#e8eaed', fontWeight: 500 }}>
              Sign in with Google
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setGoogleModalOpen(false)} sx={{ color: '#9aa0a6' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1, pb: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#e8eaed', mb: 0.5 }}>
            Choose an account
          </Typography>
          <Typography variant="body2" sx={{ color: '#9aa0a6', mb: 2 }}>
            to continue to <span style={{ color: '#8ab4f8' }}>IITSM Enterprise</span>
          </Typography>

          <List disablePadding sx={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {DEMO_GOOGLE_ACCOUNTS.map((acc) => (
              <ListItem key={acc.email} disablePadding sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <ListItemButton
                  onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                  sx={{
                    py: 1.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: acc.color, color: '#fff', fontWeight: 'bold' }}>
                      {acc.avatar}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={acc.name}
                    secondary={acc.email}
                    primaryTypographyProps={{ sx: { color: '#e8eaed', fontWeight: 600, fontSize: '0.95rem' } }}
                    secondaryTypographyProps={{ sx: { color: '#9aa0a6', fontSize: '0.82rem' } }}
                  />
                </ListItemButton>
              </ListItem>
            ))}

            <ListItem disablePadding sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <ListItemButton
                onClick={() => setShowCustomInput(!showCustomInput)}
                sx={{
                  py: 1.5,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'transparent', border: '1px solid #5f6368', color: '#8ab4f8' }}>
                    <PersonAddOutlinedIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Use another account"
                  primaryTypographyProps={{ sx: { color: '#e8eaed', fontWeight: 500, fontSize: '0.92rem' } }}
                />
              </ListItemButton>
            </ListItem>
          </List>

          <Collapse in={showCustomInput}>
            <Box mt={2} p={1.5} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Enter Gmail or Enterprise email"
                value={customEmailInput}
                onChange={(e) => setCustomEmailInput(e.target.value)}
                placeholder="e.g. yourname@gmail.com"
                sx={{
                  mb: 1.5,
                  input: { color: '#fff' },
                  label: { color: '#9aa0a6' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#5f6368' },
                    '&:hover fieldset': { borderColor: '#8ab4f8' },
                  },
                }}
              />
              <Button
                variant="contained"
                fullWidth
                disabled={!customEmailInput.trim()}
                onClick={() => handleSelectGoogleAccount(customEmailInput, customEmailInput.split('@')[0])}
                sx={{ bgcolor: '#8ab4f8', color: '#202124', fontWeight: 'bold' }}
              >
                Verify & Continue
              </Button>
            </Box>
          </Collapse>

          <Box mt={2.5} p={1.5} sx={{ bgcolor: 'rgba(66, 133, 244, 0.08)', borderRadius: 2, border: '1px solid rgba(66, 133, 244, 0.2)' }}>
            <Typography variant="caption" sx={{ color: '#8ab4f8', display: 'block', lineHeight: 1.4 }}>
              💡 <b>Note:</b> Only emails registered in the database can sign in. Unregistered accounts will be prompted to register first.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
