import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
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
          bgcolor={tokens.background}
          p={3}
          sx={{
            backgroundImage:
              `radial-gradient(circle at 50% 30%, ${alpha(tokens.danger, 0.08)} 0%, transparent 60%)`,
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
              bgcolor: tokens.paper,
              border: `1px solid ${alpha(tokens.danger, 0.3)}`,
              boxShadow: `0 16px 48px ${alpha(tokens.black, 0.6)}, 0 0 24px ${alpha(tokens.danger, 0.15)}`,
            }}
          >
            <Typography variant="h5" sx={{ fontFamily: 'Sora, sans-serif', color: tokens.errorLight, fontWeight: 700, mb: 1 }}>
              Application Exception Intercepted
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 3 }}>
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
                bgcolor: alpha(tokens.danger, 0.1),
                color: tokens.errorPale,
                border: `1px solid ${alpha(tokens.danger, 0.25)}`,
              }}
            >
              <strong>Error:</strong> {this.state.error?.message || 'Unknown runtime error'}
            </Alert>

            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={this.handleReload}
                sx={{
                  borderColor: alpha(tokens.white, 0.15),
                  color: tokens.onSurface,
                  '&:hover': { borderColor: tokens.primary, color: tokens.primaryLight },
                }}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                sx={{
                  borderColor: alpha(tokens.white, 0.15),
                  color: tokens.secondaryLight,
                  '&:hover': { borderColor: tokens.secondaryLight, color: tokens.white },
                }}
              >
                Try Again
              </Button>
              <Button
                variant="contained"
                onClick={this.handleSignOutAndReset}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                  color: tokens.white,
                  fontWeight: 600,
                  boxShadow: `0 0 16px ${alpha(tokens.primary, 0.35)}`,
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

