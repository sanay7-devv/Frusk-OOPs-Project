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
    name: 'Asha Rao (Admin)',
    email: 'asha.rao@iitsm.demo',
    password: 'Demo@1234',
    roles: ['ADMINISTRATOR', 'EMPLOYEE'],
    roleLabel: 'Administrator',
    description: 'Enterprise IT Administrator with system-wide privileges',
    technician: null,
    administrator: { scope: 'SYSTEM_ADMIN' },
  },
  {
    name: 'Priya Nair (Team Lead)',
    email: 'priya.nair@iitsm.demo',
    password: 'Demo@1234',
    roles: ['TECHNICIAN', 'EMPLOYEE'],
    roleLabel: 'Team Lead',
    description: 'Level 1 escalation Lead: queue dispatch & escalations',
    technician: { escalationLevel: 1, availability: 'AVAILABLE' },
    administrator: null,
  },
  {
    name: 'Technician 1 (tech1)',
    email: 'tech1@iitsm.demo',
    password: 'Demo@1234',
    roles: ['TECHNICIAN', 'EMPLOYEE'],
    roleLabel: 'Technician',
    description: 'Frontline Level 0 SRE: personal queue & workbench',
    technician: { escalationLevel: 0, availability: 'AVAILABLE' },
    administrator: null,
  },
  {
    name: 'Employee 1 (employee1)',
    email: 'employee1@iitsm.demo',
    password: 'Demo@1234',
    roles: ['EMPLOYEE'],
    roleLabel: 'Employee',
    description: 'Corporate employee: report outages & track tickets',
    technician: null,
    administrator: null,
  },
];

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  } catch (apiError: any) {
    const isNetworkError = !apiError?.response || apiError?.code === 'ERR_NETWORK' || apiError?.message?.includes('Network Error');
    if (isNetworkError) {
      const dbErr = new Error(
        'Cannot reach the server at http://localhost:8080. Please ensure the backend is running.'
      );
      (dbErr as any).response = {
        data: {
          code: 'BACKEND_OFFLINE',
          message: 'Cannot reach the server. Please verify backend service is active.',
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

