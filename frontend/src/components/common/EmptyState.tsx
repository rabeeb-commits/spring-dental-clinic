import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add, Search, Inbox } from '@mui/icons-material';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'default' | 'search' | 'add';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  type = 'default',
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'search':
        return <Search sx={{ fontSize: 64, color: '#94a3b8' }} />;
      case 'add':
        return <Add sx={{ fontSize: 64, color: '#94a3b8' }} />;
      default:
        return <Inbox sx={{ fontSize: 64, color: '#94a3b8' }} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'search':
        return 'No results found';
      case 'add':
        return 'No items yet';
      default:
        return 'No data available';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'search':
        return 'Try adjusting your search criteria';
      case 'add':
        return 'Get started by adding your first item';
      default:
        return 'There is no data to display at this time';
    }
  };

  return (
    <Box
      sx={{
        py: 8,
        px: 2,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          mb: 3,
          opacity: 0.6,
        }}
      >
        {icon || getDefaultIcon()}
      </Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
        {title || getDefaultTitle()}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {message || getDefaultMessage()}
      </Typography>
      {onAction && actionLabel && (
        <Button variant="contained" onClick={onAction} startIcon={type === 'add' ? <Add /> : undefined}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
