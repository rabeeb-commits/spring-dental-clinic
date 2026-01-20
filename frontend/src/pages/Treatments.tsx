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
  Avatar,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon,
  Receipt as BillingIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Undo as UndoIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { treatmentsApi, patientsApi, usersApi, procedureTypesApi } from '../services/api';
import { Treatment, Patient, User, ProcedureType, TreatmentStatus } from '../types';
import { format } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

interface TreatmentFormData {
  patientId: string;
  dentistId: string;
  title: string;
  description?: string;
  procedures: {
    procedureTypeId: string;
    toothNumbers: number[];
    cost: number;
    notes?: string;
  }[];
}

const Treatments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<User[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TreatmentFormData>({
    defaultValues: {
      procedures: [{ procedureTypeId: '', toothNumbers: [], cost: 0, notes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'procedures',
  });

  const fetchTreatments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page + 1),
        limit: String(rowsPerPage),
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const response = await treatmentsApi.getAll(params);
      if (response.data.success) {
        setTreatments(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch treatments:', error);
      toast.error('Failed to load treatments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [patientsRes, dentistsRes, proceduresRes] = await Promise.all([
          patientsApi.getAll({ limit: '100' }),
          usersApi.getDentists(),
          procedureTypesApi.getAll({ isActive: 'true' }),
        ]);

        if (patientsRes.data.success) setPatients(patientsRes.data.data || []);
        if (dentistsRes.data.success) setDentists(dentistsRes.data.data || []);
        if (proceduresRes.data.success) setProcedureTypes(proceduresRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        toast.error('Failed to load required data. Please refresh the page.');
      }
    };

    fetchInitialData();
  }, []);

  const handleOpenDialog = () => {
    setSelectedPatient(null);
    reset({
      patientId: '',
      dentistId: dentists[0]?.id || '',
      title: '',
      description: '',
      procedures: [{ procedureTypeId: '', toothNumbers: [], cost: 0, notes: '' }],
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPatient(null);
    reset();
  };

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, treatment: Treatment) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setSelectedTreatment(treatment);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
    setSelectedTreatment(null);
  };

  const handleOpenEditDialog = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setEditDialogOpen(true);
    handleCloseActionMenu();
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingTreatment(null);
  };

  const handleGoToBilling = (treatment: Treatment) => {
    navigate(`/billing?action=new&patientId=${treatment.patientId}&treatmentId=${treatment.id}`);
    handleCloseActionMenu();
  };

  const onSubmit = async (data: TreatmentFormData) => {
    setSubmitting(true);
    try {
      await treatmentsApi.create({
        ...data,
        procedures: data.procedures.filter(p => p.procedureTypeId),
      });
      toast.success('Treatment plan created successfully');
      handleCloseDialog();
      fetchTreatments();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (treatmentId: string, status: TreatmentStatus) => {
    try {
      await treatmentsApi.updateStatus(treatmentId, status);
      toast.success(`Treatment marked as ${status}`);
      fetchTreatments();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const getStatusColor = (status: TreatmentStatus): string => {
    const colors: Record<TreatmentStatus, string> = {
      PLANNED: '#64748b',
      IN_PROGRESS: '#f59e0b',
      COMPLETED: '#22c55e',
      CANCELLED: '#ef4444',
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

  const handleProcedureChange = (index: number, procedureTypeId: string) => {
    const procedure = procedureTypes.find(p => p.id === procedureTypeId);
    if (procedure) {
      setValue(`procedures.${index}.cost`, procedure.defaultCost);
    }
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Treatments
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Manage treatment plans and procedures
          </Typography>
        </Box>
        {permissions.treatments.canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
            New Treatment
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search treatments..."
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
            <MenuItem value="PLANNED">Planned</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Treatments Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Treatment</TableCell>
                <TableCell>Dentist</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton variant="rounded" height={60} />
                    </TableCell>
                  </TableRow>
                ))
              ) : treatments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No treatments found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                treatments.map((treatment) => (
                  <TableRow key={treatment.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#0891b2', width: 36, height: 36 }}>
                          {treatment.patient?.firstName?.[0]}
                          {treatment.patient?.lastName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {treatment.patient?.firstName} {treatment.patient?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {treatment.patient?.patientId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>{treatment.title}</Typography>
                      {treatment.procedures && treatment.procedures.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {treatment.procedures.length} procedure(s)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      Dr. {treatment.dentist?.firstName} {treatment.dentist?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={treatment.status.replace('_', ' ')}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(treatment.status)}20`,
                          color: getStatusColor(treatment.status),
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {formatCurrency(treatment.totalCost)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {format(new Date(treatment.createdAt), 'PP')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Patient">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/patients/${treatment.patientId}`)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {permissions.invoices.canCreate && (
                        <Tooltip title="Create Invoice">
                          <IconButton
                            size="small"
                            onClick={() => handleGoToBilling(treatment)}
                          >
                            <BillingIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenActionMenu(e, treatment)}
                        >
                          <MoreVertIcon fontSize="small" />
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

      {/* Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { minWidth: 200, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' } }}
      >
        {permissions.treatments.canUpdate && (
          <MenuItem onClick={() => selectedTreatment && handleOpenEditDialog(selectedTreatment)}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit Treatment</ListItemText>
          </MenuItem>
        )}
        {permissions.invoices.canCreate && (
          <MenuItem onClick={() => selectedTreatment && handleGoToBilling(selectedTreatment)}>
            <ListItemIcon><BillingIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Create Invoice</ListItemText>
          </MenuItem>
        )}
        {(permissions.treatments.canUpdate || permissions.treatments.canDelete) && <Divider />}
        
        {/* Status Change Options */}
        {permissions.treatments.canUpdate && selectedTreatment?.status !== 'PLANNED' && (
          <MenuItem onClick={() => {
            if (selectedTreatment) {
              handleStatusChange(selectedTreatment.id, 'PLANNED');
              handleCloseActionMenu();
            }
          }}>
            <ListItemIcon><UndoIcon fontSize="small" color="info" /></ListItemIcon>
            <ListItemText>Revert to Planned</ListItemText>
          </MenuItem>
        )}
        
        {permissions.treatments.canUpdate && selectedTreatment?.status !== 'IN_PROGRESS' && (
          <MenuItem onClick={() => {
            if (selectedTreatment) {
              handleStatusChange(selectedTreatment.id, 'IN_PROGRESS');
              handleCloseActionMenu();
            }
          }}>
            <ListItemIcon><StartIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Mark In Progress</ListItemText>
          </MenuItem>
        )}
        
        {permissions.treatments.canUpdate && selectedTreatment?.status !== 'COMPLETED' && (
          <MenuItem onClick={() => {
            if (selectedTreatment) {
              handleStatusChange(selectedTreatment.id, 'COMPLETED');
              handleCloseActionMenu();
            }
          }}>
            <ListItemIcon><CompleteIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Mark Completed</ListItemText>
          </MenuItem>
        )}
        
        {permissions.treatments.canDelete && selectedTreatment?.status !== 'CANCELLED' && (
          <>
            <Divider />
            <MenuItem onClick={() => {
              if (selectedTreatment) {
                handleStatusChange(selectedTreatment.id, 'CANCELLED');
                handleCloseActionMenu();
              }
            }}>
              <ListItemIcon><CancelIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Cancel Treatment</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Edit Treatment Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit Treatment</Typography>
            <IconButton
              aria-label="close"
              onClick={handleCloseEditDialog}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {editingTreatment && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">Patient</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {editingTreatment.patient?.firstName} {editingTreatment.patient?.lastName}
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Treatment Title"
                defaultValue={editingTreatment.title}
                sx={{ mb: 2 }}
                onChange={(e) => {
                  setEditingTreatment({ ...editingTreatment, title: e.target.value });
                }}
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                defaultValue={editingTreatment.description || ''}
                sx={{ mb: 2 }}
                onChange={(e) => {
                  setEditingTreatment({ ...editingTreatment, description: e.target.value });
                }}
              />

              <TextField
                select
                fullWidth
                label="Status"
                value={editingTreatment.status}
                onChange={(e) => {
                  setEditingTreatment({ ...editingTreatment, status: e.target.value as TreatmentStatus });
                }}
              >
                <MenuItem value="PLANNED">Planned</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (editingTreatment) {
                try {
                  await treatmentsApi.update(editingTreatment.id, {
                    title: editingTreatment.title,
                    description: editingTreatment.description,
                    status: editingTreatment.status,
                  });
                  toast.success('Treatment updated successfully');
                  handleCloseEditDialog();
                  fetchTreatments();
                } catch (error) {
                  // Error handled by interceptor
                }
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Treatment Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Create Treatment Plan</Typography>
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
              <Grid item xs={12} sm={6}>
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
              </Grid>
              <Grid item xs={12} sm={6}>
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
                <TextField
                  fullWidth
                  label="Treatment Title"
                  {...register('title', { required: 'Title is required' })}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  {...register('description')}
                />
              </Grid>

              {/* Procedures */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Procedures
                </Typography>
                {fields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`procedures.${index}.procedureTypeId`}
                          control={control}
                          render={({ field: procField }) => (
                            <TextField
                              select
                              fullWidth
                              label="Procedure"
                              value={procField.value}
                              onChange={(e) => {
                                procField.onChange(e);
                                handleProcedureChange(index, e.target.value);
                              }}
                            >
                              {procedureTypes.map((proc) => (
                                <MenuItem key={proc.id} value={proc.id}>
                                  {proc.name} - {formatCurrency(proc.defaultCost)}
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Cost"
                          {...register(`procedures.${index}.cost`, { valueAsNumber: true })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
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
                  onClick={() => append({ procedureTypeId: '', toothNumbers: [], cost: 0, notes: '' })}
                >
                  Add Procedure
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Treatment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Treatments;


