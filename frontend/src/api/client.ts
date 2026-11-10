import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, AuthResponse } from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
export const api = axios.create({ baseURL });

// Access token in memory only; refresh token in localStorage (tradeoff: note in report).
let accessToken: string | null = null;
export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => { accessToken = t; },
  getRefresh: () => localStorage.getItem('refreshToken'),
  setRefresh: (t: string | null) => (t ? localStorage.setItem('refreshToken', t) : localStorage.removeItem('refreshToken')),
};
let onAuthFailure: () => void = () => {};
export const setAuthFailureHandler = (fn: () => void) => { onAuthFailure = fn; };

api.interceptors.request.use((cfg) => 
  {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing: Promise<string> | null = null;
async function refresh(): Promise<string> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('no refresh token');
  const { data } = await axios.post<AuthResponse>(`${baseURL}/auth/refresh`, { refreshToken });
  tokenStore.setAccess(data.accessToken);
  tokenStore.setRefresh(data.refreshToken); // rotated on every refresh
  return data.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiError>) => {
    const cfg = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status === 401 && error.response.data?.code === 'TOKEN_EXPIRED' && !cfg._retried) {
      cfg._retried = true;
      try 
      
      {
        refreshing ??= refresh().finally(() => { refreshing = null; });
        const token = await refreshing;
        cfg.headers.Authorization = `Bearer ${token}`;
        return api(cfg);
      } catch { onAuthFailure(); }
    }
    return Promise.reject(error);
  }
);
