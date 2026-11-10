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
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="#f5f5f5"
          p={3}
        >
          <Paper
            elevation={4}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" color="error" gutterBottom fontWeight="bold">
              Application Error
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              A runtime rendering error occurred in the application.
            </Typography>

            <Alert severity="error" sx={{ textAlign: 'left', mb: 3, wordBreak: 'break-word' }}>
              <strong>Error:</strong> {this.state.error?.message || 'Unknown runtime error'}
            </Alert>

            <Box display="flex" gap={2} justifyContent="center">
              <Button variant="outlined" color="primary" onClick={this.handleReload}>
                Reload Page
              </Button>
              <Button variant="contained" color="error" onClick={this.handleReset}>
                Reset Session &amp; Return to Login
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

