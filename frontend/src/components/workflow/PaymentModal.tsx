import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Box,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { paymentsApi } from '../../services/api';
import { Invoice, PaymentMode } from '../../types';
import { useClinic } from '../../context/ClinicContext';
import UPIQRCode from '../common/UPIQRCode';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
  invoice: Invoice;
}

interface PaymentFormData {
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  notes?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  onPaymentRecorded,
  invoice,
}) => {
  const [submitting, setSubmitting] = React.useState(false);
  const { settings } = useClinic();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    defaultValues: {
      amount: invoice.dueAmount,
      paymentMode: 'CASH',
      transactionId: '',
      notes: '',
    },
  });

  const paymentMode = watch('paymentMode');
  const amount = watch('amount') || invoice.dueAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (data.amount > invoice.dueAmount) {
      toast.error('Payment amount cannot exceed due amount');
      return;
    }

    if (data.amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsApi.create({
        invoiceId: invoice.id,
        ...data,
      });
      toast.success('Payment recorded successfully');
      reset();
      onPaymentRecorded();
      onClose();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
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
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Record Payment
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Paper sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Invoice: {invoice.invoiceNumber}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Amount:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(invoice.totalAmount)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Paid Amount:
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight={600}>
                {formatCurrency(invoice.paidAmount)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Due Amount:
              </Typography>
              <Typography variant="body2" color="error.main" fontWeight={700}>
                {formatCurrency(invoice.dueAmount)}
              </Typography>
            </Box>
          </Paper>

          {/* UPI QR Code */}
          {paymentMode === 'UPI' && settings.upiId && amount > 0 && (
            <Box sx={{ mb: 3 }}>
              <UPIQRCode
                upiId={settings.upiId}
                amount={amount}
                payeeName={settings.name}
                transactionNote={`Invoice ${invoice.invoiceNumber}`}
                size={200}
              />
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {paymentMode === 'UPI' && !settings.upiId && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#fef3c7', border: '1px solid #fbbf24' }}>
              <Typography variant="body2" color="text.secondary">
                UPI ID not configured. Please configure it in Settings → Clinic Settings to enable QR code payments.
              </Typography>
            </Paper>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                {...register('amount', {
                  required: 'Amount is required',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                  max: { value: invoice.dueAmount, message: `Amount cannot exceed ${formatCurrency(invoice.dueAmount)}` },
                })}
                error={!!errors.amount}
                helperText={errors.amount?.message}
                inputProps={{ step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Payment Mode"
                {...register('paymentMode', { required: 'Payment mode is required' })}
                error={!!errors.paymentMode}
                helperText={errors.paymentMode?.message}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="ONLINE_WALLET">Online Wallet</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                <MenuItem value="INSURANCE">Insurance</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Transaction ID (Optional)"
                placeholder="For digital payments"
                {...register('transactionId')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                {...register('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaymentModal;
