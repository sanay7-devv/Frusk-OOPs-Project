import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IncidentBoard from './IncidentBoard';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 7 } }) }));
vi.mock('../api/client', () => ({ tokenStore: { getAccess: () => 'mock-demo-token' } }));
vi.mock('../api/studio', () => ({ listStudioIncidents: vi.fn(async () => ({ page: 0, size: 12, totalItems: 1, totalPages: 1, items: [{ id: 101, code: 'INC-101', title: 'Campus Wi-Fi unavailable', status: 'ASSIGNED', priority: 'P2', service: { id: 1, name: 'Campus network' }, reporter: { id: 7, name: 'Demo employee' }, assignee: { id: 9, name: 'Demo technician' }, category: null, createdAt: '2026-11-15T08:00:00Z', slaState: 'OK', major: false, escalationLevel: 0 }] })) }));
afterEach(cleanup);

it('opens the incident preview from the default table and preserves it in the optional card view', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter><QueryClientProvider client={client}><IncidentBoard /></QueryClientProvider></MemoryRouter>);
  const title = await screen.findByRole('button', { name: 'View INC-101: Campus Wi-Fi unavailable' });
  const table = screen.getByRole('table', { name: 'Your reported incidents' });
  expect(within(table).getByText('Demo technician')).toBeDefined();
  expect(within(table).getByText('Campus network')).toBeDefined();
  fireEvent.click(title);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: 'Campus Wi-Fi unavailable' })).toBeDefined();
  expect(within(dialog).getByText('Demo employee')).toBeDefined();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cards' }));
  expect(screen.queryByRole('table')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'View INC-101: Campus Wi-Fi unavailable' }));
  expect(within(await screen.findByRole('dialog')).getByText('Campus Wi-Fi unavailable')).toBeDefined();
});
