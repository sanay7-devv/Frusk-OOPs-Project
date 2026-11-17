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

  const handleReset = () => {
    if (configs.length > 0) {
      const initial: Record<string, string> = {};
      configs.forEach((c) => {
        initial[c.key] = c.value;
      });
      setFormValues(initial);
      toast('Configuration reset to saved values', 'info');
    }
    refetch();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const originalMap = new Map(configs.map((c) => [c.key, c.value]));
      const changes = Object.entries(formValues)
        .filter(([key, value]) => originalMap.get(key) !== value)
        .map(([key, value]) => ({ key, value }));

      if (changes.length === 0) {
        toast('No changes detected to save', 'info');
        setIsSaving(false);
        return;
      }

      await updateAdminConfig(changes);
      toast('Configuration parameters updated successfully', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Failed to update config', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Dynamic System Configuration
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mt: 0.5 }}>
            Set Things-Tune algorithmic assignment weights, lockout safety windows and SLA warning thresholds in real time
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            sx={{
              borderColor: COLORS.border,
              color: COLORS.onSurfaceVariant,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
            sx={{
              bgcolor: COLORS.primary,
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            {isSaving ? 'Applying Changes...' : 'Save Configuration'}
          </Button>
        </Stack>
      </Stack>

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
        {isLoading ? (
          <Box p={6} display="flex" justifyContent="center">
            <CircularProgress sx={{ color: COLORS.primary }} />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow }}>
              <TableRow sx={{ '& th': { borderBottom: `1px solid ${COLORS.border}` } }}>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>CONFIGURATION PARAMETER</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>DESCRIPTION &amp; PURPOSE</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>DEFAULT</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, width: 220 }}>ACTIVE RUNTIME VALUE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((cfg) => (
                <TableRow
                  key={cfg.key}
                  hover
                  sx={{
                    '& td': { borderBottom: `1px solid ${COLORS.border}` },
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 'bold', color: COLORS.primary }}>
                      {cfg.key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: COLORS.onSurface }}>{cfg.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                      {cfg.defaultValue}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={formValues[cfg.key] ?? cfg.value}
                      onChange={(e) => setFormValues({ ...formValues, [cfg.key]: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: COLORS.surfaceContainerLowest,
                          color: COLORS.onSurface,
                          fontFamily: 'JetBrains Mono, monospace',
                          '& fieldset': { borderColor: COLORS.border },
                        },
                      }}
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
