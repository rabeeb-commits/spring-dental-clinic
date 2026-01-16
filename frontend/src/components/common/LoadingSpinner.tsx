import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  fullScreen = false,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          minHeight: '100vh',
        }),
      }}
    >
      <CircularProgress size={size} thickness={4} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  return content;
};

export default LoadingSpinner;
