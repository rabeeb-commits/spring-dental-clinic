import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../types';
import { validateEmail } from '../utils/validation';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    try {
      await login(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(8, 145, 178, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 440,
          borderRadius: 4,
          bgcolor: '#fff',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              mb: 2,
              boxShadow: '0 10px 25px -5px rgba(8, 145, 178, 0.4)',
            }}
          >
            🦷
          </Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            DentalCare
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Clinic Management System
          </Typography>
        </Box>

        <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
          Welcome back
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Enter your credentials to access your account
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              validate: (value) => validateEmail(value) || 'Invalid email address',
            })}
            error={!!errors.email}
            helperText={errors.email?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />

          <Box sx={{ textAlign: 'right', mb: 3 }}>
            <Link
              href="#"
              underline="hover"
              sx={{ color: 'primary.main', fontSize: '0.875rem' }}
            >
              Forgot password?
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              boxShadow: '0 4px 14px 0 rgba(8, 145, 178, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
                boxShadow: '0 6px 20px 0 rgba(8, 145, 178, 0.5)',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;



