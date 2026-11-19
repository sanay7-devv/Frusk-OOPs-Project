import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, IconButton, InputAdornment, LinearProgress, Menu, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, Grid,
} from '@mui/material';
import {
  Add as AddIcon, Group as GroupIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon, Search as SearchIcon,
} from '@mui/icons-material';
import {
  listDirectoryUsers, resetUserMfa, revokeRole, updateDirectoryUser, type DirectoryRole, type DirectoryUser,
} from '../../api/adminDirectory';
import { listIncidents } from '../../api/incidents';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';
import { cardSx, monoLabelSx } from './adminForm';
import ProvisionDialog from './users/ProvisionDialog';
import TechnicianDialog from './users/TechnicianDialog';
import UserDrawer from './users/UserDrawer';
import { EditUserDialog, GrantAdminDialog } from './users/AccountDialogs';
import { isLead } from './users/techForm';
import { tone } from './palette';

const USERS_KEY = ['admin-users-directory'];
const OPEN_STATUSES = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'REOPENED'];

type Filter = 'ALL' | 'EMPLOYEE' | 'TECHNICIAN' | 'LEAD' | 'ADMINISTRATOR' | 'INACTIVE';

const isStaffOnly = (u: DirectoryUser) => !u.roles.includes('TECHNICIAN') && !u.roles.includes('ADMINISTRATOR');

function matches(u: DirectoryUser, f: Filter): boolean {
  switch (f) {
    case 'EMPLOYEE': return isStaffOnly(u);
    case 'TECHNICIAN': return u.roles.includes('TECHNICIAN') && !isLead(u);
    case 'LEAD': return isLead(u);
    case 'ADMINISTRATOR': return u.roles.includes('ADMINISTRATOR');
    case 'INACTIVE': return !u.active;
    default: return true;
  }
}

function RoleChips({ u }: { u: DirectoryUser }) {
  const chips: { label: string; color: string }[] = [];
  if (u.roles.includes('ADMINISTRATOR')) chips.push({ label: u.administrator?.scope === 'IT_MANAGER' ? 'IT manager' : 'Admin', color: tokens.tertiaryLight });
  if (u.roles.includes('TECHNICIAN')) chips.push({ label: isLead(u) ? 'Team lead' : 'Technician', color: tokens.secondaryLight });
  if (chips.length === 0) chips.push({ label: 'Employee', color: tokens.onSurfaceVariant });
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {chips.map((c) => (
        <Chip key={c.label} size="small" label={c.label} sx={{ fontSize: 12, fontWeight: 600, color: c.color, bgcolor: tokens.surfaceContainerHigh }} />
      ))}
    </Stack>
  );
}

function LoadCell({ u }: { u: DirectoryUser }) {
  const t = u.technician;
  if (!t) return <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>Not a technician</Typography>;
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography sx={{ fontSize: 13 }}>{t.currentLoad} / {t.maxLoad} · {t.availability.replace('_', ' ').toLowerCase()}</Typography>
      <LinearProgress variant="determinate" value={t.maxLoad > 0 ? Math.min(100, (t.currentLoad / t.maxLoad) * 100) : 0} sx={{ mt: 0.5, height: 5, borderRadius: 3 }} />
    </Box>
  );
}

export default function Users() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editUser, setEditUser] = useState<DirectoryUser | null>(null);
  const [techDialog, setTechDialog] = useState<{ user: DirectoryUser; mode: 'grant' | 'manage' } | null>(null);
  const [adminGrant, setAdminGrant] = useState<DirectoryUser | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; user: DirectoryUser } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'mfa' | 'toggle' | 'revoke'; user: DirectoryUser; role?: DirectoryRole } | null>(null);

  const users = useQuery({ queryKey: USERS_KEY, queryFn: listDirectoryUsers, refetchInterval: 30000 });
  const open = useQuery({
    queryKey: ['admin-open-incident-count'],
    queryFn: () => listIncidents({ status: OPEN_STATUSES, size: 1 }),
    refetchInterval: 30000,
  });

  const refresh = (id?: number) => {
    qc.invalidateQueries({ queryKey: USERS_KEY });
    qc.invalidateQueries({ queryKey: ['admin-user'] });
    if (id != null) qc.invalidateQueries({ queryKey: ['admin-user', id] });
  };

  const action = useMutation({
    mutationFn: async (c: NonNullable<typeof confirm>) => {
      if (c.kind === 'mfa') await resetUserMfa(c.user.id);
      else if (c.kind === 'toggle') await updateDirectoryUser(c.user.id, { active: !c.user.active });
      else if (c.role) await revokeRole(c.user.id, c.role);
    },
    onSuccess: (_d, c) => {
      toast(
        c.kind === 'mfa' ? `Two-step verification reset for ${c.user.name}. They set it up again at next sign-in.`
          : c.kind === 'toggle' ? `${c.user.name} ${c.user.active ? 'deactivated' : 'reactivated'}`
            : `${c.role === 'TECHNICIAN' ? 'Technician' : 'Administrator'} role removed from ${c.user.name}`,
        'success',
      );
      refresh(c.user.id);
      setConfirm(null);
    },
    onError: (e) => { toast(apiErrorMessage(e), 'error'); setConfirm(null); },
  });

  const all = users.data ?? [];
  const counts = useMemo(() => ({
    total: all.length,
    inactive: all.filter((u) => !u.active).length,
    employees: all.filter(isStaffOnly).length,
    techs: all.filter((u) => u.roles.includes('TECHNICIAN')).length,
    leads: all.filter(isLead).length,
    admins: all.filter((u) => u.roles.includes('ADMINISTRATOR')).length,
    available: all.filter((u) => u.active && u.technician?.availability === 'AVAILABLE').length,
  }), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((u) => matches(u, filter) && (!q
      || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      || (u.department ?? '').toLowerCase().includes(q) || (u.location ?? '').toLowerCase().includes(q) || String(u.id) === q));
  }, [all, filter, search]);

  const menuItems = (u: DirectoryUser) => {
    const items: { label: string; run: () => void; danger?: boolean }[] = [
      { label: 'View details', run: () => setDrawerId(u.id) },
      { label: 'Edit name, department, location', run: () => setEditUser(u) },
    ];
    if (u.roles.includes('TECHNICIAN')) {
      items.push({ label: 'Technician profile and skills', run: () => setTechDialog({ user: u, mode: 'manage' }) });
      items.push({ label: 'Remove technician role', run: () => setConfirm({ kind: 'revoke', user: u, role: 'TECHNICIAN' }), danger: true });
    } else {
      items.push({ label: 'Make technician', run: () => setTechDialog({ user: u, mode: 'grant' }) });
    }
    if (u.roles.includes('ADMINISTRATOR')) items.push({ label: 'Remove administrator role', run: () => setConfirm({ kind: 'revoke', user: u, role: 'ADMINISTRATOR' }), danger: true });
    else items.push({ label: 'Make administrator', run: () => setAdminGrant(u) });
    items.push({ label: 'Reset two-step verification', run: () => setConfirm({ kind: 'mfa', user: u }) });
    items.push({ label: u.active ? 'Deactivate account' : 'Reactivate account', run: () => setConfirm({ kind: 'toggle', user: u }), danger: u.active });
    return items;
  };

  const confirmText = () => {
    if (!confirm) return { title: '', description: '', label: '' };
    const n = confirm.user.name;
    if (confirm.kind === 'mfa') return { title: 'Reset two-step verification?', description: `${n} loses their authenticator setup and must enrol again. Use this when they have lost their device.`, label: 'Reset' };
    if (confirm.kind === 'toggle') {
      return confirm.user.active
        ? { title: `Deactivate ${n}?`, description: 'They are signed out and cannot sign in. Their incidents and audit history stay. You can reactivate the account later.', label: 'Deactivate' }
        : { title: `Reactivate ${n}?`, description: 'They can sign in again with their existing password.', label: 'Reactivate' };
    }
    return {
      title: `Remove the ${confirm.role === 'TECHNICIAN' ? 'technician' : 'administrator'} role from ${n}?`,
      description: confirm.role === 'TECHNICIAN'
        ? 'Not allowed while they still have active incidents; reassign those first.'
        : 'They lose access to the administration screens.',
      label: 'Remove role',
    };
  };
  const ct = confirmText();

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      <Paper elevation={0} sx={{ ...cardSx, mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <GroupIcon sx={{ color: tokens.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>Users</Typography>
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>Accounts, roles, technician profiles and two-step verification.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { users.refetch(); open.refetch(); }} sx={{ textTransform: 'none' }}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProvisionOpen(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>Create account</Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Accounts', value: counts.total, note: `${counts.employees} employees · ${counts.techs} technicians (${counts.leads} leads) · ${counts.admins} admins` },
          { label: 'Technicians available', value: counts.available, note: `of ${counts.techs} technician accounts` },
          { label: 'Open incidents', value: open.isError ? '–' : open.data?.totalItems ?? '…', note: open.isError ? apiErrorMessage(open.error) : 'Not resolved or closed, all services' },
          { label: 'Deactivated', value: counts.inactive, note: 'Cannot sign in' },
        ].map((k) => (
          <Grid item xs={12} sm={6} lg={3} key={k.label}>
            <Paper elevation={0} sx={cardSx}>
              <Typography sx={monoLabelSx}>{k.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif', mt: 0.5 }}>{k.value}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 0.5 }}>{k.note}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, e-mail, department, location or id"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ maxWidth: { md: 420 }, '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest } }} />
          <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_e, v: Filter | null) => v && setFilter(v)} sx={{ flexWrap: 'wrap' }}>
            {([['ALL', 'All'], ['EMPLOYEE', 'Employees'], ['TECHNICIAN', 'Technicians'], ['LEAD', 'Leads'], ['ADMINISTRATOR', 'Admins'], ['INACTIVE', 'Deactivated']] as [Filter, string][]).map(([v, l]) => (
              <ToggleButton key={v} value={v} sx={{ textTransform: 'none', fontSize: 13, px: 1.5 }}>{l}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {users.isLoading && <LoadingState />}
      {users.isError && <ErrorState onRetry={() => users.refetch()} message={apiErrorMessage(users.error)} />}
      {users.data && rows.length === 0 && (
        <EmptyState message={all.length === 0 ? 'No accounts yet.' : 'No account matches this search or filter.'}
          action={search || filter !== 'ALL' ? <Button onClick={() => { setSearch(''); setFilter('ALL'); }} sx={{ textTransform: 'none' }}>Clear filters</Button> : undefined} />
      )}
      {rows.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer, borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['User', 'Roles', 'Workload', 'Status', ''].map((h) => (
                  <TableCell key={h} sx={{ ...monoLabelSx, borderColor: tokens.outlineVariant }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id} hover onClick={() => setDrawerId(u.id)} sx={{ cursor: 'pointer', opacity: u.active ? 1 : 0.65 }}>
                  <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{u.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{u.email}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: tokens.outlineVariant }}><RoleChips u={u} /></TableCell>
                  <TableCell sx={{ borderColor: tokens.outlineVariant }}><LoadCell u={u} /></TableCell>
                  <TableCell sx={{ borderColor: tokens.outlineVariant }}>
                    <Chip size="small" label={u.active ? 'Active' : 'Deactivated'} color={u.active ? 'success' : 'default'} variant="outlined" sx={{ fontSize: 12 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: tokens.outlineVariant }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Actions">
                      <IconButton aria-label={`Actions for ${u.name}`} onClick={(e) => setMenu({ anchor: e.currentTarget, user: u })}><MoreVertIcon /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu && menuItems(menu.user).map((it) => (
          <MenuItem key={it.label} sx={{ fontSize: 14, color: it.danger ? tone.danger : undefined }} onClick={() => { setMenu(null); it.run(); }}>{it.label}</MenuItem>
        ))}
      </Menu>

      <UserDrawer userId={drawerId} onClose={() => setDrawerId(null)} actions={{
        onEdit: setEditUser,
        onTechnician: (u) => setTechDialog({ user: u, mode: 'manage' }),
        onResetMfa: (u) => setConfirm({ kind: 'mfa', user: u }),
        onToggleActive: (u) => setConfirm({ kind: 'toggle', user: u }),
      }} />

      <ProvisionDialog open={provisionOpen} onClose={() => setProvisionOpen(false)} onCreated={() => { setProvisionOpen(false); refresh(); }} />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={() => refresh(editUser?.id)} />
      <TechnicianDialog user={techDialog?.user ?? null} mode={techDialog?.mode ?? 'manage'} onClose={() => setTechDialog(null)} onSaved={() => refresh(techDialog?.user.id)} />
      <GrantAdminDialog user={adminGrant} onClose={() => setAdminGrant(null)} onSaved={() => refresh(adminGrant?.id)} />
      <ConfirmDialog open={!!confirm} title={ct.title} description={ct.description} confirmLabel={ct.label}
        confirmColor={confirm?.kind === 'toggle' && !confirm.user.active ? 'success' : 'error'} isLoading={action.isPending}
        onConfirm={() => confirm && action.mutate(confirm)} onClose={() => setConfirm(null)} />
    </Box>
  );
}
