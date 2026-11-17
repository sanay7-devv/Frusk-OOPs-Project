import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Category as CategoryIcon, Psychology as SkillIcon } from '@mui/icons-material';
import {
  getAdminCategories,
  createAdminCategory,
  getAdminSkills,
  createAdminSkill,
} from '../../api/admin';
import { useToast } from '../../components/Toast';

const COLORS = {
  surface: '#090d16',
  surfaceContainerLowest: '#0a0e17',
  surfaceContainerLow: '#121622',
  surfaceContainer: '#141824',
  surfaceContainerHigh: '#1c2234',
  surfaceContainerHighest: '#262d42',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  secondary: '#06b6d4',
  error: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',
};

export default function Categories() {
  const toast = useToast();
  const [catOpen, setCatOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);

  // Category form state
  const [catName, setCatName] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  // Skill form state
  const [skillName, setSkillName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories = [], isLoading: catLoading, refetch: refetchCats } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: getAdminCategories,
  });

  const { data: skills = [], isLoading: skillLoading, refetch: refetchSkills } = useQuery({
    queryKey: ['admin-skills-list'],
    queryFn: getAdminSkills,
  });

  const handleCreateCategory = async () => {
    if (!catName.trim()) return;
    setIsSubmitting(true);
    try {
      await createAdminCategory({
        name: catName.trim(),
        parentId: parentId ? Number(parentId) : null,
        requiredSkillIds: selectedSkillIds,
        active: true,
      });
      toast(`Category ${catName} created`, 'success');
      setCatOpen(false);
      setCatName('');
      setParentId('');
      setSelectedSkillIds([]);
      refetchCats();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSkill = async () => {
    if (!skillName.trim()) return;
    setIsSubmitting(true);
    try {
      await createAdminSkill({ name: skillName.trim() });
      toast(`Skill tag ${skillName} registered`, 'success');
      setSkillOpen(false);
      setSkillName('');
      refetchSkills();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Failed to create skill', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Taxonomy &amp; Skill Matrix
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mt: 0.5 }}>
            Manage incident categorization taxonomy and technical skill proficiencies for the assignment engine
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setSkillOpen(true)}
            sx={{
              borderColor: COLORS.border,
              color: COLORS.onSurfaceVariant,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { borderColor: COLORS.secondary, color: COLORS.secondary, bgcolor: 'rgba(6, 182, 212, 0.05)' },
            }}
          >
            Add Skill Tag
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCatOpen(true)}
            sx={{
              bgcolor: COLORS.primary,
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Add Category
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Categories Table */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mb: 1.5 }}>
            Incident Categories
          </Typography>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              overflow: 'hidden',
            }}
          >
            {catLoading ? (
              <Box p={4} display="flex" justifyContent="center">
                <CircularProgress sx={{ color: COLORS.primary }} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                  <TableRow sx={{ '& th': { borderBottom: `1px solid ${COLORS.border}` } }}>
                    <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>CATEGORY</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>REQUIRED SKILLS</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((c) => {
                    const parentCat = categories.find((p) => p.id === c.parentId);
                    return (
                      <TableRow key={c.id} hover sx={{ '& td': { borderBottom: `1px solid ${COLORS.border}` }, '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                            {c.name}
                          </Typography>
                          {parentCat && (
                            <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                              Parent: {parentCat.name}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.requiredSkillIds && c.requiredSkillIds.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {c.requiredSkillIds.map((sid) => {
                                const sk = skills.find((s) => s.id === sid);
                                return (
                                  <Chip
                                    key={sid}
                                    label={sk?.name || `Skill #${sid}`}
                                    size="small"
                                    sx={{
                                      fontSize: 10,
                                      height: 20,
                                      bgcolor: 'rgba(99, 102, 241, 0.15)',
                                      color: COLORS.primary,
                                      border: '1px solid rgba(99, 102, 241, 0.3)',
                                    }}
                                  />
                                );
                              })}
                            </Stack>
                          ) : (
                            <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                              None
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.active ? 'Active' : 'Archived'}
                            size="small"
                            sx={{
                              bgcolor: c.active ? 'rgba(16, 185, 129, 0.15)' : COLORS.surfaceContainerHighest,
                              color: c.active ? '#34d399' : COLORS.onSurfaceVariant,
                              border: `1px solid ${c.active ? 'rgba(16, 185, 129, 0.3)' : COLORS.border}`,
                              fontWeight: 700,
                              fontSize: 10,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>

        {/* Skills Table */}
        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mb: 1.5 }}>
            Technician Skill Inventory
          </Typography>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              overflow: 'hidden',
            }}
          >
            {skillLoading ? (
              <Box p={4} display="flex" justifyContent="center">
                <CircularProgress sx={{ color: COLORS.primary }} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                  <TableRow sx={{ '& th': { borderBottom: `1px solid ${COLORS.border}` } }}>
                    <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>SKILL NAME</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skills.map((s) => (
                    <TableRow key={s.id} hover sx={{ '& td': { borderBottom: `1px solid ${COLORS.border}` }, '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                          {s.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Registered"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(6, 182, 212, 0.15)',
                            color: '#22d3ee',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            fontWeight: 700,
                            fontSize: 10,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>
      </Grid>

      {/* Add Category Dialog */}
      <Dialog
        open={catOpen}
        onClose={() => setCatOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', fontFamily: 'Sora, sans-serif' }}>Add Category</DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Category Name"
              fullWidth
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
            <TextField
              select
              label="Parent Category (Optional)"
              fullWidth
              value={parentId}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="">
                <em>None (Top-Level)</em>
              </MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Required Skills"
              fullWidth
              SelectProps={{
                multiple: true,
                renderValue: (selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((id) => {
                      const sk = skills.find((s) => s.id === id);
                      return <Chip key={id} label={sk?.name || id} size="small" />;
                    })}
                  </Box>
                ),
              }}
              value={selectedSkillIds}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSkillIds(typeof val === 'string' ? val.split(',').map(Number) : (val as number[]));
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              {skills.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setCatOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateCategory}
            disabled={isSubmitting}
            sx={{ bgcolor: COLORS.primary, color: '#ffffff', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            Create Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Skill Dialog */}
      <Dialog
        open={skillOpen}
        onClose={() => setSkillOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', fontFamily: 'Sora, sans-serif' }}>Add Skill Tag</DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Skill Name"
              placeholder="e.g. Docker / Kubernetes"
              fullWidth
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setSkillOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSkill}
            disabled={isSubmitting}
            sx={{ bgcolor: COLORS.secondary, color: '#000000', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#0891b2' } }}
          >
            Save Skill
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
