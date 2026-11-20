import { formatDateTime } from '../../../utils/format';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Chip, FormControlLabel, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Typography, Box,
} from '@mui/material';
import { theme, tokens } from '../../../theme/theme';
import { getCoverageRisk, type CoverageLevel } from '../../../api/reports';
import { getSlaViolations } from '../../../api/incidents';
import { ChartCard, type DateRange } from './common';

const LEVEL: Record<CoverageLevel, { label: string; color: string }> = {
  NO_COVERAGE: { label: 'No one covers this', color: theme.palette.error.main },
  SINGLE_HOLDER: { label: 'Only one person', color: theme.palette.warning.main },
  THIN: { label: 'Thin cover', color: theme.palette.warning.light },
  COVERED: { label: 'Covered', color: theme.palette.success.main },
};

const head = { color: tokens.onSurfaceVariant, fontSize: 12, fontWeight: 600, borderColor: tokens.outlineVariant } as const;
const cell = { color: tokens.onSurface, fontSize: 13, borderColor: tokens.outlineVariant } as const;

export function CoverageRiskCard() {
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const query = useQuery({ queryKey: ['reports', 'coverage', onlyFlagged], queryFn: () => getCoverageRisk(onlyFlagged) });
  return (
    <ChartCard title="Coverage risk" query={query} isEmpty={(d) => d.items.length === 0}
      emptyMessage={onlyFlagged ? 'No coverage risks found' : 'No services to check'}
      action={
        <FormControlLabel
          control={<Switch size="small" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />}
          label={<Typography sx={{ fontSize: 13 }}>Show only risks</Typography>} />
      }>
      {(d) => (
        <>
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, mb: 1 }}>
            {d.flaggedCount} at risk · looks at the last {d.windowDays} days · at least {d.minHolders} people should hold each skill
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Service', 'Category', 'Status', 'Qualified people', 'Incidents', 'Details'].map((h) => <TableCell key={h} sx={head}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {d.items.map((it, i) => (
                  <TableRow key={`${it.service?.id}-${it.category?.id}-${i}`}>
                    <TableCell sx={cell}>{it.service?.name ?? '-'}</TableCell>
                    <TableCell sx={cell}>{it.category?.name ?? '-'}</TableCell>
                    <TableCell sx={cell}>
                      <Chip size="small" label={LEVEL[it.level].label}
                        sx={{ fontSize: 12, color: LEVEL[it.level].color, border: `1px solid ${LEVEL[it.level].color}`, bgcolor: 'transparent' }} />
                    </TableCell>
                    <TableCell sx={cell}>{it.eligibleCount}</TableCell>
                    <TableCell sx={cell}>{it.incidentsInWindow}</TableCell>
                    <TableCell sx={{ ...cell, color: tokens.onSurfaceVariant }}>{it.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </ChartCard>
  );
}

function overdue(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function SlaViolationsCard({ range }: { range: DateRange | null }) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  useEffect(() => { setPage(0); }, [range?.from, range?.to]);
  const query = useQuery({
    queryKey: ['reports', 'violations', range, page, size],
    queryFn: () => getSlaViolations({ ...range, page, size }),
    enabled: range !== null,
  });
  return (
    <ChartCard title="Recent SLA violations" query={query} isEmpty={(d) => d.totalItems === 0} emptyMessage="No SLA violations in this period">
      {(d) => (
        <Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Incident', 'Missed', 'Overdue by', 'Technician', 'Created'].map((h) => <TableCell key={h} sx={head}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {d.items.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell sx={cell}>{v.incidentCode}</TableCell>
                    <TableCell sx={cell}>{v.type === 'RESPONSE' ? 'First response' : 'Resolution'}</TableCell>
                    <TableCell sx={cell}>{overdue(v.overdueSeconds)}</TableCell>
                    <TableCell sx={cell}>{v.technician?.name ?? 'Not assigned'}</TableCell>
                    <TableCell sx={cell}>{formatDateTime(v.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={d.totalItems} page={page} rowsPerPage={size}
            rowsPerPageOptions={[10, 25, 50]} onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} />
        </Box>
      )}
    </ChartCard>
  );
}
