import { Box, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { tokens } from '../theme/theme';
import { useRealtimeStatus, type RealtimeStatus } from '../realtime/realtimeStore';

const VIEW: Record<RealtimeStatus, { label: string; color: string; hint: string }> = {
  connected: { label: 'Live', color: tokens.success, hint: 'Connected: updates arrive instantly.' },
  connecting: { label: 'Connecting', color: tokens.amber, hint: 'Opening the live connection.' },
  reconnecting: {
    label: 'Reconnecting',
    color: tokens.danger,
    hint: 'Live connection lost. Retrying; the screens poll in the meantime.',
  },
  off: { label: 'Offline', color: tokens.textDisabled, hint: 'No live connection.' },
};

/** Realtime (STOMP) connection status for the app shell header. */
export default function RealtimeStatusPill() {
  const status = useRealtimeStatus();
  const v = VIEW[status];
  const pulsing = status === 'connecting' || status === 'reconnecting';
  return (
    <Tooltip title={v.hint}>
      <Box
        role="status"
        aria-label={`Live connection: ${v.label}`}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 0.8,
          px: 1.2,
          height: 28,
          borderRadius: 999,
          border: `1px solid ${alpha(v.color, 0.4)}`,
          bgcolor: alpha(v.color, 0.1),
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: v.color,
            '@keyframes pillPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
            animation: pulsing ? 'pillPulse 1.2s ease-in-out infinite' : 'none',
          }}
        />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: v.color, fontFamily: tokens.fontMono }}>
          {v.label}
        </Typography>
      </Box>
    </Tooltip>
  );
}
