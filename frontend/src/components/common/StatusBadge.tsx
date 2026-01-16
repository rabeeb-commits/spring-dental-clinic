import React from 'react';
import { Chip, ChipProps } from '@mui/material';

interface StatusBadgeProps extends Omit<ChipProps, 'label'> {
  status: string;
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'filled',
  size = 'small',
  ...props
}) => {
  const getStatusColor = (status: string): { bg: string; color: string } => {
    const statusUpper = status.toUpperCase();
    
    // Appointment statuses
    if (statusUpper === 'CONFIRMED') {
      return { bg: '#dcfce7', color: '#16a34a' };
    }
    if (statusUpper === 'COMPLETED') {
      return { bg: '#dbeafe', color: '#2563eb' };
    }
    if (statusUpper === 'CANCELLED') {
      return { bg: '#fee2e2', color: '#dc2626' };
    }
    if (statusUpper === 'NO_SHOW') {
      return { bg: '#fef3c7', color: '#d97706' };
    }
    if (statusUpper === 'RESCHEDULED') {
      return { bg: '#ede9fe', color: '#7c3aed' };
    }
    
    // Treatment statuses
    if (statusUpper === 'PLANNED') {
      return { bg: '#e0e7ff', color: '#6366f1' };
    }
    if (statusUpper === 'IN_PROGRESS') {
      return { bg: '#fef3c7', color: '#d97706' };
    }
    
    // Invoice statuses
    if (statusUpper === 'PENDING') {
      return { bg: '#fef3c7', color: '#d97706' };
    }
    if (statusUpper === 'PAID') {
      return { bg: '#dcfce7', color: '#16a34a' };
    }
    if (statusUpper === 'PARTIAL') {
      return { bg: '#dbeafe', color: '#2563eb' };
    }
    if (statusUpper === 'DRAFT') {
      return { bg: '#f3f4f6', color: '#6b7280' };
    }
    
    // Default
    return { bg: '#f3f4f6', color: '#6b7280' };
  };

  const colors = getStatusColor(status);
  const formattedStatus = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Chip
      label={formattedStatus}
      size={size}
      variant={variant}
      sx={{
        bgcolor: variant === 'filled' ? colors.bg : 'transparent',
        color: colors.color,
        borderColor: variant === 'outlined' ? colors.color : 'transparent',
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        height: size === 'small' ? 24 : 28,
        ...props.sx,
      }}
      {...props}
    />
  );
};

export default StatusBadge;
