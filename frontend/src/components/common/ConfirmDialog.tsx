import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  DialogProps,
  IconButton,
} from '@mui/material';
import { Warning, Close as CloseIcon } from '@mui/icons-material';

interface ConfirmDialogProps extends Omit<DialogProps, 'onClose'> {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
  loading = false,
  ...props
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
      {...props}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Warning sx={{ color: 'warning.main', fontSize: 32 }} />
            <Typography variant="h6" fontWeight={600}>
              {title}
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onCancel}
            disabled={loading}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
