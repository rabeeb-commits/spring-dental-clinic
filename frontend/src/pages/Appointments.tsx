import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewDay as DayIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MedicalServices as TreatmentIcon,
  Receipt as BillingIcon,
  CheckCircle as CompleteIcon,
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { DatePicker, MobileTimePicker } from '@mui/x-date-pickers';
import { useForm, Controller } from 'react-hook-form';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentsApi, patientsApi, usersApi } from '../services/api';
import { Appointment, Patient, User, AppointmentType, AppointmentStatus } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ToothSelector from '../components/dental-chart/ToothSelector';
import { sendAppointmentReminder } from '../utils/whatsapp';
import PatientRegistrationModal from '../components/workflow/PatientRegistrationModal';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { formatTime12Hour, parseTime12Hour } from '../utils/helpers';
import ConflictDialog from '../components/common/ConflictDialog';
import { useDebounce } from '../hooks/useDebounce';

interface AppointmentFormData {
  patientId: string;
  dentistId: string;
  appointmentDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  type: AppointmentType;
  reason?: string;
  notes?: string;
  toothNumbers?: number[];
}

const Appointments: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<Appointment | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [patientRegistrationModalOpen, setPatientRegistrationModalOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    message: string;
    conflict: {
      existingAppointment: { patientName: string; time: string };
      suggestions: {
        alternativeDoctors: Array<{ id: string; name: string; available: boolean }>;
        availableTimeSlots: Array<{ startTime: string; endTime: string }>;
        nextAvailableSlot: { startTime: string; endTime: string } | null;
      };
    };
  } | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
  }>({ checking: false, available: null, message: null });

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AppointmentFormData>();
  
  // Watch form fields for validation and proactive availability checking
  const watchedDentistId = watch('dentistId');
  const watchedAppointmentDate = watch('appointmentDate');
  const watchedStartTime = watch('startTime');
  const watchedEndTime = watch('endTime');
  
  // Validate that endTime is after startTime
  const validateEndTime = (endTime: Date | null): boolean | string => {
    if (!endTime || !watchedStartTime) return true;
    return endTime > watchedStartTime || 'End time must be after start time';
  };

  // Debounce availability check to avoid excessive API calls
  const debouncedStartTime = useDebounce(watchedStartTime, 500);
  const debouncedEndTime = useDebounce(watchedEndTime, 500);

  // Helper function to format time
  const formatTime = (date: Date): string => {
    return formatTime12Hour(date);
  };

  // Proactive availability checking
  useEffect(() => {
    const checkAvailability = async () => {
      if (!watchedDentistId || !watchedAppointmentDate || !debouncedStartTime || !debouncedEndTime) {
        setAvailabilityStatus({ checking: false, available: null, message: null });
        return;
      }

      // Skip check if editing existing appointment (to avoid false positives)
      if (editingAppointment) {
        setAvailabilityStatus({ checking: false, available: null, message: null });
        return;
      }

      setAvailabilityStatus({ checking: true, available: null, message: null });

      try {
        const response = await appointmentsApi.checkAvailability({
          dentistId: watchedDentistId,
          appointmentDate: format(watchedAppointmentDate, 'yyyy-MM-dd'),
          startTime: formatTime(debouncedStartTime),
          endTime: formatTime(debouncedEndTime),
        });

        if (response.data.success) {
          if (response.data.available) {
            setAvailabilityStatus({
              checking: false,
              available: true,
              message: 'This time slot is available',
            });
          } else {
            setAvailabilityStatus({
              checking: false,
              available: false,
              message: 'This time slot is not available',
            });
          }
        }
      } catch (error) {
        // Silently fail - don't show error for proactive checks
        setAvailabilityStatus({ checking: false, available: null, message: null });
      }
    };

    checkAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDentistId, watchedAppointmentDate, debouncedStartTime, debouncedEndTime, editingAppointment]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : currentDate;
      const end = viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : currentDate;

      const [appointmentsRes, patientsRes, dentistsRes] = await Promise.all([
        appointmentsApi.getCalendar(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
        patientsApi.getAll({ limit: '100' }),
        usersApi.getDentists(),
      ]);

      if (appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.data || []);
      }
      if (patientsRes.data.success) {
        setPatients(patientsRes.data.data || []);
      }
      if (dentistsRes.data.success) {
        setDentists(dentistsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle query parameters for pre-filling patient
  useEffect(() => {
    const action = searchParams.get('action');
    const patientId = searchParams.get('patientId');
    
    if (action === 'new' && patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
        handleOpenDialog(undefined, new Date());
        setValue('patientId', patientId);
        // Clear URL params
        navigate('/appointments', { replace: true });
      }
    }
  }, [searchParams, patients, navigate, setValue]);

  const handleOpenDialog = (appointment?: Appointment, date?: Date) => {
    if (appointment) {
      setEditingAppointment(appointment);
      const patient = patients.find(p => p.id === appointment.patientId);
      setSelectedPatient(patient || null);
      reset({
        patientId: appointment.patientId,
        dentistId: appointment.dentistId,
        appointmentDate: new Date(appointment.appointmentDate),
        startTime: parseTimeString(appointment.startTime),
        endTime: parseTimeString(appointment.endTime),
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes,
        toothNumbers: appointment.toothNumbers || [],
      });
      setSelectedTeeth(appointment.toothNumbers || []);
    } else {
      setEditingAppointment(null);
      setSelectedPatient(null);
      reset({
        patientId: '',
        dentistId: dentists[0]?.id || '',
        appointmentDate: date || new Date(),
        startTime: null,
        endTime: null,
        type: 'CONSULTATION',
        reason: '',
        notes: '',
        toothNumbers: [],
      });
      setSelectedTeeth([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAppointment(null);
    setSelectedPatient(null);
    setSelectedTeeth([]);
    reset();
  };

  const handlePatientRegistered = (patient: Patient) => {
    // Add patient to the list if not already present
    if (!patients.find(p => p.id === patient.id)) {
      setPatients([...patients, patient]);
    }
    // Auto-select the newly registered patient
    setSelectedPatient(patient);
    setValue('patientId', patient.id);
    // Refresh patients list
    fetchData();
  };

  const parseTimeString = (timeStr: string): Date => {
    try {
      return parseTime12Hour(timeStr);
    } catch {
      // Fallback for backward compatibility with 24-hour format
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!data.appointmentDate || !data.startTime || !data.endTime) return;

    setSubmitting(true);
    try {
      const payload = {
        patientId: data.patientId,
        dentistId: data.dentistId,
        appointmentDate: format(data.appointmentDate, 'yyyy-MM-dd'),
        startTime: formatTime(data.startTime),
        endTime: formatTime(data.endTime),
        type: data.type,
        reason: data.reason,
        notes: data.notes,
        toothNumbers: selectedTeeth,
      };

      if (editingAppointment) {
        await appointmentsApi.update(editingAppointment.id, payload);
        toast.success('Appointment updated successfully');
      } else {
        await appointmentsApi.create(payload);
        toast.success('Appointment scheduled successfully');
      }

      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      // Check if error has conflict data
      if (error.response?.data?.conflict) {
        setConflictData({
          message: error.response.data.message || 'Time slot conflicts with an existing appointment',
          conflict: error.response.data.conflict,
        });
        setConflictDialogOpen(true);
        // Don't show toast for conflict errors - dialog handles it
      } else {
        // Error handled by interceptor for other errors
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      await appointmentsApi.updateStatus(appointmentId, status);
      toast.success(`Appointment marked as ${status}`);
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentsApi.delete(appointmentId);
        toast.success('Appointment cancelled');
        fetchData();
      } catch (error) {
        // Error handled by interceptor
      }
    }
  };

  const handleSendWhatsApp = (appointment: Appointment) => {
    if (!appointment.patient?.phone) {
      toast.error('Patient phone number is not available');
      return;
    }

    const appointmentDate = format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy');
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const dentistName = appointment.dentist 
      ? `${appointment.dentist.firstName} ${appointment.dentist.lastName}`
      : 'N/A';

    sendAppointmentReminder({
      phone: appointment.patient.phone,
      patientName,
      date: appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      dentistName,
      type: appointment.type,
      reason: appointment.reason || undefined,
    });

    toast.success('Opening WhatsApp...');
  };

  const getStatusColor = (status: AppointmentStatus): string => {
    const colors: Record<AppointmentStatus, string> = {
      CONFIRMED: '#22c55e',
      COMPLETED: '#3b82f6',
      CANCELLED: '#ef4444',
      NO_SHOW: '#f59e0b',
      RESCHEDULED: '#8b5cf6',
    };
    return colors[status];
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.appointmentDate), date)
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Appointments
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Schedule and manage patient appointments
          </Typography>
        </Box>
          {permissions.appointments.canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              New Appointment
            </Button>
          )}
      </Box>

      {/* Calendar Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => setCurrentDate(d => addDays(d, viewMode === 'week' ? -7 : -1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              {viewMode === 'week'
                ? `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMMM d, yyyy')}
            </Typography>
            <IconButton onClick={() => setCurrentDate(d => addDays(d, viewMode === 'week' ? 7 : 1))}>
              <ChevronRightIcon />
            </IconButton>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TodayIcon />}
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </Box>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="day">
              <DayIcon sx={{ mr: 0.5 }} /> Day
            </ToggleButton>
            <ToggleButton value="week">
              <WeekIcon sx={{ mr: 0.5 }} /> Week
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Calendar Grid */}
      {loading ? (
        <Skeleton variant="rounded" height={500} />
      ) : viewMode === 'week' ? (
        <Paper sx={{ overflow: 'hidden' }}>
          <Grid container>
            {weekDays.map((day, index) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Grid
                  item
                  xs={12}
                  sm={12 / 7}
                  key={day.toISOString()}
                  sx={{
                    borderRight: index < 6 ? '1px solid #e2e8f0' : 'none',
                    minHeight: 400,
                  }}
                >
                  {/* Day Header */}
                  <Box
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      bgcolor: isToday ? '#0891b2' : '#f8fafc',
                      color: isToday ? '#fff' : 'inherit',
                    }}
                  >
                    <Typography variant="caption" display="block">
                      {format(day, 'EEE')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {format(day, 'd')}
                    </Typography>
                  </Box>

                  {/* Appointments */}
                  <Box sx={{ p: 1 }}>
                    {dayAppointments.length === 0 ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center', py: 2 }}
                      >
                        No appointments
                      </Typography>
                    ) : (
                      dayAppointments.map((apt) => (
                        <Box
                          key={apt.id}
                          sx={{
                            p: 1,
                            mb: 1,
                            borderRadius: 1,
                            bgcolor: `${getStatusColor(apt.status)}15`,
                            borderLeft: `3px solid ${getStatusColor(apt.status)}`,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            '&:hover': { bgcolor: `${getStatusColor(apt.status)}25` },
                          }}
                        >
                          <Box
                            sx={{ flex: 1 }}
                            onClick={() => {
                              setSelectedAppointmentDetail(apt);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Typography variant="caption" fontWeight={600} display="block">
                              {formatTime12Hour(apt.startTime)}
                            </Typography>
                            <Typography variant="caption" noWrap>
                              {apt.patient?.firstName} {apt.patient?.lastName}
                            </Typography>
                          </Box>
                          {apt.patient?.phone && (
                            <Tooltip title="Send WhatsApp Message">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendWhatsApp(apt);
                                }}
                                sx={{
                                  color: '#25D366',
                                  '&:hover': { bgcolor: '#25D36615' },
                                }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <List>
            {getAppointmentsForDay(currentDate).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">No appointments for this day</Typography>
              </Box>
            ) : (
              getAppointmentsForDay(currentDate).map((apt) => (
                <ListItem
                  key={apt.id}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    '&:hover': { bgcolor: '#f1f5f9' },
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedAppointmentDetail(apt);
                    setDetailDialogOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Appointment with ${apt.patient?.firstName} ${apt.patient?.lastName} at ${formatTime12Hour(apt.startTime)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedAppointmentDetail(apt);
                      setDetailDialogOpen(true);
                    }
                  }}
                >
                  <Avatar sx={{ bgcolor: '#0891b2', mr: 2 }}>
                    {apt.patient?.firstName?.[0]}{apt.patient?.lastName?.[0]}
                  </Avatar>
                  <ListItemText
                    primary={`${apt.patient?.firstName} ${apt.patient?.lastName}`}
                    secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption">
                          {formatTime12Hour(apt.startTime)} - {formatTime12Hour(apt.endTime)}
                        </Typography>
                        <Typography variant="caption">
                          {apt.type.replace('_', ' ')}
                        </Typography>
                        {apt.dentist && (
                          <Typography variant="caption">
                            Dr. {apt.dentist.firstName} {apt.dentist.lastName}
                          </Typography>
                        )}
                        {apt.toothNumbers && apt.toothNumbers.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            🦷 {apt.toothNumbers.length} tooth{apt.toothNumbers.length !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip
                    label={apt.status}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor(apt.status)}20`,
                      color: getStatusColor(apt.status),
                      fontWeight: 500,
                      mr: 1,
                    }}
                  />
                  <ListItemSecondaryAction>
                    {apt.patient?.phone && (
                      <Tooltip title="Send WhatsApp Message">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(apt);
                          }}
                          sx={{
                            color: '#25D366',
                            '&:hover': { bgcolor: '#25D36615' },
                          }}
                        >
                          <WhatsAppIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Create Treatment">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/treatments?action=new&patientId=${apt.patientId}`);
                        }}
                      >
                        <TreatmentIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(apt);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {permissions.appointments.canDelete && (
                      <Tooltip title="Cancel">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(apt.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Appointment Details</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setDetailDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAppointmentDetail && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: '#0891b2', width: 56, height: 56 }}>
                  {selectedAppointmentDetail.patient?.firstName?.[0]}
                  {selectedAppointmentDetail.patient?.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedAppointmentDetail.patient?.firstName} {selectedAppointmentDetail.patient?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAppointmentDetail.patient?.phone}
                  </Typography>
                </Box>
                <Chip
                  label={selectedAppointmentDetail.status}
                  sx={{
                    ml: 'auto',
                    bgcolor: `${getStatusColor(selectedAppointmentDetail.status)}20`,
                    color: getStatusColor(selectedAppointmentDetail.status),
                    fontWeight: 600,
                  }}
                />
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography>{format(new Date(selectedAppointmentDetail.appointmentDate), 'PPP')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Time</Typography>
                  <Typography>{formatTime12Hour(selectedAppointmentDetail.startTime)} - {formatTime12Hour(selectedAppointmentDetail.endTime)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Typography>{selectedAppointmentDetail.type.replace('_', ' ')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Dentist</Typography>
                  <Typography>
                    {selectedAppointmentDetail.dentist 
                      ? `Dr. ${selectedAppointmentDetail.dentist.firstName} ${selectedAppointmentDetail.dentist.lastName}`
                      : 'N/A'}
                  </Typography>
                </Grid>
                {selectedAppointmentDetail.reason && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Reason</Typography>
                    <Typography>{selectedAppointmentDetail.reason}</Typography>
                  </Grid>
                )}
                {selectedAppointmentDetail.toothNumbers && selectedAppointmentDetail.toothNumbers.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Affected Teeth ({selectedAppointmentDetail.toothNumbers.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedAppointmentDetail.toothNumbers.map(tooth => (
                        <Chip
                          key={tooth}
                          label={tooth}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 2 }}>Quick Actions</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<TreatmentIcon />}
                    onClick={() => {
                      setDetailDialogOpen(false);
                      navigate(`/treatments?action=new&patientId=${selectedAppointmentDetail.patientId}&appointmentId=${selectedAppointmentDetail.id}`);
                    }}
                    sx={{ py: 1.5 }}
                  >
                    Create Treatment
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<BillingIcon />}
                    onClick={() => {
                      setDetailDialogOpen(false);
                      navigate(`/billing?action=new&patientId=${selectedAppointmentDetail.patientId}`);
                    }}
                    sx={{ py: 1.5 }}
                  >
                    Create Invoice
                  </Button>
                </Grid>
                {selectedAppointmentDetail.patient?.phone && (
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<WhatsAppIcon />}
                      onClick={() => {
                        handleSendWhatsApp(selectedAppointmentDetail);
                      }}
                      sx={{
                        py: 1.5,
                        bgcolor: '#25D366',
                        '&:hover': { bgcolor: '#20BA5A' },
                      }}
                    >
                      Send WhatsApp Message
                    </Button>
                  </Grid>
                )}
                {selectedAppointmentDetail.status === 'CONFIRMED' && (
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<CompleteIcon />}
                      onClick={() => {
                        handleStatusChange(selectedAppointmentDetail.id, 'COMPLETED');
                        setDetailDialogOpen(false);
                      }}
                      sx={{ py: 1.5 }}
                    >
                      Mark as Completed
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setDetailDialogOpen(false);
              if (selectedAppointmentDetail) {
                handleOpenDialog(selectedAppointmentDetail);
              }
            }}
          >
            Edit Appointment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Appointment Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
        sx={{
          '& .MuiDialog-paper': {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleCloseDialog}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Controller
                      name="patientId"
                      control={control}
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
                              error={!!errors.patientId}
                              helperText={errors.patientId?.message}
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
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Select Dentist"
                  {...register('dentistId', { required: 'Dentist is required' })}
                  error={!!errors.dentistId}
                  helperText={errors.dentistId?.message}
                  defaultValue={dentists[0]?.id || ''}
                >
                  {dentists.map((dentist) => (
                    <MenuItem key={dentist.id} value={dentist.id}>
                      Dr. {dentist.firstName} {dentist.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="appointmentDate"
                  control={control}
                  rules={{ required: 'Date is required' }}
                  render={({ field }) => (
                    <DatePicker
                      label="Appointment Date"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.appointmentDate,
                          helperText: errors.appointmentDate?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="startTime"
                  control={control}
                  rules={{ required: 'Start time is required' }}
                  render={({ field }) => (
                    <MobileTimePicker
                      label="Start Time"
                      value={field.value}
                      onChange={field.onChange}
                      ampm={true}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.startTime,
                          helperText: errors.startTime?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="endTime"
                  control={control}
                  rules={{ 
                    required: 'End time is required',
                    validate: validateEndTime,
                  }}
                  render={({ field }) => (
                    <Box>
                      <MobileTimePicker
                        label="End Time"
                        value={field.value}
                        onChange={field.onChange}
                        ampm={true}
                        minTime={watchedStartTime || undefined}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.endTime || (availabilityStatus.available === false),
                            helperText: errors.endTime?.message || (
                              availabilityStatus.checking
                                ? 'Checking availability...'
                                : availabilityStatus.available === false
                                ? availabilityStatus.message
                                : availabilityStatus.available === true
                                ? availabilityStatus.message
                                : undefined
                            ),
                            InputProps: {
                              endAdornment: availabilityStatus.checking ? (
                                <CircularProgress size={20} />
                              ) : availabilityStatus.available === true ? (
                                <CompleteIcon color="success" sx={{ fontSize: 20 }} />
                              ) : availabilityStatus.available === false ? (
                                <WarningIcon color="error" sx={{ fontSize: 20 }} />
                              ) : undefined,
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                />
              </Grid>
              {availabilityStatus.available === false && availabilityStatus.message && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {availabilityStatus.message}. Please select a different time or doctor.
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Appointment Type"
                  defaultValue="CONSULTATION"
                  {...register('type')}
                >
                  <MenuItem value="CONSULTATION">Consultation</MenuItem>
                  <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
                  <MenuItem value="EMERGENCY">Emergency</MenuItem>
                  <MenuItem value="PROCEDURE">Procedure</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Visit"
                  {...register('reason')}
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
                <Box sx={{ mt: 2 }}>
                  <ToothSelector
                    selectedTeeth={selectedTeeth}
                    onSelectionChange={setSelectedTeeth}
                    mode="select"
                    showQuickSelect={true}
                    compact={false}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : editingAppointment ? 'Update' : 'Schedule'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Patient Registration Modal */}
      <PatientRegistrationModal
        open={patientRegistrationModalOpen}
        onClose={() => setPatientRegistrationModalOpen(false)}
        onPatientRegistered={handlePatientRegistered}
      />

      {/* Conflict Dialog */}
      {conflictData && (
        <ConflictDialog
          open={conflictDialogOpen}
          onClose={() => {
            setConflictDialogOpen(false);
            setConflictData(null);
          }}
          conflict={conflictData.conflict}
          message={conflictData.message}
          onSelectDoctor={(doctorId) => {
            setValue('dentistId', doctorId);
            const selectedDentist = dentists.find((d) => d.id === doctorId);
            if (selectedDentist) {
              // Optionally show a success message
              toast.success(`Selected ${selectedDentist.firstName} ${selectedDentist.lastName}`);
            }
          }}
          onSelectTimeSlot={(startTime, endTime) => {
            try {
              const startTimeDate = parseTime12Hour(startTime);
              const endTimeDate = parseTime12Hour(endTime);
              setValue('startTime', startTimeDate);
              setValue('endTime', endTimeDate);
              toast.success(`Selected time slot: ${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`);
            } catch (error) {
              toast.error('Failed to set time slot');
            }
          }}
          onSelectNextAvailable={() => {
            if (conflictData.conflict.suggestions.nextAvailableSlot) {
              const slot = conflictData.conflict.suggestions.nextAvailableSlot;
              try {
                const startTimeDate = parseTime12Hour(slot.startTime);
                const endTimeDate = parseTime12Hour(slot.endTime);
                setValue('startTime', startTimeDate);
                setValue('endTime', endTimeDate);
                toast.success(`Selected next available slot: ${formatTime12Hour(slot.startTime)} - ${formatTime12Hour(slot.endTime)}`);
              } catch (error) {
                toast.error('Failed to set time slot');
              }
            }
          }}
        />
      )}
    </Box>
  );
};

export default Appointments;


