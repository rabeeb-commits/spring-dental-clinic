import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  CalendarMonth as AppointmentIcon,
  Notes as NotesIcon,
  MedicalServices as TreatmentIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { Appointment, Treatment, Invoice } from '../../types';

interface VisitProgressProps {
  appointment: Appointment;
  treatments: Treatment[];
  invoices: Invoice[];
  hasNotes: boolean;
  hasTeethSelected: boolean;
  onStepClick?: (step: number) => void;
}

interface StepStatus {
  completed: boolean;
  inProgress: boolean;
  pending: boolean;
}

const VisitProgress: React.FC<VisitProgressProps> = ({
  appointment,
  treatments,
  invoices,
  hasNotes,
  hasTeethSelected,
  onStepClick,
}) => {
  const steps = [
    {
      id: 'patient',
      label: 'Patient Information',
      icon: <PersonIcon />,
      description: 'Patient details loaded',
    },
    {
      id: 'appointment',
      label: 'Appointment',
      icon: <AppointmentIcon />,
      description: 'Appointment scheduled',
    },
    {
      id: 'examination',
      label: 'Examination',
      icon: <NotesIcon />,
      description: 'Clinical notes and affected teeth',
    },
    {
      id: 'treatment',
      label: 'Treatment Plan',
      icon: <TreatmentIcon />,
      description: 'Treatment plan created',
    },
    {
      id: 'invoice',
      label: 'Invoice',
      icon: <InvoiceIcon />,
      description: 'Invoice generated',
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: <PaymentIcon />,
      description: 'Payment recorded',
    },
    {
      id: 'complete',
      label: 'Complete Visit',
      icon: <CompleteIcon />,
      description: 'Visit completed',
    },
  ];

  const getStepStatus = (stepId: string): StepStatus => {
    switch (stepId) {
      case 'patient':
        return { completed: true, inProgress: false, pending: false };
      case 'appointment':
        return {
          completed: appointment.status === 'COMPLETED' || appointment.status === 'CONFIRMED',
          inProgress: false,
          pending: false,
        };
      case 'examination':
        return {
          completed: hasNotes || hasTeethSelected,
          inProgress: false,
          pending: !hasNotes && !hasTeethSelected,
        };
      case 'treatment':
        return {
          completed: treatments.length > 0,
          inProgress: treatments.some(t => t.status === 'IN_PROGRESS'),
          pending: treatments.length === 0,
        };
      case 'invoice':
        return {
          completed: invoices.length > 0,
          inProgress: invoices.some(i => i.status === 'PARTIAL'),
          pending: invoices.length === 0,
        };
      case 'payment':
        return {
          completed: invoices.length > 0 && invoices.every(i => i.status === 'PAID'),
          inProgress: invoices.some(i => i.status === 'PARTIAL'),
          pending: invoices.length === 0 || invoices.some(i => i.dueAmount > 0),
        };
      case 'complete':
        return {
          completed: appointment.status === 'COMPLETED',
          inProgress: false,
          pending: appointment.status !== 'COMPLETED',
        };
      default:
        return { completed: false, inProgress: false, pending: true };
    }
  };

  const getActiveStep = (): number => {
    for (let i = steps.length - 1; i >= 0; i--) {
      const status = getStepStatus(steps[i].id);
      if (status.completed || status.inProgress) {
        return i;
      }
    }
    return 0;
  };

  const activeStep = getActiveStep();

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Visit Progress
        </Typography>
        <Chip
          label={`${activeStep + 1} of ${steps.length} steps`}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = onStepClick && (status.pending || status.inProgress);

          return (
            <Step
              key={step.id}
              completed={status.completed}
              active={status.inProgress || (index === activeStep && !status.completed)}
            >
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: status.completed
                        ? '#22c55e'
                        : status.inProgress
                        ? '#f59e0b'
                        : '#e2e8f0',
                      color: status.completed || status.inProgress ? '#fff' : '#94a3b8',
                      border: `2px solid ${
                        status.completed
                          ? '#22c55e'
                          : status.inProgress
                          ? '#f59e0b'
                          : '#e2e8f0'
                      }`,
                    }}
                  >
                    {status.completed ? (
                      <CompleteIcon sx={{ fontSize: 20 }} />
                    ) : (
                      React.cloneElement(step.icon, { sx: { fontSize: 20 } })
                    )}
                  </Box>
                )}
                optional={
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={status.completed || status.inProgress ? 600 : 500}
                    sx={{
                      cursor: isClickable ? 'pointer' : 'default',
                      '&:hover': isClickable ? { color: 'primary.main' } : {},
                    }}
                    onClick={() => {
                      if (isClickable) {
                        onStepClick?.(index);
                      }
                    }}
                  >
                    {step.label}
                  </Typography>
                  {status.inProgress && (
                    <Chip
                      label="In Progress"
                      size="small"
                      sx={{
                        bgcolor: '#f59e0b15',
                        color: '#f59e0b',
                        fontWeight: 500,
                      }}
                    />
                  )}
                  {status.completed && (
                    <Chip
                      label="Done"
                      size="small"
                      sx={{
                        bgcolor: '#22c55e15',
                        color: '#22c55e',
                        fontWeight: 500,
                      }}
                    />
                  )}
                </Box>
              </StepLabel>
              <StepContent>
                {step.id === 'treatment' && treatments.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {treatments.length} treatment plan(s) created
                    </Typography>
                  </Box>
                )}
                {step.id === 'invoice' && invoices.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {invoices.length} invoice(s) generated
                    </Typography>
                  </Box>
                )}
                {step.id === 'payment' && invoices.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {invoices.filter(i => i.status === 'PAID').length} paid,{' '}
                      {invoices.filter(i => i.dueAmount > 0).length} pending
                    </Typography>
                  </Box>
                )}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Paper>
  );
};

export default VisitProgress;
