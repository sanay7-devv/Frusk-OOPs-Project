import { api } from './client';
import type { AuthResponse, CurrentUser } from './types';

export interface PredefinedAccount {
  name: string;
  email: string;
  password: string;
  roles: ('EMPLOYEE' | 'TECHNICIAN' | 'ADMINISTRATOR')[];
  roleLabel: string;
  description: string;
  technician: { escalationLevel: 0 | 1; availability: string } | null;
  administrator: { scope: string } | null;
}

export const PREDEFINED_ACCOUNTS: PredefinedAccount[] = [
  {
    name: 'Administrator',
    email: 'admin@iitsm.local',
    password: 'Admin@123',
    roles: ['ADMINISTRATOR', 'TECHNICIAN', 'EMPLOYEE'],
    roleLabel: 'Administrator',
    description: 'Full access to Admin, Lead, Tech & Employee views',
    technician: { escalationLevel: 1, availability: 'AVAILABLE' },
    administrator: { scope: 'SYSTEM_ADMIN' },
  },
  {
    name: 'Team Lead',
    email: 'lead@iitsm.local',
    password: 'Lead@123',
    roles: ['TECHNICIAN'],
    roleLabel: 'Team Lead',
    description: 'Technician with Level 1 escalation: Lead queue & escalations',
    technician: { escalationLevel: 1, availability: 'AVAILABLE' },
    administrator: null,
  },
  {
    name: 'Technician',
    email: 'tech@iitsm.local',
    password: 'Tech@123',
    roles: ['TECHNICIAN'],
    roleLabel: 'Technician',
    description: 'Level 0 technician: Personal queue & workbench',
    technician: { escalationLevel: 0, availability: 'AVAILABLE' },
    administrator: null,
  },
  {
    name: 'Employee',
    email: 'employee@iitsm.local',
    password: 'User@123',
    roles: ['EMPLOYEE'],
    roleLabel: 'Employee',
    description: 'Report incidents & track employee tickets',
    technician: null,
    administrator: null,
  },
];

export async function login(email: string, password: string): Promise<AuthResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Check against pre-decided accounts first (Offline / DB bypass)
  const matchedAccount = PREDEFINED_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail
  );

  if (matchedAccount) {
    if (matchedAccount.password !== password) {
      const err = new Error('Email or password is incorrect.');
      (err as unknown as { response: { data: { code: string; message: string } } }).response = {
        data: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid password. Hint for pre-decided account: ' + matchedAccount.password,
        },
      };
      throw err;
    }

    const mockResponse: AuthResponse = {
      accessToken: `mock-access-token-${matchedAccount.roles[0].toLowerCase()}`,
      refreshToken: `mock-refresh-token-${matchedAccount.roles[0].toLowerCase()}`,
      expiresInSeconds: 900,
      user: {
        id: matchedAccount.roles.includes('ADMINISTRATOR') ? 1 : 2,
        name: matchedAccount.name,
        email: matchedAccount.email,
        roles: matchedAccount.roles,
        permissions: matchedAccount.roles.includes('ADMINISTRATOR') ? ['ALL'] : [],
        technician: matchedAccount.technician,
        administrator: matchedAccount.administrator,
      },
    };
    return mockResponse;
  }

  // 2. If not a predefined account, attempt live backend API call
  try {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  } catch (apiError: unknown) {
    // If backend connection fails, explain that database/server is offline and how to bypass
    const axiosErr = apiError as { code?: string; message?: string; response?: unknown };
    if (!axiosErr.response || axiosErr.code === 'ERR_NETWORK' || axiosErr.message?.includes('Network Error')) {
      const dbErr = new Error(
        'Backend server/database is offline on port 8080. Please use one of the pre-decided credentials (e.g., admin@iitsm.local / Admin@123) to bypass.'
      );
      (dbErr as unknown as { response: { data: { code: string; message: string } } }).response = {
        data: {
          code: 'BACKEND_OFFLINE',
          message: 'Backend database at localhost:8080 is unreachable. Use a pre-decided account (e.g. admin@iitsm.local / Admin@123) to bypass.',
        },
      };
      throw dbErr;
    }
    throw apiError;
  }
}

export const register = (b: { name: string; email: string; password: string; department?: string }) =>
  api.post<AuthResponse>('/auth/register', b).then((r) => r.data);

export const logout = (refreshToken: string) => {
  if (refreshToken.startsWith('mock-')) {
    return Promise.resolve();
  }
  return api.post('/auth/logout', { refreshToken });
};

export const me = () => api.get<CurrentUser>('/auth/me').then((r) => r.data);

