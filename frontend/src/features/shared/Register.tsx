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
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { register as registerApi } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
import { passwordRule } from '../../utils/validation';
import logoIcon from '../../assets/logo.png';

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
      if (e?.response?.data?.fieldErrors) {
        for (const [field, msg] of Object.entries(e.response.data.fieldErrors)) {
          if (field === 'name' || field === 'email' || field === 'password' || field === 'department') {
            setError(field as any, { message: String(msg) });
          }
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
        <Box textAlign="center" mb={3.5}>
          <Box
            sx={{
              width: 58,
              height: 58,
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
            <Box component="img" src={logoIcon} alt="IITSM Logo" sx={{ width: 46, height: 46, objectFit: 'contain' }} />
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
            Create Enterprise Account
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              fontFamily: 'Geist, sans-serif',
              fontSize: 13,
            }}
          >
            Self-register for employee incident reporting &amp; IT catalog services
          </Typography>
        </Box>

        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              fullWidth
              placeholder="e.g. Alice Smith"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <TextField
              label="Enterprise Email"
              fullWidth
              type="email"
              placeholder="alice@company.com"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              label="Department"
              fullWidth
              placeholder="e.g. Human Resources"
              {...register('department')}
              error={!!errors.department}
              helperText={errors.department?.message}
            />

            <TextField
              label="Password (min 8 chars, letter + number)"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
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

            <TextField
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />

            {err && (
              <Alert
                severity="error"
                sx={{
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Register'}
            </Button>
          </Stack>
        </form>

        <Box mt={3} textAlign="center">
          <Typography sx={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Geist, sans-serif' }}>
            Already have an account?{' '}
            <Link
              component="button"
              sx={{
                fontWeight: 700,
                color: '#4cd7f6',
                textDecoration: 'none',
                fontFamily: 'Geist, sans-serif',
                fontSize: 13,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
