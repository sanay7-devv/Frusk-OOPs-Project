import { api } from './client';
import type { AuthResponse, CurrentUser } from './types';

export async function login(email: string, password: string, totp?: string): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>('/auth/login', totp ? { email, password, totp } : { email, password });
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
 */
export async function googleLogin(idToken: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/google', { idToken });
  return res.data;
}

export const logout = (refreshToken: string) =>
  api.post('/auth/logout', { refreshToken });

export const me = () => api.get<CurrentUser>('/auth/me').then((r) => r.data);


// Password reset (public). Request always answers 202 whether or not the address has an account.
export const requestPasswordReset = (email: string) =>
  api.post('/auth/password-reset/request', { email }).then(() => undefined);

export const confirmPasswordReset = (token: string, newPassword: string) =>
  api.post('/auth/password-reset/confirm', { token, newPassword }).then(() => undefined);

// Two-step verification (TOTP), signed-in user.
export interface MfaSetup { otpauthUri: string; secret: string }
export const getMfaStatus = () => api.get<{ enabled: boolean }>('/auth/mfa').then((r) => r.data);
export const setupMfa = () => api.post<MfaSetup>('/auth/mfa/setup').then((r) => r.data);
export const enableMfa = (code: string) => api.post('/auth/mfa/enable', { code }).then(() => undefined);
export const disableMfa = (code: string) => api.post('/auth/mfa/disable', { code }).then(() => undefined);
