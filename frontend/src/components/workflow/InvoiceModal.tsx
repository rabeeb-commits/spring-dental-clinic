import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  IconButton,
  Box,
  Typography,
  Paper,
  Divider,
  MenuItem,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import toast from 'react-hot-toast';
import { invoicesApi } from '../../services/api';

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onInvoiceCreated: () => void;
  patientId: string;
  treatmentId?: string;
  treatmentItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    toothNumbers?: number[];
  }>;
}

interface InvoiceFormData {
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  discount: number;
  tax: number;
  dueDate: Date | null;
  notes?: string;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  open,
  onClose,
  onInvoiceCreated,
  patientId,
  treatmentId,
  treatmentItems,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    defaultValues: {
      items: treatmentItems && treatmentItems.length > 0
        ? treatmentItems.map(item => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
          }))
        : [{ description: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      tax: 0,
      dueDate: null,
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedDiscount = watch('discount') || 0;
  const watchedTax = watch('tax') || 0;
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0) || 0;
  const totalAmount = subtotal - watchedDiscount + watchedTax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setSubmitting(true);
    try {
      await invoicesApi.create({
        patientId,
        treatmentId,
        items: data.items.filter(item => item.description && item.unitPrice > 0),
        discount: data.discount,
        tax: data.tax,
        dueDate: data.dueDate?.toISOString(),
        notes: data.notes,
      });
      toast.success('Invoice created successfully');
      reset();
      onInvoiceCreated();
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Create Invoice
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
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          <Grid container spacing={2}>
            {/* Line Items */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Line Items
              </Typography>
              {fields.map((field, index) => (
                <Box
                  key={field.id}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Description"
                        {...register(`items.${index}.description`)}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        label="Qty"
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        label="Price"
                        type="number"
                        {...register(`items.${index}.unitPrice`, { valueAsNumber: true, min: 0 })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      {index > 0 && (
                        <IconButton color="error" onClick={() => remove(index)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
              >
                Add Item
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Discount"
                type="number"
                {...register('discount', { valueAsNumber: true, min: 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Tax"
                type="number"
                {...register('tax', { valueAsNumber: true, min: 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Due Date (Optional)"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                )}
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

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Subtotal:</Typography>
                  <Typography>{formatCurrency(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Discount:</Typography>
                  <Typography color="error">-{formatCurrency(watchedDiscount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Tax:</Typography>
                  <Typography>+{formatCurrency(watchedTax)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={600}>Total:</Typography>
                  <Typography fontWeight={700} color="primary" variant="h6">
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InvoiceModal;
