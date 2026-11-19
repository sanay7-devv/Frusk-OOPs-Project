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

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { count: 0, items: [], content: [] } });
  vi.spyOn(api, 'post').mockImplementation(async (url, body: any) => {
    if (url === '/auth/login') {
      const email = body?.email;
      if (email === 'asha.rao@iitsm.demo') {
        return {
          data: {
            accessToken: 'token-admin',
            refreshToken: 'refresh-admin',
            expiresInSeconds: 900,
            user: {
              id: 1,
              name: 'Asha Rao',
              email: 'asha.rao@iitsm.demo',
              roles: ['ADMINISTRATOR', 'EMPLOYEE'],
              permissions: ['ALL'],
              technician: null,
              administrator: { scope: 'SYSTEM_ADMIN' },
            },
          },
        };
      }
      if (email === 'priya.nair@iitsm.demo') {
        return {
          data: {
            accessToken: 'token-lead',
            refreshToken: 'refresh-lead',
            expiresInSeconds: 900,
            user: {
              id: 2,
              name: 'Priya Nair',
              email: 'priya.nair@iitsm.demo',
              roles: ['TECHNICIAN', 'EMPLOYEE'],
              permissions: [],
              technician: { escalationLevel: 1, availability: 'AVAILABLE' },
              administrator: null,
            },
          },
        };
      }
      if (email === 'employee1@iitsm.demo') {
        return {
          data: {
            accessToken: 'token-employee',
            refreshToken: 'refresh-employee',
            expiresInSeconds: 900,
            user: {
              id: 3,
              name: 'Employee 1',
              email: 'employee1@iitsm.demo',
              roles: ['EMPLOYEE'],
              permissions: [],
              technician: null,
              administrator: null,
            },
          },
        };
      }
    }
    return { data: {} };
  });
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
  it('Rejects empty and malformed credentials before calling the API', async () => {
    localStorage.clear();
    renderApp('/login');

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
    expect(await screen.findByText('Please enter a valid email address')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'bad-address' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
    expect(await screen.findByText('Please enter a valid email address')).toBeTruthy();
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url === '/auth/login')).toHaveLength(0);
  });

  it('Admin login routes to Admin Dashboard', async () => {
    localStorage.clear();
    renderApp('/login');

    signInWithSeedAccount('asha.rao@iitsm.demo');

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/admin/dashboard');
    });
  });

  it('Team Lead login routes to Team Lead Queue', async () => {
    localStorage.clear();
    renderApp('/login');

    signInWithSeedAccount('priya.nair@iitsm.demo');

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/lead/team-queue');
    });
  });

  it('Employee login routes to Employee Home', async () => {
    localStorage.clear();
    renderApp('/login');

    signInWithSeedAccount('employee1@iitsm.demo');

    await waitFor(() => {
      expect(screen.getByTestId('current-route').textContent).toBe('/employee/home');
    });
  });
});

