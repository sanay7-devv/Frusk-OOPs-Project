import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { listStudioIncidents } from '../api/studio';
import WorkshopRoom from './WorkshopRoom';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 7 } }) }));
vi.mock('../api/client', () => ({ tokenStore: { getAccess: () => 'mock-demo-token' } }));
vi.mock('../api/studio', () => ({ listStudioIncidents: vi.fn() }));

function mount(workspace: 'admin' | 'employee') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><WorkshopRoom workspace={workspace} /></QueryClientProvider></MemoryRouter>);
}
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(listStudioIncidents).mockResolvedValue({ page: 0, size: 6, totalItems: 1, totalPages: 1, items: [{ id: 101, code: 'INC-101', title: 'Campus Wi-Fi unavailable', status: 'ASSIGNED', priority: 'P2', service: { id: 1, name: 'Wi-Fi' }, reporter: { id: 7, name: 'Demo employee' }, assignee: { id: 9, name: 'Demo technician' }, category: null, createdAt: '2026-11-15T08:00:00Z', responseDue: null, resolutionDue: null, slaState: 'OK', major: false, escalationLevel: 0 }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('Service workshop files', () => {
  it('loads on cabinet entry, pulls an actual incident, and links its audit ID', async () => {
    mount('admin');
    expect(listStudioIncidents).not.toHaveBeenCalled();
    const station = screen.getByRole('button', { name: 'Open the record room' });
    fireEvent.click(station);
    fireEvent.click(await screen.findByRole('button', { name: 'Pull out INC-101: Campus Wi-Fi unavailable' }));
    expect(screen.getByRole('link', { name: /Follow the audit trail/ }).getAttribute('href')).toBe('/admin/audit?incident=101');
    expect(screen.getByRole('heading', { name: 'Campus Wi-Fi unavailable' })).toBeDefined();
    fireEvent.keyDown(screen.getByLabelText('The record room close-up'), { key: 'Escape' });
    expect(screen.queryByLabelText('The record room close-up')).toBeNull();
    expect(document.activeElement).toBe(station);
  });

  it('requests only the employee’s reports and keeps administrator audit links out', async () => {
    mount('employee');
    fireEvent.click(screen.getByRole('button', { name: 'Open the record room' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pull out INC-101: Campus Wi-Fi unavailable' }));
    expect(listStudioIncidents).toHaveBeenCalledWith(expect.objectContaining({ mine: true, size: 6 }));
    expect(screen.queryByRole('link', { name: /audit/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Open ticket view/ }).getAttribute('href')).toBe('/employee/incidents');
  });

  it('keeps an API failure visible and offers a retry instead of fictional files', async () => {
    vi.mocked(listStudioIncidents).mockRejectedValueOnce(new Error('Offline'));
    mount('admin');
    fireEvent.click(screen.getByRole('button', { name: 'Open the ticket rack' }));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.queryByRole('group', { name: 'Incident files' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pull out INC-101: Campus Wi-Fi unavailable' })).toBeDefined());
  });
});
