import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { treatmentsApi, usersApi, procedureTypesApi } from '../../services/api';
import { ProcedureType, User } from '../../types';

interface TreatmentModalProps {
  open: boolean;
  onClose: () => void;
  onTreatmentCreated: () => void;
  patientId: string;
  defaultDentistId?: string;
}

interface TreatmentFormData {
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

const TreatmentModal: React.FC<TreatmentModalProps> = ({
  open,
  onClose,
  onTreatmentCreated,
  patientId,
  defaultDentistId,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [dentists, setDentists] = useState<User[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TreatmentFormData>({
    defaultValues: {
      dentistId: defaultDentistId || '',
      title: '',
      description: '',
      procedures: [{ procedureTypeId: '', toothNumbers: [], cost: 0, notes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'procedures',
  });

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const [dentistsRes, proceduresRes] = await Promise.all([
            usersApi.getDentists(),
            procedureTypesApi.getAll({ isActive: 'true' }),
          ]);

          if (dentistsRes.data.success) {
            setDentists(dentistsRes.data.data || []);
            if (defaultDentistId) {
              setValue('dentistId', defaultDentistId);
            } else if (dentistsRes.data.data && dentistsRes.data.data.length > 0) {
              setValue('dentistId', dentistsRes.data.data[0].id);
            }
          }
          if (proceduresRes.data.success) {
            setProcedureTypes(proceduresRes.data.data || []);
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
        }
      };
      fetchData();
    }
  }, [open, defaultDentistId, setValue]);

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

  const onSubmit = async (data: TreatmentFormData) => {
    setSubmitting(true);
    try {
      await treatmentsApi.create({
        patientId,
        ...data,
        procedures: data.procedures.filter(p => p.procedureTypeId),
      });
      toast.success('Treatment plan created successfully');
      reset();
      onTreatmentCreated();
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
            Create Treatment Plan
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
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Select Dentist"
                {...register('dentistId', { required: 'Dentist is required' })}
                error={!!errors.dentistId}
                helperText={errors.dentistId?.message}
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
                placeholder="e.g., Root Canal Treatment - Tooth 36"
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
                    bgcolor: '#f8fafc',
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
                            <MenuItem value="">Select Procedure</MenuItem>
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
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Treatment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TreatmentModal;
