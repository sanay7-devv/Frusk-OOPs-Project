import type { ElementType } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Select,
  MenuItem,
  Button,
  Badge,
  IconButton,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  ReportProblem as ReportProblemIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  People as PeopleIcon,
  Dns as DnsIcon,
  AccountTree as AccountTreeIcon,
  Policy as PolicyIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon,
  Badge as BadgeIcon,
  Assignment as AssignmentIcon,
  Engineering as EngineeringIcon,
  Home as HomeIcon,
  Terminal as TerminalIcon,
  CrisisAlert as CrisisAlertIcon,
} from '@mui/icons-material';

import { useQuery } from '@tanstack/react-query';
import { useAuth, Workspace } from '../auth/AuthContext';
import { NAV } from './navConfig';
import { unreadCount } from '../api/notifications';
import logoIcon from '../assets/logo.png';
import type { RoleType } from '../api/types';

const WS_LABEL: Record<Workspace, string> = {
  employee: 'Employee View',
  tech: 'Technician View',
  lead: 'Team Lead View',
  admin: 'Admin View',
};

//see what icons we need and change acccordingly
const NAV_ICONS: Record<string, ElementType> = {
  'Home': HomeIcon,
  'Report incident': ReportProblemIcon,
  'My incidents': ConfirmationNumberIcon,
  'Notifications': NotificationsIcon,
  'My queue': AssignmentIcon,
  'Workbench': TerminalIcon,
  'Incident Workbench': TerminalIcon,
  'Workload': EngineeringIcon,
  'Team queue': AssignmentIcon,
  'Escalations': CrisisAlertIcon,
  'Dashboard': DashboardIcon,
  'Incidents': ConfirmationNumberIcon,
  'Users': PeopleIcon,
  'Services': DnsIcon,
  'Dependency graph': AccountTreeIcon,
  'SLA policies': PolicyIcon,
  'Categories': CategoryIcon,
  'Config': SettingsIcon,
  'Escalation': TrendingUpIcon,
  'Audit log': HistoryIcon,
  'Reports': AssessmentIcon,
};

const DRAWER = 250;

export default function AppShell() {
  const { user, workspace, workspaces, setWorkspace, signOut, signIn } = useAuth();
  const { data: unread = 0 } = useQuery({ queryKey: ['unread'], queryFn: unreadCount });
  const location = useLocation();
  const navigate = useNavigate();

  const isImpersonating = Boolean(localStorage.getItem('admin_impersonator'));

  const handleExitImpersonation = () => {
    localStorage.removeItem('admin_impersonator');
    const adminAccount = {
      accessToken: 'mock-access-token-admin',
      refreshToken: 'mock-refresh-token-admin',
      expiresInSeconds: 900,
      user: {
        id: 1,
        name: 'Administrator',
        email: 'admin@iitsm.local',
        roles: ['ADMINISTRATOR', 'TECHNICIAN', 'EMPLOYEE'] as RoleType[],
        permissions: ['ALL'],
        technician: { escalationLevel: 1 as const, availability: 'AVAILABLE' },
        administrator: { scope: 'SYSTEM_ADMIN' },
      },
    };
    signIn(adminAccount);
    navigate('/admin/users');
  };

  const activeWorkspace: Workspace = (workspace && NAV[workspace] ? workspace : workspaces[0] || 'employee');
  const navItems = NAV[activeWorkspace] || [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Top Application Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: '#ffffff',
          color: '#0f172a',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
          {/* Logo & Platform Name 
          //TODO we have to change the top bar not looking good and make a blue color
          //TODO if possible on the top
          //TODO make in center*/}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#0a192f',
                border: '1px solid rgba(0, 180, 216, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(10, 25, 47, 0.16)',
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={logoIcon}
                alt="IITSM Logo"
                sx={{ width: 34, height: 34, objectFit: 'contain' }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                  lineHeight: 1.15,
                }}
              >
                IITSM Enterprise
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'block',
                }}
              >
                Service Reliability Platform
              </Typography>
            </Box>
          </Box>

          {/* Workspace Switcher */}
          {workspaces.length > 1 && (
            <Select
              size="small"
              value={activeWorkspace}
              onChange={(e) => setWorkspace(e.target.value as Workspace)}
              sx={{
                mr: 2,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                bgcolor: '#f8fafc',
                borderRadius: 2,
                height: 36,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
              }}
            >
              {workspaces.map((w) => (
                <MenuItem key={w} value={w} sx={{ fontSize: 13, fontWeight: 500 }}>
                  {WS_LABEL[w]}
                </MenuItem>
              ))}
            </Select>
          )}

          {/* Notifications Button */}
          <IconButton
            component={NavLink}
            to="/notifications"
            aria-label="Notifications"
            sx={{
              color: '#475569',
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              mr: 1.5,
              width: 36,
              height: 36,
              borderRadius: 2,
              '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
            }}
          >
            <Badge badgeContent={unread} color="error">
              <NotificationsIcon sx={{ fontSize: 19 }} />
            </Badge>
          </IconButton>

          {/* User Profile Pill */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              px: 1.5,
              py: 0.5,
              mr: 1.5,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
            }}
          >
            <Avatar
              sx={{
                width: 26,
                height: 26,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: '#004d99',
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
              {user?.name ?? 'User'}
            </Typography>
          </Box>

          {/* Logout Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={signOut}
            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 2,
              height: 36,
              px: 1.5,
              '&:hover': {
                borderColor: '#cbd5e1',
                bgcolor: '#fee2e2',
                color: '#dc2626',
              },
            }}
          >
            Logout
          </Button>
        </Toolbar>

        {/* Impersonation Banner */}
        {isImpersonating && (
          <Box
            sx={{
              bgcolor: '#fffbeb',
              borderTop: '1px solid #fde68a',
              color: '#92400e',
              px: { xs: 2, sm: 3 },
              py: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                Delegated Session Active: Viewing as Employee &ldquo;{user?.name}&rdquo; ({user?.email})
              </Typography>
              <Chip
                label="AUDITED"
                size="small"
                sx={{
                  height: 18,
                  fontSize: 9.5,
                  fontWeight: 800,
                  bgcolor: '#fde68a',
                  color: '#78350f',
                  fontFamily: 'monospace',
                }}
              />
            </Box>
            <Button
              size="small"
              variant="contained"
              onClick={handleExitImpersonation}
              startIcon={<LogoutIcon sx={{ fontSize: 14 }} />}
              sx={{
                bgcolor: '#d97706',
                color: '#ffffff',
                textTransform: 'none',
                fontSize: 12,
                fontWeight: 700,
                py: 0.3,
                px: 1.5,
                borderRadius: 1.5,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#b45309' },
              }}
            >
              Return to Admin Console
            </Button>
          </Box>
        )}
      </AppBar>

      {/* Modern Side Navigation Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER,
            boxSizing: 'border-box',
            borderRight: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
          },
        }}
      >
        <Toolbar sx={{ minHeight: isImpersonating ? '106px !important' : '64px !important' }} />
        <Box sx={{ px: 2, py: 2.5 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              px: 1.5,
              mb: 1.2,
            }}
          >
            {activeWorkspace.toUpperCase()} CONSOLE
          </Typography>
          <List disablePadding>
            {navItems.map((item) => {
              const RawIcon = NAV_ICONS[item.label] || DashboardIcon;
              const IconComp = (RawIcon && (RawIcon as any).default) ? (RawIcon as any).default : RawIcon;
              const isActive = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  sx={{
                    borderRadius: 2,
                    mb: 0.6,
                    py: 1,
                    px: 1.5,
                    color: isActive ? '#004d99' : '#475569',
                    bgcolor: isActive ? '#dee8ff' : 'transparent',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      bgcolor: isActive ? '#d4e3ff' : '#f8fafc',
                      color: isActive ? '#004d99' : '#0f172a',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color: isActive ? '#004d99' : '#64748b',
                    }}
                  >
                    <IconComp sx={{ fontSize: 19 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { sm: `calc(100% - ${DRAWER}px)` },
          minHeight: '100vh',
          bgcolor: '#f8fafc',
        }}
      >
        <Toolbar sx={{ minHeight: isImpersonating ? '106px !important' : '64px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
