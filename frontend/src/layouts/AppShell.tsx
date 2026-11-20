import type { ElementType } from 'react';
import React, { Fragment, useState, useRef, useEffect } from 'react';
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
} from '@mui/icons-material';

import { useQuery } from '@tanstack/react-query';
import { useAuth, Workspace, HOME } from '../auth/AuthContext';
import { NAV } from './navConfig';
import { unreadCount } from '../api/notifications';
import ConnectionBanner from '../components/ConnectionBanner';
import CommandPalette, { OPEN_PALETTE_EVENT } from '../components/CommandPalette';
import RealtimeStatusPill from '../components/RealtimeStatusPill';
import logoIcon from '../assets/logo.png';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
const WS_LABEL: Record<Workspace, string> = {
  employee: 'Employee View',
  tech: 'Technician View',
  lead: 'Team Lead View',
  admin: 'Admin View',
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
  tech: {
    label: 'Technician View',
    icon: EngineeringIcon,
  },
  lead: {
    label: 'Team Lead View',
    icon: SupervisorAccountIcon,
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
    setWorkspace(w);
    setWorkspaceAnchorEl(null);
  };

  // Impersonation removed: no backend supports it

  const activeWorkspace: Workspace = (workspace && NAV[workspace] ? workspace : workspaces[0] || 'employee');
  const navItems = (NAV[activeWorkspace] || []).filter((i) => !i.permission || !!user?.permissions?.includes(i.permission));

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
      {/* Background Kinetic Ambient Glows */}
      <Box
        sx={{
          position: 'fixed',
          top: -120,
          left: -120,
          width: 480,
          height: 480,
          borderRadius: '50%',
          bgcolor: alpha(tokens.primary, 0.08),
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
          bgcolor: alpha(tokens.secondary, 0.06),
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
          bgcolor: alpha(tokens.surface, 0.82),
          backdropFilter: 'blur(20px)',
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
              <Box>
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
                <Typography
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: tokens.secondaryLight,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    lineHeight: 1.2,
                  }}
                >
                  COMMAND CENTRE
                </Typography>
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
          {workspaces.length > 1 && (
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
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    p: 0.75,
                    bgcolor: `${tokens.surfaceContainerLow} !important`,
                    border: `1px solid ${alpha(tokens.white, 0.1)} !important`,
                    borderRadius: '8px !important',
                    boxShadow: `0 8px 24px ${alpha(tokens.black, 0.5)} !important`,
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

                {workspaces.map((w) => {
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

          <RealtimeStatusPill />

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
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: tokens.tertiary,
                  color: tokens.white,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  boxShadow: `0 0 8px ${alpha(tokens.tertiary, 0.8)}`,
                },
              }}
            >
              <NotificationsIcon sx={{ fontSize: 18 }} />
            </Badge>
          </IconButton>

          {/* User Profile Pill */}
          <Box
            component="button"
            type="button"
            aria-label="Account menu"
            aria-haspopup="true"
            onClick={(e: React.MouseEvent<HTMLElement>) => setAccountAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              px: 1.2,
              py: 0.5,
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
              bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
              border: `1px solid ${tokens.outlineVariant}`,
              borderRadius: '8px',
              '&:hover': { borderColor: alpha(tokens.white, 0.2) },
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', textAlign: 'right' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.onSurface, lineHeight: 1.2 }}>
                {user?.name ?? 'User'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  color: tokens.secondaryLight,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {WORKSPACE_META[activeWorkspace]?.label || WS_LABEL[activeWorkspace] || 'WORKSPACE'}
              </Typography>
            </Box>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: tokens.primary,
                color: tokens.white,
                boxShadow: `0 0 12px ${alpha(tokens.primary, 0.4)}`,
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
          </Box>

          <Menu
            anchorEl={accountAnchorEl}
            open={Boolean(accountAnchorEl)}
            onClose={() => setAccountAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { setAccountAnchorEl(null); navigate('/account/security'); }}>Account security</MenuItem>
            <MenuItem onClick={() => { setAccountAnchorEl(null); navigate('/notifications'); }}>Notification preferences</MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAccountAnchorEl(null); signOut(); }}>Sign out</MenuItem>
            <MenuItem onClick={() => { setAccountAnchorEl(null); signOut(); }}>Sign out everywhere</MenuItem>
          </Menu>

          {/* Logout Button */}
          <Button
            variant="outlined"
            size="small"
            onClick={signOut}
            startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
            sx={{
              borderColor: alpha(tokens.white, 0.1),
              color: tokens.onSurfaceVariant,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 12.5,
              borderRadius: '8px',
              height: 34,
              px: 1.5,
              bgcolor: alpha(tokens.surfaceContainerLow, 0.5),
              '&:hover': {
                borderColor: tokens.danger,
                bgcolor: alpha(tokens.danger, 0.12),
                color: tokens.errorLight,
              },
            }}
          >
            Logout
          </Button>
        </Toolbar>

      </AppBar>

      {/* Drawer Content */}
      {(() => {
        const drawerContent = (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Toolbar sx={{ minHeight: '64px !important' }} />
              <Box sx={{ px: 2, py: 2 }}>
                <Typography
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: tokens.textDisabled,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    px: 1.2,
                    mb: 1.2,
                  }}
                >
                  {activeWorkspace.toUpperCase()} CONSOLE
                </Typography>
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
                    const isActive = isExact || isSubRoute;

                    return (
                      <Fragment key={item.to}>
                      {item.group && item.group !== navItems[idx - 1]?.group && (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.textDisabled, textTransform: 'uppercase', letterSpacing: '0.08em', px: 1.2, mt: idx === 0 ? 0 : 1.5, mb: 0.6 }}>
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
                          mb: 0.6,
                          py: 0.9,
                          px: 1.4,
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
                            minWidth: 30,
                            color: isActive ? tokens.secondaryLight : tokens.textDisabled,
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
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
          bgcolor: tokens.background,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <CommandPalette />
        <ConnectionBanner />
        <Outlet />
      </Box>
    </Box>
  );
}
