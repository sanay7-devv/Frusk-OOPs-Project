import { Alert, Button, Skeleton, Stack, Typography, Box } from '@mui/material';
import { ErrorOutline as ErrorOutlineIcon, Inbox as InboxIcon } from '@mui/icons-material';
import type { ReactNode } from 'react';

export const LoadingState = () => (
  <Stack spacing={1.5} sx={{ py: 2 }}>
    <Skeleton
      variant="rounded"
      height={56}
      sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px' }}
    />
    <Skeleton
      variant="rounded"
      height={56}
      sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px' }}
    />
    <Skeleton
      variant="rounded"
      height={56}
      sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px' }}
    />
  </Stack>
);

export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    spacing={2}
    sx={{
      py: 8,
      px: 3,
      borderRadius: '12px',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      bgcolor: 'rgba(18, 22, 34, 0.4)',
      textAlign: 'center',
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        bgcolor: 'rgba(255, 255, 255, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
      }}
    >
      <InboxIcon sx={{ fontSize: 24 }} />
    </Box>
    <Typography sx={{ color: '#94a3b8', fontSize: 14, fontFamily: 'Geist, sans-serif' }}>
      {message}
    </Typography>
    {action}
  </Stack>
);

export const ErrorState = ({ onRetry, message }: { onRetry: () => void; message?: string }) => (
  <Alert
    severity="error"
    icon={<ErrorOutlineIcon sx={{ color: '#f43f5e' }} />}
    action={
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        onClick={onRetry}
        sx={{
          borderColor: 'rgba(244, 63, 94, 0.4)',
          color: '#ffb0cd',
          fontSize: 12,
          '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.15)' },
        }}
      >
        Retry
      </Button>
    }
    sx={{
      bgcolor: 'rgba(244, 63, 94, 0.12)',
      color: '#ffdad6',
      border: '1px solid rgba(244, 63, 94, 0.3)',
      borderRadius: '10px',
      fontFamily: 'Geist, sans-serif',
      fontSize: 13,
      my: 2,
    }}
  >
    {message || 'Something went wrong while loading data from the server.'}
  </Alert>
);
