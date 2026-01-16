import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  MenuItem,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import toast from 'react-hot-toast';
import { invoicesApi, paymentsApi, patientsApi } from '../services/api';
import { Invoice, Patient, PaymentMode, InvoiceStatus } from '../types';
import { format } from 'date-fns';

interface InvoiceFormData {
  patientId: string;
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

interface PaymentFormData {
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  notes?: string;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [outstandingSummary, setOutstandingSummary] = useState({ total: 0, count: 0 });

  const invoiceForm = useForm<InvoiceFormData>({
    defaultValues: {
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      tax: 0,
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    defaultValues: {
      paymentMode: 'CASH',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: invoiceForm.control,
    name: 'items',
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page + 1),
        limit: String(rowsPerPage),
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const [invoicesRes, outstandingRes] = await Promise.all([
        invoicesApi.getAll(params),
        invoicesApi.getOutstanding(),
      ]);

      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.data || []);
        setTotal(invoicesRes.data.meta?.total || 0);
      }
      if (outstandingRes.data.success) {
        setOutstandingSummary({
          total: outstandingRes.data.data.totalOutstanding || 0,
          count: outstandingRes.data.data.invoices?.length || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await patientsApi.getAll({ limit: '100' });
        if (response.data.success) {
          setPatients(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        toast.error('Failed to load patients list.');
      }
    };
    fetchPatients();
  }, []);

  const handleOpenInvoiceDialog = () => {
    setSelectedPatient(null);
    invoiceForm.reset({
      patientId: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      tax: 0,
      dueDate: null,
      notes: '',
    });
    setInvoiceDialogOpen(true);
  };

  const handleOpenPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    paymentForm.reset({
      amount: invoice.dueAmount,
      paymentMode: 'CASH',
      transactionId: '',
      notes: '',
    });
    setPaymentDialogOpen(true);
  };

  const onSubmitInvoice = async (data: InvoiceFormData) => {
    setSubmitting(true);
    try {
      await invoicesApi.create({
        patientId: data.patientId,
        items: data.items.filter(item => item.description && item.unitPrice > 0),
        discount: data.discount,
        tax: data.tax,
        dueDate: data.dueDate?.toISOString(),
        notes: data.notes,
      });
      toast.success('Invoice created successfully');
      setInvoiceDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitPayment = async (data: PaymentFormData) => {
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      await paymentsApi.create({
        invoiceId: selectedInvoice.id,
        ...data,
      });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: InvoiceStatus): string => {
    const colors: Record<InvoiceStatus, string> = {
      DRAFT: '#64748b',
      PENDING: '#f59e0b',
      PARTIAL: '#8b5cf6',
      PAID: '#22c55e',
      CANCELLED: '#ef4444',
      REFUNDED: '#6b7280',
    };
    return colors[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const watchedItems = invoiceForm.watch('items');
  const watchedDiscount = invoiceForm.watch('discount') || 0;
  const watchedTax = invoiceForm.watch('tax') || 0;
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0) || 0;
  const totalAmount = subtotal - watchedDiscount + watchedTax;

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Billing & Invoices
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Manage invoices and payments
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenInvoiceDialog}>
          Create Invoice
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Outstanding Amount
              </Typography>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {formatCurrency(outstandingSummary.total)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {outstandingSummary.count} pending invoices
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by invoice number or patient..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="PARTIAL">Partial</MenuItem>
            <MenuItem value="PAID">Paid</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Invoices Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton variant="rounded" height={60} />
                    </TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No invoices found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: '#0891b2',
                        }}
                      >
                        {invoice.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#0891b2', width: 32, height: 32, fontSize: '0.8rem' }}>
                          {invoice.patient?.firstName?.[0]}{invoice.patient?.lastName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {invoice.patient?.firstName} {invoice.patient?.lastName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                    <TableCell sx={{ color: 'success.main' }}>
                      {formatCurrency(invoice.paidAmount)}
                    </TableCell>
                    <TableCell sx={{ color: invoice.dueAmount > 0 ? 'error.main' : 'inherit', fontWeight: 500 }}>
                      {formatCurrency(invoice.dueAmount)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(invoice.status)}20`,
                          color: getStatusColor(invoice.status),
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), 'PP')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton size="small">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                        <Tooltip title="Record Payment">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenPaymentDialog(invoice)}
                          >
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Print">
                        <IconButton size="small">
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Create Invoice</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setInvoiceDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={invoiceForm.handleSubmit(onSubmitInvoice)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="patientId"
                  control={invoiceForm.control}
                  rules={{ required: 'Patient is required' }}
                  render={({ field }) => (
                    <Autocomplete
                      options={patients}
                      getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.patientId})`}
                      value={selectedPatient}
                      onChange={(_, newValue) => {
                        setSelectedPatient(newValue);
                        field.onChange(newValue?.id || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Patient"
                          error={!!invoiceForm.formState.errors.patientId}
                          helperText={invoiceForm.formState.errors.patientId?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              {/* Line Items */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Line Items</Typography>
                {fields.map((field, index) => (
                  <Box key={field.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Description"
                      {...invoiceForm.register(`items.${index}.description`)}
                    />
                    <TextField
                      label="Qty"
                      type="number"
                      sx={{ width: 80 }}
                      {...invoiceForm.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <TextField
                      label="Price"
                      type="number"
                      sx={{ width: 120 }}
                      {...invoiceForm.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    />
                    {index > 0 && (
                      <IconButton color="error" onClick={() => remove(index)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                ))}
                <Button
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
                  {...invoiceForm.register('discount', { valueAsNumber: true })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Tax"
                  type="number"
                  {...invoiceForm.register('tax', { valueAsNumber: true })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="dueDate"
                  control={invoiceForm.control}
                  render={({ field }) => (
                    <DatePicker
                      label="Due Date"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
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
                    <Typography fontWeight={700} color="primary">
                      {formatCurrency(totalAmount)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Record Payment</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setPaymentDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)}>
          <DialogContent dividers>
            {selectedInvoice && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Invoice: {selectedInvoice.invoiceNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {formatCurrency(selectedInvoice.totalAmount)} | 
                  Due: <strong>{formatCurrency(selectedInvoice.dueAmount)}</strong>
                </Typography>
              </Box>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  {...paymentForm.register('amount', {
                    required: 'Amount is required',
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'Amount must be greater than 0' },
                  })}
                  error={!!paymentForm.formState.errors.amount}
                  helperText={paymentForm.formState.errors.amount?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Payment Mode"
                  {...paymentForm.register('paymentMode')}
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
                  {...paymentForm.register('transactionId')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  {...paymentForm.register('notes')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Billing;


