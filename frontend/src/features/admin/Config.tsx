import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, InputAdornment, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Refresh as RefreshIcon, Save as SaveIcon, Search as SearchIcon, RestartAlt as RestartAltIcon } from '@mui/icons-material';
import { getAdminConfig, updateAdminConfig, type ConfigItem } from '../../api/admin';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { tokens } from '../../theme/theme';
import { apiErrorMessage, fieldErrors } from '../../utils/errors';
import ConfigField from './config/ConfigField';
import WeightBar from './config/WeightBar';
import BusinessCalendarCard from './config/BusinessCalendarCard';
import { BUSINESS_KEY_SET, GROUPS, OTHER_GROUP, STRATEGY_HELP, WEIGHT_SETS, checkValue, groupOf, type Group } from './config/configMeta';
import { tone, alpha } from './palette';

const CONFIG_KEY = ['admin-config-settings'];
const headSx = { fontWeight: 700, color: tokens.onSurfaceVariant, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' };

type ServerIssue = { field: string; message: string };

/** The server keys errors by config key; a bean-validation error on the body would use `[index].value` instead. */
function issuesByKey(issues: ServerIssue[], sent: { key: string }[]): { byKey: Record<string, string>; loose: string[] } {
  const byKey: Record<string, string> = {};
  const loose: string[] = [];
  for (const i of issues) {
    const idx = /^\[(\d+)\]/.exec(i.field);
    const key = idx ? sent[Number(idx[1])]?.key : i.field;
    if (key && sent.some((s) => s.key === key)) byKey[key] = byKey[key] ? `${byKey[key]}; ${i.message}` : i.message;
    else loose.push(`${i.field}: ${i.message}`);
  }
  return { byKey, loose };
}

export default function Config() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [looseErrors, setLooseErrors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data: configs = [], isLoading, isError, error, refetch } = useQuery({ queryKey: CONFIG_KEY, queryFn: getAdminConfig });

  const saved = useMemo(() => Object.fromEntries(configs.map((c) => [c.key, c.value])), [configs]);
  const value = (key: string) => draft[key] ?? saved[key] ?? '';
  const isModified = (key: string) => key in draft && draft[key].trim() !== (saved[key] ?? '').trim();
  const changes = useMemo(
    () => configs.filter((c) => isModified(c.key)).map((c) => ({ key: c.key, value: draft[c.key].trim() })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configs, draft],
  );

  const setValue = (key: string, v: string) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setErrors((e) => { if (!(key in e)) return e; const n = { ...e }; delete n[key]; return n; });
  };

  const save = useMutation({
    mutationFn: (sent: { key: string; value: string }[]) => updateAdminConfig(sent),
    onSuccess: (updated, sent) => {
      queryClient.setQueryData(CONFIG_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: CONFIG_KEY });
      setDraft({});
      setErrors({});
      setLooseErrors([]);
      toast(`${sent.length} setting${sent.length === 1 ? '' : 's'} saved; active immediately`, 'success');
    },
    onError: (e, sent) => {
      const { byKey, loose } = issuesByKey(fieldErrors(e), sent);
      setErrors(byKey);
      setLooseErrors(loose);
      toast(apiErrorMessage(e), 'error');
    },
  });

  const handleSave = () => {
    const local: Record<string, string> = {};
    for (const c of changes) {
      const problem = checkValue(c.key, c.value);
      if (problem) local[c.key] = problem;
    }
    if (Object.keys(local).length > 0) {
      setErrors(local);
      toast('Fix the highlighted values before saving', 'error');
      return;
    }
    save.mutate(changes);
  };

  const handleReset = () => {
    setDraft({});
    setErrors({});
    setLooseErrors([]);
    toast('Unsaved changes discarded', 'info');
  };

  const q = search.trim().toLowerCase();
  const matches = (c: ConfigItem) => !q || c.key.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  const grouped = useMemo(() => {
    const map = new Map<string, { group: Group; items: ConfigItem[] }>();
    [...GROUPS, OTHER_GROUP].forEach((g) => map.set(g.id, { group: g, items: [] }));
    configs.forEach((c) => map.get(groupOf(c.key).id)!.items.push(c));
    return [...map.values()].filter((g) => g.items.length > 0);
  }, [configs]);

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const renderRow = (cfg: ConfigItem) => {
    const modified = isModified(cfg.key);
    const v = value(cfg.key);
    const help = cfg.key === 'assignment.strategy' ? STRATEGY_HELP[v.trim()] : undefined;
    return (
      <TableRow key={cfg.key} sx={{ '& td': { borderBottom: `1px solid ${tokens.outlineVariant}`, verticalAlign: 'top' }, bgcolor: modified ? alpha(tone.warning, 0.07) : undefined, boxShadow: modified ? `inset 3px 0 0 ${tone.warning}` : undefined }}>
        <TableCell sx={{ width: '26%' }}>
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: tokens.primaryLight, fontSize: 13, wordBreak: 'break-all' }}>{cfg.key}</Typography>
          {modified && <Chip size="small" label="modified" sx={{ mt: 0.5, fontSize: 12, height: 20, color: tone.warning, bgcolor: alpha(tone.warning, 0.15) }} />}
        </TableCell>
        <TableCell>
          <Typography sx={{ color: tokens.onSurface, fontSize: 13 }}>{cfg.description}</Typography>
          {help && <Typography sx={{ color: tokens.secondaryLight, fontSize: 12, mt: 0.5 }}>{help}</Typography>}
          {cfg.key === 'assignment.strategy' && (
            <Button component={RouterLink} to="/admin/simulator" size="small" sx={{ textTransform: 'none', fontSize: 12, px: 0, mt: 0.5 }}>
              Compare strategies in the simulator
            </Button>
          )}
        </TableCell>
        <TableCell sx={{ width: 280 }}>
          <ConfigField item={cfg} value={v} error={errors[cfg.key]} onChange={(nv) => setValue(cfg.key, nv)} />
        </TableCell>
        <TableCell sx={{ width: 150 }}>
          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
            default: {cfg.defaultValue === '' ? '(empty)' : cfg.defaultValue}
          </Typography>
          <Button size="small" startIcon={<RestartAltIcon />} disabled={v.trim() === cfg.defaultValue.trim()} onClick={() => setValue(cfg.key, cfg.defaultValue)}
            aria-label={`Reset ${cfg.key} to its default`} sx={{ textTransform: 'none', fontSize: 12, px: 0.5 }}>
            Use default
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const effective = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, value(k)]));

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>Runtime settings</Typography>
          <Typography sx={{ color: tokens.onSurfaceVariant, mt: 0.5, fontSize: 14 }}>
            Thresholds, assignment weights, strategies and lockout rules. Saved values apply immediately, with no restart.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {changes.length > 0 && <Chip label={`${changes.length} unsaved`} sx={{ fontSize: 13, color: tone.warning, bgcolor: alpha(tone.warning, 0.15) }} />}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleReset} disabled={changes.length === 0 && Object.keys(draft).length === 0}
            sx={{ borderColor: tokens.outlineVariant, color: tokens.onSurfaceVariant, textTransform: 'none', fontWeight: 600 }}>
            Discard changes
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={save.isPending || changes.length === 0}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            {save.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </Stack>
      </Stack>

      {looseErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
          {looseErrors.map((m) => <div key={m}>{m}</div>)}
        </Alert>
      )}

      {isLoading ? <LoadingState />
        : isError ? <ErrorState onRetry={() => void refetch()} message={apiErrorMessage(error)} />
        : configs.length === 0 ? <EmptyState message="The server returned no settings." />
        : (
          <>
            <TextField
              fullWidth size="small" placeholder="Search by key or description" value={search} onChange={(e) => setSearch(e.target.value)}
              inputProps={{ 'aria-label': 'Search settings' }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLow } }}
            />
            {grouped.map(({ group, items }) => {
              const groupKeys0 = items.map((c) => c.key);
              const visible = items.filter(matches).filter((c) => !BUSINESS_KEY_SET.has(c.key));
              const showCalendar = group.id === 'sla' && [...BUSINESS_KEY_SET].every((k) => groupKeys0.includes(k)) && (!q || 'business hours calendar holidays time zone'.includes(q) || items.some((c) => BUSINESS_KEY_SET.has(c.key) && matches(c)));
              if (visible.length === 0 && !showCalendar) return null;
              const groupKeys = items.map((c) => c.key);
              const modCount = groupKeys.filter(isModified).length;
              const errCount = groupKeys.filter((k) => errors[k]).length;
              const weightSets = WEIGHT_SETS.filter((w) => groupOf(w.keys[0].key).id === group.id && w.keys.every((k) => groupKeys.includes(k.key)));
              return (
                <Accordion key={group.id} expanded={open.has(group.id) || q !== '' || errCount > 0} onChange={() => toggle(group.id)} disableGutters
                  sx={{ bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px !important', mb: 1.5, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-label={`${group.title} settings`}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography sx={{ fontWeight: 700, color: tokens.onSurface }}>{group.title}</Typography>
                      <Chip size="small" label={`${items.length} settings`} sx={{ fontSize: 12 }} />
                      {modCount > 0 && <Chip size="small" label={`${modCount} modified`} sx={{ fontSize: 12, color: tone.warning, bgcolor: alpha(tone.warning, 0.15) }} />}
                      {errCount > 0 && <Chip size="small" color="error" label={`${errCount} with errors`} sx={{ fontSize: 12 }} />}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Stack spacing={2} sx={{ p: 2, pt: 0 }}>
                      {showCalendar && (
                        <BusinessCalendarCard values={effective([...BUSINESS_KEY_SET])} errors={errors} onChange={setValue} />
                      )}
                      {weightSets.map((w) => (
                        <WeightBar key={w.id} title={w.title} weights={w.keys.map((k) => ({ ...k, value: value(k.key) }))} />
                      ))}
                    </Stack>
                    {visible.length > 0 && (
                      <Paper elevation={0} sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: tokens.surfaceContainerLow }}>
                            <TableRow>
                              <TableCell sx={headSx}>KEY</TableCell>
                              <TableCell sx={headSx}>WHAT IT DOES</TableCell>
                              <TableCell sx={headSx}>VALUE</TableCell>
                              <TableCell sx={headSx}>DEFAULT</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>{visible.map(renderRow)}</TableBody>
                        </Table>
                      </Paper>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </>
        )}
    </Box>
  );
}
