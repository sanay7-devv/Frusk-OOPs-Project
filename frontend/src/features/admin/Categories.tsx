import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, Grid, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Restore as RestoreIcon, Block as BlockIcon } from '@mui/icons-material';
import {
  deactivateAdminCategory, deleteAdminSkill, getAdminCategories, getAdminSkills, updateAdminCategory,
  type AdminCategory, type AdminSkill,
} from '../../api/admin';
import { getCoverageRisk, type CoverageItem } from '../../api/reports';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';
import CategoryDialog from './categories/CategoryDialog';
import SkillDialog from './categories/SkillDialog';
import { alpha, tone } from './palette';
import { reportFailure } from './adminErrors';

const CATEGORIES_KEY = ['admin-categories-list'];
const SKILLS_KEY = ['admin-skills-list'];
const headSx = { fontWeight: 700, color: tokens.onSurfaceVariant, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' };
const rowSx = { '& td': { borderBottom: `1px solid ${tokens.outlineVariant}` } };
const tableBox = { borderRadius: 3, border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer, overflow: 'hidden' };

/** Depth-first order: each category directly under its parent, children sorted by name. */
function toTree(categories: AdminCategory[]): { category: AdminCategory; depth: number }[] {
  const ids = new Set(categories.map((c) => c.id));
  const byParent = new Map<number | null, AdminCategory[]>();
  categories.forEach((c) => {
    const key = c.parentId != null && ids.has(c.parentId) ? c.parentId : null; // a missing parent is shown at top level
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  });
  const out: { category: AdminCategory; depth: number }[] = [];
  const walk = (parent: number | null, depth: number, seen: Set<number>) => {
    [...(byParent.get(parent) ?? [])].sort((a, b) => a.name.localeCompare(b.name)).forEach((c) => {
      if (seen.has(c.id)) return;
      out.push({ category: c, depth });
      walk(c.id, depth + 1, new Set(seen).add(c.id));
    });
  };
  walk(null, 0, new Set());
  return out;
}

export default function Categories() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [catDialog, setCatDialog] = useState<{ category: AdminCategory | null } | null>(null);
  const [skillDialog, setSkillDialog] = useState<{ skill: AdminSkill | null } | null>(null);
  const [toDeactivate, setToDeactivate] = useState<AdminCategory | null>(null);
  const [skillToDelete, setSkillToDelete] = useState<AdminSkill | null>(null);

  const cats = useQuery({ queryKey: CATEGORIES_KEY, queryFn: getAdminCategories });
  const skillsQ = useQuery({ queryKey: SKILLS_KEY, queryFn: getAdminSkills });
  // Coverage report: how many available technicians hold the skills each category needs.
  const coverage = useQuery({ queryKey: ['coverage-risk', false], queryFn: () => getCoverageRisk(false) });
  const eligibleByCategory = useMemo(() => {
    const m = new Map<number, CoverageItem>();
    (coverage.data?.items ?? []).forEach((it) => {
      if (!it.category) return;
      const prev = m.get(it.category.id);
      if (!prev || it.eligibleCount < prev.eligibleCount) m.set(it.category.id, it);
    });
    return m;
  }, [coverage.data]);
  const categories = cats.data ?? [];
  const skills = skillsQ.data ?? [];
  const tree = useMemo(() => toTree(categories), [categories]);

  // The employee report form and the Declare dialog read the public category tree; keep them in step.
  const refreshCategories = () => {
    [CATEGORIES_KEY, ['categories'], ['catalog-categories']].forEach((k) => void queryClient.invalidateQueries({ queryKey: k }));
  };
  const refreshSkills = () => {
    void queryClient.invalidateQueries({ queryKey: SKILLS_KEY });
    refreshCategories(); // category rows show skill names
  };

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivateAdminCategory(id),
    onSuccess: () => { toast('Category switched off', 'success'); setToDeactivate(null); refreshCategories(); },
    onError: (e) => { reportFailure(toast, e); setToDeactivate(null); },
  });
  const reactivate = useMutation({
    mutationFn: (c: AdminCategory) => updateAdminCategory(c.id, { name: c.name, parentId: c.parentId ?? null, requiredSkillIds: c.requiredSkillIds ?? [], active: true }),
    onSuccess: (c) => { toast(`Category ${c.name} is active again`, 'success'); refreshCategories(); },
    onError: (e) => reportFailure(toast, e),
  });
  const removeSkill = useMutation({
    mutationFn: (id: number) => deleteAdminSkill(id),
    onSuccess: () => { toast('Skill deleted', 'success'); setSkillToDelete(null); refreshSkills(); },
    // the server refuses with its own message while a category or technician still uses the skill
    onError: (e) => { reportFailure(toast, e); setSkillToDelete(null); },
  });

  const skillName = (id: number) => skills.find((s) => s.id === id)?.name ?? `Skill #${id}`;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>Categories and skills</Typography>
          <Typography sx={{ color: tokens.onSurfaceVariant, mt: 0.5, fontSize: 14 }}>
            The category tree and the skills each category requires. Assignment only offers incidents to technicians who hold the required skills.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSkillDialog({ skill: null })}
            sx={{ borderColor: tokens.outlineVariant, color: tokens.onSurfaceVariant, textTransform: 'none', fontWeight: 600 }}>
            Add skill
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCatDialog({ category: null })} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Add category
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif', mb: 1.5 }}>Incident categories</Typography>
          {cats.isLoading ? <LoadingState />
            : cats.isError ? <ErrorState onRetry={() => void cats.refetch()} message={apiErrorMessage(cats.error)} />
            : tree.length === 0 ? <EmptyState message="No categories yet." />
            : (
              <TableContainer component={Paper} elevation={0} sx={tableBox}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: tokens.surfaceContainerLow }}>
                    <TableRow>
                      <TableCell sx={headSx}>CATEGORY</TableCell>
                      <TableCell sx={headSx}>REQUIRED SKILLS</TableCell>
                      <TableCell sx={headSx}>ELIGIBLE TECHNICIANS</TableCell>
                      <TableCell sx={headSx}>STATUS</TableCell>
                      <TableCell sx={headSx} align="right">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tree.map(({ category: c, depth }) => (
                      <TableRow key={c.id} hover sx={{ ...rowSx, opacity: c.active ? 1 : 0.65 }}>
                        <TableCell sx={{ pl: 2 + depth * 3 }}>
                          <Typography sx={{ fontWeight: 600, color: tokens.onSurface, fontSize: 14 }}>
                            {depth > 0 && <Box component="span" sx={{ color: tokens.outline, mr: 0.75 }} aria-hidden>└</Box>}
                            {c.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {c.requiredSkillIds && c.requiredSkillIds.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {c.requiredSkillIds.map((sid) => (
                                <Chip key={sid} label={skillName(sid)} size="small" sx={{ fontSize: 12, height: 22, bgcolor: alpha(tokens.primary, 0.15), color: tokens.primaryLight }} />
                              ))}
                            </Stack>
                          ) : <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>None</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={c.active ? 'Active' : 'Inactive'} size="small"
                            sx={{ fontSize: 12, fontWeight: 700, bgcolor: c.active ? alpha(tone.success, 0.15) : tokens.surfaceContainerHighest, color: c.active ? tone.success : tokens.onSurfaceVariant }} />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Edit"><IconButton aria-label={`Edit ${c.name}`} onClick={() => setCatDialog({ category: c })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          {c.active ? (
                            <Tooltip title="Switch off"><IconButton aria-label={`Deactivate ${c.name}`} onClick={() => setToDeactivate(c)}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                          ) : (
                            <Tooltip title="Reactivate">
                              <span><IconButton aria-label={`Reactivate ${c.name}`} disabled={reactivate.isPending} onClick={() => reactivate.mutate(c)}><RestoreIcon fontSize="small" /></IconButton></span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif', mb: 1.5 }}>Skills</Typography>
          {skillsQ.isLoading ? <LoadingState />
            : skillsQ.isError ? <ErrorState onRetry={() => void skillsQ.refetch()} message={apiErrorMessage(skillsQ.error)} />
            : skills.length === 0 ? <EmptyState message="No skills yet." />
            : (
              <TableContainer component={Paper} elevation={0} sx={tableBox}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: tokens.surfaceContainerLow }}>
                    <TableRow>
                      <TableCell sx={headSx}>SKILL</TableCell>
                      <TableCell sx={headSx} align="right">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {skills.map((s) => (
                      <TableRow key={s.id} hover sx={rowSx}>
                        <TableCell><Typography sx={{ fontWeight: 600, color: tokens.onSurface, fontSize: 14 }}>{s.name}</Typography></TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Rename"><IconButton aria-label={`Rename ${s.name}`} onClick={() => setSkillDialog({ skill: s })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Delete (only when nothing uses it)"><IconButton aria-label={`Delete ${s.name}`} onClick={() => setSkillToDelete(s)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
        </Grid>
      </Grid>

      {catDialog && (
        <CategoryDialog category={catDialog.category} categories={categories} skills={skills} onClose={() => setCatDialog(null)}
          onSaved={() => { setCatDialog(null); refreshCategories(); }} />
      )}
      {skillDialog && (
        <SkillDialog skill={skillDialog.skill} onClose={() => setSkillDialog(null)} onSaved={() => { setSkillDialog(null); refreshSkills(); }} />
      )}
      <ConfirmDialog
        open={toDeactivate !== null} title="Switch off category"
        description={toDeactivate ? `${toDeactivate.name} stops being offered for new incidents. Existing incidents keep it, and you can reactivate it later.` : undefined}
        confirmLabel="Switch off" confirmColor="warning" isLoading={deactivate.isPending}
        onConfirm={() => toDeactivate && deactivate.mutate(toDeactivate.id)} onClose={() => setToDeactivate(null)}
      />
      <ConfirmDialog
        open={skillToDelete !== null} title="Delete skill"
        description={skillToDelete ? `Delete ${skillToDelete.name}? This cannot be undone. The server refuses while a category or technician still uses it.` : undefined}
        confirmLabel="Delete" confirmColor="error" isLoading={removeSkill.isPending}
        onConfirm={() => skillToDelete && removeSkill.mutate(skillToDelete.id)} onClose={() => setSkillToDelete(null)}
      />
    </Box>
  );
}
