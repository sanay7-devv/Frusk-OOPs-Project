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
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import { humanizeEnum } from '../../utils/format';
import PushDevicesDialog from './PushDevicesDialog';

import { tokens } from '../../theme/theme';
import { alpha } from '@mui/material/styles';
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

function extractIncidentCode(n?: AppNotification | null): string {
  if (!n) return '';
  const match = (n.title + ' ' + n.message).match(/INC-\d{4}-\d{5}/i);
  return match ? match[0].toUpperCase() : (n.incidentId ? `INC-${n.incidentId}` : '');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: tokens.onSurfaceVariant, fontSize: 13, fontWeight: 500 }}>
          <NavLink to={homePath} style={{ color: tokens.secondaryLight, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <HomeIcon sx={{ fontSize: 16 }} />
            <span>Home</span>
          </NavLink>
          <ChevronRightIcon sx={{ fontSize: 16, color: tokens.textDisabled }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.white, fontFamily: 'Sora, sans-serif' }}>
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
          border: `1px solid ${tokens.outlineVariant}`,
          bgcolor: tokens.paper,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          boxShadow: `0 8px 32px ${alpha(tokens.black, 0.35)}`,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" component="h1" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: tokens.white, letterSpacing: '-0.01em' }}>
              Notification Center
            </Typography>
            {unreadTotal > 0 ? (
              <Chip
                label={`${unreadTotal} Unread`}
                size="small"
                sx={{
                  bgcolor: alpha(tokens.tertiary, 0.15),
                  color: tokens.tertiaryLight,
                  border: `1px solid ${alpha(tokens.tertiary, 0.35)}`,
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
                  bgcolor: alpha(tokens.success, 0.15),
                  color: tokens.successLight,
                  border: `1px solid ${alpha(tokens.success, 0.3)}`,
                  fontWeight: 700,
                  fontSize: 12,
                  height: 22,
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 13.5, color: tokens.onSurfaceVariant, maxWidth: 580 }}>
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
              borderColor: tokens.border,
              bgcolor: alpha(tokens.white, 0.03),
              color: tokens.onSurface,
              fontWeight: 700,
              fontSize: 12.5,
              textTransform: 'none',
              borderRadius: '8px',
              px: 1.8,
              py: 0.6,
              '&:hover': { bgcolor: alpha(tokens.primary, 0.12), borderColor: tokens.primary, color: tokens.primaryLight },
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
              border: `1px solid ${alpha(tokens.white, 0.1)}`,
              borderRadius: '8px',
              p: 0.8,
              bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
              color: tokens.onSurfaceVariant,
              '&:hover': { bgcolor: tokens.borderSubtle, color: tokens.onSurface },
            }}
          >
            <PhoneAndroidIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton aria-label="Notification preferences"
            size="small"
            onClick={() => setPrefsOpen(true)}
            title="Notification Preferences"
            sx={{
              border: `1px solid ${alpha(tokens.white, 0.1)}`,
              borderRadius: '8px',
              p: 0.8,
              bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
              color: tokens.onSurfaceVariant,
              '&:hover': { bgcolor: tokens.borderSubtle, color: tokens.onSurface },
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
          border: `1px solid ${tokens.outlineVariant}`,
          bgcolor: tokens.paper,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          boxShadow: `0 4px 20px ${alpha(tokens.black, 0.3)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflowX: 'auto', pb: { xs: 0.5, md: 0 } }}>
          {(
            [
              { id: 'ALL', label: `All Notifications (${pageData?.totalItems ?? allItems.length})` },
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
                  color: isSelected ? tokens.white : tokens.onSurfaceVariant,
                  bgcolor: isSelected ? alpha(tokens.primary, 0.25) : 'transparent',
                  border: isSelected ? `1px solid ${alpha(tokens.primary, 0.4)}` : '1px solid transparent',
                  borderRadius: '8px',
                  px: 1.5,
                  py: 0.5,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: isSelected ? alpha(tokens.primary, 0.3) : tokens.hover, color: tokens.onSurface },
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
                <SearchIcon sx={{ color: tokens.textDisabled, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', md: 240 },
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
              borderRadius: '8px',
              fontSize: 12.5,
            },
          }}
        />
      </Paper>

      {/* 4. CHRONOLOGICAL FEED */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: tokens.primary }} />
        </Box>
      ) : filteredNotifications.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: '16px',
            border: `1px solid ${tokens.outlineVariant}`,
            bgcolor: tokens.paper,
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
              bgcolor: tokens.hover,
              color: tokens.textDisabled,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NotificationsPausedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: tokens.white, fontSize: 16 }}>
            No notifications found
          </Typography>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, maxWidth: 360 }}>
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
              borderColor: tokens.border,
              color: tokens.secondaryLight,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              '&:hover': { borderColor: tokens.secondary, bgcolor: alpha(tokens.secondary, 0.1) },
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
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: tokens.secondaryLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Today
                  </Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: alpha(tokens.white, 0.1) }} />
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.textDisabled }}>
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
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: tokens.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Earlier
                  </Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: alpha(tokens.white, 0.1) }} />
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.textDisabled }}>
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
            border: `1px solid ${tokens.outlineVariant}`,
            bgcolor: tokens.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: tokens.onSurfaceVariant,
            fontSize: 12.5,
          }}
        >
          <Typography sx={{ fontSize: 12.5 }}>
            Showing page <strong>{page + 1}</strong> of <strong>{pageData.totalPages}</strong> ({pageData.totalItems} total)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton aria-label="Previous page"
              size="small"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              sx={{ color: tokens.textDisabled }}
            >
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ px: 1.2, py: 0.2, bgcolor: alpha(tokens.primary, 0.2), border: `1px solid ${alpha(tokens.primary, 0.35)}`, borderRadius: '4px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: tokens.primaryLight }}>
              {page + 1}
            </Box>
            <IconButton aria-label="Next page"
              size="small"
              disabled={page >= pageData.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              sx={{ color: tokens.textDisabled }}
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
            bgcolor: tokens.surfaceContainerLow,
            border: `1px solid ${alpha(tokens.white, 0.1)}`,
            p: 1,
            color: tokens.white,
          },
        }}
      >
        {replyItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: tokens.secondaryLight }}>
                  REPLY TO {extractIncidentCode(replyItem) || 'INCIDENT'}
                </Typography>
                <Typography variant="h6" component="span" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: tokens.white, fontSize: 16 }}>
                  {replyItem.title}
                </Typography>
              </Box>
              <IconButton aria-label="Close reply dialog" onClick={() => setReplyItem(null)} size="small" sx={{ color: tokens.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: tokens.outlineVariant }}>
              <Paper sx={{ p: 1.8, bgcolor: alpha(tokens.primary, 0.1), border: `1px solid ${alpha(tokens.primary, 0.3)}`, borderRadius: '10px', mb: 2 }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: tokens.primaryLight }}>
                  Technician Request:
                </Typography>
                <Typography sx={{ fontSize: 13, color: tokens.onSurface, mt: 0.3 }}>
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
                  bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
                  borderRadius: '10px',
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReplyItem(null)} sx={{ color: tokens.onSurfaceVariant, textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                  color: tokens.white,
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
            bgcolor: tokens.surfaceContainerLow,
            border: `1px solid ${alpha(tokens.white, 0.1)}`,
            p: 1,
            color: tokens.white,
          },
        }}
      >
        {verifyItem && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" component="span" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: tokens.white, fontSize: 16 }}>
                Verify Resolution
              </Typography>
              <IconButton aria-label="Close verify dialog" onClick={() => setVerifyItem(null)} size="small" sx={{ color: tokens.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: tokens.outlineVariant }}>
              <Typography sx={{ fontSize: 13, color: tokens.onSurface, mb: 2 }}>
                Please confirm that {extractIncidentCode(verifyItem) || 'the incident'} has been resolved to your satisfaction:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, mb: 1, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                  Rate Support Experience
                </Typography>
                <Rating
                  value={ratingVal}
                  onChange={(_, val) => setRatingVal(val)}
                  size="large"
                  sx={{ color: tokens.secondaryLight }}
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
                  bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
                  borderRadius: '10px',
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setVerifyItem(null)} sx={{ color: tokens.onSurfaceVariant, textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmVerification}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                  color: tokens.white,
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
            bgcolor: tokens.surfaceContainerLow,
            border: `1px solid ${alpha(tokens.white, 0.1)}`,
            p: 1,
            color: tokens.white,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="span" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: tokens.white, fontSize: 16 }}>
            Notification preferences
          </Typography>
          <IconButton aria-label="Close preferences dialog" onClick={() => setPrefsOpen(false)} size="small" sx={{ color: tokens.onSurfaceVariant }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant, p: 0 }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
              Manage notification preferences across communication channels. Critical alerts and in-app system channels are locked.
            </Typography>
          </Box>
          {(() => {
            const matrixChannels = Array.from(new Set(localPrefs.map((p) => p.channel)));
            const matrixEvents = Array.from(new Set(localPrefs.map((p) => p.eventType)));
            return (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: tokens.surfaceContainerLow, color: tokens.onSurfaceVariant, fontSize: 12, fontWeight: 700, borderColor: tokens.outlineVariant }}>
                        Event
                      </TableCell>
                      {matrixChannels.map((ch) => (
                        <TableCell key={ch} align="center" sx={{ bgcolor: tokens.surfaceContainerLow, color: tokens.onSurfaceVariant, fontSize: 12, fontWeight: 700, borderColor: tokens.outlineVariant }}>
                          {ch === 'IN_APP' ? 'In-app' : ch === 'SMS_SIM' ? 'SMS' : ch === 'WEBSOCKET' ? 'Live feed' : humanizeEnum(ch)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matrixEvents.map((evt) => (
                      <TableRow key={evt} hover>
                        <TableCell sx={{ borderColor: tokens.outlineVariant, fontSize: 13, fontWeight: 600, color: tokens.onSurface }}>
                          {humanizeEnum(evt)}
                        </TableCell>
                        {matrixChannels.map((ch) => {
                          const prefIdx = localPrefs.findIndex((p) => p.eventType === evt && p.channel === ch);
                          const pref = prefIdx >= 0 ? localPrefs[prefIdx] : null;
                          if (!pref) {
                            return (
                              <TableCell key={ch} align="center" sx={{ borderColor: tokens.outlineVariant, color: tokens.textDisabled, fontSize: 12 }}>
                                —
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={ch} align="center" sx={{ borderColor: tokens.outlineVariant }}>
                              <Checkbox
                                size="small"
                                checked={pref.enabled}
                                disabled={pref.locked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setLocalPrefs((prev) =>
                                    prev.map((p, i) => (i === prefIdx ? { ...p, enabled: checked } : p))
                                  );
                                }}
                                sx={{
                                  p: 0.5,
                                  color: tokens.outlineVariant,
                                  '&.Mui-checked': { color: tokens.secondaryLight },
                                  '&.Mui-disabled': { opacity: 0.4 },
                                }}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPrefsOpen(false)} sx={{ color: tokens.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savePrefsMutation.isPending}
            onClick={() => savePrefsMutation.mutate(localPrefs)}
            sx={{
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Save preferences
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
  let iconBg: string = alpha(tokens.primary, 0.15);
  let iconColor: string = tokens.primaryLight;
  let badgeLabel = '';
  let badgeColor: string = tokens.primaryLight;
  let badgeBg: string = alpha(tokens.primary, 0.15);

  if (notif.eventType === 'INFO_REQUESTED') {
    iconComp = <ForumIcon sx={{ fontSize: 20 }} />;
    iconBg = alpha(tokens.tertiary, 0.15);
    iconColor = tokens.tertiaryLight;
    badgeLabel = 'Action Required';
    badgeColor = tokens.tertiaryLight;
    badgeBg = alpha(tokens.tertiary, 0.15);
  } else if (notif.eventType === 'INCIDENT_RESOLVED') {
    iconComp = <TaskAltIcon sx={{ fontSize: 20 }} />;
    iconBg = alpha(tokens.success, 0.15);
    iconColor = tokens.successLight;
    badgeLabel = 'Pending Verification';
    badgeColor = tokens.successLight;
    badgeBg = alpha(tokens.success, 0.15);
  } else if (notif.eventType === 'SLA_WARNING' || notif.eventType === 'SLA_VIOLATED' || notif.eventType === 'INCIDENT_ESCALATED') {
    iconComp = <SaveAsIcon sx={{ fontSize: 20 }} />;
    iconBg = alpha(tokens.danger, 0.15);
    iconColor = tokens.danger;
    badgeLabel = isExhausted(notif) ? 'Escalation exhausted' : notif.eventType.replace(/_/g, ' ');
    badgeColor = tokens.danger;
    badgeBg = alpha(tokens.danger, 0.15);
  } else if (notif.eventType === 'INCIDENT_ASSIGNED') {
    iconComp = <AssignmentIndIcon sx={{ fontSize: 20 }} />;
    iconBg = alpha(tokens.secondary, 0.15);
    iconColor = tokens.secondaryLight;
    badgeLabel = 'Assigned';
    badgeColor = tokens.secondaryLight;
    badgeBg = alpha(tokens.secondary, 0.15);
  } else if (notif.eventType === 'INCIDENT_CREATED') {
    iconComp = <ConfirmationNumberIcon sx={{ fontSize: 20 }} />;
    iconBg = alpha(tokens.primary, 0.12);
    iconColor = tokens.primaryLight;
    badgeLabel = 'Created';
  } else {
    iconComp = <SecurityIcon sx={{ fontSize: 20 }} />;
    iconBg = alpha(tokens.white, 0.05);
    iconColor = tokens.onSurfaceVariant;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: '16px',
        border: isUnread ? `1px solid ${alpha(tokens.primary, 0.35)}` : `1px solid ${tokens.borderSubtle}`,
        bgcolor: isUnread ? alpha(tokens.primary, 0.05) : tokens.paper,
        position: 'relative',
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(tokens.black, 0.4)}`,
          borderColor: isUnread ? alpha(tokens.primary, 0.6) : tokens.border,
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
              bgcolor: tokens.secondary,
              boxShadow: `0 0 8px ${tokens.secondary}`,
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
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: tokens.white, fontFamily: 'Sora, sans-serif' }}>
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

          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, lineHeight: 1.5, mb: 1 }}>
            {notif.message}
          </Typography>

          {/* Metadata & Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: tokens.textDisabled, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScheduleIcon sx={{ fontSize: 13 }} />
                {formatTimeAgo(notif.createdAt)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: tokens.textDisabled }}>
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
                    background: `linear-gradient(135deg, ${tokens.tertiary} 0%, ${tokens.primary} 100%)`,
                    color: tokens.white,
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
                    bgcolor: tokens.success,
                    color: tokens.white,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 1.5,
                    '&:hover': { bgcolor: tokens.successDark },
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
                    borderColor: tokens.border,
                    color: tokens.secondaryLight,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 1.2,
                  }}
                >
                  View {extractIncidentCode(notif) || 'Incident'}
                </Button>
              )}

              {isUnread && (
                <Button
                  size="small"
                  onClick={onMarkRead}
                  sx={{
                    color: tokens.onSurfaceVariant,
                    fontSize: 12,
                    textTransform: 'none',
                    '&:hover': { color: tokens.white },
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
