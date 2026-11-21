import type { ElementType } from 'react';
import React, { Fragment, useState, useRef, useEffect, useMemo } from 'react';
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
  Menu,
  Button,
  Badge,
  IconButton,
  Avatar,
  Chip,
  InputBase,
  Tooltip,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
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
  Hub as HubIcon,
  ManageAccounts as ManageAccountsIcon,
  Science as ScienceIcon,
  Tune as TuneIcon,
  Search as SearchIcon,
  Bolt as BoltIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Security as SecurityIcon,
  NotificationsNone as NotificationsNoneIcon,
} from '@mui/icons-material';

import { useQuery } from '@tanstack/react-query';
import { useAuth, Workspace, HOME } from '../auth/AuthContext';
import { NAV } from './navConfig';
import { unreadCount } from '../api/notifications';
import ConnectionBanner from '../components/ConnectionBanner';
import DirectorBar from '../features/admin/DirectorBar';
import CommandPalette, { OPEN_PALETTE_EVENT } from '../components/CommandPalette';
import { useRealtimeStatus, type RealtimeStatus } from '../realtime/realtimeStore';
import logoIcon from '../assets/logo.png';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
const WS_LABEL: Record<Workspace, string> = {
  admin: 'Admin View',
  lead: 'Team Lead View',
  tech: 'Technician View',
  employee: 'Employee View',
};

const REALTIME_STATUS_CONFIG: Record<RealtimeStatus, { label: string; color: string; hint: string }> = {
  connected: { label: 'LIVE SYSTEM', color: tokens.success, hint: 'Real-time WebSocket connected: updates arrive instantly.' },
  connecting: { label: 'CONNECTING...', color: tokens.amber, hint: 'Opening the live WebSocket connection.' },
  reconnecting: {
    label: 'RECONNECTING...',
    color: tokens.danger,
    hint: 'Live connection lost. Reconnecting; background polling is active.',
  },
  off: { label: 'OFFLINE', color: tokens.textDisabled, hint: 'Live connection inactive.' },
};

const WORKSPACE_META: Record<
  Workspace,
  {
    label: string;
    icon: ElementType;
  }
> = {
  admin: {
    label: 'Admin View',
    icon: AdminPanelSettingsIcon,
  },
  lead: {
    label: 'Team Lead View',
    icon: SupervisorAccountIcon,
  },
  tech: {
    label: 'Technician View',
    icon: EngineeringIcon,
  },
  employee: {
    label: 'Employee View',
    icon: PersonIcon,
  },
};

const NAV_ICONS: Record<string, ElementType> = {
  'Home': HomeIcon,
  'Report incident': ReportProblemIcon,
  'My incidents': ConfirmationNumberIcon,
  'Service status': DnsIcon,
  'Notifications': NotificationsIcon,
  'My queue': AssignmentIcon,
  'Workbench': TerminalIcon,
  'Incident Workbench': TerminalIcon,
  'Workload': EngineeringIcon,
  'Team queue': AssignmentIcon,
  'Escalations': CrisisAlertIcon,
  'Dashboard': DashboardIcon,
  'Account security': ManageAccountsIcon,
  'Simulator': ScienceIcon,
  'Demo controls': TuneIcon,
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
  'Problems': HubIcon,
};

const DRAWER_WIDTH = 260;

export default function AppShell() {
  const { user, workspace, workspaces, setWorkspace, signOut, signIn } = useAuth();
  const { data: unread = 0 } = useQuery({ queryKey: ['unread'], queryFn: unreadCount });
  const realtimeStatus = useRealtimeStatus();
  const rtConfig = REALTIME_STATUS_CONFIG[realtimeStatus] || REALTIME_STATUS_CONFIG.off;
  const isRtPulsing = realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting';
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaceAnchorEl, setWorkspaceAnchorEl] = useState<null | HTMLElement>(null);
  const isWorkspaceMenuOpen = Boolean(workspaceAnchorEl);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = encodeURIComponent(searchQuery.trim());
    if (activeWorkspace === 'employee') {
      navigate(`/employee/incidents?q=${q}`);
    } else if (activeWorkspace === 'tech') {
      navigate(`/tech/queue?q=${q}`);
    } else if (activeWorkspace === 'lead') {
      navigate(`/lead/team-queue?q=${q}`);
    } else {
      navigate(`/admin/incidents?q=${q}`);
    }
  };

  const handleWorkspaceClick = (event: React.MouseEvent<HTMLElement>) => {
    setWorkspaceAnchorEl(event.currentTarget);
  };

  const handleWorkspaceClose = () => {
    setWorkspaceAnchorEl(null);
  };

  const handleWorkspaceSelect = (w: Workspace) => {
    setWorkspaceAnchorEl(null);
    if (w !== activeWorkspace) {
      setWorkspace(w);
    }
  };

  // Impersonation removed: no backend supports it

  const activeWorkspace: Workspace = (workspace && NAV[workspace] ? workspace : workspaces[0] || 'employee');
  const availableWorkspaces: Workspace[] = useMemo(() => {
    if (activeWorkspace === 'admin' || user?.roles?.includes('ADMINISTRATOR') || workspaces.includes('admin')) {
      return ['admin', 'lead', 'tech', 'employee'];
    }
    return workspaces.length > 0 ? workspaces : ['employee'];
  }, [activeWorkspace, user, workspaces]);

  const navItems = (NAV[activeWorkspace] || []).filter((i) => !i.permission || !!user?.permissions?.includes(i.permission));

  useEffect(() => {
    const currentNav = navItems.find((n) => n.to === location.pathname || (n.to !== '/' && location.pathname.startsWith(n.to)));
    const pageTitle = currentNav?.label || (location.pathname.includes('/incidents/') ? 'Incident detail' : 'Command Centre');
    document.title = `${pageTitle} · IITSM`;
  }, [location.pathname, navItems]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: tokens.background, color: tokens.onSurface, position: 'relative' }}>
      {/* Skip link: first focusable element, jumps past the header and navigation */}
      <Box
        component="a"
        href="#main-content"
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          const el = document.getElementById('main-content');
          el?.focus();
          el?.scrollIntoView();
        }}
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: (t) => t.zIndex.tooltip + 1,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: 'primary.main',
          color: tokens.white,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
          transform: 'translateY(-200%)',
          '&:focus': { transform: 'translateY(0)' },
        }}
      >
        Skip to main content
      </Box>
      {/* Background Kinetic Ambient Glows (GPU-optimized via radial gradients) */}
      <Box
        sx={{
          position: 'fixed',
          top: -120,
          left: -120,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(tokens.primary, 0.12)} 0%, ${alpha(tokens.primary, 0)} 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translateZ(0)',
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
          background: `radial-gradient(circle, ${alpha(tokens.secondary, 0.08)} 0%, ${alpha(tokens.secondary, 0)} 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translateZ(0)',
        }}
      />

      {/* Top Application Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: alpha(tokens.surface, 0.88),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transform: 'translateZ(0)',
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          color: tokens.onSurface,
          boxShadow: `0 4px 20px ${alpha(tokens.black, 0.35)}`,
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 }, gap: 2 }}>
          {/* Logo & Platform Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Tooltip title={(isMobile ? mobileOpen : sidebarOpen) ? 'Collapse navigation sidebar' : 'Expand navigation sidebar'}>
              <IconButton
                onClick={() => {
                  if (isMobile) {
                    setMobileOpen((prev) => !prev);
                  } else {
                    setSidebarOpen((prev) => !prev);
                  }
                }}
                size="small"
                aria-label="Toggle navigation sidebar"
                sx={{
                  color: (isMobile ? mobileOpen : sidebarOpen) ? tokens.onSurfaceVariant : tokens.secondaryLight,
                  bgcolor: alpha(tokens.surfaceContainerLow, 0.8),
                  border: `1px solid ${tokens.outlineVariant}`,
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(tokens.primary, 0.15),
                    borderColor: alpha(tokens.primary, 0.4),
                    color: tokens.white,
                    boxShadow: `0 0 12px ${alpha(tokens.primary, 0.25)}`,
                  },
                }}
              >
                {(isMobile ? mobileOpen : sidebarOpen) ? <MenuOpenIcon sx={{ fontSize: 20 }} /> : <MenuIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>

            <Box
              component="button"
              type="button"
              onClick={() => navigate(HOME[activeWorkspace] || '/')}
              aria-label="Go to workspace dashboard"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                textDecoration: 'none',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
                '&:hover': {
                  opacity: 0.88,
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${tokens.secondary}`,
                  outlineOffset: '4px',
                  borderRadius: '8px',
                },
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: tokens.paper,
                  border: `1px solid ${alpha(tokens.primary, 0.35)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 16px ${alpha(tokens.primary, 0.25)}`,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <Box
                  component="img"
                  src={logoIcon}
                  alt="IITSM Logo"
                  sx={{ width: 28, height: 28, objectFit: 'contain' }}
                />
              </Box>
              {/* Brand text hides on phones so the top bar fits 375 px. */}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography
                  variant="h6" component="div"
                  sx={{
                    fontFamily: 'Sora, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    letterSpacing: '-0.02em',
                    color: tokens.white,
                    lineHeight: 1.2,
                  }}
                >
                  IITSM Enterprise
                </Typography>
                <Tooltip title={rtConfig.hint} arrow placement="bottom-start">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.7,
                      mt: 0.2,
                      cursor: 'default',
                    }}
                  >
                    <Box
                      sx={{
                        width: 6.5,
                        height: 6.5,
                        borderRadius: '50%',
                        bgcolor: rtConfig.color,
                        boxShadow: realtimeStatus === 'connected' ? `0 0 8px ${rtConfig.color}` : 'none',
                        '@keyframes liveDotPulse': {
                          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                          '50%': { opacity: 0.35, transform: 'scale(0.85)' },
                        },
                        animation: isRtPulsing ? 'liveDotPulse 1.2s ease-in-out infinite' : 'none',
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: rtConfig.color,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        lineHeight: 1.2,
                      }}
                    >
                      {rtConfig.label}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Telemetry Status Pills */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1.5, ml: 1 }}>
           {/* removed the serv engine armed want the latency one to be chnaged here*/}
          </Box>

          {/* Incident Quick Search Bar */}
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
              border: `1px solid ${tokens.outlineVariant}`,
              borderRadius: '10px',
              px: 1.5,
              py: 0.4,
              width: { md: 240, lg: 320 },
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:focus-within': {
                borderColor: alpha(tokens.secondary, 0.5),
                boxShadow: `0 0 12px ${alpha(tokens.secondary, 0.2)}`,
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: tokens.outline }} />
            <InputBase
              inputRef={searchInputRef}
              placeholder="Search incidents, code, title..."
              inputProps={{ 'aria-label': 'Search incidents' }}
              onFocus={(e) => { window.dispatchEvent(new Event(OPEN_PALETTE_EVENT)); (e.target as HTMLInputElement).blur(); }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                color: tokens.onSurface,
                fontSize: 13,
                fontFamily: 'Geist, sans-serif',
                width: '100%',
                '& input::placeholder': { color: tokens.textDisabled, opacity: 1 },
              }}
            />
            <Tooltip title="Open the command palette (Ctrl+K / ⌘K)">
              <Box
                component="button"
                type="button"
                aria-label="Open command palette"
                onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
                sx={{
                  bgcolor: tokens.borderSubtle,
                  borderRadius: '4px',
                  px: 0.8,
                  py: 0.2,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: 0,
                  color: 'inherit',
                  '&:hover': { bgcolor: tokens.border },
                }}
              >
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.onSurfaceVariant }}>
                  ⌘K
                </Typography>
              </Box>
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Elevated Glassmorphic Workspace Switcher */}
          {availableWorkspaces.length > 1 && (
            <>
              <Button
                onClick={handleWorkspaceClick}
                aria-controls={isWorkspaceMenuOpen ? 'workspace-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isWorkspaceMenuOpen ? 'true' : undefined}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  height: 36,
                  bgcolor: isWorkspaceMenuOpen
                    ? tokens.outlineVariant
                    : tokens.hover,
                  border: '1px solid',
                  borderColor: isWorkspaceMenuOpen
                    ? alpha(tokens.secondaryLight, 0.5)
                    : alpha(tokens.white, 0.1),
                  borderRadius: '8px',
                  color: tokens.slate200,
                  textTransform: 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: tokens.outlineVariant,
                    borderColor: alpha(tokens.white, 0.2),
                  },
                }}
              >
                {(() => {
                  const WIcon = WORKSPACE_META[activeWorkspace]?.icon || AdminPanelSettingsIcon;
                  return <WIcon sx={{ fontSize: 18, color: tokens.secondaryLight }} />;
                })()}
                <Typography
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    fontSize: 13,
                    fontWeight: 600,
                    color: tokens.white,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {WORKSPACE_META[activeWorkspace]?.label || WS_LABEL[activeWorkspace]}
                </Typography>
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: 18,
                    color: tokens.onSurfaceVariant,
                    transform: isWorkspaceMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </Button>

              <Menu
                id="workspace-menu"
                anchorEl={workspaceAnchorEl}
                open={isWorkspaceMenuOpen}
                onClose={handleWorkspaceClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                TransitionProps={{ timeout: 120 }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    p: 0.75,
                    bgcolor: `${tokens.surfaceContainerLow} !important`,
                    backdropFilter: 'blur(12px) !important',
                    WebkitBackdropFilter: 'blur(12px) !important',
                    border: `1px solid ${alpha(tokens.white, 0.1)} !important`,
                    borderRadius: '8px !important',
                    boxShadow: `0 8px 24px ${alpha(tokens.black, 0.5)} !important`,
                    transform: 'translateZ(0)',
                  },
                }}
              >
                <Typography
                  sx={{
                    px: 1.5,
                    py: 0.8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: tokens.textDisabled,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Switch Workspace
                </Typography>
                <Divider sx={{ borderColor: tokens.borderSubtle, my: 0.5 }} />

                {availableWorkspaces.map((w) => {
                  const meta = WORKSPACE_META[w];
                  const isCurrent = w === activeWorkspace;
                  const WIcon = meta?.icon || AdminPanelSettingsIcon;
                  return (
                    <MenuItem
                      key={w}
                      onClick={() => handleWorkspaceSelect(w)}
                      sx={{
                        py: 0.8,
                        px: 1.5,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        bgcolor: isCurrent ? `${alpha(tokens.secondaryLight, 0.08)} !important` : 'transparent',
                        '&:hover': {
                          bgcolor: `${tokens.borderSubtle} !important`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <WIcon sx={{ fontSize: 18, color: isCurrent ? tokens.secondaryLight : tokens.onSurfaceVariant }} />
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: isCurrent ? 600 : 400,
                            color: isCurrent ? tokens.white : tokens.slate300,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {meta?.label || WS_LABEL[w]}
                        </Typography>
                      </Box>
                      {isCurrent && (
                        <CheckIcon sx={{ fontSize: 16, color: tokens.secondaryLight }} />
                      )}
                    </MenuItem>
                  );
                })}
              </Menu>
            </>
          )}

          {/* Notifications Button */}
          <IconButton
            component={NavLink}
            to="/notifications"
            aria-label="Notifications"
            sx={{
              color: tokens.onSurface,
              bgcolor: alpha(tokens.surfaceContainerLow, 0.8),
              border: `1px solid ${tokens.outlineVariant}`,
              width: 36,
              height: 36,
              borderRadius: '8px',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(tokens.primary, 0.15),
                borderColor: alpha(tokens.primary, 0.4),
                color: tokens.white,
              },
            }}
          >
            <Badge
              badgeContent={unread}
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: tokens.danger,
                  color: tokens.white,
                  fontSize: 10.5,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  height: 18,
                  minWidth: 18,
                  boxShadow: `0 0 6px ${alpha(tokens.danger, 0.6)}`,
                },
              }}
            >
              <NotificationsIcon sx={{ fontSize: 18 }} />
            </Badge>
          </IconButton>

          {/* Humanized User Profile Trigger (Google / Linear style) */}
          <Box
            component="button"
            type="button"
            aria-label="Account profile and settings"
            aria-haspopup="true"
            aria-expanded={Boolean(accountAnchorEl)}
            onClick={(e: React.MouseEvent<HTMLElement>) => setAccountAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              p: '3px 10px 3px 4px',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
              bgcolor: Boolean(accountAnchorEl) ? tokens.outlineVariant : alpha(tokens.surfaceContainerLow, 0.75),
              border: '1px solid',
              borderColor: Boolean(accountAnchorEl) ? alpha(tokens.secondary, 0.5) : tokens.outlineVariant,
              borderRadius: '9999px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: tokens.outlineVariant,
                borderColor: alpha(tokens.white, 0.25),
                boxShadow: `0 0 12px ${alpha(tokens.secondary, 0.15)}`,
              },
            }}
          >
            <Box
              sx={{
                p: '2px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: 12.5,
                  fontWeight: 700,
                  bgcolor: tokens.surfaceContainerLowest,
                  color: tokens.white,
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </Avatar>
            </Box>
            <Typography
              sx={{
                display: { xs: 'none', sm: 'block' },
                fontSize: 13,
                fontWeight: 600,
                color: tokens.onSurface,
                whiteSpace: 'nowrap',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name ?? 'Account'}
            </Typography>
            <KeyboardArrowDownIcon
              sx={{
                fontSize: 18,
                color: tokens.onSurfaceVariant,
                transform: Boolean(accountAnchorEl) ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </Box>

          {/* Google / Gmail Style Account Popover Menu */}
          <Menu
            anchorEl={accountAnchorEl}
            open={Boolean(accountAnchorEl)}
            onClose={() => setAccountAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            TransitionProps={{ timeout: 120 }}
            PaperProps={{
              sx: {
                mt: 1.5,
                width: 340,
                maxWidth: '92vw',
                p: 2,
                borderRadius: '20px !important',
                bgcolor: `${tokens.surfaceContainerLow} !important`,
                backdropFilter: 'blur(12px) !important',
                WebkitBackdropFilter: 'blur(12px) !important',
                border: `1px solid ${alpha(tokens.white, 0.12)} !important`,
                boxShadow: `0 24px 64px -8px ${alpha(tokens.black, 0.85)}, 0 0 24px -2px ${alpha(tokens.primary, 0.2)} !important`,
                transform: 'translateZ(0)',
              },
            }}
          >
            {/* Top Close Row */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setAccountAnchorEl(null)}
                aria-label="Close account menu"
                sx={{
                  color: tokens.onSurfaceVariant,
                  '&:hover': { color: tokens.white, bgcolor: tokens.borderSubtle },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* User Profile Card (Gmail style) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.8,
                borderRadius: '16px',
                bgcolor: alpha(tokens.surfaceContainerLowest, 0.7),
                border: `1px solid ${tokens.outlineVariant}`,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  p: '3px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.secondary})`,
                  flexShrink: 0,
                  boxShadow: `0 0 16px ${alpha(tokens.primary, 0.3)}`,
                }}
              >
                <Avatar
                  sx={{
                    width: 50,
                    height: 50,
                    fontSize: 20,
                    fontWeight: 700,
                    bgcolor: tokens.surfaceContainerLowest,
                    color: tokens.white,
                  }}
                >
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </Avatar>
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: tokens.white,
                    fontFamily: 'Sora, sans-serif',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name ?? 'User'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: tokens.onSurfaceVariant,
                    lineHeight: 1.3,
                    mt: 0.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.email || 'user@iitsm.local'}
                </Typography>
                <Box sx={{ mt: 0.8 }}>
                  <Chip
                    label={WORKSPACE_META[activeWorkspace]?.label || (user?.roles?.[0] ? user.roles[0].replace('_', ' ') : 'EMPLOYEE')}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: alpha(tokens.secondary, 0.15),
                      color: tokens.secondaryLight,
                      border: `1px solid ${alpha(tokens.secondary, 0.3)}`,
                      px: 0.5,
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Account Action Buttons */}
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              <Button
                fullWidth
                onClick={() => {
                  setAccountAnchorEl(null);
                  navigate('/account/security');
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  p: '10px 14px',
                  borderRadius: '12px',
                  color: tokens.onSurface,
                  bgcolor: alpha(tokens.surfaceContainerLowest, 0.5),
                  border: `1px solid ${tokens.outlineVariant}`,
                  textTransform: 'none',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: tokens.borderSubtle,
                    borderColor: alpha(tokens.white, 0.2),
                    transform: 'translateX(2px)',
                  },
                }}
              >
                <SecurityIcon sx={{ fontSize: 20, color: tokens.secondaryLight }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.white, lineHeight: 1.2 }}>
                    Account security &amp; 2FA
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: tokens.textDisabled, lineHeight: 1.2, mt: 0.2 }}>
                    Password, MFA tokens and sessions
                  </Typography>
                </Box>
              </Button>

              <Button
                fullWidth
                onClick={() => {
                  setAccountAnchorEl(null);
                  navigate('/notifications');
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  p: '10px 14px',
                  borderRadius: '12px',
                  color: tokens.onSurface,
                  bgcolor: alpha(tokens.surfaceContainerLowest, 0.5),
                  border: `1px solid ${tokens.outlineVariant}`,
                  textTransform: 'none',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: tokens.borderSubtle,
                    borderColor: alpha(tokens.white, 0.2),
                    transform: 'translateX(2px)',
                  },
                }}
              >
                <NotificationsNoneIcon sx={{ fontSize: 20, color: tokens.onSurfaceVariant }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.white, lineHeight: 1.2 }}>
                    Notification preferences
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: tokens.textDisabled, lineHeight: 1.2, mt: 0.2 }}>
                    Email, in-app and escalation alerts
                  </Typography>
                </Box>
              </Button>
            </Stack>

            <Divider sx={{ borderColor: tokens.borderSubtle, my: 1 }} />

            {/* Integrated Sign Out Button (Gmail style) */}
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setAccountAnchorEl(null);
                signOut();
              }}
              startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
              sx={{
                p: '10px 14px',
                borderRadius: '12px',
                color: tokens.onSurface,
                borderColor: alpha(tokens.white, 0.15),
                bgcolor: alpha(tokens.surfaceContainerLowest, 0.6),
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 13.5,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(tokens.danger, 0.15),
                  borderColor: alpha(tokens.danger, 0.5),
                  color: tokens.errorLight,
                  boxShadow: `0 0 14px ${alpha(tokens.danger, 0.2)}`,
                },
              }}
            >
              Sign out
            </Button>

            {/* Footer / Status */}
            <Typography
              sx={{
                textAlign: 'center',
                fontSize: 10.5,
                color: tokens.textDisabled,
                mt: 1.5,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              IITSM Enterprise · Active Session
            </Typography>
          </Menu>
        </Toolbar>

      </AppBar>

      {/* Drawer Content */}
      {(() => {
        const drawerContent = (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Toolbar sx={{ minHeight: '64px !important' }} />
              <Box sx={{ px: 1.5, py: 1.5 }}>
                <List disablePadding component="nav" aria-label={`${activeWorkspace} navigation`}>
                  {navItems.map((item, idx) => {
                    const RawIcon = NAV_ICONS[item.label] || DashboardIcon;
                    const IconComp = (RawIcon && (RawIcon as any).default) ? (RawIcon as any).default : RawIcon;
                    const isExact = location.pathname === item.to;
                    const isSubRoute =
                      item.to !== '/' &&
                      item.to !== '/employee/home' &&
                      item.to !== '/admin/dashboard' &&
                      location.pathname.startsWith(item.to + '/');
                    // Only the most specific matching item is highlighted (Services vs Dependency graph).
                    const moreSpecific = navItems.some((o) => o.to !== item.to && o.to.length > item.to.length && (location.pathname === o.to || location.pathname.startsWith(o.to + '/')));
                    const isActive = (isExact || isSubRoute) && !moreSpecific;

                    return (
                      <Fragment key={item.to}>
                      {item.group && item.group !== navItems[idx - 1]?.group && (
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.textDisabled, textTransform: 'uppercase', letterSpacing: '0.08em', px: 1.2, mt: idx === 0 ? 0.5 : 1.2, mb: 0.4 }}>
                          {item.group}
                        </Typography>
                      )}
                      <ListItemButton
                        key={item.to}
                        component={NavLink}
                        to={item.to}
                        onClick={() => {
                          if (isMobile) setMobileOpen(false);
                        }}
                        sx={{
                          borderRadius: '8px',
                          mb: 0.3,
                          py: 0.6,
                          px: 1.2,
                          color: isActive ? tokens.white : tokens.onSurfaceVariant,
                          background: isActive
                            ? `linear-gradient(90deg, ${alpha(tokens.primary, 0.22)} 0%, ${alpha(tokens.secondary, 0.12)} 100%)`
                            : 'transparent',
                          border: isActive
                            ? `1px solid ${alpha(tokens.primary, 0.35)}`
                            : '1px solid transparent',
                          fontWeight: isActive ? 600 : 500,
                          transition: 'all 0.18s ease-in-out',
                          boxShadow: isActive ? `0 0 16px ${alpha(tokens.primary, 0.15)}` : 'none',
                          '&:hover': {
                            bgcolor: isActive ? undefined : tokens.hover,
                            color: tokens.onSurface,
                            borderColor: isActive ? alpha(tokens.primary, 0.5) : tokens.outlineVariant,
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 28,
                            color: isActive ? tokens.secondaryLight : tokens.textDisabled,
                            transition: 'color 0.18s ease',
                          }}
                        >
                          <IconComp sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: 12.5,
                            fontWeight: isActive ? 600 : 500,
                            fontFamily: 'Geist, sans-serif',
                          }}
                        />
                      </ListItemButton>
                      </Fragment>
                    );
                  })}
                </List>
              </Box>
            </Box>
          </Box>
        );

        return (
          <>
            {/* Mobile Temporary Drawer */}
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': {
                  width: DRAWER_WIDTH,
                  bgcolor: tokens.surfaceDim,
                  borderRight: `1px solid ${tokens.borderSubtle}`,
                  boxSizing: 'border-box',
                },
              }}
            >
              {drawerContent}
            </Drawer>

            {/* Desktop Permanent Drawer */}
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', sm: 'block' },
                width: sidebarOpen ? DRAWER_WIDTH : 0,
                flexShrink: 0,
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '& .MuiDrawer-paper': {
                  width: DRAWER_WIDTH,
                  boxSizing: 'border-box',
                  borderRight: `1px solid ${tokens.borderSubtle}`,
                  bgcolor: tokens.surfaceDim,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  zIndex: 10,
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  transform: sidebarOpen ? 'translateX(0)' : `translateX(-${DRAWER_WIDTH}px)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'transform',
                },
              }}
            >
              {drawerContent}
            </Drawer>
          </>
        );
      })()}

      {/* Main Content Area */}
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          outline: 'none',
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { sm: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
          bgcolor: tokens.background,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <CommandPalette />
        <ConnectionBanner />
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, '&:empty': { display: 'none' } }}><DirectorBar /></Box>
        <Outlet />
      </Box>
    </Box>
  );
}
