import { Box, Typography } from '@mui/material';
import SlaCountdown from '../../../components/SlaCountdown';
import type { IncidentDetail } from '../../../api/types';
import { COLORS } from './ui';

type ClockFields = Pick<IncidentDetail, 'responseDue' | 'resolutionDue' | 'acknowledgedAt' | 'resolvedAt' | 'slaState' | 'pausedAt' | 'createdAt'>;

/**
 * The response and resolution clocks side by side. Due times and the SLA state come from the server and the
 * running clock ticks down to the server's due timestamp; nothing is worked out here. The server reports one
 * `slaState` for the clock that is running: response until acknowledged, then resolution. A paused clock is
 * explained from `pausedAt`.
 */
export default function SlaClockPair({ incident, fontSize = 18 }: { incident: ClockFields; fontSize?: number }) {
  const responseActive = !incident.acknowledgedAt && !incident.resolvedAt;
  const clocks = [
    { label: 'Response', due: incident.responseDue, active: responseActive, doneAt: incident.acknowledgedAt, doneText: 'Acknowledged' },
    { label: 'Resolution', due: incident.resolutionDue, active: !responseActive && !incident.resolvedAt, doneAt: incident.resolvedAt, doneText: 'Resolved' },
  ] as const;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {clocks.map((c) => (
        <Box key={c.label}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.onSurfaceVariant }}>
            {c.label} clock
          </Typography>
          {c.active ? (
            <Box sx={{ fontSize }}>
              <SlaCountdown due={c.due} createdAt={incident.createdAt} slaState={incident.slaState} />
            </Box>
          ) : c.doneAt ? (
            <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
              {c.doneText} {new Date(c.doneAt).toLocaleString()}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>{c.due ? `Due ${new Date(c.due).toLocaleString()}` : 'No target'}</Typography>
          )}
        </Box>
      ))}
      {incident.slaState === 'PAUSED' && (
        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
          {incident.pausedAt
            ? `Paused since ${new Date(incident.pausedAt).toLocaleString()} while the reporter provides information. It resumes, with the time left kept, when they reply.`
            : 'Paused while waiting for the reporter. It resumes when they reply.'}
        </Typography>
      )}
    </Box>
  );
}
