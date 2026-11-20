import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme/theme';
import { ToastProvider } from './components/Toast';
import AuditSealPanel from './features/admin/AuditSealPanel';
import AccountSecurity from './features/account/AccountSecurity';
import ProblemsList from './features/problems/ProblemsList';
import ForgotPassword from './features/shared/ForgotPassword';
import ResetPassword from './features/shared/ResetPassword';
import Reports from './features/admin/Reports';
import Tickets from './features/admin/Tickets';
import * as auditApi from './api/audit';
import * as authApi from './api/auth';
import * as problemsApi from './api/problems';
import * as reportsApi from './api/reports';
import * as servicesApi from './api/services';
import * as incidentsApi from './api/incidents';
import * as techniciansApi from './api/technicians';
import * as adminApi from './api/admin';

vi.mock('./features/admin/AuditChainVisual', () => ({ default: () => <div>Audit chain diagram</div> }));
vi.mock('./features/problems/problemAccess', () => ({
  useProblemAccess: () => ({ basePath: '/admin/problems', incidentPath: (id: number) => `/admin/tickets/${id}`, canManage: true, canUngroup: true }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithProviders(ui: React.ReactNode, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

describe('remaining Task 3 screens', () => {
  it('verifies the audit chain and displays the verification result', async () => {
    vi.spyOn(auditApi, 'verifyAudit').mockResolvedValue({
      intact: true, sealsChecked: 2, recordsChecked: 14, unsealedRecords: 3,
      lastSealId: 2, lastSealHash: '0123456789abcdef0123456789abcdef',
      problemCount: 0, firstProblem: null, problems: [],
    });

    renderWithProviders(<AuditSealPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify chain' }));

    expect(await screen.findByText(/Intact: 14 records, 2 seals checked/)).toBeTruthy();
    expect(screen.getByText(/3 newer records are not sealed yet/)).toBeTruthy();
  });

  it('requires a six-digit authenticator code before enabling two-step verification', async () => {
    vi.spyOn(authApi, 'getMfaStatus').mockResolvedValue({ enabled: false } as any);
    const setup = vi.spyOn(authApi, 'setupMfa').mockResolvedValue({ secret: 'ABCD', otpauthUri: 'otpauth://demo' } as any);
    const enable = vi.spyOn(authApi, 'enableMfa').mockResolvedValue(undefined as any);

    renderWithProviders(<AccountSecurity />);
    fireEvent.click(await screen.findByRole('button', { name: 'Set up two-step verification' }));
    await waitFor(() => expect(setup).toHaveBeenCalledOnce());
    const turnOn = await screen.findByRole('button', { name: 'Turn on' });
    expect(turnOn).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '12a34567' } });
    expect((screen.getByLabelText('6-digit code') as HTMLInputElement).value).toBe('123456');
    fireEvent.click(turnOn);
    await waitFor(() => expect(enable).toHaveBeenCalledOnce());
    expect(await screen.findByText('Two-step verification is on.')).toBeTruthy();
  });

  it('submits a trimmed email for a password reset link', async () => {
    const request = vi.spyOn(authApi, 'requestPasswordReset').mockResolvedValue(undefined as any);
    renderWithProviders(<ForgotPassword />);

    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: '  person@example.test  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('If that address has an account, we have sent a link.')).toBeTruthy();
    expect(request).toHaveBeenCalledWith('person@example.test');
  });

  it('submits a matching new password using the reset token', async () => {
    const confirm = vi.spyOn(authApi, 'confirmPasswordReset').mockResolvedValue(undefined as any);
    renderWithProviders(<ResetPassword />, '/reset-password?token=reset-token-123');

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'CampusPass9' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'CampusPass9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Your password has been changed. Sign in with your new password.')).toBeTruthy();
    expect(confirm).toHaveBeenCalledWith('reset-token-123', 'CampusPass9');
  });

  it('shows major-incident problem rows and switches to the resolved tab', async () => {
    const list = vi.spyOn(problemsApi, 'listProblems').mockImplementation(async (status) => status === 'RESOLVED'
      ? [{ id: 2, title: 'Resolved outage', service: null, status: 'RESOLVED', createdAt: '2026-11-20T10:00:00Z', lead: null, incidentCount: 2, joined: 0, incidents: [] }]
      : [{ id: 1, title: 'Campus network outage', service: { id: 3, name: 'Network' }, status: 'OPEN', createdAt: '2026-11-20T10:00:00Z', lead: { major: true, code: 'INC-1' } as any, incidentCount: 4, joined: 2, incidents: [] }]);
    vi.spyOn(problemsApi, 'getRecurringProblems').mockResolvedValue([]);

    renderWithProviders(<ProblemsList />);
    expect(await screen.findByText('Campus network outage')).toBeTruthy();
    expect(screen.getByText('Major incident')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Resolved' }));
    expect(await screen.findByText('Resolved outage')).toBeTruthy();
    expect(list).toHaveBeenCalledWith('RESOLVED');
  });

  it('marks an invalid report date range and prevents export', async () => {
    const download = vi.spyOn(reportsApi, 'downloadReport').mockResolvedValue(undefined);
    vi.spyOn(reportsApi, 'getOverview').mockResolvedValue({} as any);
    vi.spyOn(reportsApi, 'getTrends').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getSlaCompliance').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getPriorityDistribution').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getCategoryDistribution').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getServiceReport').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getWorkloadReport').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getCoverageRisk').mockResolvedValue({ items: [], flaggedCount: 0, windowDays: 30, minHolders: 2 } as any);
    vi.spyOn(servicesApi, 'getCategories').mockResolvedValue([]);
    vi.spyOn(incidentsApi, 'getSlaViolations').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 10 } as any);

    renderWithProviders(<Reports />);
    const from = screen.getByLabelText('From');
    const to = screen.getByLabelText('To');
    fireEvent.change(from, { target: { value: '2026-11-20' } });
    fireEvent.change(to, { target: { value: '2026-11-01' } });
    expect(await screen.findByText('Pick a start date that is not after the end date')).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Download CSV' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Download PDF' })).toHaveProperty('disabled', true);
    expect(download).not.toHaveBeenCalled();
  });

  it('downloads both report formats for the selected range', async () => {
    const download = vi.spyOn(reportsApi, 'downloadReport').mockResolvedValue(undefined);
    vi.spyOn(reportsApi, 'getOverview').mockResolvedValue({} as any);
    vi.spyOn(reportsApi, 'getTrends').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getSlaCompliance').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getPriorityDistribution').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getCategoryDistribution').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getServiceReport').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getWorkloadReport').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getCoverageRisk').mockResolvedValue({ items: [], flaggedCount: 0, windowDays: 30, minHolders: 2 } as any);
    vi.spyOn(servicesApi, 'getCategories').mockResolvedValue([]);
    vi.spyOn(incidentsApi, 'getSlaViolations').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 10 } as any);

    renderWithProviders(<Reports />);
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith('incidents', 'csv', expect.objectContaining({ from: expect.any(String), to: expect.any(String) })));
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith('incidents', 'pdf', expect.objectContaining({ from: expect.any(String), to: expect.any(String) })));
  });

  it('clears incident-list filters while preserving the selected tab', async () => {
    vi.spyOn(incidentsApi, 'listIncidents').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 } as any);
    vi.spyOn(servicesApi, 'getServices').mockResolvedValue([]);
    vi.spyOn(servicesApi, 'getCategories').mockResolvedValue([]);
    vi.spyOn(techniciansApi, 'listTechnicians').mockResolvedValue([]);
    vi.spyOn(adminApi, 'getAdminUsers').mockResolvedValue([]);

    renderWithProviders(<><Tickets /><LocationProbe /></>, '/admin/tickets?tab=all&priority=P1&status=ACTIVE');
    fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByTestId('location-search').textContent).toBe('?tab=all'));
  });
});
