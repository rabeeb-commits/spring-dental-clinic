import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Avatar,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Tooltip,
  Breadcrumbs,
  Link,
  Alert,
  Grid,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CompleteIcon,
  Description as PrescriptionIcon,
  Receipt as BillingIcon,
  CalendarMonth as ScheduleIcon,
  MedicalServices as TreatmentIcon,
  Folder as DocumentsIcon,
  Notes as NotesIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Cake as AgeIcon,
  AccessTime as TimeIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  NavigateNext as NavigateNextIcon,
  Close as CloseIcon,
  QrCode as QrCodeIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { format, differenceInYears } from 'date-fns';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import {
  appointmentsApi,
  patientsApi,
  treatmentsApi,
  invoicesApi,
  procedureTypesApi,
} from '../services/api';
import ToothSelector from '../components/dental-chart/ToothSelector';
import TreatmentModal from '../components/workflow/TreatmentModal';
import InvoiceModal from '../components/workflow/InvoiceModal';
import PaymentModal from '../components/workflow/PaymentModal';
import VisitProgress from '../components/workflow/VisitProgress';
import { useClinic } from '../context/ClinicContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import UPIQRCode from '../components/common/UPIQRCode';
import {
  Appointment,
  Patient,
  Treatment,
  Invoice,
  ProcedureType,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

interface PrescriptionFormData {
  medications: string;
  dosage: string;
  instructions: string;
  notes: string;
}

const PatientWorkflow: React.FC = () => {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedTreatmentForInvoice, setSelectedTreatmentForInvoice] = useState<Treatment | null>(null);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [selectedInvoiceForQr, setSelectedInvoiceForQr] = useState<Invoice | null>(null);
  const { settings } = useClinic();
  
  // Clinical notes
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Tooth selection
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [savingTeeth, setSavingTeeth] = useState(false);

  const prescriptionForm = useForm<PrescriptionFormData>();

  const fetchData = useCallback(async () => {
    if (!appointmentId) return;
    
    setLoading(true);
    try {
      const appointmentRes = await appointmentsApi.getById(appointmentId);
      
      if (appointmentRes.data.success && appointmentRes.data.data) {
        const apt = appointmentRes.data.data;
        setAppointment(apt);
        setClinicalNotes(apt.notes || '');
        setSelectedTeeth(apt.toothNumbers || []);
        
        // Fetch patient data
        const patientRes = await patientsApi.getById(apt.patientId);
        if (patientRes.data.success) {
          setPatient(patientRes.data.data);
        }
        
        // Fetch related data
        const [treatmentsRes, invoicesRes, proceduresRes] = await Promise.all([
          treatmentsApi.getAll({ patientId: apt.patientId }),
          invoicesApi.getAll({ patientId: apt.patientId }),
          procedureTypesApi.getAll({ isActive: 'true' }),
        ]);
        
        if (treatmentsRes.data.success) {
          setTreatments(treatmentsRes.data.data || []);
        }
        if (invoicesRes.data.success) {
          setInvoices(invoicesRes.data.data || []);
        }
        if (proceduresRes.data.success) {
          setProcedureTypes(proceduresRes.data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load patient workflow data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (status: string) => {
    if (!appointment) return;
    
    try {
      await appointmentsApi.updateStatus(appointment.id, status as any);
      toast.success(`Appointment marked as ${status.replace('_', ' ')}`);
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleSaveNotes = async () => {
    if (!appointment) return;
    
    setSavingNotes(true);
    try {
      await appointmentsApi.update(appointment.id, { notes: clinicalNotes });
      toast.success('Notes saved');
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveTeeth = async () => {
    if (!appointment) return;
    
    setSavingTeeth(true);
    try {
      await appointmentsApi.update(appointment.id, { toothNumbers: selectedTeeth });
      toast.success('Affected teeth saved');
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSavingTeeth(false);
    }
  };

  const handleCreatePrescription = async (data: PrescriptionFormData) => {
    setSubmitting(true);
    try {
      // For now, save as appointment notes - in a full implementation, 
      // this would go to a Prescription model
      const prescriptionText = `
PRESCRIPTION
Medications: ${data.medications}
Dosage: ${data.dosage}
Instructions: ${data.instructions}
Notes: ${data.notes}
Date: ${format(new Date(), 'PPP')}
      `.trim();
      
      const existingNotes = clinicalNotes ? clinicalNotes + '\n\n---\n\n' : '';
      const newNotes = existingNotes + prescriptionText;
      
      await appointmentsApi.update(appointment!.id, { notes: newNotes });
      setClinicalNotes(newNotes);
      toast.success('Prescription created');
      setPrescriptionDialogOpen(false);
      prescriptionForm.reset();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      CONFIRMED: '#3b82f6',
      COMPLETED: '#22c55e',
      CANCELLED: '#ef4444',
      NO_SHOW: '#64748b',
      PLANNED: '#64748b',
      IN_PROGRESS: '#f59e0b',
      PENDING: '#f59e0b',
      PAID: '#22c55e',
      PARTIAL: '#8b5cf6',
    };
    return colors[status] || '#64748b';
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (!appointment || !patient) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">
          Appointment not found
        </Typography>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/today')}
          sx={{ mt: 2 }}
        >
          Back to Today
        </Button>
      </Box>
    );
  }

  const patientAge = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null;

  return (
    <Box className="animate-fade-in">
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 2 }}
      >
        <Link
          component={RouterLink}
          to="/today"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          Today
        </Link>
        <Typography color="text.primary">
          {patient.firstName} {patient.lastName}
        </Typography>
      </Breadcrumbs>

      {/* Patient Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: '#0891b2',
              fontSize: '1.75rem',
            }}
          >
            {patient.firstName?.[0]}
            {patient.lastName?.[0]}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                {patient.firstName} {patient.lastName}
              </Typography>
              <Chip
                label={appointment.status.replace('_', ' ')}
                sx={{
                  bgcolor: `${getStatusColor(appointment.status)}15`,
                  color: getStatusColor(appointment.status),
                  fontWeight: 600,
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <PersonIcon fontSize="small" sx={{ flexShrink: 0 }} />
                <Typography variant="body2" noWrap>
                  ID: {patient.patientId}
                </Typography>
              </Box>
              {patient.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <PhoneIcon fontSize="small" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" noWrap>{patient.phone}</Typography>
                </Box>
              )}
              {patient.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', maxWidth: 250 }}>
                  <EmailIcon fontSize="small" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {patient.email}
                  </Typography>
                </Box>
              )}
              {patientAge !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <AgeIcon fontSize="small" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" noWrap>{patientAge} years old</Typography>
                </Box>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: 'text.secondary' }}>
              <TimeIcon fontSize="small" />
              <Typography variant="body2">
                Appointment: {appointment.startTime} - {appointment.endTime}
                {' • '}
                {appointment.type?.replace('_', ' ')}
                {appointment.dentist && ` • Dr. ${appointment.dentist.firstName} ${appointment.dentist.lastName}`}
              </Typography>
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            {appointment.status !== 'COMPLETED' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CompleteIcon />}
                onClick={() => handleStatusChange('COMPLETED')}
              >
                Complete Visit
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<PrescriptionIcon />}
              onClick={() => setPrescriptionDialogOpen(true)}
            >
              Prescription
            </Button>
            {permissions.invoices.canCreate && (
              <Button
                variant="outlined"
                startIcon={<BillingIcon />}
                onClick={() => setInvoiceDialogOpen(true)}
              >
                Invoice
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => navigate(`/appointments?action=new&patientId=${patient.id}`)}
            >
              Follow-up
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<PersonIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<PrescriptionIcon />} label="Prescription" iconPosition="start" />
          <Tab icon={<TreatmentIcon />} label="Treatments" iconPosition="start" />
          <Tab icon={<BillingIcon />} label="Billing" iconPosition="start" />
          <Tab icon={<ScheduleIcon />} label="Appointments" iconPosition="start" />
          <Tab icon={<DocumentsIcon />} label="Documents" iconPosition="start" />
          <Tab icon={<NotesIcon />} label="Notes" iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            {/* Visit Progress */}
            <VisitProgress
              appointment={appointment}
              treatments={treatments}
              invoices={invoices}
              hasNotes={!!clinicalNotes}
              hasTeethSelected={selectedTeeth.length > 0}
              onStepClick={(step) => {
                // Navigate to relevant tab based on step
                switch (step) {
                  case 2: // Examination
                    setActiveTab(6); // Notes tab
                    break;
                  case 3: // Treatment
                    setActiveTab(2); // Treatments tab
                    break;
                  case 4: // Invoice
                    setActiveTab(3); // Billing tab
                    break;
                  case 5: // Payment
                    setActiveTab(3); // Billing tab
                    break;
                }
              }}
            />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Patient Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Gender</Typography>
                        <Typography>{patient.gender || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Blood Group</Typography>
                        <Typography>{patient.bloodGroup || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Address</Typography>
                        <Typography>{patient.address || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Emergency Contact</Typography>
                        <Typography>{patient.emergencyContact || 'Not specified'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Affected Teeth Selection */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Affected Teeth
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveTeeth}
                        disabled={savingTeeth}
                      >
                        {savingTeeth ? 'Saving...' : 'Save Teeth'}
                      </Button>
                    </Box>
                    <ToothSelector
                      selectedTeeth={selectedTeeth}
                      onSelectionChange={setSelectedTeeth}
                      mode="select"
                      showQuickSelect={true}
                      compact={false}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Medical History
                    </Typography>
                    {patient.medicalHistory ? (
                      <Box>
                        {(Array.isArray(patient.medicalHistory) ? patient.medicalHistory : [patient.medicalHistory]).map((history: any, index: number) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            {history.allergies && history.allergies.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Allergies</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {history.allergies.map((allergy: string, i: number) => (
                                    <Chip key={i} label={allergy} size="small" color="error" variant="outlined" />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            {history.conditions && history.conditions.length > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">Conditions</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {history.conditions.map((condition: string, i: number) => (
                                    <Chip key={i} label={condition} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography color="text.secondary">No medical history recorded</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Quick Stats
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {treatments.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Total Treatments</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" fontWeight={700} color="warning.main">
                          {treatments.filter(t => t.status === 'IN_PROGRESS').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">In Progress</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" fontWeight={700} color="success.main">
                          {invoices.filter(i => i.status === 'PAID').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Paid Invoices</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" fontWeight={700} color="error.main">
                          {formatCurrency(invoices.reduce((sum, i) => sum + (i.dueAmount || 0), 0))}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Outstanding</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Prescription Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Prescriptions</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setPrescriptionDialogOpen(true)}
              >
                New Prescription
              </Button>
            </Box>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Prescriptions are saved in the clinical notes. A dedicated prescription module with PDF generation will be available in a future update.
            </Alert>
            
            {clinicalNotes && clinicalNotes.includes('PRESCRIPTION') ? (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {clinicalNotes}
                </pre>
                <Box sx={{ mt: 2 }}>
                  <Button startIcon={<PrintIcon />} variant="outlined">
                    Print Prescription
                  </Button>
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <PrescriptionIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                <Typography color="text.secondary">No prescriptions yet</Typography>
              </Paper>
            )}
          </TabPanel>

          {/* Treatments Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Treatments</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTreatmentDialogOpen(true)}
              >
                New Treatment
              </Button>
            </Box>
            
            {treatments.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <TreatmentIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                <Typography color="text.secondary">No treatments yet</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Treatment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Dentist</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {treatments.map((treatment) => (
                      <TableRow key={treatment.id} hover>
                        <TableCell>
                          <Typography fontWeight={500}>{treatment.title}</Typography>
                          {treatment.procedures && treatment.procedures.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {treatment.procedures.length} procedure(s)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={treatment.status.replace('_', ' ')}
                            size="small"
                            sx={{
                              bgcolor: `${getStatusColor(treatment.status)}15`,
                              color: getStatusColor(treatment.status),
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          Dr. {treatment.dentist?.firstName} {treatment.dentist?.lastName}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(treatment.totalCost)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(treatment.createdAt), 'PP')}
                        </TableCell>
                        <TableCell align="right">
                          {!treatment.invoice && permissions.invoices.canCreate && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<BillingIcon />}
                              onClick={() => {
                                setSelectedTreatmentForInvoice(treatment);
                                setInvoiceDialogOpen(true);
                              }}
                            >
                              Invoice
                            </Button>
                          )}
                          {user?.role === 'ADMIN' && permissions.treatments.canDelete && (
                            <Tooltip title="Delete Treatment">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this treatment?')) {
                                    try {
                                      await treatmentsApi.delete(treatment.id);
                                      fetchData();
                                    } catch (error) {
                                      // Error handled by interceptor
                                    }
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Billing Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Invoices & Payments</Typography>
              {permissions.invoices.canCreate && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedTreatmentForInvoice(null);
                    setInvoiceDialogOpen(true);
                  }}
                >
                  New Invoice
                </Button>
              )}
            </Box>
            
            {invoices.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <BillingIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                <Typography color="text.secondary">No invoices yet</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Due</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>
                          <Typography fontWeight={500}>{invoice.invoiceNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status}
                            size="small"
                            sx={{
                              bgcolor: `${getStatusColor(invoice.status)}15`,
                              color: getStatusColor(invoice.status),
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(invoice.paidAmount)}</TableCell>
                        <TableCell align="right" sx={{ color: invoice.dueAmount > 0 ? 'error.main' : 'inherit' }}>
                          {formatCurrency(invoice.dueAmount)}
                        </TableCell>
                        <TableCell>{format(new Date(invoice.createdAt), 'PP')}</TableCell>
                        <TableCell align="right">
                          {invoice.dueAmount > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              {settings.upiId && permissions.payments.canCreate && (
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
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<BillingIcon />}
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(invoice);
                                    setPaymentDialogOpen(true);
                                  }}
                                >
                                  Pay
                                </Button>
                              )}
                              {user?.role === 'ADMIN' && permissions.invoices.canDelete && (
                                <Tooltip title="Cancel Invoice">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      // TODO: Add cancel invoice handler
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Appointments Tab */}
          <TabPanel value={activeTab} index={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Appointment History</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/appointments?action=new&patientId=${patient.id}`)}
              >
                Schedule Appointment
              </Button>
            </Box>
            
            <Alert severity="info">
              View full appointment history in the Appointments section.
            </Alert>
          </TabPanel>

          {/* Documents Tab */}
          <TabPanel value={activeTab} index={5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Documents</Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                Upload Document
              </Button>
            </Box>
            
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <DocumentsIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
              <Typography color="text.secondary">No documents uploaded yet</Typography>
            </Paper>
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={activeTab} index={6}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Clinical Notes
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={10}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter clinical notes, observations, or instructions..."
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </TabPanel>
        </Box>
      </Paper>

      {/* Prescription Dialog */}
      <Dialog
        open={prescriptionDialogOpen}
        onClose={() => setPrescriptionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Create Prescription</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setPrescriptionDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={prescriptionForm.handleSubmit(handleCreatePrescription)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Medications"
                  multiline
                  rows={3}
                  placeholder="Enter medication names, one per line"
                  {...prescriptionForm.register('medications', { required: true })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dosage & Frequency"
                  multiline
                  rows={2}
                  placeholder="e.g., 1 tablet twice daily after meals"
                  {...prescriptionForm.register('dosage', { required: true })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Instructions"
                  multiline
                  rows={2}
                  placeholder="Special instructions for the patient"
                  {...prescriptionForm.register('instructions')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  multiline
                  rows={2}
                  {...prescriptionForm.register('notes')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPrescriptionDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Prescription'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Treatment Modal */}
      <TreatmentModal
        open={treatmentDialogOpen}
        onClose={() => {
          setTreatmentDialogOpen(false);
          setSelectedTreatmentForInvoice(null);
        }}
        onTreatmentCreated={() => {
          fetchData();
        }}
        patientId={patient.id}
        defaultDentistId={appointment.dentistId}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        open={invoiceDialogOpen}
        onClose={() => {
          setInvoiceDialogOpen(false);
          setSelectedTreatmentForInvoice(null);
        }}
        onInvoiceCreated={() => {
          fetchData();
        }}
        patientId={patient.id}
        treatmentId={selectedTreatmentForInvoice?.id}
        treatmentItems={selectedTreatmentForInvoice?.procedures?.map(proc => ({
          description: proc.procedureType?.name || 'Procedure',
          quantity: 1,
          unitPrice: proc.cost,
          toothNumbers: proc.toothNumbers,
        }))}
      />

      {/* Payment Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          open={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          onPaymentRecorded={() => {
            fetchData();
          }}
          invoice={selectedInvoiceForPayment}
        />
      )}

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
                    {formatCurrency(selectedInvoiceForQr.dueAmount)}
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
                setSelectedInvoiceForPayment(selectedInvoiceForQr);
                setPaymentDialogOpen(true);
                setSelectedInvoiceForQr(null);
              }}
            >
              Record Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientWorkflow;

