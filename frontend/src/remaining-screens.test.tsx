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
import { CoverageRiskCard, SlaViolationsCard } from './features/admin/reports/Tables';
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
vi.mock('./features/admin/reports/Charts', async () => {
  const { createElement } = await import('react');
  const button = (name: string, onClick?: () => void) => createElement('button', { type: 'button', onClick }, name);
  return {
    formatMinutes: (minutes: number) => `${minutes} min`,
    TrendChart: () => null,
    SlaChart: ({ onBarClick }: { onBarClick?: (label: string) => void }) => button('Open Network SLA group', () => onBarClick?.('Network')),
    PriorityDonut: ({ onSliceClick }: { onSliceClick?: (label: string) => void }) => button('Open P1 priority', () => onSliceClick?.('P1')),
    CategoryBars: ({ onBarClick }: { onBarClick?: (label: string) => void }) => button('Open Network category', () => onBarClick?.('Network')),
    ServiceBars: ({ onBarClick }: { onBarClick?: (row: { serviceId: number; name: string; count: number }) => void }) =>
      button('Open Network service', () => onBarClick?.({ serviceId: 3, name: 'Network', count: 2 })),
    WorkloadChart: ({ onBarClick }: { onBarClick?: (row: { technicianId: number; name: string }) => void }) =>
      button('Open Riya workload', () => onBarClick?.({ technicianId: 9, name: 'Riya' })),
  };
});
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

  it('shows a useful error when audit verification fails', async () => {
    vi.spyOn(auditApi, 'verifyAudit').mockRejectedValue({ response: { data: { code: 'SERVICE_UNAVAILABLE' } } });

    renderWithProviders(<AuditSealPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify chain' }));

    expect(await screen.findByText('The service is temporarily unavailable. Try again in a moment.')).toBeTruthy();
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
    expect(enable).toHaveBeenCalledWith('123456');
    expect(await screen.findByText('Two-step verification is on.')).toBeTruthy();
  });

  it('turns off two-step verification after submitting a fresh code', async () => {
    vi.spyOn(authApi, 'getMfaStatus').mockResolvedValue({ enabled: true } as any);
    const disable = vi.spyOn(authApi, 'disableMfa').mockResolvedValue(undefined as any);

    renderWithProviders(<AccountSecurity />);
    fireEvent.change(await screen.findByLabelText('6-digit code'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));

    expect(await screen.findByText('Two-step verification is off.')).toBeTruthy();
    expect(disable).toHaveBeenCalledWith('654321');
  });

  it('shows the field error returned when an authenticator code is rejected', async () => {
    vi.spyOn(authApi, 'getMfaStatus').mockResolvedValue({ enabled: true } as any);
    vi.spyOn(authApi, 'disableMfa').mockRejectedValue({
      response: { data: { message: 'Validation failed', fieldErrors: [{ field: 'code', message: 'is invalid' }] } },
    });

    renderWithProviders(<AccountSecurity />);
    fireEvent.change(await screen.findByLabelText('6-digit code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));

    expect(await screen.findByText('Code is invalid')).toBeTruthy();
    expect(authApi.disableMfa).toHaveBeenCalledWith('123456');
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

  it('opens the filtered incident drawer when a priority chart slice is selected', async () => {
    vi.spyOn(reportsApi, 'getOverview').mockResolvedValue({ total: 4, open: 2, critical: 1, resolved: 2, slaViolations: 1, avgResolutionMinutes: 25, avgSatisfaction: 4 } as any);
    vi.spyOn(reportsApi, 'getTrends').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getSlaCompliance').mockResolvedValue([{ label: 'Network', met: 5, violated: 1 }] as any);
    vi.spyOn(reportsApi, 'getPriorityDistribution').mockResolvedValue([{ label: 'P1', count: 2 }] as any);
    vi.spyOn(reportsApi, 'getCategoryDistribution').mockResolvedValue([{ label: 'Network', count: 2 }] as any);
    vi.spyOn(reportsApi, 'getServiceReport').mockResolvedValue([{ serviceId: 3, name: 'Network', count: 2 }] as any);
    vi.spyOn(reportsApi, 'getWorkloadReport').mockResolvedValue([{ technicianId: 9, name: 'Riya', load: 1, maxLoad: 5, avgResolutionMinutes: 25 }] as any);
    vi.spyOn(reportsApi, 'getCoverageRisk').mockResolvedValue({ items: [], flaggedCount: 0, windowDays: 30, minHolders: 2 } as any);
    vi.spyOn(servicesApi, 'getCategories').mockResolvedValue([{ id: 7, name: 'Network' }] as any);
    const list = vi.spyOn(incidentsApi, 'listIncidents').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 15 } as any);
    vi.spyOn(incidentsApi, 'getSlaViolations').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 10 } as any);

    renderWithProviders(<Reports />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open P1 priority' }));

    expect(await screen.findByText('P1 incidents in this period')).toBeTruthy();
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ priority: ['P1'], page: 0, size: 15 })));
  });

  it('uses the selected SLA grouping when a chart segment is opened', async () => {
    vi.spyOn(reportsApi, 'getOverview').mockResolvedValue({ total: 4, open: 2, critical: 1, resolved: 2, slaViolations: 1, avgResolutionMinutes: 25, avgSatisfaction: 4 } as any);
    vi.spyOn(reportsApi, 'getTrends').mockResolvedValue([]);
    vi.spyOn(reportsApi, 'getSlaCompliance').mockResolvedValue([{ label: 'Network', met: 5, violated: 1 }] as any);
    vi.spyOn(reportsApi, 'getPriorityDistribution').mockResolvedValue([{ label: 'P1', count: 2 }] as any);
    vi.spyOn(reportsApi, 'getCategoryDistribution').mockResolvedValue([{ label: 'Network', count: 2 }] as any);
    vi.spyOn(reportsApi, 'getServiceReport').mockResolvedValue([{ serviceId: 3, name: 'Network', count: 2 }] as any);
    vi.spyOn(reportsApi, 'getWorkloadReport').mockResolvedValue([{ technicianId: 9, name: 'Riya', load: 1, maxLoad: 5, avgResolutionMinutes: 25 }] as any);
    vi.spyOn(reportsApi, 'getCoverageRisk').mockResolvedValue({ items: [], flaggedCount: 0, windowDays: 30, minHolders: 2 } as any);
    vi.spyOn(servicesApi, 'getCategories').mockResolvedValue([]);
    const list = vi.spyOn(incidentsApi, 'listIncidents').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 15 } as any);
    vi.spyOn(incidentsApi, 'getSlaViolations').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 10 } as any);

    renderWithProviders(<Reports />);
    fireEvent.click(screen.getByRole('button', { name: 'Service' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Network SLA group' }));

    expect(await screen.findByText('Network: incidents in this period')).toBeTruthy();
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ serviceId: 3, page: 0, size: 15 })));
  });

  it('updates the coverage-risk table when its risk-only switch changes', async () => {
    const coverage = vi.spyOn(reportsApi, 'getCoverageRisk').mockImplementation(async (onlyFlagged) => ({
      items: [{
        service: { id: 3, name: onlyFlagged ? 'Network' : 'Network and Wi-Fi' },
        category: { id: 7, name: 'Connectivity' },
        level: onlyFlagged ? 'THIN' : 'COVERED',
        eligibleCount: onlyFlagged ? 1 : 4,
        incidentsInWindow: 6,
        message: 'Coverage details',
      }],
      flaggedCount: onlyFlagged ? 1 : 0,
      windowDays: 30,
      minHolders: 2,
    } as any));

    renderWithProviders(<CoverageRiskCard />);
    expect(await screen.findByText('Network')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show only risks' }));

    expect(await screen.findByText('Network and Wi-Fi')).toBeTruthy();
    expect(coverage).toHaveBeenCalledWith(false);
  });

  it('loads the next SLA-violation table page when pagination is used', async () => {
    const violations = vi.spyOn(incidentsApi, 'getSlaViolations').mockImplementation(async ({ page = 0, size = 10 } = {}) => ({
      items: [{
        id: page + 1,
        incidentCode: page === 0 ? 'INC-1' : 'INC-11',
        type: 'RESOLUTION',
        overdueSeconds: 90,
        technician: { id: 9, name: 'Riya' },
        createdAt: '2026-11-21T10:00:00Z',
      }],
      totalItems: 21,
      totalPages: 3,
      page,
      size,
    } as any));

    renderWithProviders(<SlaViolationsCard range={{ from: '2026-11-01T00:00:00.000Z', to: '2026-11-21T23:59:59.999Z' }} />);
    expect(await screen.findByText('INC-1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));

    expect(await screen.findByText('INC-11')).toBeTruthy();
    await waitFor(() => expect(violations).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 10 })));
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

  it('applies a selected incident filter to the URL and server request', async () => {
    const list = vi.spyOn(incidentsApi, 'listIncidents').mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 } as any);
    vi.spyOn(servicesApi, 'getServices').mockResolvedValue([]);
    vi.spyOn(servicesApi, 'getCategories').mockResolvedValue([]);
    vi.spyOn(techniciansApi, 'listTechnicians').mockResolvedValue([]);
    vi.spyOn(adminApi, 'getAdminUsers').mockResolvedValue([]);

    renderWithProviders(<><Tickets /><LocationProbe /></>, '/admin/tickets?tab=all');
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Priority' }));
    fireEvent.click(await screen.findByRole('option', { name: 'P1' }));

    await waitFor(() => expect(screen.getByTestId('location-search').textContent).toBe('?tab=all&priority=P1'));
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ priority: ['P1'] })));
  });
});
