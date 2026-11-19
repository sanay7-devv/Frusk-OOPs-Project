import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleSignOutAndReset = () => {
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('workspace');
    sessionStorage.clear();
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="#090d16"
          p={3}
          sx={{
            backgroundImage:
              'radial-gradient(circle at 50% 30%, rgba(244, 63, 94, 0.08) 0%, transparent 60%)',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              borderRadius: '16px',
              textAlign: 'center',
              bgcolor: '#141824',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(244, 63, 94, 0.15)',
            }}
          >
            <Typography variant="h5" sx={{ fontFamily: 'Sora, sans-serif', color: '#ffb4ab', fontWeight: 700, mb: 1 }}>
              Application Exception Intercepted
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
              A runtime rendering fault occurred. State snapshot logged for diagnostics.
            </Typography>

            <Alert
              severity="error"
              sx={{
                textAlign: 'left',
                mb: 3,
                wordBreak: 'break-word',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                bgcolor: 'rgba(244, 63, 94, 0.1)',
                color: '#ffdad6',
                border: '1px solid rgba(244, 63, 94, 0.25)',
              }}
            >
              <strong>Error:</strong> {this.state.error?.message || 'Unknown runtime error'}
            </Alert>

            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={this.handleReload}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#dfe2ef',
                  '&:hover': { borderColor: '#6366f1', color: '#c0c1ff' },
                }}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#4cd7f6',
                  '&:hover': { borderColor: '#4cd7f6', color: '#ffffff' },
                }}
              >
                Try Again
              </Button>
              <Button
                variant="contained"
                onClick={this.handleSignOutAndReset}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
                }}
              >
                Return to Login
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

