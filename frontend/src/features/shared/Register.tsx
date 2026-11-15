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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { register as registerApi } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
import logoIcon from '../../assets/studio-mark.svg';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    department: z.string().min(1, 'Department is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
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
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
  });

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');

  const onSubmit = handleSubmit(async (v) => {
    setErr('');
    try {
      const authResponse = await registerApi({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        department: v.department.trim(),
      });
      localStorage.setItem('workspace', 'employee');
      signIn(authResponse);
      navigate(HOME.employee, { replace: true });
    } catch (e: unknown) {
      setErr(errorMessage(e));
    }
  });

  return (
    <Box className="studio-register" display="flex" justifyContent="center" alignItems="center" minHeight="100svh" px={2}>
      <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 480, borderRadius: 3 }}>
        <Box textAlign="center" mb={3}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: '#0a192f',
              border: '1px solid rgba(0, 180, 216, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
              overflow: 'hidden',
            }}
          >
            <Box component="img" src={logoIcon} alt="IITSM Logo" sx={{ width: 48, height: 48, objectFit: 'contain' }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Your next chapter.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Self-register for employee incident reporting & IT catalog services
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
              label="Password (min 8 chars)"
              type="password"
              fullWidth
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />

            {err && <Alert severity="error">{err}</Alert>}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ py: 1.2, fontWeight: 'bold' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Register'}
            </Button>
          </Stack>
        </form>

        <Box mt={3} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component="button" variant="body2" fontWeight="bold" onClick={() => navigate('/login')}>
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

