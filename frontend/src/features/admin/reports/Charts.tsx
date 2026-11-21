import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
} from 'recharts';
import { tokens } from '../../../theme/theme';
import type { LabelCount, ServiceReportRow, SlaComplianceRow, TrendPoint, WorkloadReportRow } from '../../../api/reports';
import { AXIS, CHART_COLORS, PRIORITY_COLORS, TOOLTIP_STYLE } from './common';

const GRID = tokens.outlineVariant;
const LABEL_FILL = tokens.onSurfaceVariant;

export function formatMinutes(m: number): string {
  const total = Math.round(m);
  const h = Math.floor(total / 60);
  const mins = total % 60;
  return h > 0 ? `${h} h ${mins} min` : `${mins} min`;
}

export const TrendChart = ({ data }: { data: TrendPoint[] }) => (
  <ResponsiveContainer width="100%" height={280}>
    <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="date" {...AXIS} tickFormatter={(d: string) => d.slice(5)} />
      <YAxis allowDecimals={false} {...AXIS} />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      <Legend wrapperStyle={{ fontSize: 12, color: LABEL_FILL }} />
      <Line type="monotone" dataKey="created" name="Created" stroke={CHART_COLORS.created} strokeWidth={2} dot={false} isAnimationActive={false} />
      <Line type="monotone" dataKey="resolved" name="Resolved" stroke={CHART_COLORS.resolved} strokeWidth={2} dot={false} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer>
);

export const SlaChart = ({ data, onBarClick }: { data: SlaComplianceRow[]; onBarClick?: (label: string) => void }) => {
  const click = onBarClick ? (d: unknown) => onBarClick((d as SlaComplianceRow).label) : undefined;
  const cursor = onBarClick ? 'pointer' : undefined;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, color: LABEL_FILL }} />
        <Bar dataKey="met" name="Met" fill={CHART_COLORS.met} isAnimationActive={false} cursor={cursor} onClick={click}>
          <LabelList dataKey="met" position="top" fill={LABEL_FILL} fontSize={12} />
        </Bar>
        <Bar dataKey="violated" name="Violated" fill={CHART_COLORS.violated} isAnimationActive={false} cursor={cursor} onClick={click}>
          <LabelList dataKey="violated" position="top" fill={LABEL_FILL} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const priorityName = (l: string) => (/^\d$/.test(l) ? `P${l}` : l);

export const PriorityDonut = ({ data, onSliceClick, center }: {
  data: LabelCount[]; onSliceClick?: (label: string) => void; center?: { caption: string; value: string };
}) => (
  <Box sx={{ position: 'relative' }}>
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data.map((d) => ({ ...d, name: priorityName(d.label) }))} dataKey="count" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}
          isAnimationActive={false} cy="45%" label={false}
          cursor={onSliceClick ? 'pointer' : undefined}
          onClick={(d) => onSliceClick?.((d as unknown as LabelCount).label)}>
          {data.map((d) => <Cell key={d.label} fill={PRIORITY_COLORS[priorityName(d.label)] ?? PRIORITY_COLORS[d.label] ?? tokens.outline} stroke="none" />)}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: LABEL_FILL }}
          formatter={(value, entry) => `${value}: ${(entry.payload as unknown as { count?: number })?.count ?? ''}`} />
      </PieChart>
    </ResponsiveContainer>
    {center && (
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', pb: '36px' }}>
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{center.caption}</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: tokens.onSurface }}>{center.value}</Typography>
      </Box>
    )}
  </Box>
);

function HBars<T extends object>({ data, nameKey, valueKey, onBarClick }: {
  data: T[]; nameKey: keyof T & string; valueKey: keyof T & string; onBarClick?: (row: T) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...AXIS} />
        <YAxis type="category" dataKey={nameKey} width={130} {...AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey={valueKey} name="Incidents" fill={CHART_COLORS.bar} isAnimationActive={false}
          cursor={onBarClick ? 'pointer' : undefined} onClick={(d) => onBarClick?.(d as unknown as T)}>
          <LabelList dataKey={valueKey} position="right" fill={LABEL_FILL} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const CategoryBars = ({ data, onBarClick }: { data: LabelCount[]; onBarClick?: (label: string) => void }) => (
  <HBars<LabelCount> data={[...data].sort((a, b) => b.count - a.count).slice(0, 8)} nameKey="label" valueKey="count" onBarClick={onBarClick && ((r) => onBarClick(r.label))} />
);
export const ServiceBars = ({ data, onBarClick }: { data: ServiceReportRow[]; onBarClick?: (row: ServiceReportRow) => void }) => (
  <HBars data={[...data].sort((a, b) => b.count - a.count)} nameKey="name" valueKey="count" onBarClick={onBarClick} />
);

export const WorkloadChart = ({ data, onBarClick }: { data: WorkloadReportRow[]; onBarClick?: (row: WorkloadReportRow) => void }) => (
  <Box>
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52 + 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...AXIS} />
        <YAxis type="category" dataKey="name" width={130} {...AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, color: LABEL_FILL }} />
        <Bar dataKey="load" name="Current load" fill={CHART_COLORS.bar} isAnimationActive={false}
          cursor={onBarClick ? 'pointer' : undefined} onClick={(d) => onBarClick?.(d as unknown as WorkloadReportRow)}>
          <LabelList dataKey="load" position="right" fill={LABEL_FILL} fontSize={12} />
        </Bar>
        <Bar dataKey="maxLoad" name="Capacity" fill={alpha(tokens.secondary, 0.7)} isAnimationActive={false}>
          <LabelList dataKey="maxLoad" position="right" fill={LABEL_FILL} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <Typography sx={{ color: tokens.onSurface, fontSize: 13, fontWeight: 600, mt: 1.5, mb: 0.5 }}>Average time to resolve, per technician</Typography>
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0.5 }}>
      {data.map((d) => (
        <Box component="li" key={d.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: 12, color: tokens.onSurfaceVariant }}>
          <span>{d.name}</span>
          <span>{d.avgResolutionMinutes <= 0 ? 'No data' : formatMinutes(d.avgResolutionMinutes)}</span>
        </Box>
      ))}
    </Box>
  </Box>
);
