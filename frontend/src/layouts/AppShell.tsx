import type { ElementType } from 'react';
import { useState } from 'react';
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
  InputBase,
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
  Assignment as AssignmentIcon,
  Engineering as EngineeringIcon,
  Home as HomeIcon,
  Terminal as TerminalIcon,
  CrisisAlert as CrisisAlertIcon,
  Search as SearchIcon,
  Bolt as BoltIcon,
  Tune as TuneIcon,
  Shield as ShieldIcon,
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

const DRAWER_WIDTH = 260;

export default function AppShell() {
  const { user, workspace, workspaces, setWorkspace, signOut, signIn } = useAuth();
  const { data: unread = 0 } = useQuery({ queryKey: ['unread'], queryFn: unreadCount });
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#090d16', color: '#dfe2ef', position: 'relative' }}>
      {/* Background Kinetic Ambient Glows */}
      <Box
        sx={{
          position: 'fixed',
          top: -120,
          left: -120,
          width: 480,
          height: 480,
          borderRadius: '50%',
          bgcolor: 'rgba(99, 102, 241, 0.08)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          bottom: -120,
          right: '15%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          bgcolor: 'rgba(6, 182, 212, 0.06)',
          filter: 'blur(140px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Application Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: 'rgba(15, 19, 28, 0.82)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          color: '#dfe2ef',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 }, gap: 2 }}>
          {/* Logo & Platform Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                bgcolor: '#141824',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.25)',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={logoIcon}
                alt="IITSM Logo"
                sx={{ width: 28, height: 28, objectFit: 'contain' }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Sora, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  lineHeight: 1.2,
                }}
              >
                IITSM Enterprise
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#4cd7f6',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                }}
              >
                INCIDENT COMMAND
              </Typography>
            </Box>
          </Box>

          {/* Telemetry Status Pills */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1.5, ml: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.6,
                py: 0.5,
                borderRadius: '9999px',
                bgcolor: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: '#06b6d4',
                  boxShadow: '0 0 8px #06b6d4',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.4, transform: 'scale(1.3)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, color: '#4cd7f6' }}>
                Mesh: 99.98% Healthy
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.4,
                py: 0.5,
                borderRadius: '9999px',
                bgcolor: 'rgba(247, 81, 161, 0.1)',
                border: '1px solid rgba(247, 81, 161, 0.25)',
              }}
            >
              <BoltIcon sx={{ fontSize: 14, color: '#f751a1' }} />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 600, color: '#ffb0cd', letterSpacing: '0.04em' }}>
                SEV-1 ENGINE ARMED
              </Typography>
            </Box>
          </Box>

          {/* Quick Telemetry / Runbook Search Bar */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              px: 1.5,
              py: 0.4,
              width: { md: 240, lg: 320 },
              transition: 'all 0.2s',
              '&:focus-within': {
                borderColor: 'rgba(6, 182, 212, 0.5)',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)',
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: '#908fa0' }} />
            <InputBase
              placeholder="Search telemetry, nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                color: '#dfe2ef',
                fontSize: 13,
                fontFamily: 'Geist, sans-serif',
                width: '100%',
                '& input::placeholder': { color: '#64748b', opacity: 1 },
              }}
            />
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '4px',
                px: 0.8,
                py: 0.2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#94a3b8' }}>
                ⌘K
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Workspace Switcher */}
          {workspaces.length > 1 && (
            <Select
              size="small"
              value={activeWorkspace}
              onChange={(e) => setWorkspace(e.target.value as Workspace)}
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#dfe2ef',
                bgcolor: 'rgba(18, 22, 34, 0.8)',
                borderRadius: '8px',
                height: 34,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover': { bgcolor: 'rgba(28, 31, 41, 0.9)', borderColor: 'rgba(99, 102, 241, 0.4)' },
                '&.Mui-focused': { borderColor: '#06b6d4', boxShadow: '0 0 0 2px rgba(6, 182, 212, 0.25)' },
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
              color: '#dfe2ef',
              bgcolor: 'rgba(18, 22, 34, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              width: 36,
              height: 36,
              borderRadius: '8px',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.4)',
                color: '#ffffff',
              },
            }}
          >
            <Badge
              badgeContent={unread}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: '#f751a1',
                  color: '#ffffff',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  boxShadow: '0 0 8px rgba(247, 81, 161, 0.8)',
                },
              }}
            >
              <NotificationsIcon sx={{ fontSize: 18 }} />
            </Badge>
          </IconButton>

          {/* User Profile Pill */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              px: 1.2,
              py: 0.5,
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', textAlign: 'right' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#dfe2ef', lineHeight: 1.2 }}>
                {user?.name ?? 'User'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: '#4cd7f6',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {user?.roles?.[0] ? user.roles[0].replace('_', ' ') : 'MEMBER'}
              </Typography>
            </Box>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: '#6366f1',
                color: '#ffffff',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
          </Box>

          {/* Logout Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={signOut}
            startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 12.5,
              borderRadius: '8px',
              height: 34,
              px: 1.5,
              bgcolor: 'rgba(18, 22, 34, 0.5)',
              '&:hover': {
                borderColor: '#f43f5e',
                bgcolor: 'rgba(244, 63, 94, 0.12)',
                color: '#ffb4ab',
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
              bgcolor: 'rgba(245, 158, 11, 0.15)',
              borderTop: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fde68a',
              px: { xs: 2, sm: 3 },
              py: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#f59e0b',
                  boxShadow: '0 0 8px #f59e0b',
                }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fde68a' }}>
                Delegated Session Active: Viewing as Employee &ldquo;{user?.name}&rdquo; ({user?.email})
              </Typography>
              <Chip
                label="AUDITED"
                size="small"
                sx={{
                  height: 18,
                  fontSize: 9.5,
                  fontWeight: 800,
                  bgcolor: 'rgba(245, 158, 11, 0.3)',
                  color: '#fef3c7',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
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
                borderRadius: '6px',
                boxShadow: '0 0 12px rgba(217, 119, 6, 0.4)',
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
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            bgcolor: '#0a0e17',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 10,
          },
        }}
      >
        <Box>
          <Toolbar sx={{ minHeight: isImpersonating ? '106px !important' : '64px !important' }} />
          <Box sx={{ px: 2, py: 2 }}>
            <Typography
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                px: 1.2,
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
                      borderRadius: '8px',
                      mb: 0.6,
                      py: 0.9,
                      px: 1.4,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.22) 0%, rgba(6, 182, 212, 0.12) 100%)'
                        : 'transparent',
                      border: isActive
                        ? '1px solid rgba(99, 102, 241, 0.35)'
                        : '1px solid transparent',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.18s ease-in-out',
                      boxShadow: isActive ? '0 0 16px rgba(99, 102, 241, 0.15)' : 'none',
                      '&:hover': {
                        bgcolor: isActive ? undefined : 'rgba(255, 255, 255, 0.04)',
                        color: '#dfe2ef',
                        borderColor: isActive ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 30,
                        color: isActive ? '#4cd7f6' : '#64748b',
                        transition: 'color 0.18s ease',
                      }}
                    >
                      <IconComp sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        fontFamily: 'Geist, sans-serif',
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Box>

        {/* Command Node SRE Telemetry Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: '8px',
              bgcolor: 'rgba(18, 22, 34, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: '#06b6d4',
                  boxShadow: '0 0 8px #06b6d4',
                  animation: 'pulse 2s infinite',
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#dfe2ef', lineHeight: 1.1 }}>
                  COMMAND NODE 01
                </Typography>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: '#4cd7f6', lineHeight: 1.1 }}>
                  LATENCY: 4ms
                </Typography>
              </Box>
            </Box>
            <TuneIcon sx={{ fontSize: 16, color: '#64748b' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: '#64748b' }}>
              IITSM OS v4.19
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <ShieldIcon sx={{ fontSize: 11, color: '#06b6d4' }} />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 600, color: '#06b6d4' }}>
                SECURE SHIELD
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: '#090d16',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Toolbar sx={{ minHeight: isImpersonating ? '106px !important' : '64px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
