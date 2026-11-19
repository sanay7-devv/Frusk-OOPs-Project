import React, { useEffect, useState } from 'react';
import { Alert, Box, Collapse, IconButton } from '@mui/material';
import { Close as CloseIcon, CloudOff as CloudOffIcon } from '@mui/icons-material';

interface NetworkState {
  show: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export default function ConnectionBanner() {
  const [banner, setBanner] = useState<NetworkState>({
    show: false,
    severity: 'error',
    message: '',
  });

  useEffect(() => {
    const handleNetworkError = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string; severity?: 'error' | 'warning' }>;
      setBanner({
        show: true,
        severity: customEvent.detail?.severity || 'error',
        message: customEvent.detail?.message || 'Server connection error. Please verify the backend service is running.',
      });
    };

    const handleNetworkRecovered = () => {
      setBanner((prev) => (prev.show ? { ...prev, show: false } : prev));
    };

    window.addEventListener('app:network-error', handleNetworkError);
    window.addEventListener('app:network-recovered', handleNetworkRecovered);

    return () => {
      window.removeEventListener('app:network-error', handleNetworkError);
      window.removeEventListener('app:network-recovered', handleNetworkRecovered);
    };
  }, []);

  return (
    <Collapse in={banner.show}>
      <Box sx={{ width: '100%', zIndex: 1400, position: 'relative' }}>
        <Alert
          severity={banner.severity}
          icon={<CloudOffIcon fontSize="inherit" />}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setBanner((prev) => ({ ...prev, show: false }))}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{
            borderRadius: 0,
            py: 0.5,
            px: 2,
            alignItems: 'center',
            fontSize: '0.85rem',
          }}
        >
          {banner.message}
        </Alert>
      </Box>
    </Collapse>
  );
}
