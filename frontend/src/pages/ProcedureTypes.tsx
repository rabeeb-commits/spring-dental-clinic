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
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Category as CategoryIcon,
  AttachMoney as PriceIcon,
  Schedule as DurationIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { procedureTypesApi } from '../services/api';
import { ProcedureType } from '../types';
import { useAuth } from '../context/AuthContext';

interface ProcedureFormData {
  name: string;
  code?: string;
  description?: string;
  defaultCost: number;
  duration?: number;
  category?: string;
  isActive: boolean;
}

const CATEGORIES = [
  'General',
  'Preventive',
  'Restorative',
  'Endodontic',
  'Periodontic',
  'Prosthodontic',
  'Orthodontic',
  'Oral Surgery',
  'Cosmetic',
  'Diagnostic',
  'Other',
];

const ProcedureTypes: React.FC = () => {
  const { user } = useAuth();
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ProcedureType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<ProcedureType | null>(null);

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<ProcedureFormData>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      defaultCost: 0,
      duration: 30,
      category: 'General',
      isActive: true,
    },
  });

  const fetchProcedureTypes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.category = categoryFilter;
      if (activeFilter) params.isActive = activeFilter;

      const response = await procedureTypesApi.getAll(params);
      if (response.data.success) {
        setProcedureTypes(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch procedure types:', error);
      toast.error('Failed to load procedure types. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, activeFilter]);

  useEffect(() => {
    fetchProcedureTypes();
  }, [fetchProcedureTypes]);

  const handleOpenDialog = (procedure?: ProcedureType) => {
    if (procedure) {
      setEditingProcedure(procedure);
      reset({
        name: procedure.name,
        code: procedure.code || '',
        description: procedure.description || '',
        defaultCost: procedure.defaultCost,
        duration: procedure.duration || 30,
        category: procedure.category || 'General',
        isActive: procedure.isActive,
      });
    } else {
      setEditingProcedure(null);
      reset({
        name: '',
        code: '',
        description: '',
        defaultCost: 0,
        duration: 30,
        category: 'General',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProcedure(null);
    reset();
  };

  const onSubmit = async (data: ProcedureFormData) => {
    setSubmitting(true);
    try {
      if (editingProcedure) {
        await procedureTypesApi.update(editingProcedure.id, data as unknown as Record<string, unknown>);
        toast.success('Procedure type updated successfully');
      } else {
        await procedureTypesApi.create(data as unknown as Record<string, unknown>);
        toast.success('Procedure type created successfully');
      }
      handleCloseDialog();
      fetchProcedureTypes();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (procedure: ProcedureType) => {
    try {
      await procedureTypesApi.update(procedure.id, { isActive: !procedure.isActive });
      toast.success(`Procedure ${procedure.isActive ? 'deactivated' : 'activated'}`);
      fetchProcedureTypes();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleDeleteClick = (procedure: ProcedureType) => {
    setProcedureToDelete(procedure);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!procedureToDelete) return;
    
    try {
      await procedureTypesApi.delete(procedureToDelete.id);
      toast.success('Procedure type deleted');
      fetchProcedureTypes();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setDeleteDialogOpen(false);
      setProcedureToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isAdmin = user?.role === 'ADMIN';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'DENTIST';

  // Filter and paginate
  const filteredProcedures = procedureTypes
    .filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  const paginatedProcedures = filteredProcedures.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Procedure Types
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Manage treatment types and pricing
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Procedure
          </Button>
        )}
      </Box>

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have read-only access to procedure types. Contact an administrator to make changes.
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search procedures..."
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
            label="Category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Procedure Types Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="center">Duration</TableCell>
                <TableCell align="center">Status</TableCell>
                {canEdit && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={canEdit ? 7 : 6}>
                      <Skeleton variant="rounded" height={50} />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedProcedures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} align="center" sx={{ py: 6 }}>
                    <CategoryIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">
                      No procedure types found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProcedures.map((procedure) => (
                  <TableRow key={procedure.id} hover>
                    <TableCell>
                      <Box>
                        <Typography fontWeight={500}>{procedure.name}</Typography>
                        {procedure.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {procedure.description.length > 50 
                              ? `${procedure.description.substring(0, 50)}...` 
                              : procedure.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {procedure.code ? (
                        <Chip label={procedure.code} size="small" variant="outlined" />
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={procedure.category || 'General'}
                        size="small"
                        sx={{ bgcolor: '#e2e8f0' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color="primary">
                        {formatCurrency(procedure.defaultCost)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {procedure.duration ? `${procedure.duration} min` : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={procedure.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: procedure.isActive ? '#22c55e15' : '#64748b15',
                          color: procedure.isActive ? '#22c55e' : '#64748b',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    {canEdit && (
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(procedure)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={procedure.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleActive(procedure)}
                            color={procedure.isActive ? 'default' : 'success'}
                          >
                            <Switch
                              checked={procedure.isActive}
                              size="small"
                              sx={{ pointerEvents: 'none' }}
                            />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(procedure)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredProcedures.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {editingProcedure ? 'Edit Procedure Type' : 'Add New Procedure Type'}
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
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Procedure Name"
                  {...register('name', { required: 'Name is required' })}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Code"
                  {...register('code')}
                  placeholder="e.g., EXT01"
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="defaultCost"
                  control={control}
                  rules={{ required: 'Price is required', min: { value: 0, message: 'Price must be positive' } }}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="Default Price"
                      type="number"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">₹</InputAdornment>
                        ),
                      }}
                      {...field}
                      error={!!errors.defaultCost}
                      helperText={errors.defaultCost?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="Duration (minutes)"
                      type="number"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">min</InputAdornment>
                        ),
                      }}
                      {...field}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  defaultValue="General"
                  {...register('category')}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          color="success"
                        />
                      }
                      label="Active"
                      sx={{ mt: 1 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : editingProcedure ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Delete Procedure Type</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setDeleteDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{procedureToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. Treatments using this procedure type will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProcedureTypes;

