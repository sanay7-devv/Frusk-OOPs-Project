import { Alert, Button, Skeleton, Stack, Typography, Box } from '@mui/material';
import { ErrorOutline as ErrorOutlineIcon, Inbox as InboxIcon } from '@mui/icons-material';
import type { ReactNode } from 'react';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
export const LoadingState = () => (
  <Stack spacing={1.5} sx={{ py: 2 }}>
    <Skeleton
      variant="rounded"
      height={56}
      sx={{ bgcolor: tokens.hover, borderRadius: '10px' }}
    />
    <Skeleton
      variant="rounded"
      height={56}
      sx={{ bgcolor: tokens.hover, borderRadius: '10px' }}
    />
    <Skeleton
      variant="rounded"
      height={56}
      sx={{ bgcolor: tokens.hover, borderRadius: '10px' }}
    />
  </Stack>
);

export const EmptyState = ({ message, action, compact = false }: { message: string; action?: ReactNode; compact?: boolean }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    spacing={compact ? 1 : 2}
    sx={{
      py: compact ? 2.5 : 8,
      px: compact ? 2 : 3,
      borderRadius: '12px',
      border: `1px dashed ${alpha(tokens.white, 0.1)}`,
      bgcolor: alpha(tokens.surfaceContainerLow, 0.4),
      textAlign: 'center',
    }}
  >
    <Box
      sx={{
        width: compact ? 32 : 48,
        height: compact ? 32 : 48,
        borderRadius: '50%',
        bgcolor: tokens.hover,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tokens.textDisabled,
      }}
    >
      <InboxIcon sx={{ fontSize: compact ? 18 : 24 }} />
    </Box>
    <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, fontFamily: 'Geist, sans-serif' }}>
      {message}
    </Typography>
    {action}
  </Stack>
);

export const ErrorState = ({ onRetry, message }: { onRetry: () => void; message?: string }) => (
  <Alert
    severity="error"
    icon={<ErrorOutlineIcon sx={{ color: tokens.danger }} />}
    action={
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        onClick={onRetry}
        sx={{
          borderColor: alpha(tokens.danger, 0.4),
          color: tokens.tertiaryLight,
          fontSize: 12,
          '&:hover': { bgcolor: alpha(tokens.danger, 0.15) },
        }}
      >
        Retry
      </Button>
    }
    sx={{
      bgcolor: alpha(tokens.danger, 0.12),
      color: tokens.errorPale,
      border: `1px solid ${alpha(tokens.danger, 0.3)}`,
      borderRadius: '10px',
      fontFamily: 'Geist, sans-serif',
      fontSize: 13,
      my: 2,
    }}
  >
    {message || 'Something went wrong while loading data from the server.'}
  </Alert>
);
