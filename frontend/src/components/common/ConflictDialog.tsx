import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { formatTime12Hour } from '../../utils/helpers';

interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: {
    existingAppointment: {
      patientName: string;
      time: string;
    };
    suggestions: {
      alternativeDoctors: Array<{ id: string; name: string; available: boolean }>;
      availableTimeSlots: Array<{ startTime: string; endTime: string }>;
      nextAvailableSlot: { startTime: string; endTime: string } | null;
    };
  };
  message: string;
  onSelectDoctor?: (doctorId: string) => void;
  onSelectTimeSlot?: (startTime: string, endTime: string) => void;
  onSelectNextAvailable?: () => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onClose,
  conflict,
  message,
  onSelectDoctor,
  onSelectTimeSlot,
  onSelectNextAvailable,
}) => {
  const { existingAppointment, suggestions } = conflict;
  const { alternativeDoctors, availableTimeSlots, nextAvailableSlot } = suggestions;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          <Typography variant="h6">Time Slot Not Available</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {message}
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Conflicting Appointment
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {existingAppointment.patientName} - {existingAppointment.time}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Alternative Doctors */}
        {alternativeDoctors.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Alternative Doctors Available
            </Typography>
            <List dense>
              {alternativeDoctors.map((doctor) => (
                <ListItem
                  key={doctor.id}
                  disablePadding
                  secondaryAction={
                    onSelectDoctor && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onSelectDoctor(doctor.id);
                          onClose();
                        }}
                      >
                        Select
                      </Button>
                    )
                  }
                >
                  <ListItemButton disabled={!onSelectDoctor}>
                    <CheckIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <ListItemText primary={doctor.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Available Time Slots */}
        {availableTimeSlots.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Available Time Slots
            </Typography>
            <List dense>
              {availableTimeSlots.slice(0, 5).map((slot, index) => (
                <ListItem
                  key={index}
                  disablePadding
                  secondaryAction={
                    onSelectTimeSlot && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onSelectTimeSlot(slot.startTime, slot.endTime);
                          onClose();
                        }}
                      >
                        Select
                      </Button>
                    )
                  }
                >
                  <ListItemButton disabled={!onSelectTimeSlot}>
                    <TimeIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                    <ListItemText
                      primary={`${formatTime12Hour(slot.startTime)} - ${formatTime12Hour(slot.endTime)}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Next Available Slot */}
        {nextAvailableSlot && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Next Available Slot
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon color="success" />
                <Typography variant="body1" fontWeight={500}>
                  {formatTime12Hour(nextAvailableSlot.startTime)} - {formatTime12Hour(nextAvailableSlot.endTime)}
                </Typography>
              </Box>
              {onSelectNextAvailable && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => {
                    onSelectNextAvailable();
                    onClose();
                  }}
                >
                  Select This Time
                </Button>
              )}
            </Box>
          </Box>
        )}

        {alternativeDoctors.length === 0 && availableTimeSlots.length === 0 && !nextAvailableSlot && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No alternative options available. Please try a different date or time.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictDialog;
