import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Today = lazy(() => import('./pages/Today'));
const PatientWorkflow = lazy(() => import('./pages/PatientWorkflow'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Treatments = lazy(() => import('./pages/Treatments'));
const Billing = lazy(() => import('./pages/Billing'));
const Reports = lazy(() => import('./pages/Reports'));
const ProcedureTypes = lazy(() => import('./pages/ProcedureTypes'));
const Settings = lazy(() => import('./pages/Settings'));
const Logs = lazy(() => import('./pages/Logs'));

// Loading component
const Loading: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    }}
  >
    <CircularProgress size={48} thickness={4} />
  </Box>
);

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route wrapper (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/today"
          element={
            <ProtectedRoute>
              <Today />
            </ProtectedRoute>
          }
        />
        <Route
          path="/today/:id"
          element={
            <ProtectedRoute>
              <PatientWorkflow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/treatments"
          element={
            <ProtectedRoute>
              <Treatments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procedures"
          element={
            <ProtectedRoute>
              <ProcedureTypes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;


