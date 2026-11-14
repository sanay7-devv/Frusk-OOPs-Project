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

export default function Categories() {
  const toast = useToast();
  const [catOpen, setCatOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);

  // Category form state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('P2');

  // Skill form state
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');

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
      await createAdminCategory({ name: catName.trim(), description: catDesc.trim(), defaultPriority, active: true });
      toast(`Category ${catName} created`, 'success');
      setCatOpen(false);
      setCatName('');
      setCatDesc('');
      refetchCats();
    } catch (e: any) {
      toast(e.message || 'Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSkill = async () => {
    if (!skillName.trim()) return;
    setIsSubmitting(true);
    try {
      await createAdminSkill({ name: skillName.trim(), description: skillDesc.trim() });
      toast(`Skill tag ${skillName} registered`, 'success');
      setSkillOpen(false);
      setSkillName('');
      setSkillDesc('');
      refetchSkills();
    } catch (e: any) {
      toast(e.message || 'Failed to create skill', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Taxonomy & Skill Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage incident categorization taxonomy and technical skill proficiencies for the assignment engine
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSkillOpen(true)}>
            Add Skill Tag
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCatOpen(true)}>
            Add Category
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Categories Table */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight="bold" mb={1.5}>
            Incident Categories
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            {catLoading ? (
              <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Default Priority</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {c.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={c.defaultPriority} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={c.active ? 'Active' : 'Archived'} color={c.active ? 'success' : 'default'} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>

        {/* Skills Table */}
        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight="bold" mb={1.5}>
            Technician Skill Inventory
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            {skillLoading ? (
              <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Skill Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skills.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {s.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {s.description}
                        </Typography>
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
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Category</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Category Name" fullWidth value={catName} onChange={(e) => setCatName(e.target.value)} required />
            <TextField label="Description" fullWidth multiline rows={2} value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
            <TextField select label="Default Priority" fullWidth value={defaultPriority} onChange={(e) => setDefaultPriority(e.target.value)}>
              <MenuItem value="P1">P1</MenuItem>
              <MenuItem value="P2">P2</MenuItem>
              <MenuItem value="P3">P3</MenuItem>
              <MenuItem value="P4">P4</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCatOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCategory} disabled={isSubmitting}>
            Create Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Skill Dialog */}
      <Dialog open={skillOpen} onClose={() => setSkillOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Skill Tag</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Skill Name" placeholder="e.g. Docker / Kubernetes" fullWidth value={skillName} onChange={(e) => setSkillName(e.target.value)} required />
            <TextField label="Description" fullWidth multiline rows={2} value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSkillOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSkill} disabled={isSubmitting}>
            Save Skill
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
