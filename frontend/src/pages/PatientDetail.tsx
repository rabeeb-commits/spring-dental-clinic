import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  Tabs,
  Tab,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText as MenuListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  MedicalServices as TreatmentIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { patientsApi, patientExportApi, invoicesApi } from '../services/api';
import { Patient } from '../types';
import DentalChart from '../components/dental-chart/DentalChart';
import { format } from 'date-fns';
import { calculateAge, formatTime12Hour } from '../utils/helpers';
import { openWhatsApp, generateFollowUpMessage, generatePaymentReminderMessage } from '../utils/whatsapp';

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

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [whatsappMenuAnchor, setWhatsappMenuAnchor] = useState<null | HTMLElement>(null);
  const [customMessageDialogOpen, setCustomMessageDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      try {
        const response = await patientsApi.getById(id);
        if (response.data.success) {
          setPatient(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch patient:', error);
        toast.error('Failed to load patient data. Redirecting...');
        setTimeout(() => navigate('/patients'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id, navigate]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography>Patient not found</Typography>
        <Button onClick={() => navigate('/patients')} sx={{ mt: 2 }}>
          Back to Patients
        </Button>
      </Box>
    );
  }

  const getGenderColor = (gender: string) => {
    const colors: Record<string, string> = {
      MALE: '#3b82f6',
      FEMALE: '#ec4899',
      OTHER: '#8b5cf6',
    };
    return colors[gender] || '#64748b';
  };

  const handleExportPDF = async () => {
    if (!patient) return;
    setExporting(true);
    try {
      const response = await patientExportApi.exportToPDF(patient.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-${patient.patientId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Patient report exported');
    } catch (error) {
      toast.error('Failed to export patient report');
    } finally {
      setExporting(false);
    }
  };

  const handleWhatsAppMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setWhatsappMenuAnchor(event.currentTarget);
  };

  const handleWhatsAppMenuClose = () => {
    setWhatsappMenuAnchor(null);
  };

  const handleSendFollowUp = () => {
    if (!patient?.phone) {
      toast.error('Patient phone number is not available');
      return;
    }
    const message = generateFollowUpMessage(`${patient.firstName} ${patient.lastName}`);
    openWhatsApp(patient.phone, message);
    handleWhatsAppMenuClose();
    toast.success('Opening WhatsApp...');
  };

  const handleSendPaymentReminder = async () => {
    if (!patient?.phone) {
      toast.error('Patient phone number is not available');
      return;
    }
    try {
      const response = await invoicesApi.getByPatient(patient.id);
      if (response.data.success) {
        const invoices = response.data.data || [];
        const outstandingInvoices = invoices.filter(
          (inv: any) => inv.status === 'PENDING' || inv.status === 'PARTIAL'
        );
        const totalOutstanding = outstandingInvoices.reduce(
          (sum: number, inv: any) => sum + inv.dueAmount,
          0
        );

        if (totalOutstanding === 0) {
          toast('No outstanding payments for this patient');
          handleWhatsAppMenuClose();
          return;
        }

        const message = generatePaymentReminderMessage({
          patientName: `${patient.firstName} ${patient.lastName}`,
          amount: totalOutstanding,
        });
        openWhatsApp(patient.phone, message);
        handleWhatsAppMenuClose();
        toast.success('Opening WhatsApp...');
      }
    } catch (error) {
      toast.error('Failed to fetch payment information');
    }
  };

  const handleSendCustomMessage = () => {
    if (!patient?.phone) {
      toast.error('Patient phone number is not available');
      return;
    }
    setCustomMessage('');
    setCustomMessageDialogOpen(true);
    handleWhatsAppMenuClose();
  };

  const handleSendCustomMessageConfirm = () => {
    if (!patient?.phone || !customMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    openWhatsApp(patient.phone, customMessage.trim());
    toast.success('Opening WhatsApp...');
    setCustomMessageDialogOpen(false);
    setCustomMessage('');
  };

  return (
    <Box className="animate-fade-in">
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/patients')}
        sx={{ mb: 2 }}
      >
        Back to Patients
      </Button>

      {/* Patient Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#0891b2',
                fontSize: '1.75rem',
                fontWeight: 600,
              }}
            >
              {patient.firstName[0]}
              {patient.lastName[0]}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                {patient.firstName} {patient.lastName}
              </Typography>
              <Chip
                label={patient.gender}
                size="small"
                sx={{
                  bgcolor: `${getGenderColor(patient.gender)}15`,
                  color: getGenderColor(patient.gender),
                  fontWeight: 600,
                }}
              />
              {patient.bloodGroup && (
                <Chip
                  label={`Blood: ${patient.bloodGroup}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: '#0891b2',
                fontWeight: 500,
                mb: 1.5,
              }}
            >
              {patient.patientId}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="body2">{patient.phone}</Typography>
              </Box>
              {patient.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmailIcon sx={{ fontSize: 18, color: '#64748b' }} />
                  <Typography variant="body2">{patient.email}</Typography>
                </Box>
              )}
              {patient.city && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationIcon sx={{ fontSize: 18, color: '#64748b' }} />
                  <Typography variant="body2">
                    {patient.city}, {patient.state}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={exporting ? <CircularProgress size={20} /> : <PdfIcon />}
                onClick={handleExportPDF}
                disabled={exporting}
              >
                Export PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<CalendarIcon />}
                onClick={() => navigate(`/appointments?patientId=${patient.id}`)}
              >
                Book Appointment
              </Button>
              {patient.phone && (
                <>
                  <Button
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    onClick={handleWhatsAppMenuOpen}
                    sx={{
                      bgcolor: '#25D366',
                      '&:hover': { bgcolor: '#20BA5A' },
                    }}
                  >
                    WhatsApp
                  </Button>
                  <Menu
                    anchorEl={whatsappMenuAnchor}
                    open={Boolean(whatsappMenuAnchor)}
                    onClose={handleWhatsAppMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem onClick={handleSendFollowUp}>
                      <ListItemIcon>
                        <CalendarIcon fontSize="small" />
                      </ListItemIcon>
                      <MenuListItemText>Follow-up Reminder</MenuListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleSendPaymentReminder}>
                      <ListItemIcon>
                        <PdfIcon fontSize="small" />
                      </ListItemIcon>
                      <MenuListItemText>Payment Reminder</MenuListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleSendCustomMessage}>
                      <ListItemIcon>
                        <WhatsAppIcon fontSize="small" />
                      </ListItemIcon>
                      <MenuListItemText>Custom Message</MenuListItemText>
                    </MenuItem>
                  </Menu>
                </>
              )}
              <Tooltip title="Edit Patient">
                <IconButton aria-label="Edit patient information">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {patient.age !== undefined ? patient.age : calculateAge(patient.dateOfBirth)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Age (years)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {(patient as any).appointments?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {(patient as any).treatments?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Treatments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {(patient as any).documents?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Documents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Dental Chart" />
          <Tab label="Medical History" />
          <Tab label="Treatments" />
          <Tab label="Appointments" />
          <Tab label="Documents" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Dental Chart Tab */}
          <TabPanel value={activeTab} index={0}>
            <DentalChart patientId={patient.id} />
          </TabPanel>

          {/* Medical History Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Allergies
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {patient.medicalHistory?.allergies?.length ? (
                    patient.medicalHistory.allergies.map((allergy, i) => (
                      <Chip key={i} label={allergy} color="error" variant="outlined" size="small" />
                    ))
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No known allergies
                    </Typography>
                  )}
                </Box>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Chronic Diseases
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {patient.medicalHistory?.chronicDiseases?.length ? (
                    patient.medicalHistory.chronicDiseases.map((disease, i) => (
                      <Chip key={i} label={disease} color="warning" variant="outlined" size="small" />
                    ))
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      None reported
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current Medications
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {patient.medicalHistory?.currentMedications?.length ? (
                    patient.medicalHistory.currentMedications.map((med, i) => (
                      <Chip key={i} label={med} variant="outlined" size="small" />
                    ))
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      None reported
                    </Typography>
                  )}
                </Box>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Previous Surgeries
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {patient.medicalHistory?.previousSurgeries?.length ? (
                    patient.medicalHistory.previousSurgeries.map((surgery, i) => (
                      <Chip key={i} label={surgery} variant="outlined" size="small" />
                    ))
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      None reported
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Treatments Tab */}
          <TabPanel value={activeTab} index={2}>
            {(patient as any).treatments?.length ? (
              <List>
                {(patient as any).treatments.map((treatment: any) => (
                  <ListItem
                    key={treatment.id}
                    sx={{
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={treatment.title}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption">
                            Status: {treatment.status}
                          </Typography>
                          <Typography variant="caption">
                            Cost: ₹{treatment.totalCost?.toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip
                      label={treatment.status}
                      size="small"
                      color={treatment.status === 'COMPLETED' ? 'success' : 'default'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <TreatmentIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
                <Typography color="text.secondary">No treatments recorded</Typography>
              </Box>
            )}
          </TabPanel>

          {/* Appointments Tab */}
          <TabPanel value={activeTab} index={3}>
            {(patient as any).appointments?.length ? (
              <List>
                {(patient as any).appointments.map((apt: any) => (
                  <ListItem
                    key={apt.id}
                    sx={{
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={format(new Date(apt.appointmentDate), 'PPP')}
                      secondary={`${formatTime12Hour(apt.startTime)} - ${formatTime12Hour(apt.endTime)} | ${apt.type}`}
                    />
                    <Chip
                      label={apt.status}
                      size="small"
                      color={apt.status === 'COMPLETED' ? 'success' : 'default'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CalendarIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
                <Typography color="text.secondary">No appointments yet</Typography>
              </Box>
            )}
          </TabPanel>

          {/* Documents Tab */}
          <TabPanel value={activeTab} index={4}>
            {(patient as any).documents?.length ? (
              <Grid container spacing={2}>
                {(patient as any).documents.map((doc: any) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" noWrap>
                          {doc.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.type} | {format(new Date(doc.uploadedAt), 'PP')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <DocumentIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
                <Typography color="text.secondary">No documents uploaded</Typography>
              </Box>
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* Custom Message Dialog */}
      <Dialog
        open={customMessageDialogOpen}
        onClose={() => {
          setCustomMessageDialogOpen(false);
          setCustomMessage('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Send Custom WhatsApp Message</Typography>
            <IconButton
              aria-label="close"
              onClick={() => {
                setCustomMessageDialogOpen(false);
                setCustomMessage('');
              }}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Message"
            placeholder="Enter your message here..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setCustomMessageDialogOpen(false);
              setCustomMessage('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendCustomMessageConfirm}
            disabled={!customMessage.trim()}
            sx={{
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#20BA5A' },
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientDetail;


