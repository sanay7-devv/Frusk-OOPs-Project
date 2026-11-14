import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme/theme';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-route">{location.pathname}</output>;
}

function renderApp(initialPath = '/login') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={qc}>
          <ToastProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <LocationProbe />
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

afterEach(cleanup);

describe('Auth and Navigation Flow', () => {
  it('Admin login routes to Admin Dashboard', async () => {
    localStorage.clear();
    renderApp('/login');
    
    // Quick-select Admin chip
    const adminChip = screen.getByRole('button', { name: /^Administrator$/i });
    fireEvent.click(adminChip);

    const submitBtn = screen.getByRole('button', { name: /Sign In & Validate/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/admin/dashboard');
    });
  });

  it('Team Lead login routes to Team Lead Queue', async () => {
    localStorage.clear();
    renderApp('/login');

    const leadChip = screen.getByRole('button', { name: /Team Lead/i });
    fireEvent.click(leadChip);

    const submitBtn = screen.getByRole('button', { name: /Sign In & Validate/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/lead/team-queue');
    });
  });

  it('Employee login routes to Employee Home', async () => {
    localStorage.clear();
    renderApp('/login');

    const empChip = screen.getByRole('button', { name: /Employee/i });
    fireEvent.click(empChip);

    const submitBtn = screen.getByRole('button', { name: /Sign In & Validate/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/employee/home');
    });
  });
});

