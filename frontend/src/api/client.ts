import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, AuthResponse } from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
export const api = axios.create({ baseURL, timeout: 15000 });

// Access token in memory only; refresh token in localStorage (tradeoff: note in report).
let accessToken: string | null = null;
export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => {
    accessToken = t;
  },
  getRefresh: () => localStorage.getItem('refreshToken'),
  setRefresh: (t: string | null) =>
    t ? localStorage.setItem('refreshToken', t) : localStorage.removeItem('refreshToken'),
};

let onAuthFailure: () => void = () => {};
export const setAuthFailureHandler = (fn: () => void) => {
  onAuthFailure = fn;
};

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing: Promise<AuthResponse> | null = null;

export async function requestRefresh(): Promise<AuthResponse> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('no refresh token');
  if (!refreshing) {
    refreshing = axios
      .post<AuthResponse>(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 8000 })
      .then((res) => {
        tokenStore.setAccess(res.data.accessToken);
        tokenStore.setRefresh(res.data.refreshToken); // rotated on every refresh
        return res.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:network-recovered'));
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    // Network error / server unreachable
    if (!error.response || error.code === 'ERR_NETWORK') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app:network-error', {
            detail: {
              severity: 'error',
              message: 'Server connection offline: backend service is unreachable.',
            },
          })
        );
      }
      return Promise.reject(error);
    }

    // 503 Service Unavailable
    if (error.response.status === 503) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app:network-error', {
            detail: {
              severity: 'error',
              message: '503 Service Unavailable: Server is experiencing high load or temporary maintenance.',
            },
          })
        );
      }
      return Promise.reject(error);
    }

    // 429 Rate Limited with Retry-After
    if (error.response.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const retryMsg = retryAfter ? `Please wait ${retryAfter} seconds before trying again.` : 'Too many requests.';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app:network-error', {
            detail: {
              severity: 'warning',
              message: `Rate limit reached: ${retryMsg}`,
            },
          })
        );
      }
      return Promise.reject(error);
    }

    // Blob downloads deliver error bodies as a Blob; turn them back into the JSON ApiError.
    if (error.response?.data instanceof Blob) {
      try {
        (error.response as { data: unknown }).data = JSON.parse(await error.response.data.text());
      } catch {
        /* not JSON */
      }
    }

    // Handle 401 generally (try refresh once, then sign out)
    if (error.response?.status === 401 && cfg && !cfg._retried) {
      cfg._retried = true;
      try {
        const authData = await requestRefresh();
        cfg.headers.Authorization = `Bearer ${authData.accessToken}`;
        return api(cfg);
      } catch {
        onAuthFailure();
      }
    }

    return Promise.reject(error);
  }
);
