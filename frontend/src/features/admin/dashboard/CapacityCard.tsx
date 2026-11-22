import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Engineering as EngineeringIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../../../theme/theme';
import { getWorkloadReport } from '../../../api/reports';
import { ChartCard } from '../reports/common';
import { tone } from '../palette';

export function CapacityCard() {
  const query = useQuery({ queryKey: ['dashboard', 'workload'], queryFn: getWorkloadReport, refetchInterval: 30_000 });
  return (
    <ChartCard
      title="Team capacity"
      query={query}
      isEmpty={(d) => d.length === 0}
      emptyMessage="No technicians configured."
      icon={<EngineeringIcon sx={{ fontSize: 19, color: tokens.secondaryLight }} />}
      borderTopColor={tokens.secondary}
      action={
        <Typography
          component={RouterLink}
          to="/admin/reports"
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: tokens.secondaryLight,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Workload report →
        </Typography>
      }
    >
      {(rows) => {
        const sorted = [...rows].sort((a, b) => (b.maxLoad ? b.load / b.maxLoad : 0) - (a.maxLoad ? a.load / a.maxLoad : 0));
        const totalUsed = rows.reduce((s, r) => s + (r.load || 0), 0);
        const totalMax = rows.reduce((s, r) => s + (r.maxLoad || 10), 0);
        const totalPct = totalMax > 0 ? Math.round((totalUsed / totalMax) * 100) : 0;

        return (
          <Box>
            {/* Overall Capacity Summary Banner */}
            <Box
              sx={{
                p: '8px 12px',
                mb: 1.5,
                borderRadius: '8px',
                bgcolor: alpha(tokens.surfaceContainerLowest, 0.6),
                border: `1px solid ${tokens.outlineVariant}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, fontWeight: 500 }}>
                Total Team Load
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: totalPct >= 80 ? tone.danger : tokens.primaryLight,
                }}
              >
                {totalUsed} / {totalMax} slots ({totalPct}%)
              </Typography>
            </Box>

            <Stack
              spacing={1.2}
              sx={{
                maxHeight: 310,
                overflowY: 'auto',
                pr: 0.6,
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: alpha(tokens.white, 0.12),
                  borderRadius: 4,
                  '&:hover': { bgcolor: alpha(tokens.white, 0.25) },
                },
              }}
            >
              {sorted.map((t) => {
                const pct = t.maxLoad > 0 ? Math.min(100, Math.round((t.load / t.maxLoad) * 100)) : 0;
                const isFull = t.maxLoad > 0 && t.load >= t.maxLoad;
                const isHigh = !isFull && pct >= 70;
                const isAvailable = t.load === 0;

                const statusColor = isFull ? tone.danger : isHigh ? tone.caution : isAvailable ? tokens.textDisabled : tokens.secondary;
                const initials = t.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <Box
                    key={t.technicianId}
                    sx={{
                      p: 1.2,
                      borderRadius: '8px',
                      bgcolor: alpha(tokens.surfaceContainerLowest, 0.4),
                      border: `1px solid ${isFull ? alpha(tone.danger, 0.35) : tokens.outlineVariant}`,
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: alpha(tokens.surfaceContainerHigh, 0.6),
                        borderColor: alpha(statusColor, 0.4),
                      },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.7 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: alpha(statusColor, 0.15),
                            color: statusColor,
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${alpha(statusColor, 0.3)}`,
                          }}
                        >
                          {initials}
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.onSurface }}>
                          {t.name}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={isFull ? '10/10 · Full' : isAvailable ? 'Available' : `${t.load}/${t.maxLoad} · ${pct}%`}
                        sx={{
                          height: 19,
                          fontSize: 10.5,
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: statusColor,
                          bgcolor: alpha(statusColor, 0.12),
                          border: `1px solid ${alpha(statusColor, 0.3)}`,
                        }}
                      />
                    </Stack>

                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      aria-label={`${t.name} load`}
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: alpha(tokens.white, 0.06),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: isFull ? tone.danger : isHigh ? tone.caution : tokens.secondary,
                          backgroundImage: isFull
                            ? `linear-gradient(90deg, #ef4444 0%, #dc2626 100%)`
                            : isHigh
                            ? `linear-gradient(90deg, #f59e0b 0%, #d97706 100%)`
                            : `linear-gradient(90deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      }}
    </ChartCard>
  );
}
