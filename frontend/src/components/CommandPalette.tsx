import { Box, Dialog, InputBase, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listIncidents } from '../api/incidents';
import { useAuth, type Workspace } from '../auth/AuthContext';
import { NAV } from '../layouts/navConfig';
import { tokens } from '../theme/theme';
import { apiErrorMessage } from '../utils/errors';

/** Window event other components dispatch to open the palette (the shell button does). */
export const OPEN_PALETTE_EVENT = 'app:open-palette';

interface Entry {
  key: string;
  label: string;
  hint: string;
  to: string;
}

const WS_LABEL: Record<Workspace, string> = {
  employee: 'Employee',
  tech: 'Technician',
  lead: 'Team lead',
  admin: 'Administrator',
};

/** Where an incident opens for the highest role the user has. */
function incidentPath(workspaces: Workspace[], id: number) {
  if (workspaces.includes('admin')) return `/admin/incidents/${id}`;
  if (workspaces.includes('tech') || workspaces.includes('lead')) return `/tech/incidents/${id}`;
  return `/employee/incidents/${id}`;
}

/** Ctrl+K / Cmd+K: jump to a screen the user may open, or to an incident by code or title. */
export default function CommandPalette() {
  const { user, workspaces } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(text.trim()), 250);
    return () => window.clearTimeout(t);
  }, [text]);

  const screens = useMemo<Entry[]>(() => {
    const seen = new Set<string>();
    const out: Entry[] = [];
    if (workspaces.includes('admin') && user?.permissions?.includes('REPORT_VIEW')) {
      out.push({ key: 'wallboard', label: 'Wallboard', hint: 'Full-screen NOC view', to: '/wallboard' });
      seen.add('/wallboard');
    }
    workspaces.forEach((w) => {
      (NAV[w] ?? [])
        .filter((i) => !i.permission || user?.permissions?.includes(i.permission))
        .forEach((i) => {
          if (seen.has(i.to)) return;
          seen.add(i.to);
          out.push({ key: `${w}:${i.to}`, label: i.label, hint: WS_LABEL[w], to: i.to });
        });
    });
    if (!seen.has('/account/security')) {
      out.push({ key: 'account', label: 'Account security', hint: 'Account', to: '/account/security' });
    }
    return out;
  }, [workspaces, user]);

  const lookup = useQuery({
    queryKey: ['palette-incidents', debounced],
    queryFn: () => listIncidents({ q: debounced, size: 5 }),
    enabled: open && debounced.length >= 3,
  });

  const needle = text.trim().toLowerCase();
  const entries: Entry[] = [
    ...screens.filter((s) => !needle || s.label.toLowerCase().includes(needle) || s.hint.toLowerCase().includes(needle)),
    ...(debounced.length >= 3 && debounced === text.trim()
      ? (lookup.data?.items ?? []).map((i) => ({
          key: `inc:${i.id}`,
          label: `${i.code}  ${i.title}`,
          hint: `Incident, ${i.status}`,
          to: incidentPath(workspaces, i.id),
        }))
      : []),
  ];

  const close = () => {
    setOpen(false);
    setText('');
    setDebounced('');
    setActive(0);
  };
  const go = (e: Entry | undefined) => {
    if (!e) return;
    close();
    navigate(e.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(entries.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(entries[Math.min(active, entries.length - 1)]);
    }
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      aria-label="Command palette"
      PaperProps={{ sx: { bgcolor: tokens.paper, border: `1px solid ${tokens.border}`, alignSelf: 'flex-start', mt: '12vh' } }}
    >
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${tokens.outlineVariant}` }}>
        <InputBase
          autoFocus
          fullWidth
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Go to a screen, or type an incident code or title..."
          inputProps={{ 'aria-label': 'Command palette search' }}
          sx={{ color: tokens.onSurface, fontSize: 15 }}
        />
      </Box>
      <List dense role="listbox" aria-label="Results" sx={{ maxHeight: 360, overflowY: 'auto', py: 0.5 }}>
        {entries.map((e, i) => (
          <ListItemButton
            key={e.key}
            role="option"
            aria-selected={i === active}
            selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(e)}
            sx={{ '&.Mui-selected': { bgcolor: alpha(tokens.primary, 0.18) } }}
          >
            <ListItemText
              primary={e.label}
              secondary={e.hint}
              primaryTypographyProps={{ sx: { fontSize: 14, color: tokens.onSurface } }}
              secondaryTypographyProps={{ sx: { fontSize: 12, color: tokens.onSurfaceVariant } }}
            />
          </ListItemButton>
        ))}
        {!entries.length && !lookup.isFetching && (
          <Typography sx={{ p: 2, fontSize: 13, color: tokens.onSurfaceVariant }}>Nothing matches "{text}".</Typography>
        )}
        {lookup.isError && (
          <Typography role="alert" sx={{ p: 2, fontSize: 13, color: tokens.danger }}>
            Incident search failed: {apiErrorMessage(lookup.error)}
          </Typography>
        )}
      </List>
      <Box sx={{ px: 1.5, py: 0.8, borderTop: `1px solid ${tokens.outlineVariant}` }}>
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
          Up and Down to move, Enter to open, Esc to close
        </Typography>
      </Box>
    </Dialog>
  );
}
