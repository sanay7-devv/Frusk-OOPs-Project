import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  CircularProgress,
} from '@mui/material';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  maxReasonLength?: number;
  isLoading?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Please describe the reason (min 10 characters)...',
  minReasonLength = 10,
  maxReasonLength = 1000,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');

  const isReasonValid = !requireReason || (reason.trim().length >= minReasonLength && reason.length <= maxReasonLength);

  const handleConfirm = () => {
    if (!isReasonValid) return;
    onConfirm(requireReason ? reason.trim() : undefined);
    setReason('');
  };

  const handleClose = () => {
    if (isLoading) return;
    setReason('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#121622',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: '#dfe2ef',
        },
      }}
    >
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#ffffff' }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {description && (
          <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: requireReason ? 2 : 0, lineHeight: 1.5 }}>
            {description}
          </Typography>
        )}

        {requireReason && (
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={reasonLabel}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText={
                reason.length > 0 && reason.trim().length < minReasonLength
                  ? `At least ${minReasonLength} characters required (${reason.trim().length}/${minReasonLength})`
                  : `${reason.length}/${maxReasonLength} characters`
              }
              error={reason.length > 0 && reason.trim().length < minReasonLength}
              inputProps={{ maxLength: maxReasonLength }}
              sx={{
                '& .MuiInputBase-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  color: '#ffffff',
                },
                '& .MuiFormHelperText-root': {
                  color: reason.length > 0 && reason.trim().length < minReasonLength ? '#f43f5e' : '#64748b',
                },
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={isLoading} sx={{ color: '#94a3b8', textTransform: 'none' }}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          disabled={!isReasonValid || isLoading}
          onClick={handleConfirm}
          sx={{ textTransform: 'none', fontWeight: 600, minWidth: 100 }}
        >
          {isLoading ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
