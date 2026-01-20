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
  Alert,
  CircularProgress,
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
  QrCode as QrCodeIcon,
  WhatsApp as WhatsAppIcon,
  Message as MessageIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import toast from 'react-hot-toast';
import { invoicesApi, paymentsApi, patientsApi } from '../services/api';
import { Payment } from '../types';
import { Invoice, Patient, PaymentMode, InvoiceStatus } from '../types';
import { format } from 'date-fns';
import PatientRegistrationModal from '../components/workflow/PatientRegistrationModal';
import { useClinic } from '../context/ClinicContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { useInvoiceTemplate } from '../context/InvoiceTemplateContext';
import { generateInvoiceHTML } from '../components/invoice/InvoiceGenerator';
import UPIQRCode from '../components/common/UPIQRCode';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { sendInvoiceMessage, sendPaymentUpdateMessage } from '../utils/whatsapp';

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
  const { user } = useAuth();
  const permissions = usePermissions();
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
  const [patientRegistrationModalOpen, setPatientRegistrationModalOpen] = useState(false);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [selectedInvoiceForQr, setSelectedInvoiceForQr] = useState<Invoice | null>(null);
  const [invoiceDetailDialogOpen, setInvoiceDetailDialogOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; amount: number; invoiceNumber: string } | null>(null);
  const [lastRecordedPayment, setLastRecordedPayment] = useState<{ payment: Payment; invoice: Invoice } | null>(null);
  const [showPaymentWhatsAppOption, setShowPaymentWhatsAppOption] = useState(false);
  const [whatsappFormatDialogOpen, setWhatsappFormatDialogOpen] = useState(false);
  const [selectedInvoiceForWhatsApp, setSelectedInvoiceForWhatsApp] = useState<Invoice | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const { settings } = useClinic();
  const { template } = useInvoiceTemplate();

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

  const handlePatientRegistered = (patient: Patient) => {
    // Add patient to the list if not already present
    if (!patients.find(p => p.id === patient.id)) {
      setPatients([...patients, patient]);
    }
    // Auto-select the newly registered patient
    setSelectedPatient(patient);
    invoiceForm.setValue('patientId', patient.id);
  };

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

  const handleViewInvoice = async (invoice: Invoice) => {
    setLoadingInvoiceDetail(true);
    try {
      const response = await invoicesApi.getById(invoice.id);
      if (response.data.success) {
        setInvoiceDetail(response.data.data);
        setInvoiceDetailDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const response = await invoicesApi.getById(invoice.id);
      if (response.data.success) {
        const invoiceData = response.data.data;
        const html = generateInvoiceHTML({
          invoice: invoiceData,
          template,
          clinicSettings: {
            name: settings.name,
            logo: settings.logo,
            phone: settings.phone,
            address: settings.address,
          },
        });
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (error) {
      toast.error('Failed to load invoice for printing');
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to cancel invoice ${invoice.invoiceNumber}?`)) {
      try {
        await invoicesApi.delete(invoice.id);
        toast.success('Invoice cancelled successfully');
        fetchInvoices();
      } catch (error) {
        // Error handled by interceptor
      }
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await paymentsApi.delete(paymentToDelete.id);
      toast.success('Payment cancelled successfully');
      setDeletePaymentDialogOpen(false);
      setPaymentToDelete(null);
      // Refresh invoice detail if dialog is open
      if (invoiceDetail) {
        const response = await invoicesApi.getById(invoiceDetail.id);
        if (response.data.success) {
          setInvoiceDetail(response.data.data);
        }
      }
      fetchInvoices();
    } catch (error) {
      // Error handled by interceptor
    }
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
      const response = await paymentsApi.create({
        invoiceId: selectedInvoice.id,
        ...data,
      });
      
      if (response.data.success) {
        // Fetch updated invoice to get the new payment details
        const invoiceResponse = await invoicesApi.getById(selectedInvoice.id);
        if (invoiceResponse.data.success) {
          const updatedInvoice = invoiceResponse.data.data;
          const newPayment = updatedInvoice.payments?.[updatedInvoice.payments.length - 1];
          
          if (newPayment) {
            setLastRecordedPayment({
              payment: newPayment,
              invoice: updatedInvoice,
            });
            setShowPaymentWhatsAppOption(true);
          }
        }
        
        toast.success('Payment recorded successfully', {
          duration: 4000,
          icon: '✅',
        });
        setPaymentDialogOpen(false);
        setSelectedInvoice(null);
        fetchInvoices();
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPaymentUpdateAfterRecording = () => {
    if (!lastRecordedPayment) return;
    handleSendPaymentUpdateWhatsApp(lastRecordedPayment.payment, lastRecordedPayment.invoice);
    setShowPaymentWhatsAppOption(false);
    setLastRecordedPayment(null);
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

  const handleOpenWhatsAppFormatDialog = (invoice: Invoice) => {
    if (!invoice.patient?.phone) {
      toast.error('Patient phone number is not available. Please update patient details.');
      return;
    }

    if (!invoice.patient?.firstName || !invoice.patient?.lastName) {
      toast.error('Patient information is incomplete.');
      return;
    }

    setSelectedInvoiceForWhatsApp(invoice);
    setWhatsappFormatDialogOpen(true);
  };

  const handleSendInvoiceWhatsApp = (invoice: Invoice) => {
    try {
      sendInvoiceMessage({
        phone: invoice.patient!.phone!,
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          createdAt: invoice.createdAt,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          tax: invoice.tax,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          dueAmount: invoice.dueAmount,
          items: invoice.items,
          notes: invoice.notes,
        },
        patient: {
          firstName: invoice.patient!.firstName,
          lastName: invoice.patient!.lastName,
        },
        clinicSettings: {
          name: settings.name,
          phone: settings.phone,
          upiId: settings.upiId,
        },
      });
      toast.success('Opening WhatsApp...');
      setWhatsappFormatDialogOpen(false);
      setSelectedInvoiceForWhatsApp(null);
    } catch (error) {
      toast.error('Failed to open WhatsApp');
    }
  };

  const handleSendInvoiceAsPDF = async (invoice: Invoice) => {
    if (!invoice.patient?.phone) {
      toast.error('Patient phone number is not available.');
      return;
    }

    setGeneratingPDF(true);
    try {
      // Generate and download PDF with clinic settings as query parameters
      const params = new URLSearchParams();
      if (settings.name) params.append('clinicName', settings.name);
      if (settings.address) params.append('clinicAddress', settings.address);
      if (settings.phone) params.append('clinicPhone', settings.phone);
      if (settings.logo) params.append('clinicLogo', settings.logo);

      const response = await invoicesApi.exportToPDF(invoice.id, params.toString());
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Open WhatsApp with PDF message
      openWhatsAppWithPDFMessage({
        phone: invoice.patient.phone,
        patient: {
          firstName: invoice.patient.firstName,
          lastName: invoice.patient.lastName,
        },
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
        },
        clinicSettings: {
          name: settings.name,
        },
      });

      toast.success('PDF downloaded. Please attach it in WhatsApp.');
      setWhatsappFormatDialogOpen(false);
      setSelectedInvoiceForWhatsApp(null);
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSendPaymentUpdateWhatsApp = (payment: Payment, invoice: Invoice) => {
    if (!invoice.patient?.phone) {
      toast.error('Patient phone number is not available. Please update patient details.');
      return;
    }

    if (!invoice.patient?.firstName || !invoice.patient?.lastName) {
      toast.error('Patient information is incomplete.');
      return;
    }

    try {
      sendPaymentUpdateMessage({
        phone: invoice.patient.phone,
        payment: {
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          paymentDate: payment.paymentDate,
        },
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          dueAmount: invoice.dueAmount,
        },
        patient: {
          firstName: invoice.patient.firstName,
          lastName: invoice.patient.lastName,
        },
        clinicSettings: {
          name: settings.name,
        },
      });
      toast.success('Opening WhatsApp...');
    } catch (error) {
      toast.error('Failed to open WhatsApp');
    }
  };

  const watchedItems = invoiceForm.watch('items');
  const watchedDiscount = invoiceForm.watch('discount') || 0;
  const watchedTax = invoiceForm.watch('tax') || 0;
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0) || 0;
  const totalAmount = subtotal - watchedDiscount + watchedTax;

  // Show WhatsApp option toast after payment recording
  useEffect(() => {
    if (showPaymentWhatsAppOption && lastRecordedPayment) {
      const patientPhone = lastRecordedPayment.invoice.patient?.phone;
      if (patientPhone) {
        toast(
          (t) => (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Payment recorded! Send update via WhatsApp?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => {
                    handleSendPaymentUpdateAfterRecording();
                    toast.dismiss(t.id);
                  }}
                >
                  Send Update
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setShowPaymentWhatsAppOption(false);
                    setLastRecordedPayment(null);
                    toast.dismiss(t.id);
                  }}
                >
                  Dismiss
                </Button>
              </Box>
            </Box>
          ),
          {
            duration: 6000,
            id: 'payment-whatsapp-option',
          }
        );
      } else {
        setShowPaymentWhatsAppOption(false);
        setLastRecordedPayment(null);
      }
    }
  }, [showPaymentWhatsAppOption, lastRecordedPayment]);

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
        {permissions.invoices.canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenInvoiceDialog}>
            Create Invoice
          </Button>
        )}
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
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {invoice.patient?.phone && (
                          <Tooltip title="Send Invoice via WhatsApp">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenWhatsAppFormatDialog(invoice)}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                          <>
                            {settings.upiId && invoice.dueAmount > 0 && permissions.payments.canCreate && (
                              <Tooltip title="Show QR Code">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setSelectedInvoiceForQr(invoice);
                                    setQrCodeDialogOpen(true);
                                  }}
                                >
                                  <QrCodeIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {permissions.payments.canCreate && (
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
                            {user?.role === 'ADMIN' && permissions.invoices.canDelete && invoice.status !== 'CANCELLED' && (
                              <Tooltip title="Cancel Invoice">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleCancelInvoice(invoice)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                        <Tooltip title="Print Invoice">
                          <IconButton 
                            size="small"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
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
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => setPatientRegistrationModalOpen(true)}
                    sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
                  >
                    Quick Register
                  </Button>
                </Box>
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

      {/* QR Code Dialog */}
      <Dialog
        open={qrCodeDialogOpen}
        onClose={() => {
          setQrCodeDialogOpen(false);
          setSelectedInvoiceForQr(null);
        }}
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
              UPI Payment QR Code
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => {
                setQrCodeDialogOpen(false);
                setSelectedInvoiceForQr(null);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoiceForQr && settings.upiId ? (
            <Box>
              <Paper sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Invoice: {selectedInvoiceForQr.invoiceNumber}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Due Amount:
                  </Typography>
                  <Typography variant="body2" color="error.main" fontWeight={700}>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(selectedInvoiceForQr.dueAmount)}
                  </Typography>
                </Box>
              </Paper>
              <UPIQRCode
                upiId={settings.upiId}
                amount={selectedInvoiceForQr.dueAmount}
                payeeName={settings.name}
                transactionNote={`Invoice ${selectedInvoiceForQr.invoiceNumber}`}
                size={250}
              />
            </Box>
          ) : (
            <Alert severity="warning">
              UPI ID not configured. Please configure it in Settings → Clinic Settings.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setQrCodeDialogOpen(false);
              setSelectedInvoiceForQr(null);
            }}
          >
            Close
          </Button>
          {selectedInvoiceForQr && (
            <Button
              variant="contained"
              onClick={() => {
                setQrCodeDialogOpen(false);
                handleOpenPaymentDialog(selectedInvoiceForQr);
                setSelectedInvoiceForQr(null);
              }}
            >
              Record Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Patient Registration Modal */}
      <PatientRegistrationModal
        open={patientRegistrationModalOpen}
        onClose={() => setPatientRegistrationModalOpen(false)}
        onPatientRegistered={handlePatientRegistered}
      />

      {/* Invoice Detail Dialog */}
      <Dialog
        open={invoiceDetailDialogOpen}
        onClose={() => {
          setInvoiceDetailDialogOpen(false);
          setInvoiceDetail(null);
        }}
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
              Invoice Details
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => {
                setInvoiceDetailDialogOpen(false);
                setInvoiceDetail(null);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {loadingInvoiceDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : invoiceDetail ? (
            <Box>
              {/* Invoice Header */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Invoice Number
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {invoiceDetail.invoiceNumber}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date
                  </Typography>
                  <Typography>{format(new Date(invoiceDetail.createdAt), 'PP')}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Patient
                  </Typography>
                  <Typography>
                    {invoiceDetail.patient?.firstName} {invoiceDetail.patient?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {invoiceDetail.patient?.patientId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={invoiceDetail.status}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor(invoiceDetail.status)}20`,
                      color: getStatusColor(invoiceDetail.status),
                      fontWeight: 500,
                    }}
                  />
                </Grid>
              </Grid>

              {/* Invoice Items */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceDetail.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ minWidth: 250 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Subtotal:</Typography>
                    <Typography>{formatCurrency(invoiceDetail.subtotal)}</Typography>
                  </Box>
                  {invoiceDetail.discount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Discount:</Typography>
                      <Typography color="error">-{formatCurrency(invoiceDetail.discount)}</Typography>
                    </Box>
                  )}
                  {invoiceDetail.tax > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Tax:</Typography>
                      <Typography>{formatCurrency(invoiceDetail.tax)}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography fontWeight={600}>Total:</Typography>
                    <Typography fontWeight={600}>{formatCurrency(invoiceDetail.totalAmount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Paid:</Typography>
                    <Typography color="success.main">{formatCurrency(invoiceDetail.paidAmount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontWeight={600}>Due:</Typography>
                    <Typography fontWeight={600} color={invoiceDetail.dueAmount > 0 ? 'error.main' : 'success.main'}>
                      {formatCurrency(invoiceDetail.dueAmount)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Payments List */}
              {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Payments
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Mode</TableCell>
                          <TableCell>Received By</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoiceDetail.payments.map((payment: Payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.paymentDate), 'PP')}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.paymentMode}</TableCell>
                            <TableCell>
                              {payment.receivedBy?.firstName} {payment.receivedBy?.lastName}
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                {invoiceDetail.patient?.phone && (
                                  <Tooltip title="Send Payment Update via WhatsApp">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleSendPaymentUpdateWhatsApp(payment, invoiceDetail)}
                                    >
                                      <WhatsAppIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {permissions.payments.canDelete && (
                                  <Tooltip title="Cancel Payment">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setPaymentToDelete({
                                          id: payment.id,
                                          amount: payment.amount,
                                          invoiceNumber: invoiceDetail.invoiceNumber,
                                        });
                                        setDeletePaymentDialogOpen(true);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {invoiceDetail.notes && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Notes
                  </Typography>
                  <Typography>{invoiceDetail.notes}</Typography>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setInvoiceDetailDialogOpen(false);
              setInvoiceDetail(null);
            }}
          >
            Close
          </Button>
          {invoiceDetail && (
            <>
              {invoiceDetail.patient?.phone && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => handleOpenWhatsAppFormatDialog(invoiceDetail)}
                >
                  Send via WhatsApp
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => handlePrintInvoice(invoiceDetail)}
              >
                Print
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Payment Confirmation Dialog */}
      <ConfirmDialog
        open={deletePaymentDialogOpen}
        title="Cancel Payment"
        message={
          paymentToDelete
            ? `Are you sure you want to cancel this payment of ${formatCurrency(paymentToDelete.amount)}? This will update the invoice balance.`
            : ''
        }
        confirmLabel="Cancel Payment"
        cancelLabel="Keep Payment"
        confirmColor="error"
        onConfirm={handleDeletePayment}
        onCancel={() => {
          setDeletePaymentDialogOpen(false);
          setPaymentToDelete(null);
        }}
      />

      {/* WhatsApp Format Selection Dialog */}
      <Dialog
        open={whatsappFormatDialogOpen}
        onClose={() => {
          setWhatsappFormatDialogOpen(false);
          setSelectedInvoiceForWhatsApp(null);
        }}
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
              Send Invoice via WhatsApp
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => {
                setWhatsappFormatDialogOpen(false);
                setSelectedInvoiceForWhatsApp(null);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose how you want to send the invoice:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '2px solid #e2e8f0',
                  '&:hover': {
                    borderColor: '#0891b2',
                    bgcolor: '#f0f9ff',
                  },
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  if (selectedInvoiceForWhatsApp) {
                    handleSendInvoiceWhatsApp(selectedInvoiceForWhatsApp);
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <MessageIcon sx={{ fontSize: 48, color: '#0891b2', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Text Message
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Send formatted invoice details as text message
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: generatingPDF ? 'wait' : 'pointer',
                  border: '2px solid #e2e8f0',
                  '&:hover': {
                    borderColor: '#0891b2',
                    bgcolor: '#f0f9ff',
                  },
                  transition: 'all 0.2s',
                  opacity: generatingPDF ? 0.6 : 1,
                }}
                onClick={() => {
                  if (selectedInvoiceForWhatsApp && !generatingPDF) {
                    handleSendInvoiceAsPDF(selectedInvoiceForWhatsApp);
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  {generatingPDF ? (
                    <CircularProgress size={48} sx={{ mb: 2 }} />
                  ) : (
                    <PictureAsPdfIcon sx={{ fontSize: 48, color: '#ef4444', mb: 2 }} />
                  )}
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    PDF Document
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {generatingPDF
                      ? 'Generating PDF...'
                      : 'Download PDF and attach manually in WhatsApp'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setWhatsappFormatDialogOpen(false);
              setSelectedInvoiceForWhatsApp(null);
            }}
            disabled={generatingPDF}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Billing;


