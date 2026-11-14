import { useState, useEffect } from 'react';
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
  TextField,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Refresh as RefreshIcon, Save as SaveIcon } from '@mui/icons-material';
import { getAdminConfig, updateAdminConfig, ConfigItem } from '../../api/admin';
import { useToast } from '../../components/Toast';

export default function Config() {
  const toast = useToast();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: configs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-config-settings'],
    queryFn: getAdminConfig,
  });

  useEffect(() => {
    if (configs.length > 0) {
      const initial: Record<string, string> = {};
      configs.forEach((c) => {
        initial[c.key] = c.value;
      });
      setFormValues(initial);
    }
  }, [configs]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = Object.entries(formValues).map(([key, value]) => ({ key, value }));
      await updateAdminConfig(changes);
      toast('Configuration parameters updated successfully without requiring a restart', 'success');
      refetch();
    } catch (e: any) {
      toast(e.message || 'Failed to update config', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Dynamic System Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set Things-Tune algorithmic assignment weights, lockout safety windows and SLA warning thresholds in real time
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
            Reset
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Applying Changes...' : 'Save Configuration'}
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        {isLoading ? (
          <Box p={6} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Configuration Parameter</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description & Purpose</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Default</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 220 }}>Active Runtime Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((cfg) => (
                <TableRow key={cfg.key} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                      {cfg.key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{cfg.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                      {cfg.defaultValue}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={formValues[cfg.key] ?? cfg.value}
                      onChange={(e) => setFormValues({ ...formValues, [cfg.key]: e.target.value })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
}
