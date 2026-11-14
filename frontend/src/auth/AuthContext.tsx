import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as authApi from '../api/auth';
import { setAuthFailureHandler, tokenStore } from '../api/client';
import type { AuthResponse, CurrentUser } from '../api/types';

export type Workspace = 'employee' | 'tech' | 'lead' | 'admin';

/** Which workspaces this user may switch between. Team Lead = technician with escalationLevel 1. */
export function workspacesFor(u: CurrentUser): Workspace[] {
  const ws: Workspace[] = [];
  if (!u || !Array.isArray(u.roles)) return ws;
  if (u.roles.includes('ADMINISTRATOR')) ws.push('admin');
  if (u.roles.includes('TECHNICIAN')) {
    if (u.technician?.escalationLevel === 1) ws.push('lead');
    ws.push('tech');
  }
  if (u.roles.includes('EMPLOYEE')) ws.push('employee');
  return ws;
}
export const HOME: Record<Workspace, string> = { 
  employee: '/employee/home', 
  tech: '/tech/queue',
  lead: '/lead/team-queue',
  admin: '/admin/dashboard'
 };

interface Ctx {
  user: CurrentUser | null; loading: boolean;
  workspace: Workspace | null; workspaces: Workspace[]; setWorkspace: (w: Workspace) => void;
  signIn: (r: AuthResponse) => Workspace | null; signOut: () => Promise<void>;
}
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWs] = useState<Workspace | null>(null);
  const navigate = useNavigate();

  const workspaces = useMemo(() => (user ? workspacesFor(user) : []), [user]);

  // Remember the last workspace choice; fall back to the first allowed one.
  const signIn = useCallback((r: AuthResponse) => {
    tokenStore.setAccess(r.accessToken);
    tokenStore.setRefresh(r.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(r.user));
    setUser(r.user);
    const all = workspacesFor(r.user);
    const saved = localStorage.getItem('workspace') as Workspace | null;
    const chosen = saved && all.includes(saved) ? saved : all[0] ?? null;
    if (chosen) {
      localStorage.setItem('workspace', chosen);
    }
    setWs(chosen);
    setLoading(false);
    return chosen;
  }, []);
  const clear = useCallback(() => {
    tokenStore.setAccess(null);
    tokenStore.setRefresh(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('workspace');
    setUser(null);
    setWs(null);
    setLoading(false);
  }, []);
  const signOut = useCallback(async () => {
    const rt = tokenStore.getRefresh();
    if (rt) await authApi.logout(rt).catch(() => {});
    clear();
    navigate('/login');
  }, [clear, navigate]);
  const setWorkspace = (w: Workspace) => {
    localStorage.setItem('workspace', w);
    setWs(w);
    navigate(HOME[w]);
  };

  // On page load: use the stored refresh token to restore the session.
  useEffect(() => {
    setAuthFailureHandler(() => { clear(); navigate('/login'); });
    const rt = tokenStore.getRefresh();
    if (!rt) { setLoading(false); return; }

    // If mock session, restore from localStorage directly without calling offline backend
    if (rt.startsWith('mock-')) {
      const savedUserStr = localStorage.getItem('currentUser');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          tokenStore.setAccess('mock-access-token');
          setUser(savedUser);
          const all = workspacesFor(savedUser);
          const saved = localStorage.getItem('workspace') as Workspace | null;
          const chosen = saved && all.includes(saved) ? saved : all[0] ?? null;
          if (chosen) {
            localStorage.setItem('workspace', chosen);
          }
          setWs(chosen);
          setLoading(false);
          return;
        } catch {
          // parse error, clear and fall through
          clear();
          return;
        }
      } else {
        clear();
        return;
      }
    }

    axios.post<AuthResponse>(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'}/auth/refresh`, { refreshToken: rt }, { timeout: 3000 })
      .then((r) => signIn(r.data))
      .catch((err) => {
        // If it's a network error (backend offline) or timeout, preserve the stored session from localStorage
        const isNetworkErr = !err?.response || err?.code === 'ERR_NETWORK' || err?.message?.includes('Network') || err?.code === 'ECONNABORTED';
        const savedUserStr = localStorage.getItem('currentUser');
        if (isNetworkErr && savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            setUser(savedUser);
            const all = workspacesFor(savedUser);
            const saved = localStorage.getItem('workspace') as Workspace | null;
            const chosen = saved && all.includes(saved) ? saved : all[0] ?? null;
            if (chosen) {
              localStorage.setItem('workspace', chosen);
            }
            setWs(chosen);
            return;
          } catch {
            clear();
          }
        } else {
          clear();
        }
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  return <AuthCtx.Provider value={{ user, loading, workspace, workspaces, setWorkspace, signIn, signOut }}>{children}</AuthCtx.Provider>;
}
