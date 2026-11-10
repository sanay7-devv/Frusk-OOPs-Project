import { Button, Stack } from '@mui/material';
import type { IncidentAction } from '../api/types';

const LABEL: Partial<Record<IncidentAction, string>> = {
  ACKNOWLEDGE: 'Acknowledge', START_WORK: 'Start work', REQUEST_INFO: 'Request info', RESOLVE: 'Resolve',
  VERIFY: 'Confirm fixed', REOPEN: 'Reopen', REASSIGN: 'Reassign', ESCALATE: 'Escalate',
  ASSIGN: 'Assign', CLOSE: 'Close', OVERRIDE_PRIORITY: 'Override priority', MARK_DUPLICATE: 'Mark duplicate',
};
/** Buttons come ONLY from allowedActions. Never re-implement the lifecycle rules here. */
export default function ActionButtons({ allowed, onAction }: { allowed: IncidentAction[]; onAction: (a: IncidentAction) => void }) {
  return <Stack direction="row" spacing={1} flexWrap="wrap">
    {allowed.filter(a => LABEL[a]).map(a => <Button key={a} variant="outlined" onClick={() => onAction(a)}>{LABEL[a]}</Button>)}
  </Stack>;
}
