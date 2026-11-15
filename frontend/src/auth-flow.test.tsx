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

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); vi.spyOn(api, 'post').mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Auth and Navigation Flow', () => {
  it('Admin login routes to Admin Dashboard', async () => {
    localStorage.clear();
    renderApp('/login');
    fireEvent.click(screen.getByText('Demo workspaces'));
    
    // Quick-select Admin chip
    const adminChip = screen.getByRole('button', { name: /^Administrator$/i });
    fireEvent.click(adminChip);

    const submitBtn = screen.getByRole('button', { name: /Sign in to your workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/admin/dashboard');
    }, { timeout: 10_000 });
  }, 15_000);

  it('Team Lead login routes to Team Lead Queue', async () => {
    localStorage.clear();
    renderApp('/login');
    fireEvent.click(screen.getByText('Demo workspaces'));

    const leadChip = screen.getByRole('button', { name: /Team Lead/i });
    fireEvent.click(leadChip);

    const submitBtn = screen.getByRole('button', { name: /Sign in to your workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/lead/team-queue');
    }, { timeout: 10_000 });
  }, 15_000);

  it('Employee login routes to Employee Home', async () => {
    localStorage.clear();
    renderApp('/login');
    fireEvent.click(screen.getByText('Demo workspaces'));

    const empChip = screen.getByRole('button', { name: /Employee/i });
    fireEvent.click(empChip);

    const submitBtn = screen.getByRole('button', { name: /Sign in to your workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/employee/home');
    }, { timeout: 10_000 });
  }, 15_000);
});

