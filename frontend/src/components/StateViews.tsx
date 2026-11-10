import { Alert, Button, Skeleton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
export const LoadingState = () => <Stack spacing={1}><Skeleton height={48} /><Skeleton height={48} /><Skeleton height={48} /></Stack>;
export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) =>
  <Stack alignItems="center" spacing={2} py={6}><Typography color="text.secondary">{message}</Typography>{action}</Stack>;
export const ErrorState = ({ onRetry }: { onRetry: () => void }) =>
  <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Retry</Button>}>Something went wrong on our side.</Alert>;
