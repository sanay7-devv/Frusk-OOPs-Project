import { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
const ToastCtx = createContext<(msg: string, severity?: AlertColor) => void>(() => { });
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; severity: AlertColor } | null>(null);
  return (
    <ToastCtx.Provider value={(msg, severity = 'info') => setT({ msg, severity })}>
      {children}
      <Snackbar open={!!t} autoHideDuration={5000} onClose={() => setT(null)}>
        {t ? <Alert severity={t.severity} onClose={() => setT(null)}>{t.msg}</Alert> : undefined}
      </Snackbar>
    </ToastCtx.Provider>
  );
}
