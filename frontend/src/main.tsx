import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ClinicProvider } from './context/ClinicContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ErrorBoundary>
            <AuthProvider>
              <ClinicProvider>
                <App />
              </ClinicProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#1e293b',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                    style: {
                      background: '#dcfce7',
                      color: '#16a34a',
                      borderColor: '#86efac',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                    style: {
                      background: '#fee2e2',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                    },
                  },
                  loading: {
                    style: {
                      background: '#dbeafe',
                      color: '#2563eb',
                      borderColor: '#93c5fd',
                    },
                  },
                }}
              />
            </AuthProvider>
          </ErrorBoundary>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);


