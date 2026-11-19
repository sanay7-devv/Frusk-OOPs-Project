import { Button, Stack } from '@mui/material';
import type { IncidentAction } from '../api/types';
import { tokens } from '../theme/theme';

const LABEL: Partial<Record<IncidentAction, string>> = {
  ACKNOWLEDGE: 'Acknowledge',
  START_WORK: 'Start work',
  REQUEST_INFO: 'Request info',
  PROVIDE_INFO: 'Provide information',
  RESOLVE: 'Resolve',
  VERIFY: 'Confirm fixed',
  GIVE_FEEDBACK: 'Give feedback',
  REOPEN: 'Reopen',
  WITHDRAW: 'Withdraw incident',
  REASSIGN: 'Reassign',
  ESCALATE: 'Escalate',
  ASSIGN: 'Assign',
  CLOSE: 'Close',
  OVERRIDE_PRIORITY: 'Override priority',
  MARK_DUPLICATE: 'Mark duplicate',
  COMMENT: 'Add note',
  EDIT: 'Edit incident',
};

export interface ActionButtonsProps {
  /** The incident's `allowedActions` from the API. Either this or `incident` must be given. */
  allowed?: IncidentAction[];
  /** Pass an incident (summary or detail with `allowedActions`) instead of `allowed`. */
  incident?: { allowedActions?: IncidentAction[] } | null;
  onAction: (a: IncidentAction) => void;
  /** Actions the screen renders itself (for example COMMENT has a composer). Never use this to add actions. */
  exclude?: IncidentAction[];
  /** Label overrides for one screen, per action. */
  labels?: Partial<Record<IncidentAction, string>>;
  /** Action currently being sent: shown disabled with a busy label. */
  pending?: IncidentAction | null;
  disabled?: boolean;
}

/** Buttons come ONLY from allowedActions. Never re-implement the lifecycle rules here. */
export default function ActionButtons({
  allowed,
  incident,
  onAction,
  exclude,
  labels,
  pending,
  disabled,
}: ActionButtonsProps) {
  const actions = (allowed ?? incident?.allowedActions ?? []).filter((a) => !exclude?.includes(a));
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap role="group" aria-label="Incident actions">
      {actions
        .filter((a) => labels?.[a] ?? LABEL[a])
        .map((a) => {
          const isPrimary = a === 'ACKNOWLEDGE' || a === 'START_WORK' || a === 'RESOLVE' || a === 'VERIFY';
          const isDanger = a === 'ESCALATE' || a === 'REOPEN';

          return (
            <Button
              key={a}
              size="small"
              variant={isPrimary ? 'contained' : 'outlined'}
              disabled={disabled || pending === a}
              onClick={() => onAction(a)}
              sx={{
                borderRadius: '8px',
                px: 1.8,
                py: 0.6,
                fontSize: 12.5,
                fontWeight: 600,
                ...(isPrimary
                  ? {
                      background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                      color: '#ffffff',
                      boxShadow: '0 0 14px rgba(99, 102, 241, 0.35)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)',
                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.45)',
                      },
                    }
                  : isDanger
                  ? {
                      bgcolor: 'rgba(244, 63, 94, 0.12)',
                      borderColor: 'rgba(244, 63, 94, 0.4)',
                      color: tokens.tertiaryLight,
                      '&:hover': {
                        bgcolor: 'rgba(244, 63, 94, 0.22)',
                        borderColor: '#f43f5e',
                        color: '#ffffff',
                        boxShadow: '0 0 16px rgba(244, 63, 94, 0.3)',
                      },
                    }
                  : {
                      bgcolor: 'rgba(255, 255, 255, 0.04)',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      color: tokens.onSurface,
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.12)',
                        borderColor: '#6366f1',
                        color: tokens.primaryLight,
                      },
                    }),
              }}
            >
              {labels?.[a] ?? LABEL[a]}
            </Button>
          );
        })}
    </Stack>
  );
}
