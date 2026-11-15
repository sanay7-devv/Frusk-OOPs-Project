import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll as DoneAllIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Forum as ForumIcon,
  TaskAlt as TaskAltIcon,
  SaveAs as SaveAsIcon,
  AssignmentInd as AssignmentIndIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Schedule as ScheduleIcon,
  Lan as LanIcon,
  Reply as ReplyIcon,
  RateReview as RateReviewIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  NotificationsPaused as NotificationsPausedIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { markRead as markReadApi, markAllRead as markAllReadApi } from '../../api/notifications';

export interface NotificationItem {
  id: string;
  category: 'action' | 'sla' | 'assigned' | 'submitted' | 'system';
  status: 'unread' | 'read';
  group: 'today' | 'earlier';
  title: string;
  incidentCode?: string;
  badgeLabel?: string;
  badgeType?: 'action' | 'pending' | 'sla' | 'info';
  message: string;
  sender?: string;
  timeAgo: string;
  service: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  actions: ('reply' | 'verify' | 'runbook' | 'read')[];
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    category: 'action',
    status: 'unread',
    group: 'today',
    title: 'Clarification Requested on',
    incidentCode: 'INC-2026-00104',
    badgeLabel: 'Action Required',
    badgeType: 'action',
    sender: 'Marcus Chen (Support SRE)',
    message: 'Could you attach the latest AnyConnect diagnostic bundle from /var/log/cisco? We noticed intermittent TLS handshake drops.',
    timeAgo: '18 mins ago',
    service: 'Corporate VPN',
    priority: 'P2',
    actions: ['reply', 'read'],
  },
  {
    id: 'notif-2',
    category: 'action',
    status: 'unread',
    group: 'today',
    title: 'Incident Resolved:',
    incidentCode: 'INC-2026-00082',
    badgeLabel: 'Pending Verification',
    badgeType: 'pending',
    sender: 'Priya Patel',
    message: 'DisplayLink firmware patch v3.8.1 deployed to your device. Please verify your dual monitor setup.',
    timeAgo: '1 hour ago',
    service: 'Hardware Support',
    priority: 'P4',
    actions: ['verify', 'read'],
  },
  {
    id: 'notif-3',
    category: 'sla',
    status: 'unread',
    group: 'today',
    title: 'SLA Warning: Response Due in 15 Minutes',
    incidentCode: 'INC-2026-00095',
    badgeLabel: 'Critical SLA',
    badgeType: 'sla',
    message: 'Incident INC-2026-00095 has entered the critical SLA window (<25% margin remaining). Tier-2 Lead SRE has been automatically notified and incident escalation protocol initiated.',
    timeAgo: '2 hours ago',
    service: 'Payment Ingress',
    priority: 'P1',
    actions: ['runbook', 'read'],
  },
  {
    id: 'notif-4',
    category: 'assigned',
    status: 'read',
    group: 'earlier',
    title: 'Incident Assigned:',
    incidentCode: 'INC-2026-00108',
    message: 'Your report “SSO Login Loop for West Coast remote workers” has been assigned to Identity Squad (Lead: Marcus Chen).',
    timeAgo: 'Yesterday at 16:42',
    service: 'Identity & SSO',
    actions: ['read'],
  },
  {
    id: 'notif-5',
    category: 'submitted',
    status: 'read',
    group: 'earlier',
    title: 'Incident Submitted:',
    incidentCode: 'INC-2026-00108',
    message: 'Incident successfully logged with AI triage score P2 High. Estimated initial response within 15 minutes.',
    timeAgo: 'Yesterday at 16:30',
    service: 'Auto-Triage Complete',
    priority: 'P2',
    actions: ['read'],
  },
  {
    id: 'notif-6',
    category: 'sla',
    status: 'read',
    group: 'earlier',
    title: 'SLA Restored:',
    incidentCode: 'INC-2026-00072',
    message: 'Incident INC-2026-00072 recovery confirmed under MTTR SLA targets.',
    timeAgo: 'Feb 23 at 11:15',
    service: 'DevOps Platform Team',
    actions: ['read'],
  },
  {
    id: 'notif-7',
    category: 'system',
    status: 'read',
    group: 'earlier',
    title: 'Policy Update: Multi-Factor Authentication',
    message: 'Mandatory FIDO2 WebAuthn authentication policy enforced for all internal subnets.',
    timeAgo: 'Feb 22 at 09:00',
    service: 'Global SecOps',
    actions: ['read'],
  },
  {
    id: 'notif-8',
    category: 'system',
    status: 'read',
    group: 'earlier',
    title: 'Scheduled Maintenance Window',
    message: 'Core Kubernetes cluster rolling upgrade scheduled for Sunday 02:00 IST.',
    timeAgo: 'Feb 21 at 14:00',
    service: 'Infrastructure Fleet',
    actions: ['read'],
  },
];

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'ACTION' | 'SLA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [replyItem, setReplyItem] = useState<NotificationItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [verifyItem, setVerifyItem] = useState<NotificationItem | null>(null);
  const [ratingVal, setRatingVal] = useState<number | null>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [runbookItem, setRunbookItem] = useState<NotificationItem | null>(null);

  // Preference switches
  const [p1Alerts, setP1Alerts] = useState(true);
  const [techMsg, setTechMsg] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const actionCount = notifications.filter((n) => n.category === 'action').length;
  const slaCount = notifications.filter((n) => n.category === 'sla').length;

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'read' as const } : n))
    );
    markReadApi(1).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['unread'] });
    toast('Notification marked as read.', 'info');
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: 'read' as const }))
    );
    markAllReadApi().catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['unread'] });
    toast('All notifications marked as read.', 'success');
  };

  const handleSendReply = () => {
    if (!replyItem) return;
    handleMarkRead(replyItem.id);
    toast(`Reply and clarification delivered for ${replyItem.incidentCode}.`, 'success');
    setReplyItem(null);
    setReplyText('');
  };

  const handleConfirmVerification = () => {
    if (!verifyItem) return;
    handleMarkRead(verifyItem.id);
    toast(`Verification submitted for ${verifyItem.incidentCode} with ${ratingVal} stars. Thanks!`, 'success');
    setVerifyItem(null);
    setRatingComment('');
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === 'UNREAD' && n.status !== 'unread') return false;
    if (filterTab === 'ACTION' && n.category !== 'action') return false;
    if (filterTab === 'SLA' && n.category !== 'sla') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.incidentCode && n.incidentCode.toLowerCase().includes(q)) ||
        n.service.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const todayNotifications = filteredNotifications.filter((n) => n.group === 'today');
  const earlierNotifications = filteredNotifications.filter((n) => n.group === 'earlier');

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', pb: 6, pt: 1 }}>
      {/* 1. BREADCRUMB & TOP UTILITY STRIP */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
          <NavLink to="/employee/home" style={{ color: '#4cd7f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <HomeIcon sx={{ fontSize: 16 }} />
            <span>Portal</span>
          </NavLink>
          <ChevronRightIcon sx={{ fontSize: 16, color: '#64748b' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
            Notification Center
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            bgcolor: 'rgba(18, 22, 34, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 8, height: 8 }}>
            <Box
              sx={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#06b6d4',
                opacity: 0.6,
                animation: 'pulse 1.5s infinite',
              }}
            />
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#06b6d4', position: 'relative' }} />
          </Box>
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, color: '#4cd7f6' }}>
            STREAM_SYNCED • LIVE
          </Typography>
        </Box>
      </Box>

      {/* 2. HEADER SECTION WITH TITLE, UNREAD COUNTER & ACTIONS */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2.5,
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#141824',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Notification Center
            </Typography>
            {unreadCount > 0 ? (
              <Chip
                label={`${unreadCount} New`}
                size="small"
                sx={{
                  bgcolor: 'rgba(247, 81, 161, 0.15)',
                  color: '#ffb0cd',
                  border: '1px solid rgba(247, 81, 161, 0.35)',
                  fontWeight: 800,
                  fontSize: 11,
                  height: 22,
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.04em',
                }}
              />
            ) : (
              <Chip
                label="All Caught Up"
                size="small"
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.15)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 13.5, color: '#94a3b8', maxWidth: 580, fontFamily: 'Geist, sans-serif' }}>
            Real-time updates on your incident reports, SLA countdown alerts, and technician communications.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.12)',
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              color: '#dfe2ef',
              fontWeight: 700,
              fontSize: 12.5,
              textTransform: 'none',
              borderRadius: '8px',
              px: 1.8,
              py: 0.6,
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.12)', borderColor: '#6366f1', color: '#c0c1ff' },
            }}
          >
            Mark All as Read
          </Button>
          <IconButton
            size="small"
            onClick={() => setPrefsOpen(true)}
            title="Notification Preferences"
            sx={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              p: 0.8,
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              color: '#94a3b8',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#dfe2ef' },
            }}
          >
            <SettingsIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Paper>

      {/* 3. FILTER TOOLBAR: TABS + QUICK SEARCH */}
      <Paper
        elevation={0}
        sx={{
          p: 1.8,
          mb: 3,
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#141824',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Tabs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflowX: 'auto', pb: { xs: 0.5, md: 0 } }}>
          {(
            [
              { id: 'ALL', label: `All Notifications (${notifications.length})` },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'ACTION', label: `Action Required (${actionCount})` },
              { id: 'SLA', label: `SLA Alerts (${slaCount})` },
            ] as const
          ).map((tab) => {
            const isSelected = filterTab === tab.id;
            return (
              <Button
                key={tab.id}
                size="small"
                onClick={() => setFilterTab(tab.id)}
                sx={{
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: 12,
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  bgcolor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  borderRadius: '8px',
                  px: 1.5,
                  py: 0.5,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)', color: '#dfe2ef' },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>

        {/* Search */}
        <TextField
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter notifications..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748b', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', md: 240 },
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              borderRadius: '8px',
              fontSize: 12.5,
            },
          }}
        />
      </Paper>

      {/* 4. CHRONOLOGICAL FEED */}
      {filteredNotifications.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: '#141824',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NotificationsPausedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#ffffff', fontSize: 16 }}>
            No notifications found
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, fontFamily: 'Geist, sans-serif' }}>
            No active items match your selected filter criteria. You can clear filters or adjust search parameters.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setFilterTab('ALL');
              setSearchQuery('');
            }}
            sx={{
              mt: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#4cd7f6',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              '&:hover': { borderColor: '#06b6d4', bgcolor: 'rgba(6, 182, 212, 0.1)' },
            }}
          >
            Reset Filters
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* GROUP: TODAY */}
          {todayNotifications.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: '#4cd7f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Today
                  </Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                  {todayNotifications.length} items
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {todayNotifications.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={handleMarkRead}
                    onReply={() => setReplyItem(notif)}
                    onVerify={() => setVerifyItem(notif)}
                    onRunbook={() => setRunbookItem(notif)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* GROUP: EARLIER THIS WEEK */}
          {earlierNotifications.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Earlier this week
                  </Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                  {earlierNotifications.length} items
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {earlierNotifications.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={handleMarkRead}
                    onReply={() => setReplyItem(notif)}
                    onVerify={() => setVerifyItem(notif)}
                    onRunbook={() => setRunbookItem(notif)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* 5. FOOTER SUMMARY */}
      {filteredNotifications.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 2,
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: '#141824',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#94a3b8',
            fontSize: 12.5,
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontFamily: 'Geist, sans-serif' }}>
            Showing <strong>{filteredNotifications.length}</strong> of <strong>{notifications.length}</strong> notifications
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" disabled sx={{ color: '#64748b' }}>
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ px: 1.2, py: 0.2, bgcolor: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '4px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#c0c1ff' }}>
              1
            </Box>
            <IconButton size="small" disabled sx={{ color: '#64748b' }}>
              <ChevronRightIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* DIALOG 1: REPLY TO TECHNICIAN */}
      <Dialog
        open={Boolean(replyItem)}
        onClose={() => setReplyItem(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 24px rgba(99, 102, 241, 0.2)',
          },
        }}
      >
        {replyItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#4cd7f6' }}>
                  REPLY TO SRE // {replyItem.incidentCode}
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', fontSize: 16 }}>
                  {replyItem.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setReplyItem(null)} size="small" sx={{ color: '#94a3b8' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Paper sx={{ p: 1.8, bgcolor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', mb: 2 }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: '#c0c1ff' }}>
                  Technician Request:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#dfe2ef', mt: 0.3, fontFamily: 'Geist, sans-serif' }}>
                  &ldquo;{replyItem.message}&rdquo;
                </Typography>
              </Paper>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your clarification or paste terminal log snippet..."
                sx={{
                  bgcolor: 'rgba(18, 22, 34, 0.7)',
                  borderRadius: '10px',
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReplyItem(null)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Send Clarification
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 2: VERIFICATION & CSAT RATING */}
      <Dialog
        open={Boolean(verifyItem)}
        onClose={() => setVerifyItem(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 24px rgba(99, 102, 241, 0.2)',
          },
        }}
      >
        {verifyItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', fontSize: 16 }}>
                Verify Resolution
              </Typography>
              <IconButton onClick={() => setVerifyItem(null)} size="small" sx={{ color: '#94a3b8' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Typography sx={{ fontSize: 13, color: '#dfe2ef', mb: 2, fontFamily: 'Geist, sans-serif' }}>
                Please confirm that incident <strong>{verifyItem.incidentCode}</strong> has been resolved to your satisfaction:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', mb: 1, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                  Rate Support Experience
                </Typography>
                <Rating
                  value={ratingVal}
                  onChange={(_, val) => setRatingVal(val)}
                  size="large"
                  sx={{ color: '#4cd7f6' }}
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Optional feedback for the resolution engineering team..."
                sx={{
                  bgcolor: 'rgba(18, 22, 34, 0.7)',
                  borderRadius: '10px',
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setVerifyItem(null)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmVerification}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Confirm Verified &amp; Rate
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 3: NOTIFICATION PREFERENCES */}
      <Dialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 24px rgba(99, 102, 241, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', fontSize: 16 }}>
            Notification Preferences
          </Typography>
          <IconButton onClick={() => setPrefsOpen(false)} size="small" sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <FormControlLabel
              control={<Switch checked={p1Alerts} onChange={(e) => setP1Alerts(e.target.checked)} color="primary" />}
              label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>P1 / P2 Major Incident Alerts</Typography>}
            />
            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: -1, ml: 4 }}>
              Immediate push alerts for enterprise wide degradation.
            </Typography>

            <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

            <FormControlLabel
              control={<Switch checked={techMsg} onChange={(e) => setTechMsg(e.target.checked)} color="primary" />}
              label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>Technician Clarification Prompts</Typography>}
            />
            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: -1, ml: 4 }}>
              Alerts when SRE on-call engineers request diagnostic logs.
            </Typography>

            <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

            <FormControlLabel
              control={<Switch checked={slaAlerts} onChange={(e) => setSlaAlerts(e.target.checked)} color="primary" />}
              label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>SLA Countdown Reminders</Typography>}
            />
            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: -1, ml: 4 }}>
              Warnings when an active incident approaches target breach time.
            </Typography>

            <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

            <FormControlLabel
              control={<Switch checked={emailDigest} onChange={(e) => setEmailDigest(e.target.checked)} color="primary" />}
              label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>Daily Email Incident Digest</Typography>}
            />
            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: -1, ml: 4 }}>
              Summary of tickets submitted and closed by your department.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              toast('Notification preferences saved.', 'success');
              setPrefsOpen(false);
            }}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 4: LIVE RUNBOOK QUICK VIEW */}
      <Dialog
        open={Boolean(runbookItem)}
        onClose={() => setRunbookItem(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 24px rgba(99, 102, 241, 0.2)',
          },
        }}
      >
        {runbookItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#f43f5e' }}>
                  CRITICAL SLA RUNBOOK // {runbookItem.incidentCode}
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', fontSize: 16 }}>
                  {runbookItem.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setRunbookItem(null)} size="small" sx={{ color: '#94a3b8' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', mb: 2 }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: '#ffb0cd' }}>
                  Auto-Escalation Active:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#ffdad6', mt: 0.5, fontFamily: 'Geist, sans-serif' }}>
                  {runbookItem.message}
                </Typography>
              </Paper>
              <Typography sx={{ fontSize: 13, color: '#ffffff', mb: 1, fontWeight: 600 }}>
                Service: {runbookItem.service} • Priority: {runbookItem.priority}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#94a3b8', fontFamily: 'Geist, sans-serif' }}>
                Tier-2 on-call engineers are monitoring response telemetry. You will receive an updated webhook notification as soon as the initial containment patch is verified.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setRunbookItem(null)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleMarkRead(runbookItem.id);
                  setRunbookItem(null);
                }}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Acknowledge Alert
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

// Reusable Notification Card Component
function NotificationCard({
  notif,
  onMarkRead,
  onReply,
  onVerify,
  onRunbook,
}: {
  notif: NotificationItem;
  onMarkRead: (id: string) => void;
  onReply: () => void;
  onVerify: () => void;
  onRunbook: () => void;
}) {
  const isUnread = notif.status === 'unread';

  // Category Icon
  let iconComp = <ForumIcon sx={{ fontSize: 20 }} />;
  let iconBg = 'rgba(99, 102, 241, 0.15)';
  let iconColor = '#c0c1ff';

  if (notif.category === 'action') {
    if (notif.badgeType === 'pending') {
      iconComp = <TaskAltIcon sx={{ fontSize: 20 }} />;
      iconBg = 'rgba(16, 185, 129, 0.15)';
      iconColor = '#6ee7b7';
    } else {
      iconComp = <ForumIcon sx={{ fontSize: 20 }} />;
      iconBg = 'rgba(99, 102, 241, 0.15)';
      iconColor = '#c0c1ff';
    }
  } else if (notif.category === 'sla') {
    iconComp = <SaveAsIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(244, 63, 94, 0.15)';
    iconColor = '#f43f5e';
  } else if (notif.category === 'assigned') {
    iconComp = <AssignmentIndIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(6, 182, 212, 0.15)';
    iconColor = '#4cd7f6';
  } else if (notif.category === 'submitted') {
    iconComp = <ConfirmationNumberIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(99, 102, 241, 0.12)';
    iconColor = '#c0c1ff';
  } else if (notif.category === 'system') {
    iconComp = <SecurityIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(255, 255, 255, 0.05)';
    iconColor = '#94a3b8';
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: '16px',
        border: isUnread ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
        bgcolor: isUnread ? 'rgba(99, 102, 241, 0.05)' : '#141824',
        position: 'relative',
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          borderColor: isUnread ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.12)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Unread indicator dot */}
        {isUnread && (
          <Box
            sx={{
              position: 'absolute',
              top: 18,
              right: 18,
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#06b6d4',
              boxShadow: '0 0 8px #06b6d4',
            }}
          />
        )}

        {/* Category Icon Badge */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: iconBg,
            color: iconColor,
            border: `1px solid ${iconColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 12px ${iconColor}20`,
          }}
        >
          {iconComp}
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
              {notif.title}{' '}
              {notif.incidentCode && (
                <span style={{ color: '#4cd7f6', fontFamily: 'JetBrains Mono, monospace' }}>
                  {notif.incidentCode}
                </span>
              )}
            </Typography>

            {notif.badgeLabel && (
              <Chip
                label={notif.badgeLabel}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono, monospace',
                  bgcolor:
                    notif.badgeType === 'sla'
                      ? 'rgba(244, 63, 94, 0.15)'
                      : notif.badgeType === 'action'
                      ? 'rgba(247, 81, 161, 0.15)'
                      : 'rgba(99, 102, 241, 0.15)',
                  color:
                    notif.badgeType === 'sla'
                      ? '#f43f5e'
                      : notif.badgeType === 'action'
                      ? '#ffb0cd'
                      : '#c0c1ff',
                  border: `1px solid ${
                    notif.badgeType === 'sla'
                      ? 'rgba(244, 63, 94, 0.35)'
                      : notif.badgeType === 'action'
                      ? 'rgba(247, 81, 161, 0.35)'
                      : 'rgba(99, 102, 241, 0.35)'
                  }`,
                }}
              />
            )}
          </Box>

          <Typography sx={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, mb: 1, fontFamily: 'Geist, sans-serif' }}>
            {notif.sender && (
              <strong style={{ color: '#dfe2ef' }}>{notif.sender}: </strong>
            )}
            {notif.message}
          </Typography>

          {/* Metadata Strip */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              fontSize: 11.5,
              color: '#64748b',
              fontFamily: 'JetBrains Mono, monospace',
              mb: notif.actions.length > 0 ? 1.5 : 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 13 }} />
              <span>{notif.timeAgo}</span>
            </Box>
            <span>•</span>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LanIcon sx={{ fontSize: 13 }} />
              <span>{notif.service}</span>
            </Box>
            {notif.priority && (
              <>
                <span>•</span>
                <Box
                  component="span"
                  sx={{
                    px: 0.8,
                    py: 0.1,
                    borderRadius: '4px',
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor:
                      notif.priority === 'P1'
                        ? 'rgba(244, 63, 94, 0.15)'
                        : notif.priority === 'P2'
                        ? 'rgba(251, 146, 60, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                    color:
                      notif.priority === 'P1'
                        ? '#f43f5e'
                        : notif.priority === 'P2'
                        ? '#fb923c'
                        : '#38bdf8',
                    border: `1px solid ${
                      notif.priority === 'P1'
                        ? 'rgba(244, 63, 94, 0.3)'
                        : notif.priority === 'P2'
                        ? 'rgba(251, 146, 60, 0.3)'
                        : 'rgba(56, 189, 248, 0.3)'
                    }`,
                  }}
                >
                  {notif.priority}
                </Box>
              </>
            )}
          </Box>

          {/* Quick Action Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {notif.actions.includes('reply') && (
              <Button
                size="small"
                variant="contained"
                onClick={onReply}
                startIcon={<ReplyIcon sx={{ fontSize: 15 }} />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.4,
                  boxShadow: '0 0 12px rgba(99, 102, 241, 0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)' },
                }}
              >
                Reply Now
              </Button>
            )}

            {notif.actions.includes('verify') && (
              <Button
                size="small"
                variant="contained"
                onClick={onVerify}
                startIcon={<RateReviewIcon sx={{ fontSize: 15 }} />}
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  color: '#6ee7b7',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.4,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.35)', color: '#ffffff' },
                }}
              >
                Verify &amp; Rate Resolution
              </Button>
            )}

            {notif.actions.includes('runbook') && (
              <Button
                size="small"
                variant="outlined"
                onClick={onRunbook}
                startIcon={<VisibilityIcon sx={{ fontSize: 15 }} />}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  color: '#dfe2ef',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.4,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.12)', borderColor: '#6366f1', color: '#c0c1ff' },
                }}
              >
                View Incident Live Runbook
              </Button>
            )}

            {isUnread && (
              <Button
                size="small"
                onClick={() => onMarkRead(notif.id)}
                sx={{
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.4,
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#dfe2ef' },
                }}
              >
                Mark as Read
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
