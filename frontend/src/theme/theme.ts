import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#1653c7', dark: '#103e96', light: '#e5eaf4' }, secondary: { main: '#d73b2f' }, background: { default: '#f5f7fa', paper: '#ffffff' }, text: { primary: '#172b4d', secondary: '#64748b' }, divider: '#e2e8f0', error: { main: '#b52920' }, warning: { main: '#8c6100' }, success: { main: '#34624b' } },
  typography: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', h4: { fontWeight: 600, letterSpacing: '-.025em' }, h5: { fontWeight: 600, letterSpacing: '-.02em' }, h6: { fontWeight: 600 }, button: { textTransform: 'none', fontWeight: 600 } },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 }, contained: { border: '1px solid transparent' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 }, notchedOutline: { borderColor: '#d9dce2' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 20, fontWeight: 600 } } },
    MuiDialog: { styleOverrides: { paper: { border: '1px solid transparent', borderRadius: 8 } } },
    MuiTableCell: { styleOverrides: { head: { background: '#f6f7f9', fontSize: 12, fontWeight: 600 }, root: { borderColor: '#e2e8f0' } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, background: '#172b4d' } } },
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: '#f5f7fa' } } },
  },
});
// Operational colours retain their priority/status meanings.
export const priorityColor = { P1: '#b52920', P2: '#af4c16', P3: '#8c6100', P4: '#34624b' } as const;
export const priorityLabel = { P1: 'P1 Critical', P2: 'P2 High', P3: 'P3 Medium', P4: 'P4 Low' } as const;
export const statusColor: Record<string, string> = { NEW: '#64748b', CLASSIFIED: '#627078', ASSIGNED: '#1653c7', ACKNOWLEDGED: '#1653c7', IN_PROGRESS: '#246d78', PENDING_USER_INFO: '#79558b', RESOLVED: '#34624b', VERIFIED: '#34624b', CLOSED: '#41433f', REOPENED: '#b52920' };
