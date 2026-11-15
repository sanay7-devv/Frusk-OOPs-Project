import { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

const ToastCtx = createContext<(msg: string, severity?: AlertColor) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; severity: AlertColor } | null>(null);

  return (
    <ToastCtx.Provider value={(msg, severity = 'info') => setT({ msg, severity })}>
      {children}
      <Snackbar
        open={!!t}
        autoHideDuration={5000}
        onClose={() => setT(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {t ? (
          <Alert
            severity={t.severity}
            onClose={() => setT(null)}
            sx={{
              bgcolor: '#141824',
              color: '#dfe2ef',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.2)',
              backdropFilter: 'blur(16px)',
              fontFamily: 'Geist, sans-serif',
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            {t.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastCtx.Provider>
  );
}
