import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ClinicProvider } from './context/ClinicContext';
import { ThemeProvider } from './context/ThemeContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { InvoiceTemplateProvider } from './context/InvoiceTemplateContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ThemeAwareToaster from './components/common/ThemeAwareToaster';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ErrorBoundary>
            <AuthProvider>
              <PermissionsProvider>
                <InvoiceTemplateProvider>
                  <ClinicProvider>
                    <App />
                  </ClinicProvider>
                </InvoiceTemplateProvider>
              </PermissionsProvider>
              <ThemeAwareToaster />
            </AuthProvider>
          </ErrorBoundary>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);


