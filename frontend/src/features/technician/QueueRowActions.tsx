import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import {
  Bolt as BoltIcon,
  PlayArrow as PlayArrowIcon,
  Chat as ChatIcon,
  EditNote as EditNoteIcon,
  SwapHoriz as SwapHorizIcon,
  TrendingUp as TrendingUpIcon,
  ContentCopy as ContentCopyIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme/theme';
import { getIncident } from '../../api/incidents';
import { getSimilarIncidents } from '../../api/technicians';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../utils/errors';
import ActionButtons from '../../components/ActionButtons';
import type { IncidentAction } from '../../api/types';
import { EscalateDialog, LinkProblemDialog, MarkDuplicateDialog } from './WorkbenchDialogs';

/** The actions a queue row can start. Everything else (resolve, close, verify, priority, edit) belongs to the workbench. */
const ROW_ACTIONS: IncidentAction[] = ['ACKNOWLEDGE', 'START_WORK', 'REQUEST_INFO', 'COMMENT', 'REASSIGN', 'ESCALATE', 'MARK_DUPLICATE'];

const ICONS: Partial<Record<IncidentAction, React.ReactNode>> = {
  ACKNOWLEDGE: <BoltIcon sx={{ fontSize: 16 }} />,
  START_WORK: <PlayArrowIcon sx={{ fontSize: 16 }} />,
  REQUEST_INFO: <ChatIcon sx={{ fontSize: 15 }} />,
  COMMENT: <EditNoteIcon sx={{ fontSize: 16 }} />,
  REASSIGN: <SwapHorizIcon sx={{ fontSize: 16 }} />,
  ESCALATE: <TrendingUpIcon sx={{ fontSize: 16 }} />,
  MARK_DUPLICATE: <ContentCopyIcon sx={{ fontSize: 15 }} />,
};

const LABELS: Partial<Record<IncidentAction, string>> = {
  ACKNOWLEDGE: 'Acknowledge ticket',
  START_WORK: 'Start investigation',
  COMMENT: 'Append note',
};

/** What a row needs to know about its incident. */
export interface RowIncident { id: number; code: string }

export interface QueueRowHandlers<T extends RowIncident = RowIncident> {
  onAcknowledge: (inc: T) => void;
  onStart: (inc: T) => void;
  onRequestInfo: (inc: T) => void;
  onNote: (inc: T) => void;
  onReassign: (inc: T) => void;
}

/**
 * Buttons on one queue row. A queue row is a summary without `allowedActions`, so the incident's own
 * allowedActions are fetched and `ActionButtons` shows only what the server lists for this person.
 * Escalate, mark duplicate and link problem open their dialogs here. Link problem has no action key of its
 * own; like the workbench it is offered to team leads (TEAM_VIEW) when the incident has no problem yet.
 */
export default function QueueRowActions<T extends RowIncident>({
  incident,
  problemBase,
  pendingId,
  handlers,
  actions = ROW_ACTIONS,
}: {
  incident: T;
  problemBase: string | null;
  pendingId: number | null;
  /** A button shows only when the server allows the action AND this screen can handle it (dialog actions are always handled here). */
  handlers: Partial<QueueRowHandlers<T>>;
  /** Narrow the row to some of the actions. */
  actions?: IncidentAction[];
}) {
  const { user } = useAuth();
  const isStaffLead = !!user?.permissions?.includes('TEAM_VIEW');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<'ESCALATE' | 'MARK_DUPLICATE' | 'LINK_PROBLEM' | null>(null);

  const detailQ = useQuery({
    queryKey: ['incidents', incident.id, 'row-actions'],
    queryFn: () => getIncident(incident.id),
    staleTime: 10_000,
  });
  const detail = detailQ.data;
  const handled = (a: IncidentAction) =>
    a === 'ESCALATE' || a === 'MARK_DUPLICATE' ||
    (a === 'ACKNOWLEDGE' && !!handlers.onAcknowledge) || (a === 'START_WORK' && !!handlers.onStart) ||
    (a === 'REQUEST_INFO' && !!handlers.onRequestInfo) || (a === 'COMMENT' && !!handlers.onNote) || (a === 'REASSIGN' && !!handlers.onReassign);
  const allowed = (detail?.allowedActions ?? []).filter((a) => actions.includes(a) && ROW_ACTIONS.includes(a) && handled(a));

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

  const onAction = (a: IncidentAction) => {
    switch (a) {
      case 'ACKNOWLEDGE': return handlers.onAcknowledge?.(incident);
      case 'START_WORK': return handlers.onStart?.(incident);
      case 'REQUEST_INFO': return handlers.onRequestInfo?.(incident);
      case 'COMMENT': return handlers.onNote?.(incident);
      case 'REASSIGN': return handlers.onReassign?.(incident);
      case 'ESCALATE': return setDialog('ESCALATE');
      case 'MARK_DUPLICATE': return setDialog('MARK_DUPLICATE');
      default: return undefined;
    }
  };

  const canLinkProblem = !!detail && isStaffLead && !!problemBase && !detail.problemId;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {detailQ.isLoading && <CircularProgress size={16} aria-label={`Loading actions for ${incident.code}`} />}
        {detailQ.isError && (
          <Typography sx={{ fontSize: 12, color: tokens.tertiaryLight }}>
            Actions did not load: {apiErrorMessage(detailQ.error)}{' '}
            <Button size="small" onClick={() => detailQ.refetch()} sx={{ fontSize: 12, textTransform: 'none' }}>Retry</Button>
          </Typography>
        )}
        {detail && (
          <ActionButtons
            allowed={allowed}
            onAction={onAction}
            icons={ICONS}
            labels={LABELS}
            pending={pendingId === incident.id ? allowed.find((a) => a === 'ACKNOWLEDGE' || a === 'START_WORK') ?? null : null}
          />
        )}
        {canLinkProblem && (
          <Button size="small" variant="outlined" startIcon={<LinkIcon sx={{ fontSize: 15 }} />} onClick={() => setDialog('LINK_PROBLEM')} sx={{ fontSize: 12.5, fontWeight: 600, textTransform: 'none' }}>
            Link problem
          </Button>
        )}
      </Box>
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
