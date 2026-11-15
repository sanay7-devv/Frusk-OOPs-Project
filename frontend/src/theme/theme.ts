import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#1653c7', dark: '#103e96', light: '#e5eaf4' }, secondary: { main: '#d73b2f' }, background: { default: '#f5f0e5', paper: '#fffcf5' }, text: { primary: '#20211f', secondary: '#6a685f' }, divider: '#d6d0c3', error: { main: '#b52920' }, warning: { main: '#8c6100' }, success: { main: '#34624b' } },
  typography: { fontFamily: '"Arial", "Helvetica Neue", sans-serif', h4: { fontWeight: 800, letterSpacing: '-.045em' }, h5: { fontWeight: 800, letterSpacing: '-.035em' }, h6: { fontWeight: 700 }, button: { textTransform: 'none', fontWeight: 700 } },
  shape: { borderRadius: 0 },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 0 }, contained: { border: '1px solid #20211f' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 0 }, notchedOutline: { borderColor: '#b5afa3' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 2, fontWeight: 600 } } },
    MuiDialog: { styleOverrides: { paper: { border: '1px solid #20211f', borderRadius: 0 } } },
    MuiTableCell: { styleOverrides: { head: { background: '#eee7d9', fontSize: 11, fontWeight: 700 }, root: { borderColor: '#d6d0c3' } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 0, background: '#20211f' } } },
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: '#f5f0e5' } } },
  },
});
// Operational colours retain their priority/status meanings.
export const priorityColor = { P1: '#b52920', P2: '#af4c16', P3: '#8c6100', P4: '#34624b' } as const;
export const priorityLabel = { P1: 'P1 Critical', P2: 'P2 High', P3: 'P3 Medium', P4: 'P4 Low' } as const;
export const statusColor: Record<string, string> = { NEW: '#6a685f', CLASSIFIED: '#627078', ASSIGNED: '#1653c7', ACKNOWLEDGED: '#1653c7', IN_PROGRESS: '#246d78', PENDING_USER_INFO: '#79558b', RESOLVED: '#34624b', VERIFIED: '#34624b', CLOSED: '#41433f', REOPENED: '#b52920' };
