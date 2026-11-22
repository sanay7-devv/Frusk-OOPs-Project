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
  Link,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { register as registerApi } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
import { passwordRule } from '../../utils/validation';
import logoIcon from '../../assets/logo.png';

import { tokens } from '../../theme/theme';
import { alpha } from '@mui/material/styles';
const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Max 100 characters'),
    email: z.string().email('Please enter a valid email address').max(150, 'Max 150 characters'),
    department: z.string().max(80, 'Max 80 characters').optional().or(z.literal('')),
    password: passwordRule.max(72, 'Max 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof schema>;

export default function Register() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
  });

  const { user, workspace, signIn } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Create account · ReSolv';
  }, []);

  useEffect(() => {
    if (user && workspace) {
      navigate(HOME[workspace], { replace: true });
    }
  }, [user, workspace, navigate]);

  const onSubmit = handleSubmit(async (v) => {
    setErr('');
    try {
      const authResponse = await registerApi({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        department: v.department?.trim() || undefined,
      });
      localStorage.setItem('workspace', 'employee');
      signIn(authResponse);
      navigate(HOME.employee, { replace: true });
    } catch (e: any) {
      const fes: { field: string; message: string }[] = e?.response?.data?.fieldErrors ?? [];
      for (const fe of fes) {
        if (fe.field === 'name' || fe.field === 'email' || fe.field === 'password' || fe.field === 'department') {
          setError(fe.field, { message: fe.message });
        }
      }
      setErr(errorMessage(e));
    }
  });

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
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: 480,
          borderRadius: '12px',
          bgcolor: tokens.paper,
          border: `1px solid ${tokens.outlineVariant}`,
          boxShadow: 'none',
        }}
      >
        <Box mb={3}>
          <Stack direction="row" alignItems="center" spacing={1.25} mb={2.5}>
            <Box component="img" src={logoIcon} alt="ReSolv brand mark" sx={{ width: 36, height: 36, objectFit: 'contain' }} />
            <Typography component="div" sx={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: tokens.white }}>
              ReSolv
            </Typography>
          </Stack>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 600,
              color: tokens.white,
              letterSpacing: 'normal',
              mb: 0.5,
            }}
          >
            Create account
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: tokens.onSurfaceVariant,
              fontFamily: 'Geist, sans-serif',
              fontSize: 13,
            }}
          >
            Raise it. Track it. Resolve it.
          </Typography>
        </Box>

        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full name"
              fullWidth
              placeholder="e.g. Alice Smith"
              InputLabelProps={{ shrink: true }}
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <TextField
              label="Email"
              fullWidth
              type="email"
              placeholder="alice@company.com"
              InputLabelProps={{ shrink: true }}
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              label="Department"
              fullWidth
              placeholder="e.g. Human Resources"
              InputLabelProps={{ shrink: true }}
              {...register('department')}
              error={!!errors.department}
              helperText={errors.department?.message}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              placeholder="••••••••"
              InputLabelProps={{ shrink: true }}
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message ?? '8 to 72 characters, with a letter and a number; not your name or email'}
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

            <TextField
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              placeholder="••••••••"
              InputLabelProps={{ shrink: true }}
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />

            {err && (
              <Alert
                severity="error"
                sx={{
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
                py: 1.5,
                fontWeight: 600,
                fontSize: 14,
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Register'}
            </Button>
          </Stack>
        </form>

        <Box mt={3} textAlign="center">
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13, fontFamily: 'Geist, sans-serif' }}>
            Already have an account?{' '}
            <Link
              component="button"
              type="button"
              sx={{
                fontWeight: 700,
                color: tokens.secondaryLight,
                textDecoration: 'none',
                fontFamily: 'Geist, sans-serif',
                fontSize: 13,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => navigate('/login')}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
