import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
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
import { api } from './api/client';

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

// No backend in these tests: every API call fails like an unreachable server, so the offline accounts answer at once
// (without this the result would depend on whatever listens on port 8080 of the machine running the tests).
beforeEach(() => {
  vi.spyOn(api, 'post').mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Opens the seed-account list, fills the form from the row with this email and signs in. */
function signInWithSeedAccount(email: string) {
  fireEvent.click(screen.getByRole('button', { name: /View Default Database Credentials/i }));
  fireEvent.click(screen.getByText(email));
  fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
}

describe('Auth and Navigation Flow', () => {
  it('Admin login routes to Admin Dashboard', async () => {
    localStorage.clear();
    renderApp('/login');

    signInWithSeedAccount('admin@iitsm.com');

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/admin/dashboard');
    });
  });

  it('Team Lead login routes to Team Lead Queue', async () => {
    localStorage.clear();
    renderApp('/login');

    signInWithSeedAccount('lead@iitsm.com');

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/lead/team-queue');
    });
  });

  it('Employee login routes to Employee Home', async () => {
    localStorage.clear();
    renderApp('/login');

    signInWithSeedAccount('employee@iitsm.com');

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/employee/home');
    });
  });
});

