import { HomeOutlined, AddCircleOutline, ConfirmationNumberOutlined, DashboardOutlined, NotificationsNone, Logout, Menu, Close, PeopleOutline, SettingsOutlined, AccountTreeOutlined, History, BarChartOutlined, LayersOutlined } from '@mui/icons-material';
import { Suspense, useEffect, useRef, useState, type ElementType } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth, type Workspace } from '../auth/AuthContext';
import { NAV } from './navConfig';
import { unreadCount } from '../api/notifications';
import { tokenStore } from '../api/client';
import type { RoleType } from '../api/types';
import mark from '../assets/studio-mark.svg';

const LABEL: Record<Workspace, string> = { employee: 'Employee', tech: 'Technician', lead: 'Team lead', admin: 'Administrator' };
const ICONS: Record<string, ElementType> = { Home: HomeOutlined, 'Report incident': AddCircleOutline, 'My incidents': ConfirmationNumberOutlined, Notifications: NotificationsNone, Dashboard: DashboardOutlined, Incidents: ConfirmationNumberOutlined, Tickets: ConfirmationNumberOutlined, Users: PeopleOutline, Employees: PeopleOutline, 'Dependency graph': AccountTreeOutlined, 'Audit log': History, Reports: BarChartOutlined, Config: SettingsOutlined };

export default function AppShell() {
  const { user, workspace, workspaces, setWorkspace, signOut, signIn } = useAuth();
  const sample = Boolean(tokenStore.getAccess()?.startsWith('mock-'));
  const { data: unread = 0 } = useQuery({ queryKey: ['unread', user?.id], queryFn: unreadCount, enabled: !sample });
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = workspace && NAV[workspace] ? workspace : workspaces[0] || 'employee';
  const items = NAV[active];
  const current = items.find(item => item.to === location.pathname)?.label || 'Incident workspace';
  const impersonating = Boolean(localStorage.getItem('admin_impersonator'));
  const closeMenu = () => { setMenuOpen(false); menuButton.current?.focus(); };
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  const exitImpersonation = () => {
    localStorage.removeItem('admin_impersonator');
    signIn({ accessToken: 'mock-access-token-admin', refreshToken: 'mock-refresh-token-admin', expiresInSeconds: 900,
      user: { id: 1, name: 'Administrator', email: 'admin@iitsm.local', roles: ['ADMINISTRATOR', 'TECHNICIAN', 'EMPLOYEE'] as RoleType[], permissions: ['ALL'], technician: { escalationLevel: 1, availability: 'AVAILABLE' }, administrator: { scope: 'SYSTEM_ADMIN' } } });
    navigate('/admin/users');
  };
  return <div className="studio-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="studio-topbar"><button className="studio-icon-button studio-menu-toggle" ref={menuButton} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="studio-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <Close fontSize="small" /> : <Menu fontSize="small" />}</button><NavLink className="studio-brand" to="/" aria-label="Frusk workspace home"><img src={mark} alt="" /><div><strong>frusk.</strong><small>IT SERVICE MANAGEMENT</small></div></NavLink>
      <div className="topbar-actions">{workspaces.length > 1 && <select className="workspace-select" aria-label="Choose workspace" value={active} onChange={event => { setWorkspace(event.target.value as Workspace); setMenuOpen(false); }}>{workspaces.map(ws => <option key={ws} value={ws}>{LABEL[ws]}</option>)}</select>}<NavLink className="studio-icon-button" to="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><NotificationsNone fontSize="small" />{unread > 0 && <span className="notification-dot">{unread > 9 ? '9+' : unread}</span>}</NavLink><div className="studio-user"><span className="studio-user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</span><span className="studio-user-name">{user?.name}</span></div><button className="studio-icon-button" type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><Logout sx={{ fontSize: 17 }} /></button></div>
    </header>
    <button type="button" tabIndex={menuOpen ? 0 : -1} aria-label="Close navigation backdrop" className={`studio-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={closeMenu} />
    <aside className={`studio-sidebar ${menuOpen ? 'is-open' : ''}`} id="studio-navigation"><div className="sidebar-heading">YOUR {LABEL[active].toUpperCase()} WORKSPACE</div><nav className="studio-nav" aria-label="Main navigation">{items.map((item) => { const Icon = ICONS[item.label] || LayersOutlined; return <NavLink key={item.to} end to={item.to} onClick={() => setMenuOpen(false)}><Icon /><span>{item.label}</span></NavLink>; })}</nav></aside>
    <main className="studio-main" id="main-content" tabIndex={-1}><div className="studio-page-meta"><span>{LABEL[active].toUpperCase()} / {current.toUpperCase()}</span><span>{sample ? 'SAMPLE WORKSPACE · DEMO DATA' : 'YOUR SERVICE WORKSPACE'}</span></div>{impersonating && <div className="studio-session-banner"><span>Viewing as {user?.name} · delegated session</span><button onClick={exitImpersonation}>Return to admin</button></div>}<div className="studio-route" key={location.pathname}><Suspense fallback={<div className="route-loading" role="status">Opening your workspace…</div>}><Outlet /></Suspense></div></main>
  </div>;
}
