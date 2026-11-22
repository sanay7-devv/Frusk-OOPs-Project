import { createTheme, alpha } from '@mui/material';

// Design-system colours from Luminary Kinetic
export const priorityColor = {
  P1: '#f43f5e', // Vibrant Rose / Sev-1 Critical
  P2: '#fb923c', // Electric Orange / High
  P3: '#38bdf8', // Electric Cyan / Medium
  P4: '#4ade80', // Emerald Green / Low
} as const;

export const priorityLabel = {
  P1: 'P1 Critical',
  P2: 'P2 High',
  P3: 'P3 Medium',
  P4: 'P4 Low',
} as const;

export const statusColor: Record<string, string> = {
  NEW: '#94a3b8',
  CLASSIFIED: '#a78bfa',
  ASSIGNED: '#818cf8',
  ACKNOWLEDGED: '#38bdf8',
  IN_PROGRESS: '#06b6d4',
  PENDING_USER_INFO: '#f472b6',
  RESOLVED: '#4ade80',
  VERIFIED: '#2dd4bf',
  CLOSED: '#64748b',
  REOPENED: '#f43f5e',
};

/** Colour per server-reported SLA state. The client never derives the state itself. */
export const slaStateColor = {
  OK: '#38bdf8',
  WARNING: '#facc15',
  AT_RISK: '#fb923c',
  VIOLATED: '#f43f5e',
  PAUSED: '#94a3b8',
  MET: '#4ade80',
} as const;

export const slaStateLabel = {
  OK: 'On track',
  WARNING: 'Warning',
  AT_RISK: 'At risk',
  VIOLATED: 'Violated',
  PAUSED: 'Paused',
  MET: 'Met',
} as const;

// Luminary Kinetic Design Tokens
export const tokens = {
  background: '#090d16',
  surface: '#0f131c',
  surfaceDim: '#0a0e17',
  surfaceContainerLowest: '#070a10',
  surfaceContainerLow: '#121622',
  surfaceContainer: '#181c2b',
  surfaceContainerHigh: '#222738',
  surfaceContainerHighest: '#2d3348',
  primary: '#4d768b',
  primaryLight: '#bad0d8',
  primaryDark: '#36596e',
  secondary: '#668894',
  secondaryLight: '#b4ccd2',
  secondaryDark: '#435f68',
  tertiary: '#f751a1',
  tertiaryLight: '#ffb0cd',
  tertiaryDark: '#93000a',
  onSurface: '#dfe2ef',
  onSurfaceVariant: '#94a3b8',
  outline: '#908fa0',
  outlineVariant: 'rgba(255, 255, 255, 0.08)',
  // Added in round 5 so screens stop copying hex literals.
  paper: '#141824',
  danger: '#f43f5e',
  warning: '#fb923c',
  success: '#10b981',
  info: '#38bdf8',
  textDisabled: '#64748b',
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  hover: 'rgba(255, 255, 255, 0.04)',
  // Extra literals found in the screens, named so no screen needs a hex literal.
  white: '#ffffff',
  black: '#000000',
  successLight: '#6ee7b7',
  successDark: '#059669',
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  amberDark: '#d97706',
  amberPale: '#fef3c7',
  warningLight: '#fde68a',
  warningDark: '#b45309',
  orangePale: '#fed7aa',
  yellowLight: '#fef08a',
  red: '#ef4444',
  redDark: '#dc2626',
  roseDark: '#e11d48',
  errorLight: '#ffb4ab',
  errorPale: '#ffdad6',
  primaryStrong: '#3d6378',
  secondaryStrong: '#527681',
  surfaceDeep: '#0e121d',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  fontBody: 'Geist, sans-serif',
  fontHeading: 'Sora, sans-serif',
  fontMono: 'JetBrains Mono, monospace',
  /** Smallest font size (px) the theme allows; use for fontSize in sx. */
  minFontSize: 12,
  priority: priorityColor,
  status: statusColor,
  sla: slaStateColor,
} as const;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4d768b',
      light: '#bad0d8',
      dark: '#36596e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#668894',
      light: '#b4ccd2',
      dark: '#435f68',
      contrastText: '#10191c',
    },
    error: {
      main: '#f43f5e',
      light: '#ffb0cd',
      dark: '#93000a',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#fb923c',
      light: '#fde68a',
      dark: '#b45309',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#6ee7b7',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    info: {
      main: '#38bdf8',
      light: '#bae6fd',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    background: {
      default: '#090d16',
      paper: '#141824',
    },
    text: {
      primary: '#dfe2ef',
      secondary: '#94a3b8',
      disabled: '#64748b',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  spacing: 8,
  typography: {
    fontFamily: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'].join(','),
    h1: {
      fontFamily: 'Sora, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.03em',
      color: '#dfe2ef',
    },
    h2: {
      fontFamily: 'Sora, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.025em',
      color: '#dfe2ef',
    },
    h3: {
      fontFamily: 'Sora, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: '#dfe2ef',
    },
    h4: {
      fontFamily: 'Sora, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: '#dfe2ef',
    },
    h5: {
      fontFamily: 'Sora, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.015em',
      color: '#dfe2ef',
    },
    h6: {
      fontFamily: 'Sora, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#dfe2ef',
    },
    subtitle1: {
      fontFamily: 'Geist, sans-serif',
      fontWeight: 500,
      color: '#dfe2ef',
    },
    subtitle2: {
      fontFamily: 'Geist, sans-serif',
      fontWeight: 500,
      color: '#94a3b8',
    },
    body1: {
      fontFamily: 'Geist, sans-serif',
      color: '#dfe2ef',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: 'Geist, sans-serif',
      color: '#94a3b8',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: 'Geist, sans-serif',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem',
      fontFamily: 'Geist, sans-serif',
      letterSpacing: 'normal',
      color: '#94a3b8',
    },
    overline: {
      fontSize: '0.75rem',
      fontFamily: 'Geist, sans-serif',
      letterSpacing: '0.02em',
      fontWeight: 600,
      color: '#94a3b8',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Visible keyboard focus for every interactive element (WCAG 2.4.7).
        ':focus-visible': {
          outline: '2px solid #4cd7f6',
          outlineOffset: 2,
        },
        body: {
          backgroundColor: '#090d16',
          color: '#dfe2ef',
          fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
          overscrollBehavior: 'none',
          fontVariantNumeric: 'tabular-nums',
          scrollbarGutter: 'stable',
          '& ::selection': {
            backgroundColor: '#06b6d4',
            color: '#001f26',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148, 163, 184, 0.32) transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(148, 163, 184, 0.3)',
            borderRadius: 9999,
            transition: 'background-color 0.15s ease',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(148, 163, 184, 0.52)',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            background: 'transparent',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#141824',
          backgroundImage: 'none',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#141824',
          backgroundImage: 'none',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          textTransform: 'none',
          whiteSpace: 'nowrap',
          transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
        },
        containedPrimary: {
          backgroundColor: '#4d768b',
          color: '#ffffff',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#3d6378',
          },
          '&.Mui-disabled': {
            backgroundColor: 'rgba(77, 118, 139, 0.18)',
            color: 'rgba(223, 226, 239, 0.48)',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.12)',
          color: '#dfe2ef',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          '&:hover': {
            borderColor: '#4d768b',
            backgroundColor: 'rgba(77, 118, 139, 0.1)',
            color: '#bad0d8',
          },
        },
        text: {
          color: '#94a3b8',
          '&:hover': {
            color: '#dfe2ef',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(18, 22, 34, 0.7)',
          borderRadius: 8,
          color: '#dfe2ef',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.22)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4d768b',
            borderWidth: '1px',
            boxShadow: '0 0 0 2px rgba(77, 118, 139, 0.16)',
          },
        },
        input: {
          '&::placeholder': {
            color: '#64748b',
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#94a3b8',
          '&.Mui-focused': {
            color: '#bad0d8',
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
          PaperProps: {
            sx: {
              maxHeight: 320,
              bgcolor: '#151820 !important',
              border: '1px solid rgba(255, 255, 255, 0.12) !important',
              borderRadius: '10px !important',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4) !important',
              p: 0.8,
            },
          },
        },
      },
      styleOverrides: {
        root: {
          backgroundColor: '#151820',
          borderRadius: 10,
          color: '#dfe2ef',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'background-color 150ms ease, border-color 150ms ease',
          '&:hover': {
            borderColor: 'rgba(77, 118, 139, 0.65)',
            backgroundColor: '#1a1e25',
          },
          '&.Mui-focused': {
            borderColor: '#4d768b',
            boxShadow: '0 0 0 2px rgba(77, 118, 139, 0.16)',
          },
        },
        icon: {
          color: '#94a3b8',
          transition: 'color 150ms ease',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          color: '#dfe2ef',
          fontFamily: 'Geist, sans-serif',
          padding: '12px 16px',
        },
        head: {
          backgroundColor: '#0e121d',
          color: '#94a3b8',
          fontFamily: 'Geist, sans-serif',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: '12px' } },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.03) !important',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#121622',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.42)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontFamily: 'Geist, sans-serif',
          fontSize: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          textTransform: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '12px', maxWidth: 280, lineHeight: 1.45 },
      },
    },
    MuiDialogTitle: {
      defaultProps: { component: 'div' },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0a0e17',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0f131c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        elevation: 0,
        TransitionProps: {
          timeout: 120,
        },
      },
      styleOverrides: {
        paper: {
          backgroundColor: '#151820 !important',
          border: '1px solid rgba(255, 255, 255, 0.1) !important',
          borderRadius: '10px !important',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4) !important',
          padding: '4px !important',
          maxHeight: '320px !important',
          maxWidth: 'min(320px, calc(100vw - 16px)) !important',
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(186, 208, 216, 0.24)',
            borderRadius: 9999,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(77, 118, 139, 0.65)',
          },
        },
        list: {
          padding: '4px !important',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: '#151820 !important',
          border: '1px solid rgba(255, 255, 255, 0.1) !important',
          borderRadius: '10px !important',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4) !important',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        listbox: { maxHeight: 'min(320px, calc(100vh - 32px))', overflowY: 'auto' },
        paper: {
          backgroundColor: '#151820 !important',
          border: '1px solid rgba(255, 255, 255, 0.1) !important',
          borderRadius: '10px !important',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4) !important',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontFamily: 'Geist, sans-serif',
          color: '#dfe2ef',
          margin: '2px 4px',
          padding: '8px 12px',
          borderRadius: 6,
          transition: 'background-color 0.12s ease, color 0.12s ease',
          '&:hover': {
            backgroundColor: 'rgba(77, 118, 139, 0.12) !important',
            color: '#ffffff !important',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(77, 118, 139, 0.18) !important',
            color: '#bad0d8 !important',
            fontWeight: 600,
            borderLeft: '3px solid #4d768b',
            '&:hover': {
              backgroundColor: 'rgba(77, 118, 139, 0.24) !important',
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
});
