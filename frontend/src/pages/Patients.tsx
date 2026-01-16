import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Skeleton,
  Tooltip,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Stack,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import toast from 'react-hot-toast';
import { patientsApi } from '../services/api';
import { Patient, Gender } from '../types';
import { format } from 'date-fns';
import { calculateAge } from '../utils/helpers';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useDebounce } from '../hooks/useDebounce';

interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  notes?: string;
}

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>();

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page + 1),
        limit: String(rowsPerPage),
      };
      
      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }
      if (genderFilter) {
        params.gender = genderFilter;
      }
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active' ? 'true' : 'false';
      }

      const response = await patientsApi.getAll(params);

      if (response.data.success) {
        setPatients(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      toast.error('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearchQuery, genderFilter, statusFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setDialogOpen(true);
    }
  }, [searchParams]);

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: new Date(patient.dateOfBirth),
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode,
        emergencyContact: patient.emergencyContact,
        emergencyPhone: patient.emergencyPhone,
        bloodGroup: patient.bloodGroup,
        notes: patient.notes,
      });
    } else {
      setEditingPatient(null);
      reset({
        firstName: '',
        lastName: '',
        dateOfBirth: null,
        gender: 'MALE',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        emergencyContact: '',
        emergencyPhone: '',
        bloodGroup: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPatient(null);
    reset();
  };

  const onSubmit = async (data: PatientFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth?.toISOString(),
      };

      if (editingPatient) {
        await patientsApi.update(editingPatient.id, payload);
        toast.success('Patient updated successfully');
      } else {
        await patientsApi.create(payload);
        toast.success('Patient registered successfully');
      }

      handleCloseDialog();
      fetchPatients();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (patientToDelete) {
      try {
        await patientsApi.delete(patientToDelete.id);
        toast.success('Patient deactivated successfully');
        fetchPatients();
        setDeleteDialogOpen(false);
        setPatientToDelete(null);
      } catch (error) {
        // Error handled by interceptor
      }
    }
  };

  const getGenderColor = (gender: Gender) => {
    const colors = {
      MALE: '#3b82f6',
      FEMALE: '#ec4899',
      OTHER: '#8b5cf6',
    };
    return colors[gender];
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Patients
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Manage patient records and information
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ px: 3 }}
        >
          Add Patient
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, phone, patient ID, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            aria-label="Search patients"
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
            sx={{ flex: 1, minWidth: 250 }}
          />
          
          {/* Quick Filter Chips */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="All"
              onClick={() => {
                setStatusFilter('all');
                setGenderFilter('');
                setPage(0);
              }}
              color={statusFilter === 'all' && !genderFilter ? 'primary' : 'default'}
              size="small"
            />
            <Chip
              label="Active"
              onClick={() => {
                setStatusFilter('active');
                setPage(0);
              }}
              color={statusFilter === 'active' ? 'primary' : 'default'}
              size="small"
            />
            <Chip
              label="Inactive"
              onClick={() => {
                setStatusFilter('inactive');
                setPage(0);
              }}
              color={statusFilter === 'inactive' ? 'primary' : 'default'}
              size="small"
            />
          </Stack>

          <Button
            startIcon={<FilterIcon />}
            endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            variant="outlined"
            size="small"
          >
            Filters
          </Button>
        </Box>

        {/* Advanced Filters */}
        <Collapse in={filtersExpanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={genderFilter}
                    label="Gender"
                    onChange={(e) => {
                      setGenderFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setGenderFilter('');
                      setStatusFilter('all');
                      setPage(0);
                    }}
                  >
                    Clear All
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Bulk Actions Toolbar */}
      {selectedPatients.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" fontWeight={600}>
              {selectedPatients.length} patient(s) selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkStatusUpdate(true)}
              >
                Activate
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBulkStatusUpdate(false)}
              >
                Deactivate
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setSelectedPatients([])}
              >
                Clear Selection
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Patients Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedPatients.length > 0 && selectedPatients.length < patients.length}
                    checked={patients.length > 0 && selectedPatients.length === patients.length}
                    onChange={handleSelectAll}
                    aria-label="Select all patients"
                  />
                </TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Age</TableCell>
                <TableCell>Visits</TableCell>
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
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 0, border: 'none' }}>
                    <EmptyState
                      type={searchQuery ? 'search' : 'add'}
                      title={searchQuery ? 'No patients found' : 'No patients yet'}
                      message={searchQuery ? 'Try adjusting your search criteria' : 'Get started by registering your first patient'}
                      actionLabel="Add Patient"
                      onAction={() => handleOpenDialog()}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    selected={selectedPatients.includes(patient.id)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedPatients.includes(patient.id)}
                        onChange={() => handleSelectPatient(patient.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select patient ${patient.firstName} ${patient.lastName}`}
                      />
                    </TableCell>
                    <TableCell onClick={() => navigate(`/patients/${patient.id}`)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#0891b2' }}>
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={500}>
                            {patient.firstName} {patient.lastName}
                          </Typography>
                          {patient.bloodGroup && (
                            <Typography variant="caption" color="text.secondary">
                              Blood: {patient.bloodGroup}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: '#0891b2',
                          fontWeight: 500,
                        }}
                      >
                        {patient.patientId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                          <Typography variant="body2">{patient.phone}</Typography>
                        </Box>
                        {patient.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
                              {patient.email}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={patient.gender}
                        sx={{
                          bgcolor: `${getGenderColor(patient.gender)}15`,
                          color: getGenderColor(patient.gender),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {patient.age !== undefined ? `${patient.age} yrs` : calculateAge(patient.dateOfBirth) !== undefined ? `${calculateAge(patient.dateOfBirth)} yrs` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {patient._count?.appointments || 0}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(patient)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(patient);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
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
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Add/Edit Patient Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {editingPatient ? 'Edit Patient' : 'Register New Patient'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {editingPatient ? 'Update patient information' : 'Fill in the patient details below'}
              </Typography>
            </Box>
            <IconButton
              aria-label="close"
              onClick={handleCloseDialog}
              sx={{ color: 'text.secondary', ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  {...register('firstName', { required: 'First name is required' })}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  {...register('lastName', { required: 'Last name is required' })}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  rules={{ required: 'Date of birth is required' }}
                  render={({ field }) => (
                    <DatePicker
                      label="Date of Birth"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.dateOfBirth,
                          helperText: errors.dateOfBirth?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Gender"
                  defaultValue="MALE"
                  {...register('gender', { required: 'Gender is required' })}
                  error={!!errors.gender}
                  helperText={errors.gender?.message}
                >
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Enter a valid 10-digit phone number',
                    },
                  })}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  {...register('address')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  {...register('city')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="State"
                  {...register('state')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  {...register('zipCode')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Blood Group"
                  {...register('bloodGroup')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Emergency Contact"
                  {...register('emergencyContact')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Emergency Phone"
                  {...register('emergencyPhone')}
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
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingPatient ? 'Update Patient' : 'Register Patient'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Deactivate Patient"
        message={`Are you sure you want to deactivate ${patientToDelete?.firstName} ${patientToDelete?.lastName}? This action cannot be undone.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setPatientToDelete(null);
        }}
      />
    </Box>
  );
};

export default Patients;



