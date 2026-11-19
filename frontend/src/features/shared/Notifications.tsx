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
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  DoneAll as DoneAllIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Forum as ForumIcon,
  TaskAlt as TaskAltIcon,
  SaveAs as SaveAsIcon,
  AssignmentInd as AssignmentIndIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Schedule as ScheduleIcon,
  Reply as ReplyIcon,
  RateReview as RateReviewIcon,
  Close as CloseIcon,
  NotificationsPaused as NotificationsPausedIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
  PhoneAndroid as PhoneAndroidIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import {
  listNotifications,
  unreadCount as getUnreadCount,
  markRead as markReadApi,
  markAllRead as markAllReadApi,
  getNotificationPreferences,
  updateNotificationPreferences,
  PreferenceView,
} from '../../api/notifications';
import { provideInfo, verifyIncident, submitFeedback } from '../../api/incidents';
import type { AppNotification } from '../../api/types';
import { apiErrorMessage } from '../../utils/errors';
import PushDevicesDialog from './PushDevicesDialog';

function formatTimeAgo(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return isoString;
  }
}

// The backend sends the one final alert after level 3 as INCIDENT_ESCALATED with this title (notification-templates.properties, audience admin).
function isExhausted(n: AppNotification): boolean {
  return n.eventType === 'INCIDENT_ESCALATED' && n.title.startsWith('Escalation exhausted');
}

function isToday(isoString: string): boolean {
  try {
    const d = new Date(isoString);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  } catch {
    return false;
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'ACTION' | 'SLA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [replyItem, setReplyItem] = useState<AppNotification | null>(null);
  const [replyText, setReplyText] = useState('');
  const [verifyItem, setVerifyItem] = useState<AppNotification | null>(null);
  const [ratingVal, setRatingVal] = useState<number | null>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<PreferenceView[]>([]);

  // Real backend queries
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['notifications', page, filterTab === 'UNREAD'],
    queryFn: () => listNotifications({ page, unread: filterTab === 'UNREAD' ? true : undefined, size: 30 }),
  });

  const { data: unreadTotal = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
  });

  const { data: remotePrefs = [] } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
    enabled: prefsOpen,
  });

  // Sync remote preferences when loaded
  if (prefsOpen && remotePrefs.length > 0 && localPrefs.length === 0) {
    setLocalPrefs(remotePrefs);
  }

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread'] });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllReadApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread'] });
      toast('All notifications marked as read.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const savePrefsMutation = useMutation({
    mutationFn: (prefs: PreferenceView[]) =>
      updateNotificationPreferences(
        prefs.map((p) => ({ channel: p.channel, eventType: p.eventType, enabled: p.enabled }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast('Notification preferences saved.', 'success');
      setPrefsOpen(false);
    },
    onError: (err: any) => {
      toast(apiErrorMessage(err), 'error');
    },
  });

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate(id);
    toast('Notification marked as read.', 'info');
  };

  const handleSendReply = async () => {
    if (!replyItem || !replyItem.incidentId || !replyText.trim()) return;
    try {
      await provideInfo(replyItem.incidentId, replyText.trim());
      await markReadApi(replyItem.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast('Clarification delivered to technician.', 'success');
      setReplyItem(null);
      setReplyText('');
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const handleConfirmVerification = async () => {
    if (!verifyItem || !verifyItem.incidentId) return;
    try {
      await verifyIncident(verifyItem.incidentId);
      if (ratingVal) {
        await submitFeedback(verifyItem.incidentId, ratingVal, ratingComment.trim() || undefined);
      }
      await markReadApi(verifyItem.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast('Verification confirmed. Thank you for your feedback!', 'success');
      setVerifyItem(null);
      setRatingComment('');
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const allItems: AppNotification[] = pageData?.items || [];

  const filteredNotifications = allItems.filter((n) => {
    if (filterTab === 'ACTION' && n.eventType !== 'INFO_REQUESTED' && n.eventType !== 'INCIDENT_RESOLVED') {
      return false;
    }
    if (filterTab === 'SLA' && n.eventType !== 'SLA_WARNING' && n.eventType !== 'SLA_VIOLATED' && n.eventType !== 'INCIDENT_ESCALATED') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.incidentId && String(n.incidentId).includes(q))
      );
    }
    return true;
  });

  const todayNotifications = filteredNotifications.filter((n) => isToday(n.createdAt));
  const earlierNotifications = filteredNotifications.filter((n) => !isToday(n.createdAt));

  const actionCount = allItems.filter(
    (n) => n.eventType === 'INFO_REQUESTED' || n.eventType === 'INCIDENT_RESOLVED'
  ).length;

  const slaCount = allItems.filter(
    (n) => n.eventType === 'SLA_WARNING' || n.eventType === 'SLA_VIOLATED' || n.eventType === 'INCIDENT_ESCALATED'
  ).length;

  const homePath = user?.roles.includes('ADMINISTRATOR')
    ? '/admin/dashboard'
    : user?.roles.includes('TECHNICIAN')
    ? '/tech/queue'
    : '/employee/home';

  const incidentPath = (incidentId: number) => {
    if (user?.roles.includes('ADMINISTRATOR')) return `/admin/tickets/${incidentId}`;
    if (user?.roles.includes('TECHNICIAN')) return `/tech/incidents/${incidentId}`;
    return `/employee/incidents/${incidentId}`;
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', pb: 6, pt: 1 }}>
      {/* 1. BREADCRUMB */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
          <NavLink to={homePath} style={{ color: '#4cd7f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <HomeIcon sx={{ fontSize: 16 }} />
            <span>Home</span>
          </NavLink>
          <ChevronRightIcon sx={{ fontSize: 16, color: '#64748b' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
            Notification Center
          </Typography>
        </Box>
      </Box>

      {/* 2. HEADER SECTION */}
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
            {unreadTotal > 0 ? (
              <Chip
                label={`${unreadTotal} Unread`}
                size="small"
                sx={{
                  bgcolor: 'rgba(247, 81, 161, 0.15)',
                  color: '#ffb0cd',
                  border: '1px solid rgba(247, 81, 161, 0.35)',
                  fontWeight: 800,
                  fontSize: 12,
                  height: 22,
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono, monospace',
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
                  fontSize: 12,
                  height: 22,
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 13.5, color: '#94a3b8', maxWidth: 580 }}>
            Live notifications on your incident reports, SLA countdown alerts, and technician communications.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadTotal === 0 || markAllReadMutation.isPending}
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
            onClick={() => setDevicesOpen(true)}
            title="Push devices"
            aria-label="Push devices"
            sx={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              p: 0.8,
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              color: '#94a3b8',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#dfe2ef' },
            }}
          >
            <PhoneAndroidIcon sx={{ fontSize: 18 }} />
          </IconButton>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflowX: 'auto', pb: { xs: 0.5, md: 0 } }}>
          {(
            [
              { id: 'ALL', label: `All Notifications (${allItems.length})` },
              { id: 'UNREAD', label: `Unread (${unreadTotal})` },
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
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#6366f1' }} />
        </Box>
      ) : filteredNotifications.length === 0 ? (
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
          <Typography sx={{ fontSize: 13, color: '#94a3b8', maxWidth: 360 }}>
            No active items match your selected filter criteria.
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
          {todayNotifications.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: '#4cd7f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Today
                  </Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748b' }}>
                  {todayNotifications.length} items
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {todayNotifications.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={() => handleMarkRead(notif.id)}
                    onReply={() => setReplyItem(notif)}
                    onVerify={() => setVerifyItem(notif)}
                    onClickIncident={() => notif.incidentId && navigate(incidentPath(notif.incidentId))}
                  />
                ))}
              </Box>
            </Box>
          )}

          {earlierNotifications.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Earlier
                  </Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748b' }}>
                  {earlierNotifications.length} items
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {earlierNotifications.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={() => handleMarkRead(notif.id)}
                    onReply={() => setReplyItem(notif)}
                    onVerify={() => setVerifyItem(notif)}
                    onClickIncident={() => notif.incidentId && navigate(incidentPath(notif.incidentId))}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* 5. FOOTER PAGINATION */}
      {pageData && pageData.totalPages > 1 && (
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
          <Typography sx={{ fontSize: 12.5 }}>
            Showing page <strong>{page + 1}</strong> of <strong>{pageData.totalPages}</strong> ({pageData.totalItems} total)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              sx={{ color: '#64748b' }}
            >
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ px: 1.2, py: 0.2, bgcolor: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '4px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#c0c1ff' }}>
              {page + 1}
            </Box>
            <IconButton
              size="small"
              disabled={page >= pageData.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              sx={{ color: '#64748b' }}
            >
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
            color: '#ffffff',
          },
        }}
      >
        {replyItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#4cd7f6' }}>
                  REPLY TO INCIDENT #{replyItem.incidentId}
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
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#c0c1ff' }}>
                  Technician Request:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#dfe2ef', mt: 0.3 }}>
                  &ldquo;{replyItem.message}&rdquo;
                </Typography>
              </Paper>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your clarification or additional information here..."
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
            color: '#ffffff',
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
              <Typography sx={{ fontSize: 13, color: '#dfe2ef', mb: 2 }}>
                Please confirm that incident #{verifyItem.incidentId} has been resolved to your satisfaction:
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
      <PushDevicesDialog open={devicesOpen} onClose={() => setDevicesOpen(false)} />

      <Dialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            color: '#ffffff',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff' }}>
            Notification Preferences
          </Typography>
          <IconButton onClick={() => setPrefsOpen(false)} size="small" sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <Typography sx={{ fontSize: 13, color: '#94a3b8', mb: 2 }}>
            Manage notification preferences across communication channels. Critical alerts and in-app system channels are locked.
          </Typography>
          <Stack spacing={1}>
            {localPrefs.map((pref, idx) => (
              <Box
                key={`${pref.channel}-${pref.eventType}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.2,
                  borderRadius: '8px',
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>
                    {pref.eventType.replace(/_/g, ' ')}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                    Channel: {pref.channel} {pref.locked ? '(Locked by Policy)' : ''}
                  </Typography>
                </Box>
                <Switch
                  checked={pref.enabled}
                  disabled={pref.locked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLocalPrefs((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, enabled: checked } : p))
                    );
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#4cd7f6' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#06b6d4' },
                  }}
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPrefsOpen(false)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savePrefsMutation.isPending}
            onClick={() => savePrefsMutation.mutate(localPrefs)}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Save Preferences
          </Button>
        </DialogActions>
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
  onClickIncident,
}: {
  notif: AppNotification;
  onMarkRead: () => void;
  onReply: () => void;
  onVerify: () => void;
  onClickIncident: () => void;
}) {
  const isUnread = !notif.read;

  let iconComp = <ForumIcon sx={{ fontSize: 20 }} />;
  let iconBg = 'rgba(99, 102, 241, 0.15)';
  let iconColor = '#c0c1ff';
  let badgeLabel = '';
  let badgeColor = '#c0c1ff';
  let badgeBg = 'rgba(99, 102, 241, 0.15)';

  if (notif.eventType === 'INFO_REQUESTED') {
    iconComp = <ForumIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(247, 81, 161, 0.15)';
    iconColor = '#ffb0cd';
    badgeLabel = 'Action Required';
    badgeColor = '#ffb0cd';
    badgeBg = 'rgba(247, 81, 161, 0.15)';
  } else if (notif.eventType === 'INCIDENT_RESOLVED') {
    iconComp = <TaskAltIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(16, 185, 129, 0.15)';
    iconColor = '#6ee7b7';
    badgeLabel = 'Pending Verification';
    badgeColor = '#6ee7b7';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
  } else if (notif.eventType === 'SLA_WARNING' || notif.eventType === 'SLA_VIOLATED' || notif.eventType === 'INCIDENT_ESCALATED') {
    iconComp = <SaveAsIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(244, 63, 94, 0.15)';
    iconColor = '#f43f5e';
    badgeLabel = isExhausted(notif) ? 'Escalation exhausted' : notif.eventType.replace(/_/g, ' ');
    badgeColor = '#f43f5e';
    badgeBg = 'rgba(244, 63, 94, 0.15)';
  } else if (notif.eventType === 'INCIDENT_ASSIGNED') {
    iconComp = <AssignmentIndIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(6, 182, 212, 0.15)';
    iconColor = '#4cd7f6';
    badgeLabel = 'Assigned';
    badgeColor = '#4cd7f6';
    badgeBg = 'rgba(6, 182, 212, 0.15)';
  } else if (notif.eventType === 'INCIDENT_CREATED') {
    iconComp = <ConfirmationNumberIcon sx={{ fontSize: 20 }} />;
    iconBg = 'rgba(99, 102, 241, 0.12)';
    iconColor = '#c0c1ff';
    badgeLabel = 'Created';
  } else {
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
        {/* Unread dot */}
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

        {/* Icon */}
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
          }}
        >
          {iconComp}
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
              {notif.title}
            </Typography>

            {badgeLabel && (
              <Chip
                label={badgeLabel}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono, monospace',
                  bgcolor: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeColor}40`,
                }}
              />
            )}
          </Box>

          <Typography sx={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, mb: 1 }}>
            {notif.message}
          </Typography>

          {/* Metadata & Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScheduleIcon sx={{ fontSize: 13 }} />
                {formatTimeAgo(notif.createdAt)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                Channel: {notif.channel}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {notif.eventType === 'INFO_REQUESTED' && notif.incidentId && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={onReply}
                  startIcon={<ReplyIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    background: 'linear-gradient(135deg, #f751a1 0%, #6366f1 100%)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 1.5,
                  }}
                >
                  Reply
                </Button>
              )}

              {notif.eventType === 'INCIDENT_RESOLVED' && notif.incidentId && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={onVerify}
                  startIcon={<TaskAltIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 1.5,
                    '&:hover': { bgcolor: '#059669' },
                  }}
                >
                  Verify Fix
                </Button>
              )}

              {notif.incidentId && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={onClickIncident}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#4cd7f6',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 1.2,
                  }}
                >
                  View Ticket #{notif.incidentId}
                </Button>
              )}

              {isUnread && (
                <Button
                  size="small"
                  onClick={onMarkRead}
                  sx={{
                    color: '#94a3b8',
                    fontSize: 12,
                    textTransform: 'none',
                    '&:hover': { color: '#ffffff' },
                  }}
                >
                  Mark Read
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
