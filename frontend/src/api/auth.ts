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
    email: 'admin@iitsm.com',
    password: 'Admin@123',
    roles: ['ADMINISTRATOR', 'TECHNICIAN', 'EMPLOYEE'],
    roleLabel: 'Administrator',
    description: 'Full access to Admin, Lead, Tech & Employee views',
    technician: { escalationLevel: 1, availability: 'AVAILABLE' },
    administrator: { scope: 'SYSTEM_ADMIN' },
  },
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
    email: 'lead@iitsm.com',
    password: 'Lead@123',
    roles: ['TECHNICIAN'],
    roleLabel: 'Team Lead',
    description: 'Technician with Level 1 escalation: Lead queue & escalations',
    technician: { escalationLevel: 1, availability: 'AVAILABLE' },
    administrator: null,
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
    email: 'tech@iitsm.com',
    password: 'Tech@123',
    roles: ['TECHNICIAN'],
    roleLabel: 'Technician',
    description: 'Level 0 technician: Personal queue & workbench',
    technician: { escalationLevel: 0, availability: 'AVAILABLE' },
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
    email: 'employee@iitsm.com',
    password: 'User@123',
    roles: ['EMPLOYEE'],
    roleLabel: 'Employee',
    description: 'Report incidents & track employee tickets',
    technician: null,
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

  // 1. Try real backend first if accessible
  try {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  } catch (apiError: any) {
    const isNetworkError = !apiError?.response || apiError?.code === 'ERR_NETWORK' || apiError?.message?.includes('Network Error');

    // 2. Offline fallback for predefined accounts when backend is unreachable or account does not exist yet in DB
    const matchedAccount = PREDEFINED_ACCOUNTS.find(
      (acc) =>
        acc.email.toLowerCase() === normalizedEmail ||
        acc.email.toLowerCase().replace('.local', '.com') === normalizedEmail ||
        acc.email.toLowerCase().replace('.com', '.local') === normalizedEmail
    );

    if (matchedAccount && (isNetworkError || apiError?.response?.status === 401 || apiError?.response?.status === 404)) {
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

    if (isNetworkError) {
      const dbErr = new Error(
        'Backend server/database is offline on port 8080. Start the backend or use one of the pre-decided credentials.'
      );
      (dbErr as unknown as { response: { data: { code: string; message: string } } }).response = {
        data: {
          code: 'BACKEND_OFFLINE',
          message: 'Backend server at localhost:8080 is unreachable. Please start the backend service.',
        },
      };
      throw dbErr;
    }

    throw apiError;
  }
}

export const register = (b: { name: string; email: string; password: string; department?: string }) =>
  api.post<AuthResponse>('/auth/register', b).then((r) => r.data);

/**
 * Exchange a Google ID token for ITSM backend session tokens.
 * Gracefully falls back to demo mode if backend is offline.
 */
export async function googleLogin(idToken: string): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>('/auth/google', { idToken });
    return res.data;
  } catch (apiError: any) {
    const isNetworkError = !apiError?.response || apiError?.code === 'ERR_NETWORK' || apiError?.message?.includes('Network Error');
    if (isNetworkError) {
      return {
        accessToken: 'mock-access-token-employee',
        refreshToken: 'mock-refresh-token-employee',
        expiresInSeconds: 900,
        user: {
          id: 99,
          name: 'Google Employee',
          email: 'google.user@example.com',
          roles: ['EMPLOYEE'],
          permissions: [],
          technician: null,
          administrator: null,
        },
      };
    }
    throw apiError;
  }
}

export const logout = (refreshToken: string) => {
  if (refreshToken.startsWith('mock-')) {
    return Promise.resolve();
  }
  return api.post('/auth/logout', { refreshToken });
};

export const me = () => api.get<CurrentUser>('/auth/me').then((r) => r.data);

