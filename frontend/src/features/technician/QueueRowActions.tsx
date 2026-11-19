import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, CircularProgress, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { tokens } from '../../theme/theme';
import { getIncident } from '../../api/incidents';
import { getSimilarIncidents } from '../../api/technicians';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../utils/errors';
import type { IncidentSummary } from '../../api/types';
import { EscalateDialog, LinkProblemDialog, MarkDuplicateDialog } from './WorkbenchDialogs';

type Which = 'ESCALATE' | 'MARK_DUPLICATE' | 'LINK_PROBLEM';

/**
 * "More" menu on a queue row. The row only carries a summary, so the incident's own allowedActions are
 * fetched when the menu opens; an entry shows only when the server lists the action for this person.
 * Link problem has no action key of its own; like the workbench it is offered to team leads (TEAM_VIEW).
 */
export default function QueueRowActions({ incident, problemBase }: { incident: IncidentSummary; problemBase: string | null }) {
  const { user } = useAuth();
  const isStaffLead = !!user?.permissions?.includes('TEAM_VIEW');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<Which | null>(null);

  const detailQ = useQuery({
    queryKey: ['incidents', incident.id, 'row-actions'],
    queryFn: () => getIncident(incident.id),
    enabled: anchor != null || dialog != null,
    staleTime: 5000,
  });
  const detail = detailQ.data;
  const allowed = detail?.allowedActions ?? [];

  const similarQ = useQuery({
    queryKey: ['incidents', incident.id, 'similar'],
    queryFn: () => getSimilarIncidents(incident.id),
    enabled: dialog === 'MARK_DUPLICATE',
  });

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
    queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };
  const choose = (w: Which) => {
    setAnchor(null);
    setDialog(w);
  };

  const items: { key: Which; label: string }[] = [];
  if (allowed.includes('ESCALATE')) items.push({ key: 'ESCALATE', label: 'Escalate' });
  if (allowed.includes('MARK_DUPLICATE')) items.push({ key: 'MARK_DUPLICATE', label: 'Mark duplicate' });
  if (detail && isStaffLead && problemBase && !detail.problemId) {
    items.push({ key: 'LINK_PROBLEM', label: 'Link problem' });
  }

  return (
    <>
      <Button
        size="small"
        aria-label={`More actions for ${incident.code}`}
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<MoreHorizIcon sx={{ fontSize: 16 }} />}
        sx={{ fontSize: 12, fontWeight: 600, color: tokens.onSurfaceVariant, textTransform: 'none' }}
      >
        More
      </Button>
      <Menu anchorEl={anchor} open={anchor != null} onClose={() => setAnchor(null)}>
        {detailQ.isLoading && (
          <MenuItem disabled>
            <CircularProgress size={16} sx={{ mr: 1 }} /> Loading actions
          </MenuItem>
        )}
        {detailQ.isError && (
          <MenuItem disabled>
            <Typography sx={{ fontSize: 12, color: tokens.tertiaryLight }}>{apiErrorMessage(detailQ.error)}</Typography>
          </MenuItem>
        )}
        {detail && items.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="No more actions for this incident" primaryTypographyProps={{ fontSize: 12 }} />
          </MenuItem>
        )}
        {items.map((it) => (
          <MenuItem key={it.key} onClick={() => choose(it.key)} sx={{ fontSize: 13 }}>
            {it.label}
          </MenuItem>
        ))}
      </Menu>
      {detail && (
        <>
          <EscalateDialog open={dialog === 'ESCALATE'} incident={detail} onClose={() => setDialog(null)} onDone={done} />
          <MarkDuplicateDialog
            open={dialog === 'MARK_DUPLICATE'}
            incident={detail}
            similar={similarQ.data ?? []}
            onClose={() => setDialog(null)}
            onDone={done}
          />
          <LinkProblemDialog
            open={dialog === 'LINK_PROBLEM'}
            incident={detail}
            onClose={() => setDialog(null)}
            onDone={(problemId) => {
              done();
              if (problemBase) navigate(`${problemBase}/${problemId}`);
            }}
          />
        </>
      )}
    </>
  );
}
